/* Download the logos of the women's leagues in EA's rating database into assets/leagues/.
   Runs in GitHub Actions (the logo hosts are not reachable from every network): node scripts/fetch-league-logos.cjs
   Each league names its Wikipedia article; the article's lead image is the league logo. A logo that
   cannot be downloaded keeps the checked-in file. */
'use strict';
const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'..','assets','leagues');
// EA league name -> English Wikipedia article.
const LEAGUES={
 'GPFBL':'Frauen-Bundesliga',
 'Barclays WSL':"Women's Super League",
 'Liga F Moeve':'Liga F',
 'NWSL':"National Women's Soccer League",
 'Arkema PL':'Première Ligue (women)',
 'Calcio A Femminile':"Serie A (women's football)",
 'Liga Portugal Feminino':'Campeonato Nacional Feminino',
 'Ceska Liga Žen':"Czech Women's First League",
 'Nederland Vrouwen Liga':'Eredivisie (women)',
 'Schweizer Damen Liga':"Swiss Women's Super League",
 'Sverige Liga':'Damallsvenskan',
 "Scottish Women's League":"Scottish Women's Premier League"
};
const slug=name=>name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const UA={'User-Agent':'FooteraLeagueLogos/1.0 (https://github.com/basti17svh-cloud/gerlies-fut)'};
async function leadImage(title){
 const url='https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=256&titles='+encodeURIComponent(title);
 const res=await fetch(url,{headers:UA});if(!res.ok)throw new Error(`HTTP ${res.status}`);
 const pages=Object.values((await res.json()).query?.pages||{});
 const src=pages[0]?.thumbnail?.source;if(!src)throw new Error('no lead image');
 return src;
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const manifestPath=path.join(OUT,'manifest.json');
 const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
 for(const[league,title]of Object.entries(LEAGUES)){
  try{
   const src=await leadImage(title);
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
