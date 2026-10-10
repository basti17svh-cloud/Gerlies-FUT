const CACHE="footera-v21-92-camera-radar-opponents";
const SHELL=["./squad-tactics.js?v=2124","./squad-tactics.css?v=2124","./squad-numbers.js?v=2185","./squad-numbers.css?v=2185","./3d-highlights.js?v=2192","./3d-highlights-match.js?v=2189","./3d-highlights.css?v=2189","./3d-highlights-scene.mjs?v=2192","./3d-playbook.mjs?v=2189","./3d-footwork-dynamics.mjs?v=2178","./3d-player-materials.mjs?v=2178","./3d-rigged-footballer.mjs?v=2190","./3d-player-prototype.mjs?v=2190","./3d-glb-clip-blend.mjs?v=2175","./3d-glb-motion.mjs?v=2175","./assets/footera/models/footballer-prototype.glb","./vendor/three/GLTFLoader.mjs","./vendor/three/BufferGeometryUtils.mjs","./vendor/three/SkeletonUtils.mjs","./3d-football-animation.mjs?v=2174","./3d-motion-clips.mjs?v=2136","./3d-mocap-data.mjs?v=2139","./3d-mocap-runtime.mjs?v=2141","./3d-action-motion.mjs?v=2142","./3d-squad-motion.mjs?v=2174","./3d-motion-lab.mjs?v=2157","./3d-action-continuity.mjs?v=2144","./3d-motion-2.mjs?v=2147","./3d-motion-transition.mjs?v=2148","./3d-motion-duels.mjs?v=2154","./3d-duel-contact.mjs?v=2157","./3d-defender-tracking.mjs?v=2159","./3d-attack-flow.mjs?v=2160","./vendor/three/three.module.min.js","./chem-boosts.js?v=2114","./chem-boosts-ui.js?v=2114","./chem-boosts.css?v=2114","./playstyles.js?v=2114","./playstyles.css?v=2114","./player-profile.css?v=2114","./potm.js","./potm.css","./assets/footera/events/potm/frames/bundesliga.svg","./assets/footera/events/potm/frames/premier-league.svg","./assets/footera/events/potm/frames/laliga.svg","./assets/footera/events/potm/frames/serie-a.svg","./assets/footera/events/potm/frames/ligue-1.svg","./assets/footera/events/potm/logos/bundesliga.png","./assets/footera/events/potm/logos/premier-league.png","./assets/footera/events/potm/logos/laliga.png","./assets/footera/events/potm/logos/serie-a.png","./assets/footera/events/potm/logos/ligue-1.png","./assets/footera/events/potm/september-2026/olise.png","./assets/footera/events/potm/september-2026/gross.png","./assets/footera/events/potm/september-2026/raphinha.png","./assets/footera/events/potm/september-2026/malen.png","./","./index.html","./modellvergleich.html","./makehuman-vergleich.html","./footera-theme.css","./legacy-card.css","./momentum-card.css","./story-card.css","./evolution-card.css","./card-layout.css","./flashback-card.css?v=2173","./assets/footera/card-flashback-approved.png","./assets/footera/events/flashback/reus-dortmund.png","./assets/footera/events/flashback/de.png","./assets/footera/events/flashback/Los_Angeles_Galaxy_logo.svg","./assets/footera/events/flashback/Major_League_Soccer_logo.svg","./friend-online.css","./matchday.css","./club-stats.css","./club-identity.css?v=2130","./club-crest-premium.css?v=2130","./club-crest-art.js?v=2130","./ux-overview.css?v=2114","./online-config.js","./friend-online.js","./club-stats.js","./play-hub.js","./play-hub.css","./weekly-rewards.css?v=2128","./weekly-rewards.js?v=2128","./friends-hub.js","./friends-hub.css","./footera-time.js","./season-system.js","./competition-system.js","./champions-system.js?v=2114","./manifest.webmanifest","./players-fallback.json","./assets/badge-manifest.json","./assets/player-traits.json","./assets/footera/emblem.png","./assets/footera/intro-mobile-v1.mp4","./assets/footera/stadion.webp","./assets/footera/coins.webp","./assets/footera/points.webp","./assets/footera/bronze.webp","./assets/footera/silber.webp","./assets/footera/gold.webp","./assets/footera/promo.webp","./assets/footera/card-gold-approved.webp","./assets/footera/card-silver-approved.webp","./assets/footera/card-bronze-approved.webp","./assets/footera/card-totw-approved.webp","./assets/footera/card-icon-approved.webp","./assets/footera/legacy-event-aura.svg","./assets/footera/card-momentum-v2.webp","./assets/footera/card-story-v1.webp","./assets/footera/card-evolution-v1.webp","./assets/footera/founder-frame.webp","./assets/footera/founder-bastian-portrait.webp","./assets/footera/founder-bastian-card-hd.webp","./assets/footera/founder-bastian-card-6.txt","./assets/footera/founder-bastian-card-5.txt","./assets/footera/founder-bastian-card-4.txt","./assets/footera/founder-bastian-card-3.txt","./assets/footera/founder-bastian-card-2.txt","./assets/footera/founder-bastian-card-1.txt","./assets/footera/founder-bastian-card-0.txt","./assets/footera/fc-gerlies.svg","./assets/footera/founder-pack.svg","./assets/footera/founder-marco-frame.webp","./assets/footera/founder-marco-portrait.webp","./assets/footera/schweinfurt-rangers-09.webp","./assets/footera/founder-marco-pack.svg","./assets/footera/events/momentum/team2/musiala.webp","./assets/footera/events/momentum/team2/doue.webp","./assets/footera/events/momentum/team2/isak.webp","./assets/footera/events/momentum/team2/alvarez.webp","./assets/footera/events/momentum/team2/barella.webp","./assets/footera/events/momentum/team2/maignan.webp","./assets/footera/events/momentum/team2/caicedo.webp","./assets/footera/events/momentum/team2/cubarsi.webp","./assets/footera/events/momentum/team2/cherki.webp","./assets/footera/events/momentum/team2/yildiz.webp","./assets/footera/events/momentum/team2/eze.webp","./assets/footera/events/momentum/team2/costa.webp","./assets/footera/events/momentum/team2/bellingham.webp","./assets/footera/events/momentum/team2/sesko.webp","./assets/footera/events/momentum/team2/tapsoba.webp","./assets/footera/events/momentum/team2/lang.webp","./assets/footera/events/momentum/team2/kone.webp","./assets/footera/events/momentum/team2/de-ketelaere.webp","./assets/footera/events/momentum/objectives/haraldsson.webp","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png","./p1.png","./p2.png","./p3.png","./p4.png","./p5.png","./p6.png","./p7.png","./p8.png"];

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
 if(u.origin!==self.location.origin||r.method!=="GET")return;
 if(r.mode==="navigate"||u.pathname.endsWith("/index.html")){
  e.respondWith(
   fetch(new Request(r,{cache:"no-store"}))
    .then(res=>{
     const x=res.clone();
     e.waitUntil(caches.open(CACHE).then(c=>c.put("./index.html",x)));
     return res
    })
    .catch(()=>caches.match("./index.html"))
  );
  return
 }
 const immutable=/\.(?:png|webp|jpe?g|gif|svg|ico|mp4)$/i.test(u.pathname);
 e.respondWith(
  caches.match(r).then(cached=>{
   if(cached){
    if(!immutable){
     e.waitUntil(fetch(r).then(res=>{
      if(res.ok)return caches.open(CACHE).then(c=>c.put(r,res.clone()))
     }).catch(()=>{}))
    }
    return cached
   }
   return fetch(r).then(res=>{
    if(res.ok)e.waitUntil(caches.open(CACHE).then(c=>c.put(r,res.clone())));
    return res
   })
  })
 )
});
