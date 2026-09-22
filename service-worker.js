const CACHE="gerlies-fut-v10-1-shell";
const SHELL=["./","./index.html","./manifest.webmanifest","./players-fallback.json","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(u.origin!==self.location.origin)return;if(r.mode==="navigate"){e.respondWith(fetch(r).then(res=>{const x=res.clone();caches.open(CACHE).then(c=>c.put("./index.html",x));return res}).catch(()=>caches.match("./index.html")));return}e.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(r.method==="GET"&&res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));return res}))) });
