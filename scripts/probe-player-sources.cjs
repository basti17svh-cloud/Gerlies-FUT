'use strict';
// Temporary: find which public source serves current FC 27 clubs and ratings.
const H={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36','Accept':'application/json,text/html;q=0.9'};
const urls=[
 'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=3&offset=0',
 'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=3&offset=0&search=lewandowski',
 'https://drop-api.ea.com/rating/ea-sports-fc-27?locale=en&limit=3&offset=0',
 'https://drop-api.ea.com/rating/fc-27?locale=en&limit=3&offset=0',
 'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=3&offset=0&version=27',
 'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=3&offset=0&gameVersion=fc27',
 'https://drop-api.ea.com/rating/ea-sports-fc-26?locale=en&limit=3&offset=0',
 'https://www.ea.com/games/ea-sports-fc/ratings',
 'https://www.fut.gg/api/fut/players/v2/27/?page=1',
 'https://www.fut.gg/api/fut/players/v2/27/?page=1&search=lewandowski',
 'https://www.fut.gg/api/fut/players/v2/27/?rarity_id=1&page=1',
 'https://www.futwiz.com/en/fc27/players?page=0',
 'https://www.futbin.com/27/players',
 'https://sofifa.com/players',
];
(async()=>{
 for(const u of urls){
  try{const r=await fetch(u,{headers:H});const t=await r.text();
   console.log('\n=====',u,r.status,t.length);
   const m=t.match(/"next(?:Page)?"\s*:\s*[^,}]+|"totalItems"\s*:\s*\d+|"count"\s*:\s*\d+/g);if(m)console.log('meta',m.slice(0,4).join(' '));
   const urlsIn=[...new Set(t.match(/https?:\/\/[a-z0-9.-]*(?:drop-api|ratings|api)[a-z0-9.-]*\/[^"'\s<>]{0,80}/gi)||[])].slice(0,15);if(urlsIn.length)console.log('urls',urlsIn.join('\n  '));
   console.log(t.slice(0,1500).replace(/\s+/g,' '));
   for(const n of['Lewandowski','Kvaratskhelia','Pacho','Nkunku']){const i=t.indexOf(n);if(i>=0)console.log('--',n,t.slice(Math.max(0,i-300),i+600).replace(/\s+/g,' '))}
  }catch(e){console.log('\n=====',u,'ERR',e.message)}
 }
})();
