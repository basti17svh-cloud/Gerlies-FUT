/* Print FC27 dataset rows for TOTW candidates (runs in CI, where the dataset host is reachable). */
const names=process.argv.slice(2).join(' ').split('|').map(s=>s.trim()).filter(Boolean);
const key=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function parse(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
(async()=>{
 const res=await fetch('https://raw.githubusercontent.com/mzafram2001/ea-fc/main/data/dataset_ea_fc_27.csv');if(!res.ok)throw new Error('dataset '+res.status);
 const [head,...rows]=parse(await res.text());console.log('COLUMNS',head.join(','));
 const col=(...n)=>n.map(x=>head.indexOf(x)).find(i=>i>=0);
 const c={id:col('sofifa_id','player_id','ea_id','id'),short:col('common_name','short_name','name'),long:col('long_name','full_name','name'),club:col('club_name','team_name','club','team'),league:col('league_name','league'),pos:col('player_positions','positions','position'),ovr:col('overall','ovr'),nat:col('nationality_name','nationality','nation'),gender:col('gender')};
 const stats=['pace','shooting','passing','dribbling','defending','physic','physical'].map(n=>head.indexOf(n)).filter(i=>i>=0);
 const gk=['goalkeeping_diving','goalkeeping_handling','goalkeeping_kicking','goalkeeping_reflexes','goalkeeping_speed','goalkeeping_positioning'].map(n=>head.indexOf(n));
 for(const name of names){const k=key(name);const hits=rows.filter(r=>[r[c.short],r[c.long]].some(v=>{const kv=key(v);return kv===k||kv.includes(k)}));
  console.log('\n## '+name+' ('+hits.length+')');
  for(const r of hits.slice(0,6))console.log(JSON.stringify({id:r[c.id],short:r[c.short],long:r[c.long],club:r[c.club],league:r[c.league],pos:r[c.pos],ovr:r[c.ovr],nat:r[c.nat],gender:c.gender>=0?r[c.gender]:'',stats:stats.map(i=>r[i]),gk:gk.map(i=>i>=0?r[i]:'')}))}
})().catch(e=>{console.error(e);process.exitCode=1});
