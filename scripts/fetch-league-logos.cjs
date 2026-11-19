/* Download league logos (women's leagues in EA's rating database, plus men's leagues whose logo the
   API-Sports CDN does not show reliably) into assets/leagues/, and a few club crests that are missing
   from assets/badge-manifest.json into assets/badges/.
   Runs in GitHub Actions (the logo hosts are not reachable from every network): node scripts/fetch-league-logos.cjs
   Each league names its Wikipedia article; the article's lead image is the league logo. A logo that
   cannot be downloaded keeps the checked-in file. */
'use strict';
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','assets','leagues');
// EA league name -> English Wikipedia article (or several titles to try in order).
const LEAGUES={
 'GPFBL':'Frauen-Bundesliga',
 'Barclays WSL':"Women's Super League",
 'Liga F Moeve':'Liga F',
 'NWSL':"National Women's Soccer League",
 'Arkema PL':['Première Ligue (football)','Division 1 Féminine','Première Ligue'],
 'Calcio A Femminile':"Serie A (women's football)",
 'Liga Portugal Feminino':'Campeonato Nacional Feminino',
 'Ceska Liga Žen':"Czech Women's First League",
 'Nederland Vrouwen Liga':'Eredivisie (women)',
 'Schweizer Damen Liga':["Swiss Women's Super League","Women's Super League (Switzerland)",'AXA Women\'s Super League','Swiss Women\'s Football League'],
 'Sverige Liga':'Damallsvenskan',
 "Scottish Women's League":"Scottish Women's Premier League",
 'Norge Kvinner Liga':['Toppserien','Norwegian Women\'s Premier League'],
 'Iceland League':['Besta deild kvenna','Úrvalsdeild kvenna (football)'],
 // Men's leagues (Black Friday 2026 cards): the API-Sports logos stay blank or tiny on the cards.
 'Ligue 1':'Ligue 1',
 'Trendyol Süper Lig':'Süper Lig',
 'ROSHN Saudi League':'Saudi Pro League',
 'EFL Championship':'EFL Championship',
 'LPF':['Argentine Primera División','Liga Profesional de Fútbol']
};
// Club name as the game shows it -> English Wikipedia article. Saved as assets/badges/club-<slug>.png.
const CLUBS={
 'Al Hilal':'Al Hilal SFC',
 'Al Qadsiah':['Al-Qadsiah FC','Al-Qadsiah F.C.'],
 'Estudiantes':'Estudiantes de La Plata',
 'West Ham':'West Ham United F.C.'
};
const BADGES=path.join(__dirname,'..','assets','badges');
const slug=name=>name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const UA={'User-Agent':'FooteraLeagueLogos/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)'};
const api=async params=>{
 const res=await fetch('https://en.wikipedia.org/w/api.php?format=json&redirects=1&'+new URLSearchParams(params),{headers:UA});
 if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();
};
// Logos are mostly non-free files, which the lead-image API leaves out, so read the infobox first.
async function leadImage(title){
 const wikitext=(await api({action:'parse',page:title,prop:'wikitext',section:0})).parse?.wikitext?.['*']||'';
 const file=(wikitext.match(/\|\s*(?:logo|image|crest)\s*=\s*(?:\[\[)?(?:File:|Image:)?([^|\]\n<{}]+\.(?:png|svg|jpe?g|webp))/i)||[])[1];
 if(file){
  const pages=Object.values((await api({action:'query',prop:'imageinfo',iiprop:'url',iiurlwidth:256,titles:'File:'+file.trim()})).query?.pages||{});
  const src=pages[0]?.imageinfo?.[0]?.thumburl||pages[0]?.imageinfo?.[0]?.url;if(src)return src;
 }
 const pages=Object.values((await api({action:'query',prop:'pageimages',piprop:'thumbnail',pithumbsize:256,titles:title})).query?.pages||{});
 const src=pages[0]?.thumbnail?.source;if(!src)throw new Error('no logo in infobox or lead image');
 return src;
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const manifestPath=path.join(OUT,'manifest.json');
 const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
 for(const[league,title]of Object.entries(LEAGUES)){
  try{
   let src='';
   for(const t of[].concat(title)){try{src=await leadImage(t);break}catch(e){console.warn(league,t,e.message)}}
   if(!src)throw new Error('no article with a logo');
   const res=await fetch(src,{headers:UA});if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const type=res.headers.get('content-type')||'';if(!/^image\/(png|jpeg|webp)/.test(type))throw new Error(`type ${type}`);
   const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg',file=`${slug(league)}.${ext}`;
   fs.writeFileSync(path.join(OUT,file),Buffer.from(await res.arrayBuffer()));
   manifest[league]={url:`./assets/leagues/${file}`,source:src};
   console.log(league,'->',file,src);
  }catch(e){console.warn(league,'kept as is:',e.message)}
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,1)+'\n');
 const clubManifestPath=path.join(BADGES,'local-clubs.json');
 const clubs=fs.existsSync(clubManifestPath)?JSON.parse(fs.readFileSync(clubManifestPath,'utf8')):{};
 for(const[club,title]of Object.entries(CLUBS)){
  try{
   let src='';
   for(const t of[].concat(title)){try{src=await leadImage(t);break}catch(e){console.warn(club,t,e.message)}}
   if(!src)throw new Error('no article with a crest');
   const res=await fetch(src,{headers:UA});if(!res.ok)throw new Error(`HTTP ${res.status}`);
   const type=res.headers.get('content-type')||'';if(!/^image\/png/.test(type))throw new Error(`type ${type}`);
   const file=`club-${slug(club)}.png`;
   fs.writeFileSync(path.join(BADGES,file),Buffer.from(await res.arrayBuffer()));
   clubs[club]={url:`./assets/badges/${file}`,source:src};
   console.log(club,'->',file,src);
  }catch(e){console.warn(club,'kept as is:',e.message)}
 }
 fs.writeFileSync(clubManifestPath,JSON.stringify(clubs,null,1)+'\n');
})().catch(e=>{console.error(e);process.exit(1)});
