const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createServer}=require('../server');
const docs=path.join(__dirname,'../docs');
const base='https://owaiszahooryourecommercegrowthpartner.github.io/OwaisZahoorYourEcommerceGrowthPartner/';
const pages=fs.readdirSync(docs,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name+'/index.html');pages.push('index.html');
test('every public page has unique metadata, parseable schema and canonical sitemap coverage',()=>{
 const titles=new Set(), descriptions=new Set();const sitemap=fs.readFileSync(path.join(docs,'sitemap.xml'),'utf8');
 for(const page of pages){const s=fs.readFileSync(path.join(docs,page),'utf8');const canonical=base+page.replace(/index\.html$/,'');
 assert.ok(s.includes('rel="canonical" href="'+canonical+'"'),page);
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),page);
 for(const [regex,set] of [[/<title>(.*?)<\/title>/,titles],[/<meta name="description" content="([^"]+)"/,descriptions]]){const value=s.match(regex)?.[1];assert.ok(value,page);assert.ok(!set.has(value),page);set.add(value);}
 for(const m of s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(m[1]);
 assert.ok(!/<script>(?!<)/.test(s),page+' executable inline script');
 for(const m of s.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(!m[1].startsWith(base)&&!m[1].startsWith('/OwaisZahoorYourEcommerceGrowthPartner/'))continue;
  const url=new URL(m[1],base);const rel=decodeURIComponent(url.pathname.slice(new URL(base).pathname.length));
  const dest=path.join(docs,rel);assert.ok(fs.existsSync(dest),page+' -> '+m[1]);
  if(url.hash){const html=fs.readFileSync(fs.statSync(dest).isDirectory()?path.join(dest,'index.html'):dest,'utf8');assert.ok(html.includes('id="'+url.hash.slice(1)+'"'),page+' -> '+m[1]);}
 }
 }
});
test('server routes, redirects, host validation and errors',async t=>{
 const server=createServer({production:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const url='http://127.0.0.1:'+server.address().port;
 for(const p of pages){const route='/'+p.replace(/index\.html$/,'');assert.equal((await fetch(url+route)).status,200,route);}
 assert.equal((await fetch(url+'/missing')).status,404);
 assert.equal((await fetch(url+'/%ZZ')).status,400);
 assert.equal((await fetch(url+'/for-agencies',{redirect:'manual'})).status,308);
 assert.equal((await fetch(url+'/',{method:'POST'})).status,405);
 assert.equal((await fetch(url+'/health')).status,200);
 assert.throws(()=>createServer({production:true,site:undefined}),/PUBLIC_SITE_URL/);
 const prod=createServer({production:true,site:base,allowedHosts:'valid.example'});await new Promise(r=>prod.listen(0,'127.0.0.1',r));t.after(()=>prod.close());
 const purl='http://127.0.0.1:'+prod.address().port;
 assert.equal((await fetch(purl)).status,400);
 const response=await new Promise((resolve,reject)=>require('node:http').get(purl+'/resources/',{headers:{Host:'valid.example','X-Forwarded-Host':'evil.example'}},res=>{res.resume();resolve(res);}).on('error',reject));assert.equal(response.statusCode,308);assert.equal(response.headers.location,base+'resources/');
});
