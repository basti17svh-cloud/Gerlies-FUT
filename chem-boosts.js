/* Footera chemie-boosts: consumable definitions and pure attribute/inventory rules. */
(function(root){
 "use strict";
 const ATTRIBUTES=Object.freeze([
  {key:"pac",short:"TEM",name:"Tempo",icon:"tempo"},{key:"sho",short:"SCH",name:"Schuss",icon:"schuss"},
  {key:"pas",short:"PAS",name:"Passspiel",icon:"pass"},{key:"dri",short:"DRI",name:"Dribbling",icon:"dribbling"},
  {key:"def",short:"DEF",name:"Defensive",icon:"schild"},{key:"phy",short:"PHY",name:"Physis",icon:"kraft"}
 ].map(Object.freeze));
 const CONFIG=Object.freeze({arrowBonus:Object.freeze([0,2,4,6]),chemScale:Object.freeze([0,1/3,2/3,1]),maxAttribute:99,
  drops:Object.freeze({gold:Object.freeze({slots:1,chance:.25}),promo:Object.freeze({slots:2,chance:.30})})});
 const DEFINITIONS=Object.freeze([
  {id:"vollstrecker",name:"Vollstrecker",color:"#ff465c",symbol:"abschluss",dropWeight:.4,arrows:{pac:3,sho:3}},
  {id:"dynamo",name:"Dynamo",color:"#44b9ff",symbol:"dynamik",dropWeight:1,arrows:{pac:2,pas:2,dri:2}},
  {id:"abfangjaeger",name:"Abfangjäger",color:"#60ef8b",symbol:"abfangen",dropWeight:.6,arrows:{pac:3,def:3}},
  {id:"bollwerk",name:"Bollwerk",color:"#f3c45c",symbol:"festung",dropWeight:.4,arrows:{def:3,phy:3}},
  {id:"stratege",name:"Stratege",color:"#c58aff",symbol:"taktik",dropWeight:1,arrows:{pas:3,dri:3}},
  {id:"allrounder",name:"Allrounder",color:"#cbd6e1",symbol:"balance",dropWeight:1,arrows:{pac:1,sho:1,pas:1,dri:1,def:1,phy:1}},
  {id:"torjaeger",name:"Torjäger",color:"#ff7a3d",symbol:"torjaeger",dropWeight:.85,arrows:{sho:3,dri:3}},
  {id:"kraftpaket",name:"Kraftpaket",color:"#d88a3d",symbol:"kraftpaket",dropWeight:.9,arrows:{sho:3,phy:3}},
  {id:"motor",name:"Motor",color:"#47d6c9",symbol:"motor",dropWeight:1,arrows:{pas:3,phy:3}},
  {id:"fluegelstuermer",name:"Flügelstürmer",color:"#38d4ff",symbol:"fluegel",dropWeight:.85,arrows:{pac:3,pas:3}},
  {id:"brecher",name:"Brecher",color:"#ff9b3d",symbol:"brecher",dropWeight:.7,arrows:{pac:2,sho:2,phy:2}},
  {id:"dirigent",name:"Dirigent",color:"#e178ff",symbol:"dirigent",dropWeight:.9,arrows:{sho:2,pas:2,dri:2}}
 ].map(d=>Object.freeze({...d,arrows:Object.freeze(d.arrows)})));
 const byId=new Map(DEFINITIONS.map(d=>[d.id,d]));
 const num=v=>Number.isFinite(Number(v))?Number(v):0;
 const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const chemistry=v=>Math.max(0,Math.min(3,Math.floor(num(v))));
 const definition=id=>byId.get(String(id||""))||null;
 const active=item=>definition(item?.chemBoost?.id||item?.chemBoostId);
 function effect(base,item,chem,config=CONFIG){
  const boost=active(item),level=chemistry(chem),values={...base},rows=ATTRIBUTES.map(attr=>{
   const original=num(base?.[attr.key]),arrows=boost?.arrows[attr.key]||0,maxBonus=config.arrowBonus[arrows]||0;
   const proposed=Math.round(maxBonus*(config.chemScale[level]||0));
   const value=proposed?Math.min(config.maxAttribute,original+proposed):original;
   values[attr.key]=value;
   return{...attr,arrows,base:original,maxBonus,maxValue:Math.min(config.maxAttribute,original+maxBonus),bonus:Math.max(0,value-original),value}
  });
  return{boost,chem:level,values,rows}
 }
 function inventory(state){
  const raw=state.chemBoostInventory;
  if(!raw||typeof raw!=="object"||Array.isArray(raw))state.chemBoostInventory={};
  for(const d of DEFINITIONS)state.chemBoostInventory[d.id]=Math.max(0,Math.floor(num(state.chemBoostInventory[d.id])));
  return state.chemBoostInventory
 }
 function count(state,id){return definition(id)?inventory(state)[id]:0}
 function apply(state,uid,id,{confirmed=false,expected=null,at=Date.now()}={}){
  const boost=definition(id),item=(state.club||[]).find(x=>x.uid===uid);
  if(!boost||!item)return{ok:false,reason:"missing"};
  const previous=active(item);
  if((previous?.id||null)!==expected)return{ok:false,reason:"changed"};
  if(previous?.id===id)return{ok:false,reason:"same"};
  if(previous&&!confirmed)return{ok:false,reason:"confirmation",previous};
  if(count(state,id)<1)return{ok:false,reason:"empty"};
  inventory(state)[id]-=1;item.chemBoost={id,appliedAt:at};delete item.chemBoostId;
  return{ok:true,item,previous,boost}
 }
 function packRule(pack){
  if(!pack||pack.recipientSaveId||pack.type==="founder"||pack.id==="totw-reward"||pack.id?.includes("founder"))return null;
  if(pack.chemBoostSlots)return pack.chemBoostSlots;
  if(pack.promo||pack.rotation)return CONFIG.drops.promo;
  if(pack.type==="gold"||pack.type==="special"||(pack.composition||[]).some(x=>x.quality==="gold"))return CONFIG.drops.gold;
  return null
 }
 function randomDefinition(random=Math.random){
  const total=DEFINITIONS.reduce((sum,d)=>sum+Math.max(0,num(d.dropWeight||1)),0);
  let pick=Math.max(0,Math.min(.999999999,Number(random())||0))*total;
  for(const d of DEFINITIONS){pick-=Math.max(0,num(d.dropWeight||1));if(pick<0)return d}
  return DEFINITIONS[DEFINITIONS.length-1]
 }
 function rollPack(pack,random=Math.random,makeUid=()=>String(Date.now())+"-"+random()){
  const rule=packRule(pack);if(!rule)return[];const rows=[];
  for(let i=0;i<Math.max(0,Math.min(4,Math.floor(num(rule.slots))));i++)if(random()<num(rule.chance)){
   const d=randomDefinition(random);
   rows.push({uid:makeUid(),kind:"chem-boost",chemBoostId:d.id,acquired:Date.now()})
  }
  return rows
 }
 function pending(state){return(Array.isArray(state.pendingChemBoosts)?state.pendingChemBoosts:[]).filter(i=>i?.kind==="chem-boost"&&definition(i.chemBoostId))}
 function collect(state,uid){
  const item=pending(state).find(i=>i.uid===uid);if(!item)return false;
  const remaining=pending(state).filter(i=>i.uid!==uid);inventory(state)[item.chemBoostId]+=1;state.pendingChemBoosts=remaining;return true
 }
 function collectAll(state){let n=0;for(const i of pending(state))if(collect(state,i.uid))n++;return n}
 const paths={
  flask:'<path d="M9 2h6m-5 0v7L5 19q-1 3 2 3h10q3 0 2-3L14 9V2M8 16h8m-5 3h2"/>',
  tempo:'<path d="M14 2 4 13h7l-1 9 10-13h-7z"/>',
  schuss:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
  pass:'<circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="m8 11 8-5m-8 7 8 5"/>',
  dribbling:'<path d="M19 6c-6-6-16 1-14 9 1 5 9 6 13 2 3-4-1-10-5-8-4 1-6 7-2 8 3 1 5-4 2-5"/>',
  schild:'<path d="m12 2 9 4-2 9-7 7-7-7-2-9zM12 5v13"/>',
  kraft:'<path d="m3 18 2-8 5-4 3 2-3 3 2 3 4-3 4 3-1 7H4zM7 16l4 1"/>',
  abschluss:'<circle cx="12" cy="12" r="9"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/><circle cx="12" cy="7" r="1.5"/><path d="m12 10-4 4-3 1m6-3 3 3 4-1m-8 0-1 5m5-4 3 5"/><circle cx="19" cy="12" r="2"/>',
  dynamik:'<path d="m2 6 7 1m-8 6h6m-5 6 5-1"/><circle cx="16" cy="4" r="2"/><path d="m15 8-4 6 4 3-2 5m-2-8-3 6m6-12 4 4 3-3m-7 4 5 5"/>',
  abfangen:'<path d="m4 3 5 3 6-2 5 3-4 3 5 2-6 3-2 7-4-5-6-1 2-5-3-3 4-1zM10 9l4 1-2 2"/>',
  festung:'<path d="m12 2 9 4-2 9-7 7-7-7-2-9zM7 9V6h3v3h4V6h3v9H7zM11 15v-4h2v4"/>',
  taktik:'<circle cx="5" cy="17" r="2"/><circle cx="19" cy="5" r="2"/><path d="m4 3 4 4m0-4L4 7m12 9 4 4m0-4-4 4M6 14l3-4 6 2 2-4m-5 2 3 2-2 3"/>',
  balance:'<path d="M12 12C5 2 1 7 1 12s4 10 11 0S23 7 23 12s-4 10-11 0Z"/>',
  torjaeger:'<path d="M4 20 8 9l4-5 4 5 4 11M8 15h8M6 20h12"/><circle cx="12" cy="9" r="2.5"/>',
  kraftpaket:'<path d="M4 18V8l4-3 4 4 4-4 4 3v10l-4 3H8zM8 13h8M12 9v8"/>',
  motor:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3m-8 8-3 3"/><circle cx="12" cy="12" r="2"/>',
  fluegel:'<path d="M3 15c4-8 9-10 18-9-4 3-7 5-9 9m-9 0c4-2 7-2 10 0m-10 0 4 5m6-5 3 5"/>',
  brecher:'<path d="M3 12h5l2-7 4 14 2-7h5M5 5l14 14M19 5 5 19"/>',
  dirigent:'<path d="M4 18c5-8 11-10 16-12M6 7l3 3m3-6 2 4m4 2-3 2"/><circle cx="5" cy="19" r="2"/><circle cx="20" cy="5" r="2"/>'
 };
 function icon(id){return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.schild}</svg>`}
 function arrowsHTML(n){return`<span class="cb-arrows" aria-label="${n} Pfeil${n===1?"":"e"}">${"↑".repeat(n)}</span>`}
 function boostRowsHTML(d){return ATTRIBUTES.filter(a=>d.arrows[a.key]).map(a=>`<div class="cb-stat">${icon(a.icon)}<span>${safe(a.name.toUpperCase())}</span>${arrowsHTML(d.arrows[a.key])}</div>`).join("")}
 function cardHTML(id){const d=definition(id);if(!d)return"";return`<article class="cb-card cb-${d.id}" style="--cb-accent:${d.color}" aria-label="Chemie-Boost ${safe(d.name)}"><div class="cb-card-inner"><div class="cb-card-header">${icon("flask")}<span>CHEMIE-BOOST</span></div><div class="cb-emblem">${icon(d.symbol)}</div><h3>${safe(d.name.toUpperCase())}</h3><div class="cb-stats">${boostRowsHTML(d)}</div><div class="cb-footer" aria-hidden="true">F</div></div></article>`}
 function badgeHTML(item,mini=false){const d=active(item);return d?`<span class="cb-player-badge ${mini?"cb-symbol-only":""}" style="--cb-accent:${d.color}" title="Chemie-Boost: ${safe(d.name)}" aria-label="Chemie-Boost: ${safe(d.name)}">${icon(d.symbol)}<span>${safe(d.name.toUpperCase())}</span></span>`:""}
 function profileHTML(base,item,chem){
  const e=effect(base,item,chem),d=e.boost;
  if(!d)return`<section class="cb-profile cb-profile-empty"><h3>AKTIVER CHEMIE-BOOST</h3><p>Kein Chemie-Boost ausgerüstet · ${e.chem}/3 individuelle Chemie.</p></section>`;
  return`<section class="cb-profile" style="--cb-accent:${d.color}"><div class="cb-profile-head"><h3>AKTIVER CHEMIE-BOOST</h3><span>✓ Ausgerüstet</span></div><div class="cb-equipped"><div class="cb-equipped-symbol">${icon(d.symbol)}</div><div><h4>${safe(d.name)}</h4><p>${e.chem}/3 individuelle Chemie · ${e.chem===0?"kein Bonus aktiv":"Boost aktiv"}</p></div></div><div class="cb-maximum"><strong>Maximale Wirkung bei 3 Chemie</strong>${boostRowsHTML(d)}</div>${attributeTableHTML(e)}<p class="cb-note">Die Gesamtwertung bleibt ${safe(base.ovr)}. Ein neuer Chemie-Boost ersetzt den aktuellen.</p></section>`
 }
 function attributeTableHTML(e){const boosted=e.rows.filter(a=>a.arrows>0||a.maxBonus>0);return`<div class="cb-values"><div class="cb-values-head"><span>Attribut</span><span>Basis → Mit Boost</span><span>Max.</span></div>${boosted.map(a=>`<div class="cb-value ${a.bonus?"improved":""}"><span>${icon(a.icon)}${safe(a.name)}</span><strong>${a.base} <i>→</i> ${a.value}${a.bonus?` <small>+${a.bonus}</small>`:""}</strong><span>+${a.maxBonus}</span></div>`).join("")}</div>`}
 const api={ATTRIBUTES,CONFIG,DEFINITIONS,definition,active,chemistry,effect,inventory,count,apply,packRule,randomDefinition,rollPack,pending,collect,collectAll,icon,cardHTML,badgeHTML,profileHTML,attributeTableHTML,safe};
 root.FooteraChemBoosts=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
