/* Footera V21.340 – Stadionwetter.
 * Picks one weather per match (snow, rain or clear) from the match id and the
 * Berlin month. Presentation only: the simulation, results and saves never read it.
 * Overrides for previews/QA: ?wetter=schnee|regen|klar, window.__FOOTERA_WEATHER,
 * localStorage footera-3d-weather=0 switches the weather off (always clear). */
(function(root){
 'use strict';
 const KINDS=['clear','rain','snow'];
 const ALIASES={schnee:'snow',snow:'snow',regen:'rain',rain:'rain',klar:'clear',clear:'clear',aus:'clear',off:'clear'};
 function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function berlinMonth(at){
  try{return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',month:'numeric'}).format(new Date(at)))}
  catch(_){return new Date(at).getMonth()+1}
 }
 // Chance of snow / rain per month (rest is a clear evening).
 const ODDS={1:[.36,.22],2:[.30,.26],3:[.10,.32],4:[0,.30],5:[0,.24],6:[0,.20],7:[0,.18],8:[0,.20],9:[0,.26],10:[0,.32],11:[.26,.34],12:[.38,.24]};
 // Temperature range in °C per weather and season.
 function temperature(kind,month,u){
  const winter=[12,1,2].includes(month),cold=winter||[11,3].includes(month),summer=[6,7,8].includes(month);
  const [a,b]=kind==='snow'?(winter?[-6,0]:[-3,1]):kind==='rain'?(winter?[2,7]:cold?[4,10]:summer?[14,21]:[8,15]):(winter?[-2,5]:cold?[3,11]:summer?[19,28]:[11,19]);
  return Math.round(a+(b-a)*u);
 }
 function label(weather){
  if(!weather||weather.kind==='clear')return 'Klar';
  if(weather.kind==='snow')return weather.intensity>.8?'Dichter Schneefall':'Schneefall';
  return weather.intensity>.8?'Starkregen':'Regen';
 }
 function icon(kind){return kind==='snow'?'❄':kind==='rain'?'☂':'☾'}
 function override(){
  try{
   if(typeof location!=='undefined'){const q=new URLSearchParams(location.search).get('wetter');if(q&&ALIASES[q.toLowerCase()])return ALIASES[q.toLowerCase()]}
  }catch(_){}
  const forced=root.__FOOTERA_WEATHER;if(typeof forced==='string'&&ALIASES[forced.toLowerCase()])return ALIASES[forced.toLowerCase()];
  try{if(root.localStorage?.getItem('footera-3d-weather')==='0')return 'clear'}catch(_){}
  return '';
 }
 function make(kind,intensity,temp){
  const w={kind,intensity:Math.round(intensity*100)/100,temperature:temp};
  w.label=label(w);w.icon=icon(kind);return w;
 }
 function forMatch(seed,at=Date.now()){
  const month=berlinMonth(at),[snow,rain]=ODDS[month]||[0,.25];
  const h=hash('footera-weather|'+String(seed||'')),u=(h%10007)/10007,v=((h>>>11)%997)/997,t=((h>>>19)%1009)/1009;
  let kind=override();
  if(!kind)kind=u<snow?'snow':u<snow+rain?'rain':'clear';
  return make(kind,.5+.5*v,temperature(kind,month,t));
 }
 function normalize(value){
  if(!value||typeof value!=='object')return null;
  const kind=KINDS.includes(value.kind)?value.kind:'clear';
  const intensity=Math.max(0,Math.min(1,Number(value.intensity)||0));
  const temp=Number.isFinite(Number(value.temperature))?Math.round(Number(value.temperature)):(kind==='snow'?-1:kind==='rain'?7:12);
  return make(kind,intensity||.6,temp);
 }
 function chipText(weather){
  const w=normalize(weather);if(!w)return '';
  const t=w.temperature<0?'−'+Math.abs(w.temperature):String(w.temperature);
  return `${w.icon} ${w.label} · ${t}°`;
 }
 const api={KINDS,forMatch,normalize,label,chipText,override,berlinMonth,ODDS};
 root.FooteraWeather=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
