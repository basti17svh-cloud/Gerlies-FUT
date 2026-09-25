const CACHE="footera-v19-00-root-shell";
const SHELL=["./","./index.html","./footera-theme.css","./season-system.js","./manifest.webmanifest","./players-fallback.json","./assets/badge-manifest.json","./assets/player-traits.json","./assets/footera/emblem.png","./assets/footera/stadion.webp","./assets/footera/bronze.webp","./assets/footera/silber.webp","./assets/footera/gold.webp","./assets/footera/promo.webp","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png","./p1.png","./p2.png","./p3.png","./p4.png","./p5.png","./p6.png","./p7.png","./p8.png"];

self.addEventListener("install",e=>
 e.waitUntil(
  caches.open(CACHE)
   .then(c=>c.addAll(SHELL.map(x=>new Request(x,{cache:"reload"}))))
   .then(()=>self.skipWaiting())
 )
);

self.addEventListener("activate",e=>
 e.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
   .then(()=>self.clients.claim())
 )
);

self.addEventListener("fetch",e=>{
 const r=e.request,u=new URL(r.url);
 if(u.origin!==self.location.origin)return;
 if(r.mode==="navigate"||u.pathname.endsWith("/index.html")){
  e.respondWith(
   fetch(new Request(r,{cache:"no-store"}))
    .then(res=>{
     const x=res.clone();
     caches.open(CACHE).then(c=>c.put("./index.html",x));
     return res
    })
    .catch(()=>caches.match("./index.html"))
  );
  return
 }
 e.respondWith(
  fetch(r)
   .then(res=>{
    if(r.method==="GET"&&res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));
    return res
   })
   .catch(()=>caches.match(r))
 )
});
