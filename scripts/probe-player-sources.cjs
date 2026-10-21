'use strict';
const H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept':'text/html,application/json'};
const get=async(u,h={})=>{const r=await fetch(u,{headers:{...H,...h}});return {status:r.status,text:await r.text()}};
const nd=t=>{const m=t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);return m?JSON.parse(m[1]):null};
(async()=>{
 const base='https://www.ea.com/games/ea-sports-fc/ratings';
 const d=nd((await get(base)).text),pp=d.props.pageProps;
 console.log('buildId',d.buildId,'page',d.page,'pageProps keys',Object.keys(pp).join(','));
 for(const[k,v]of Object.entries(pp))if(v&&typeof v!=='object')console.log(' ',k,'=',String(v).slice(0,200));
 for(const[k,v]of Object.entries(pp.ratingDetails||{}))if(k!=='items')console.log(' ratingDetails.',k,'=',JSON.stringify(v).slice(0,200));
 for(const k of['gameDetails','auxData'])if(pp[k])console.log(k,'scalar',JSON.stringify(Object.fromEntries(Object.entries(pp[k]).filter(([,v])=>typeof v!=='object'))).slice(0,600));
 const it=pp.ratingDetails.items[0];console.log('item keys',Object.keys(it).join(','));console.log('item',JSON.stringify({...it,playerAbilities:it.playerAbilities?.slice(0,2),stats:Object.keys(it.stats||{})}).slice(0,2500));
 const genders=pp.ratingDetails.items.reduce((a,x)=>(a[JSON.stringify(x.gender)]=(a[JSON.stringify(x.gender)]||0)+1,a),{});console.log('genders p1',JSON.stringify(genders));
 const dataUrl=`https://www.ea.com/_next/data/${d.buildId}${d.page.replace(/\[.*?\]/g,'')}.json?page=150`;
 for(const u of[dataUrl,`https://www.ea.com/_next/data/${d.buildId}/en/games/ea-sports-fc/ratings.json?page=150`,base+'?page=150',base+'?page=199',base+'?gender=1',base+'?page=2&limit=500']){
  const r=await get(u);let j=null;try{j=u.includes('_next/data')?JSON.parse(r.text).pageProps:nd(r.text)?.props?.pageProps}catch{}
  const items=j?.ratingDetails?.items||[];console.log('\n==',u,r.status,r.text.length,'items',items.length,'total',j?.ratingDetails?.totalItems,'first',items[0]&&`${items[0].firstName} ${items[0].lastName} ${items[0].overallRating} ${items[0].team?.label} g=${JSON.stringify(items[0].gender)}`);
 }
 for(const slug of['fc-27','ea-sports-fc-27','ea-sports-fc','fc27']){for(const h of[{},{Origin:'https://www.ea.com',Referer:base}]){const r=await get(`https://drop-api.ea.com/rating/${slug}?locale=en&limit=2&offset=0`,h);const m=r.text.match(/"totalItems"\s*:\s*\d+/);console.log('drop',slug,JSON.stringify(h).length>2?'w/ origin':'',r.status,m&&m[0])}}
})().catch(e=>{console.error(e);process.exit(1)});
