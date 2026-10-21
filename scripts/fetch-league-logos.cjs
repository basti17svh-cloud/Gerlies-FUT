/* Download the logos of the women's leagues in EA's rating database into assets/leagues/.
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
 'Schweizer Damen Liga':["Swiss Women's Super League","Women's Super League (Switzerland)",'AXA Women\'s Super League'],
 'Sverige Liga':'Damallsvenskan',
 "Scottish Women's League":"Scottish Women's Premier League"
};
const slug=name=>name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const UA={'User-Agent':'FooteraLeagueLogos/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)'};
const api=async params=>{
 const res=await fetch('https://en.wikipedia.org/w/api.php?format=json&redirects=1&'+new URLSearchParams(params),{headers:UA});
 if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();
};
// Logos are mostly non-free files, which the lead-image API leaves out, so read the infobox first.
async function leadImage(title){
 const wikitext=(await api({action:'parse',page:title,prop:'wikitext',section:0})).parse?.wikitext?.['*']||'';
 const file=(wikitext.match(/\|\s*(?:logo|image)\s*=\s*(?:\[\[)?(?:File:|Image:)?([^|\]\n<{}]+\.(?:png|svg|jpe?g|webp))/i)||[])[1];
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
})().catch(e=>{console.error(e);process.exit(1)});
