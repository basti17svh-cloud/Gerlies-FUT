/* Print EA FC rating rows for TOTW candidates (runs in CI, where EA's rating API is reachable). */
const names=process.argv.slice(2).join(' ').split('|').map(s=>s.trim()).filter(Boolean);
const API='https://drop-api.ea.com/rating/ea-sports-fc';
const pick=(o,...k)=>k.map(x=>x.split('.').reduce((v,p)=>v?.[p],o)).find(v=>v!==undefined&&v!==null&&v!=='');
(async()=>{
 let shown=false;
 for(const name of names){
  const res=await fetch(`${API}?locale=en&gender=0&limit=5&offset=0&search=${encodeURIComponent(name)}`,{headers:{'User-Agent':'Mozilla/5.0'}});
  const data=await res.json().catch(()=>({}));const items=data.items||data.players||data.ratings||[];
  if(!shown&&items[0]){console.log('SAMPLE',JSON.stringify(items[0]).slice(0,2500));shown=true}
  console.log('\n## '+name+' ('+res.status+', '+items.length+')');
  for(const p of items)console.log(JSON.stringify({id:pick(p,'id'),name:pick(p,'commonName','firstName')+' '+(p.commonName?'':pick(p,'lastName')||''),full:[p.firstName,p.lastName].join(' '),club:pick(p,'team.label','team.name'),league:pick(p,'leagueName','league.label'),pos:pick(p,'position.shortLabel','position.id'),alt:(p.alternatePositions||[]).map(x=>x.shortLabel||x.id).join(','),ovr:pick(p,'overallRating'),nat:pick(p,'nationality.label'),gender:pick(p,'gender.label'),stats:p.stats?Object.fromEntries(Object.entries(p.stats).map(([k,v])=>[k,v?.value??v])):null,img:pick(p,'avatarUrl','shieldUrl')}));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
