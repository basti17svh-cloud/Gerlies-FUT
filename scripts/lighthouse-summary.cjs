#!/usr/bin/env node
// V21.480: turns two Lighthouse CI report folders (main, PR) into a short
// German table for the GitHub job summary. Median run per folder. Prints a
// ::warning:: annotation when the PR starts clearly slower than main.
const fs=require('fs'),path=require('path');
const [mainDir,prDir]=process.argv.slice(2);
const median=dir=>{
 try{
  const runs=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  const pick=runs.find(r=>r.isRepresentativeRun)||runs[0];
  return JSON.parse(fs.readFileSync(pick.jsonPath.startsWith('/')?pick.jsonPath:path.join(dir,path.basename(pick.jsonPath)),'utf8'));
 }catch(_){return null}
};
const rows=[
 ['Leistung (0-100)',r=>Math.round((r.categories.performance?.score||0)*100),'',true],
 ['Erstes Bild',r=>r.audits['first-contentful-paint'].numericValue/1000,' s'],
 ['Größtes Bild fertig',r=>r.audits['largest-contentful-paint'].numericValue/1000,' s'],
 ['Blockierte Zeit',r=>r.audits['total-blocking-time'].numericValue/1000,' s'],
 ['Layout-Springen',r=>r.audits['cumulative-layout-shift'].numericValue,''],
 ['Geladene Daten',r=>r.audits['total-byte-weight'].numericValue/1e6,' MB'],
 ['Barrierefreiheit (0-100)',r=>Math.round((r.categories.accessibility?.score||0)*100),'',true],
];
const main=median(mainDir),pr=median(prDir);
const fmt=(v,u)=>v==null?'–':(Number.isInteger(v)?v:v.toFixed(2))+u;
const out=['## Ladezeit auf einem simulierten Handy (Lighthouse)','','| Wert | main | dieser PR |','|---|---|---|'];
const warn=[];
for(const [label,get,unit,higherBetter] of rows){
 const a=main?get(main):null,b=pr?get(pr):null;
 out.push(`| ${label} | ${fmt(a,unit)} | ${fmt(b,unit)} |`);
 if(a!=null&&b!=null){
  if(higherBetter&&b<a-10)warn.push(`${label}: ${a} -> ${b}`);
  if(!higherBetter&&label!=='Layout-Springen'&&b>a*1.3&&b-a>0.3)warn.push(`${label}: ${fmt(a,unit)} -> ${fmt(b,unit)}`);
 }
}
out.push('','Median aus 3 Läufen, mobiles Profil mit gedrosselter CPU und Netz. Die Berichte liegen im Artefakt „lighthouse-reports“.');
if(!pr)out.push('','Der PR konnte nicht gemessen werden.');
console.log(out.join('\n'));
for(const w of warn)console.error(`::warning title=Footera startet langsamer::${w}`);
