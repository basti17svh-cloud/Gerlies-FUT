const CACHE="gerlies-fut-v18-53-root-shell";
const PATCH="./v1853-patch.js";
const SHELL=["./","./index.html","./manifest.webmanifest","./players-fallback.json","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png","./p1.png","./p2.png","./p3.png","./p4.png","./p5.png","./p6.png","./p7.png","./p8.png",PATCH];

function injectPatch(html){
 if(html.includes("v1853-patch.js"))return html;
 return html.replace("</body>",`<script src="${PATCH}"></script></body>`)
}
async function patchedHtmlResponse(res){
 const html=injectPatch(await res.text());
 const headers=new Headers(res.headers);headers.set("content-type","text/html; charset=utf-8");
 return new Response(html,{status:res.status,statusText:res.statusText,headers})
}
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(x=>new Request(x,{cache:"reload"})))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const r=e.request,u=new URL(r.url);if(u.origin!==self.location.origin)return;
 if(r.mode==="navigate"||u.pathname.endsWith("/index.html")){
  e.respondWith(fetch(new Request(r,{cache:"no-store"})).then(patchedHtmlResponse).then(res=>{caches.open(CACHE).then(c=>c.put("./index.html",res.clone()));return res}).catch(()=>caches.match("./index.html")));return
 }
 e.respondWith(fetch(r).then(res=>{if(r.method==="GET"&&res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));return res}).catch(()=>caches.match(r)))
});
