'use strict';
// Temporary: find how EA's FC 27 ratings page loads its players.
const H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept':'text/html,application/json'};
const get=async u=>{const r=await fetch(u,{headers:H});return {status:r.status,text:await r.text()}};
function walk(o,path,out,depth=0){
 if(depth>9||!o||typeof o!=='object')return;
 if(Array.isArray(o)){if(o.length&&o[0]&&typeof o[0]==='object'&&'overallRating'in o[0])out.push(`${path} [${o.length}]`);o.slice(0,3).forEach((x,i)=>walk(x,`${path}[${i}]`,out,depth+1));return}
 for(const[k,v]of Object.entries(o)){if(/total|api|endpoint|url|slug|version|game/i.test(k)&&(typeof v!=='object'))out.push(`${path}.${k}=${String(v).slice(0,150)}`);walk(v,`${path}.${k}`,out,depth+1)}
}
(async()=>{
 const base='https://www.ea.com/games/ea-sports-fc/ratings';
 const {text}=await get(base);
 const m=text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(m){const nd=JSON.parse(m[1]);console.log('buildId',nd.buildId,'page',nd.page,'query',JSON.stringify(nd.query));const out=[];walk(nd,'nd',out);console.log(out.slice(0,120).join('\n'));}
 else console.log('no __NEXT_DATA__');
 const strs=[...new Set(text.match(/https?:\/\/[^"'\s<>\\]*(?:drop-api|api)[^"'\s<>\\]*/gi)||[])];console.log('api strings',strs.slice(0,30).join('\n '));
 const scripts=[...new Set(text.match(/\/_next\/static\/chunks\/[^"']+\.js/g)||[])];console.log('chunks',scripts.length);
 for(const s of scripts){const {text:js}=await get('https://www.ea.com'+s);const hits=js.match(/.{0,120}(?:drop-api|rating\/ea-sports|\/rating\/).{0,160}/g);if(hits)console.log('CHUNK',s,'\n  '+hits.slice(0,6).join('\n  '))}
 for(const u of[base+'?page=2',base+'?search=lewandowski','https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=1&offset=0&season=27','https://drop-api.ea.com/rating/ea-sports-fc-27-ratings?locale=en&limit=1','https://drop-api.ea.com/rating/fc27?locale=en&limit=1','https://drop-api.ea.com/rating/ea-sports-fc?locale=en-us&limit=1&title=fc-27']){
  const r=await get(u);const ts=r.text.match(/"totalItems"\s*:\s*\d+/);const lw=r.text.indexOf('Lewandowski');
  console.log('\n==',u,r.status,r.text.length,ts&&ts[0],lw>=0?r.text.slice(lw-200,lw+400).replace(/\s+/g,' '):'');
 }
})().catch(e=>{console.error(e);process.exit(1)});
