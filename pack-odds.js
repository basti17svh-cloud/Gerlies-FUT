/* Exact pack-level odds for the shared weighted-without-replacement draw.
   Each subset S of k distinct player IDs has probability proportional to
   product(weight[i]), where weight[i] = 1.62^(minRating - player.ovr).
   A guaranteed rating conditions its group's subset on containing >=1 such card.
   Complements are elementary symmetric sums; no Monte Carlo or invented rates.
*/
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FooteraPackOdds=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const TARGETS=[55,60,63,65,70,73,75,80,82,83,84,85,86,87,88,89,90,91,93,95];
 const clamp=(x)=>Math.max(0,Math.min(1,x));
 const finite=x=>Number.isFinite(x)?x:0;
 function specsFor(pack){
  const composition=Array.isArray(pack.composition)&&pack.composition.length?pack.composition:
    [{count:pack.count,min:pack.min??0,max:pack.max??99}];
  const specs=composition.flatMap(c=>Array.from({length:Math.max(0,Number(c.count)||0)},()=>({
   min:Number(c.min??0),max:Number(c.max??99)
  })));
  return specs;
 }
 function model(pack,players,icons=[]){
  const specs=specsFor(pack),groups=[],byRange=new Map(),unique=new Map();
  if(specs.length!==Number(pack.count)||!specs.length)return{available:false,reason:"Ungültige Pack-Zusammensetzung"};
  for(let slot=0;slot<specs.length;slot++){
   const spec=specs[slot],key=spec.min+":"+spec.max;
   if(!byRange.has(key)){byRange.set(key,groups.length);groups.push({min:spec.min,max:spec.max,slots:[],entries:[],required:0})}
   groups[byRange.get(key)].slots.push(slot);
  }
  const guarantee=Number(pack.guarantee)||0;
  if(guarantee){
   const index=groups.findIndex(g=>g.max>=guarantee);
   if(index<0)return{available:false,reason:"Rating-Garantie nicht erfüllbar"};
   groups[index].required=guarantee;
  }
  const iconSlot=specs.findIndex(spec=>spec.min>=75);
  const selectedIconSlot=iconSlot>=0?iconSlot:0;
  const iconGroup=byRange.get(specs[selectedIconSlot].min+":"+specs[selectedIconSlot].max);
  const candidates=Array.isArray(icons)?icons.filter(i=>Number.isFinite(Number(i.ovr))&&Number(i.ovr)>0):[];
  const eligibleIcons=candidates.filter(icon=>{
   const group=groups[iconGroup];
   return !(group.required&&group.slots.length===1&&Number(icon.ovr)<group.required);
  });
  const iconRate=eligibleIcons.length?clamp(Number(pack.iconChance)||0):0;
  for(const p of players||[]){
   const id=String(p?.id??"");
   if(!id||unique.has(id)||!Number.isFinite(Number(p?.ovr)))continue;
   unique.set(id,p);
  }
  const overlap=new Set();
  for(const g of groups){
   const list=Array.from(unique.values()).filter(p=>Number(p.ovr)>=g.min&&Number(p.ovr)<=g.max);
   if(list.length<g.slots.length)return{available:false,reason:"Nicht genügend unterschiedliche Spieler für "+g.min+"–"+g.max};
   for(const p of list){
    const id=String(p.id);
    if(overlap.has(id))return{available:false,reason:"Überlappende Rating-Kategorien verhindern eine exakte Berechnung"};
    overlap.add(id);
   }
   const minRating=Math.min(...list.map(p=>Number(p.ovr)));
   g.entries=list.map(p=>({base:p,w:Math.pow(1.62,minRating-Number(p.ovr)),baseRating:Number(p.ovr)}));
   if(g.required&&!g.entries.some(x=>x.baseRating>=g.required))
    return{available:false,reason:"Kein Spieler erfüllt die garantierte Wertung"};
  }
  return{available:true,groups,iconSlot:selectedIconSlot,iconGroup,icons:eligibleIcons,iconRate,guarantee};
 }
 function totalWeight(entries,k,guarantee,excluded=()=>false){
  if(k===0)return guarantee?0:1;
  const all=new Float64Array(k+1),yes=guarantee?new Float64Array(k+1):null;
  all[0]=1;
  let n=0;
  for(const e of entries){
   if(excluded(e))continue;
   n++;
   for(let j=Math.min(k,n);j>=1;j--){
    if(yes)yes[j]+=e.w*(e.baseRating>=guarantee?all[j-1]:yes[j-1]);
    all[j]+=e.w*all[j-1];
   }
  }
  return guarantee?finite(yes[k]):finite(all[k]);
 }
 function sampleSubset(entries,count,guarantee,rng){
  if(!count)return guarantee?null:[];
  const n=entries.length,stride=count+1;
  if(count>n)return null;
  const all=new Float64Array((n+1)*stride);
  const yes=guarantee?new Float64Array((n+1)*stride):null;
  all[n*stride]=1;
  for(let i=n-1;i>=0;i--){
   const next=(i+1)*stride,here=i*stride,e=entries[i];
   all[here]=1;
   for(let j=1;j<=count;j++){
    all[here+j]=all[next+j]+e.w*all[next+j-1];
    if(yes)yes[here+j]=yes[next+j]+e.w*(e.baseRating>=guarantee?all[next+j-1]:yes[next+j-1]);
   }
  }
  if(!(guarantee?yes[count]:all[count]))return null;
  const selected=[];let remaining=count,need=!!guarantee;
  for(let i=0;i<n&&remaining>0;i++){
   const here=i*stride,next=(i+1)*stride,e=entries[i],good=e.baseRating>=guarantee;
   const denom=need?yes[here+remaining]:all[here+remaining];
   const numer=e.w*(need?(good?all[next+remaining-1]:yes[next+remaining-1]):all[next+remaining-1]);
   const chance=denom>0?clamp(numer/denom):0;
   if(rng()<chance){
    selected.push(e.base);remaining--;if(good)need=false;
   }
  }
  return remaining||need?null:selected;
 }
 function draw(pack,players,options={}){
  const m=model(pack,players,options.icons);
  if(!m.available)return{available:false,reason:m.reason,items:[]};
  const rng=typeof options.random==="function"?options.random:Math.random;
  const icon=rng()<m.iconRate?m.icons[Math.min(m.icons.length-1,Math.floor(rng()*m.icons.length))]:null;
  const items=Array(pack.count);
  for(let gi=0;gi<m.groups.length;gi++){
   const g=m.groups[gi],remove=icon&&gi===m.iconGroup?1:0;
   const guaranteed=g.required&&(icon&&gi===m.iconGroup&&Number(icon.ovr)>=g.required)?0:g.required;
   const sample=sampleSubset(g.entries,g.slots.length-remove,guaranteed,rng);
   if(!sample)return{available:false,reason:"Garantierte Inhalte nicht erfüllbar",items:[]};
   let index=0;
   for(const slot of g.slots){
    if(icon&&slot===m.iconSlot)items[slot]={base:icon,icon:true};
    else items[slot]={base:sample[index++],icon:false};
   }
  }
  return{available:true,items,iconRate:m.iconRate};
 }
 function calculate(pack,players,options={}){
  const m=model(pack,players,options.icons);
  if(!m.available)return m;
  const classify=typeof options.classify==="function"?options.classify:p=>({rating:Number(p.ovr)||0,kind:"base"});
  const groups=m.groups.map(g=>({...g,entries:g.entries.map(e=>({...e,meta:classify(e.base)}))}));
  const iconGroup=m.iconGroup,iconRate=m.iconRate;
  const denomCache=new Map();
  const denom=(idx,withIcon,meetsGuarantee)=>{
   const g=groups[idx],k=g.slots.length-(withIcon&&idx===iconGroup?1:0);
   const guarantee=idx===iconGroup&&withIcon&&meetsGuarantee?0:g.required;
   const key=idx+":"+k+":"+guarantee;
   if(!denomCache.has(key))denomCache.set(key,totalWeight(g.entries,k,guarantee));
   return denomCache.get(key)
  };
  function hitWeight(entries,k,guarantee,predicate){
   if(k===0)return 0;
   const all=new Float64Array(k+1),hit=new Float64Array(k+1);
   const good=guarantee?new Float64Array(k+1):null;
   const both=guarantee?new Float64Array(k+1):null;
   all[0]=1;let n=0;
   for(const e of entries){
    n++;
    const h=predicate(e.meta),g=!!guarantee&&e.baseRating>=guarantee;
    for(let j=Math.min(k,n);j>=1;j--){
     const a=all[j-1],hBefore=hit[j-1];
     if(good){
      const gBefore=good[j-1],bBefore=both[j-1];
      both[j]+=e.w*(h&&g?a:h?gBefore:g?hBefore:bBefore);
      good[j]+=e.w*(g?a:gBefore);
     }
     hit[j]+=e.w*(h?a:hBefore);
     all[j]+=e.w*a;
    }
   }
   return guarantee?both[k]:hit[k];
  }
  function hitChance(predicate,withIcon,iconCanGuarantee){
   let probability=1;
   for(let i=0;i<groups.length;i++){
    const g=groups[i],k=g.slots.length-(withIcon&&i===iconGroup?1:0);
    const guarantee=withIcon&&i===iconGroup&&iconCanGuarantee?0:g.required;
    const d=denom(i,withIcon,iconCanGuarantee);
    if(!(d>0))return null;
    const numerator=hitWeight(g.entries,k,guarantee,predicate);
    probability*=clamp(1-clamp(numerator/d));
   }
   return clamp(1-probability);
  }
  function rate(predicate,iconPredicate){
   const without=hitChance(predicate,false,false);
   if(without===null)return null;
   let result=(1-iconRate)*without;
   if(iconRate){
    const ratios=new Map();
    for(const icon of m.icons){
     if(iconPredicate(icon)){result+=iconRate/m.icons.length;continue}
     const good=!!m.guarantee&&groups[iconGroup].required>0&&Number(icon.ovr)>=groups[iconGroup].required;
     const key=good?"good":"bad";
     if(!ratios.has(key))ratios.set(key,hitChance(predicate,true,good));
     if(ratios.get(key)===null)return null;
     result+=iconRate*ratios.get(key)/m.icons.length;
    }
   }
   return clamp(result);
  }
  const rating=p=>Number(p?.rating??0)||0;
  const hits=[];
  for(const threshold of TARGETS){
   const answer=rate(m=>rating(m)>=threshold,i=>Number(i.ovr)>=threshold);
   if(answer===null)return{available:false,reason:"Chancen konnten nicht berechnet werden"};
   hits.push({threshold,rate:answer,guaranteed:(Number(pack.guarantee)||0)>=threshold||m.groups.every(g=>g.min>=threshold)&&(!m.iconRate||m.icons.every(i=>Number(i.ovr)>=threshold)),possible:answer>0});
  }
  const oddsOf=kind=>rate(p=>p?.kind===kind,()=>false);
  const event=oddsOf("event"),totw=oddsOf("totw");
  const special=rate(p=>["event","totw","icon"].includes(p?.kind),()=>true);
  if([event,totw,special].some(x=>x===null))return{available:false,reason:"Spezialchancen konnten nicht berechnet werden"};
  return{available:true,rows:hits,iconExact:iconRate,events:{rate:event,possible:event>0},totw:{rate:totw,possible:totw>0},
   special:{rate:special,possible:special>0},method:"exact-weighted-subset-v1"};
 }
 function percent(value){
  const row=typeof value==="number"?{rate:value}:value;
  const rate=clamp(Number(row?.rate)||0);
  if(row?.guaranteed)return"100 % (garantiert)";
  if(rate>=1)return"100,00 %";
  if(row?.possible===false||rate<=0)return"0 %";
  const x=rate*100;
  const decimals=x>=10?2:x>=1?3:x>=0.01?4:6;
  if(x<0.000001)return"< 0,000001 %";
  return x.toLocaleString("de-DE",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+" %";
 }
 return{specsFor,model,draw,calculate,percent,totalWeight};
});
