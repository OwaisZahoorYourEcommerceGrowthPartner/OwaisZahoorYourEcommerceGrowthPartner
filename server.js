'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, 'docs');
const MIME = {'.html':'text/html', '.js':'application/javascript', '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png'};
function createServer(options = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const raw = options.site ?? process.env.PUBLIC_SITE_URL;
  let site;
  if (raw) {
    site = new URL(raw);
    if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) throw new Error('PUBLIC_SITE_URL must be a clean HTTPS URL');
    site = site.href.replace(/\/$/, '');
  } else if (production) throw new Error('PUBLIC_SITE_URL is required in production');
  const allowed = (options.allowedHosts ?? process.env.ALLOWED_HOSTS ?? '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if (production && !allowed.length) throw new Error('ALLOWED_HOSTS is required in production');
  const routes = new Map();
  function walk(dir, prefix='') {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const rel = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel+'/');
      else if (!entry.name.startsWith('.')) routes.set('/'+rel, path.join(dir, entry.name));
    }
  }
  walk(ROOT);
  const server = http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control','no-cache');
    if (production) res.setHeader('Strict-Transport-Security','max-age=31536000');
    if (allowed.length && !allowed.includes(String(req.headers.host || '').toLowerCase())) {res.writeHead(400);return res.end('Invalid host');}
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
    let u;
    try {
      if (!req.url.startsWith('/') || req.url.startsWith('//')) throw new Error('Invalid target');
      u = new URL(req.url,'http://localhost');
      decodeURIComponent(u.pathname);
    } catch {res.writeHead(400);return res.end('Invalid URL');}
    if(u.pathname==='/health') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?'':'{"status":"ok"}');}
    const base = '/OwaisZahoorYourEcommerceGrowthPartner';
    let pathname = u.pathname;
    if (pathname===base) pathname='/';
    else if(pathname.startsWith(base+'/')) pathname=pathname.slice(base.length);
    let file = routes.get(pathname);
    if (pathname.endsWith('/')) file = routes.get(pathname+'index.html');
    if (!file && routes.has(pathname+'/index.html')) {
      res.writeHead(308,{'Location':(site || base)+pathname+'/'+u.search});return res.end();
    }
    if (!file) {res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'});return res.end(req.method==='HEAD'?'':fs.readFileSync(path.join(ROOT,'404.html')));}
    // Older Node-hosted pages redirect to the authoritative Pages URL.
    if (site && path.extname(file)==='.html') {
      const target = site+(pathname==='/'?'/':pathname.replace(/index\.html$/, ''))+u.search;
      res.writeHead(308,{'Location':target});return res.end();
    }
    res.writeHead(200,{'Content-Type':(MIME[path.extname(file)] || 'application/octet-stream')+'; charset=utf-8'});
    res.end(req.method==='HEAD'?'':fs.readFileSync(file));
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return server;
}
if (require.main===module) {
 const server=createServer();server.listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Portfolio server ready'));
 for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
}
module.exports={createServer};
