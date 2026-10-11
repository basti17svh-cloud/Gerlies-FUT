/* Footera Pack-Odds: deterministic, read-only sampling of the actual weighted pack selection.
 * Estimated rates are NOT contractual/exact probabilities. No inventory or wallet mutations.
 * The sampling mirrors weightedPlayer, guarantee slots, unique players and the Icon roll.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FooteraPackOdds=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const TARGETS=[65,70,75,80,82,83,84,85,86,87,88,89,90,91,93];
 function rngFromSeed(seed){
  let a=seed>>>0;
  return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
 }
 function seedFor(pack,players,icons){
  let h=2166136261;const key=String(pack.id)+":"+players.length+":"+icons.length+
   ":"+players.slice(0,5).map(p=>p.id+":"+p.ovr).join("|")+
   ":"+players.slice(-5).map(p=>p.id+":"+p.ovr).join("|");
  for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);
  return h>>>0
 }
 function specsFor(pack){
  const comps=Array.isArray(pack.composition)&&pack.composition.length?pack.composition:null;
  const specs=comps?comps.flatMap(c=>Array.from({length:c.count},()=>({min:Number(c.min||0),max:Number(c.max??99)}))):
   Array.from({length:pack.count},()=>({min:Number(pack.min||0),max:Number(pack.max??99)}));
  if(pack.guarantee&&specs.length){
   const slot=specs.findIndex(spec=>spec.max>=pack.guarantee);
   specs[slot>=0?slot:0].min=Math.max(specs[slot>=0?slot:0].min,Number(pack.guarantee));
  }
  return specs
 }
 function calculate(pack,players,options={}){
  const all=Array.isArray(players)?players:[],icons=Array.isArray(options.icons)?options.icons.filter(i=>Number.isFinite(Number(i.ovr))):[];
  const trials=Math.max(1000,Math.min(30000,Math.floor(Number(options.trials)||12000)));
  const specs=specsFor(pack);
  if(!specs.length||!all.length)return{available:false,reason:"Keine Spieler für die Quotenberechnung vorhanden."};
  const classify=typeof options.classify==="function"?options.classify:null;
  const meta=all.map(p=>{
   const kind=classify?classify(p):null;
   return{rating:Number(kind?.rating??p.ovr)||0,kind:kind?.kind||"base"}
  });
  const ranges=new Map();
  const pools=specs.map(spec=>{
   const key=spec.min+":"+spec.max;
   if(ranges.has(key))return ranges.get(key);
   let total=0;const ids=[],prefix=[];
   for(let i=0;i<all.length;i++){
    const rating=Number(all[i]?.ovr);
    if(!(rating>=spec.min&&rating<=spec.max))continue;
    total+=Math.pow(1.62,Math.max(0,spec.max-rating));
    ids.push(i);prefix.push(total)
   }
   const pool={ids,prefix,total};
   ranges.set(key,pool);return pool
  });
  for(let i=0;i<pools.length;i++)if(!pools[i].ids.length)return{available:false,reason:"Mindestens eine Kartenkategorie ist nicht verfügbar."};
  const used=new Uint32Array(all.length),rng=rngFromSeed(seedFor(pack,all,icons)),hit=Object.fromEntries(TARGETS.map(v=>[v,0]));
  let valid=0,events=0,totws=0,anySpecial=0;
  const iconChance=icons.length?Math.max(0,Math.min(1,Number(pack.iconChance)||0)):0;
  for(let trial=1;trial<=trials;trial++){
   const indices=[],rating=[],kind=[];let ok=true;
   for(let j=0;j<specs.length;j++){
    const pool=pools[j];let index=-1;
    for(let attempts=0;attempts<120;attempts++){
     let r=rng()*pool.total,lo=0,hi=pool.prefix.length-1;
     while(lo<hi){const mid=(lo+hi)>>1;if(r<=pool.prefix[mid])hi=mid;else lo=mid+1}
     const candidate=pool.ids[lo];
     if(used[candidate]!==trial){index=candidate;break}
    }
    if(index<0)index=pool.ids.find(i=>used[i]!==trial)??-1;
    if(index<0){ok=false;break}
    used[index]=trial;
    indices.push(index);rating.push(meta[index].rating);kind.push(meta[index].kind)
   }
   if(!ok)continue;
   if(iconChance&&rng()<iconChance){
    let slot=rating.findIndex(n=>n>=75);if(slot<0)slot=0;
    const icon=icons[Math.floor(rng()*icons.length)];
    rating[slot]=Number(icon.ovr)||0;
    kind[slot]="icon";
   }
   valid++;
   const best=Math.max(...rating);
   for(const threshold of TARGETS)if(best>=threshold)hit[threshold]++;
   if(kind.includes("event"))events++;
   if(kind.includes("totw"))totws++;
   if(kind.some(k=>k==="event"||k==="totw"||k==="icon"))anySpecial++;
  }
  if(!valid)return{available:false,reason:"Dieses Pack lässt sich mit dem aktuellen Spielerpool nicht vollständig generieren."};
  const eligible=new Set(pools.flatMap(pool=>pool.ids));
  const possibleRatings=Array.from(eligible,index=>meta[index].rating);
  if(iconChance)possibleRatings.push(...icons.map(i=>Number(i.ovr)));
  const maxPossible=Math.max(...possibleRatings);
  const minimum=Math.max(Number(pack.guarantee)||0,...specs.map(s=>s.min));
  const odds=(count,possible=true,guaranteed=false)=>({rate:guaranteed?1:!possible?0:count/valid,guaranteed,possible,hits:count});
  const rows=TARGETS.map(threshold=>({threshold,...odds(hit[threshold],maxPossible>=threshold,minimum>=threshold)}));
  const anyKind=k=>meta.some(m=>m.kind===k);
  return{available:true,trials:valid,requested:trials,rows,icon:odds(0,iconChance>0,false),
   iconExact:iconChance,events:odds(events,anyKind("event")),totw:odds(totws,anyKind("totw")),
   special:odds(anySpecial,iconChance>0||anyKind("event")||anyKind("totw")),
   pack,minimum,highestPossible:maxPossible};
 }
 function percent(row){
  if(row.guaranteed)return"100 % (garantiert)";
  if(row.possible===false)return"0 %";
  if(row.rate>=1)return"> 99,9 %";
  if(row.rate<0.001)return"< 0,1 %*";
  return"≈ "+(row.rate*100).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
 }
 return{calculate,percent,specsFor};
});
