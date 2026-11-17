'use strict';
// Read-only: lists footballers whose current club on Wikidata (open data) started on/after SINCE.
// Prints one WD| JSON line per player to the job log; nothing is written back.
const SINCE=process.env.SINCE||'2026-06-01';
const UA={'User-Agent':'FooteraClubCheck/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)','Accept':'application/sparql-results+json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sparql(q){
 for(let a=0;;a++){
  try{const r=await fetch('https://query.wikidata.org/sparql',{method:'POST',headers:{...UA,'Content-Type':'application/x-www-form-urlencoded'},body:'query='+encodeURIComponent(q)});
   if(!r.ok)throw new Error('HTTP '+r.status);return (await r.json()).results.bindings}
  catch(e){if(a>=4)throw e;console.error('retry',e.message);await sleep(5000*(a+1))}
 }
}
const id=u=>u&&u.value.replace(/^.*\//,'');
(async()=>{
 const moves=await sparql(`SELECT DISTINCT ?p ?club ?start WHERE {
  ?p p:P54 ?st. ?st ps:P54 ?club; pq:P580 ?start. FILTER(?start >= "${SINCE}T00:00:00Z"^^xsd:dateTime)
  FILTER NOT EXISTS{?st pq:P582 ?end} ?p wdt:P106 wd:Q937857. }`);
 const players=[...new Set(moves.map(m=>id(m.p)))];
 console.log('MOVES',moves.length,'PLAYERS',players.length);
 for(let i=0;i<players.length;i+=150){
  const vals=players.slice(i,i+150).map(x=>'wd:'+x).join(' ');
  const rows=await sparql(`SELECT ?p ?name ?alt ?birth ?club ?clubName ?start ?end ?how WHERE {
   VALUES ?p {${vals}}
   OPTIONAL{?p rdfs:label ?name FILTER(LANG(?name)="en")}
   OPTIONAL{?p skos:altLabel ?alt FILTER(LANG(?alt)="en")}
   OPTIONAL{?p wdt:P569 ?birth}
   ?p p:P54 ?st. ?st ps:P54 ?club. OPTIONAL{?club rdfs:label ?clubName FILTER(LANG(?clubName)="en")}
   OPTIONAL{?st pq:P580 ?start} OPTIONAL{?st pq:P582 ?end} OPTIONAL{?st pq:P1642 ?how}
   FILTER(!BOUND(?end) || ?end >= "2025-01-01T00:00:00Z"^^xsd:dateTime) }`);
  const by=new Map();
  for(const r of rows){
   const k=id(r.p);let o=by.get(k);if(!o)by.set(k,o={q:k,n:r.name?.value||'',a:new Set(),b:(r.birth?.value||'').slice(0,10),c:new Map()});
   if(r.alt)o.a.add(r.alt.value);
   const ck=id(r.club)+'|'+(r.start?.value||'').slice(0,10);
   if(!o.c.has(ck))o.c.set(ck,[id(r.club),r.clubName?.value||'',(r.start?.value||'').slice(0,10),(r.end?.value||'').slice(0,10),id(r.how)||'']);
  }
  for(const o of by.values())console.log('WD|'+JSON.stringify({q:o.q,n:o.n,a:[...o.a].slice(0,6),b:o.b,c:[...o.c.values()]}));
  await sleep(800);
 }
})().catch(e=>{console.error(e);process.exit(1)});
