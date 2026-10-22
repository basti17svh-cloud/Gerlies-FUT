// Run on each approved TOTW/event release; publish the resulting SQL to Supabase.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
const ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('const TOTW_WEEK_1='),html.indexOf('function totwAddCalendarDays'))+';this.weeks=TOTW_WEEKS;',ctx);
const quote=v=>"'"+String(v).replace(/'/g,"''")+"'",rows=[];
for(const team of ctx.weeks){
 if(team.sourceStatus&&team.sourceStatus!=='admin-approved')continue;
 for(const [idx,p]of team.players.entries()){
  if(p.ovr<85||!Array.isArray(p.stats)||p.stats.length!==6)continue;
  const id=String(p.eaId||p.fallback?.id||'');if(!id)continue;
  const base={...p.fallback,id,name:p.fallback?.name||p.names[0],fullName:p.fallback?.fullName||p.names[0],position:p.position,ovr:p.ovr,gender:'male',source:'fc27-totw'};
  ['pac','sho','pas','dri','def','phy'].forEach((k,i)=>base[k]=p.stats[i]);
  const item={pid:id,variant:'special',eventType:'totw',eventName:team.name,eventReleaseId:'totw-'+team.id,displayRating:p.ovr,eventStats:p.stats,overridePosition:p.position,baseSnapshot:base,tradeable:false,rare:true,evo:0,evoStats:{}};
  rows.push('('+[quote('totw:'+team.id+':'+id),quote('special'),p.ovr,`(${quote(team.releaseDate+' 19:00')}::timestamp at time zone 'Europe/Berlin')`,`((${quote(team.releaseDate+' 19:00')}::timestamp+interval '7 days') at time zone 'Europe/Berlin')`,quote(JSON.stringify(item))+'::jsonb'].join(',')+')');
 }
}
const sql='-- Generated from approved index.html TOTW releases; server time enforces availability.\ninsert into public.footera_pick_catalog(id,kind,rating,starts_at,ends_at,item) values\n'+rows.join(',\n')+'\non conflict(id) do update set rating=excluded.rating,starts_at=excluded.starts_at,ends_at=excluded.ends_at,item=excluded.item;\n';
fs.writeFileSync(path.join(root,'online/footera-pick-catalog.sql'),sql);console.log(rows.length+' approved special cards');
