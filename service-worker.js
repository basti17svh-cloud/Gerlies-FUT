const CACHE="gerlies-fut-v10-shell";
const SHELL=[
 "./",
 "./index.html",
 "./manifest.webmanifest",
 "./icon-192.png",
 "./icon-512.png",
 "./icon-maskable-512.png",
 "./apple-touch-icon.png"
];

self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
 event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
 );
});

self.addEventListener("fetch",event=>{
 const req=event.request;
 const url=new URL(req.url);

 // Never intercept cross-origin EA/player-data requests.
 if(url.origin!==self.location.origin)return;

 if(req.mode==="navigate"){
  event.respondWith(
   fetch(req).then(res=>{
    const clone=res.clone();
    caches.open(CACHE).then(cache=>cache.put("./index.html",clone));
    return res;
   }).catch(()=>caches.match("./index.html"))
  );
  return;
 }

 event.respondWith(
  caches.match(req).then(cached=>cached||fetch(req).then(res=>{
   if(req.method==="GET" && res.ok){
    const clone=res.clone();
    caches.open(CACHE).then(cache=>cache.put(req,clone));
   }
   return res;
  }))
 );
});
