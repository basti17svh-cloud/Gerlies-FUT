'use strict';
// Read-only check: does Wikidata (open data) know the current clubs of EA players? Prints to the job log only.
const UA={'User-Agent':'FooteraClubCheck/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)','Accept':'application/sparql-results+json'};
async function sparql(q){const r=await fetch('https://query.wikidata.org/sparql?query='+encodeURIComponent(q),{headers:UA});return r.ok?(await r.json()).results.bindings:`HTTP ${r.status}`}
(async()=>{
 console.log('PROPS',JSON.stringify(await sparql(`SELECT ?p ?l WHERE { ?p a wikibase:Property; rdfs:label ?l. FILTER(LANG(?l)="en" && (CONTAINS(LCASE(?l),"sofifa")||CONTAINS(LCASE(?l),"ea sports")||CONTAINS(LCASE(?l),"fifa player"))) }`)));
})();
