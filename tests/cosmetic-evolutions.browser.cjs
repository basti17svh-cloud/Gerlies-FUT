/* Champions + Rivals qualification mobile integration smoke test. Run with NODE_PATH pointing to Playwright. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts","cosmetics-v21.156");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
const check=(label,value)=>{assert.ok(value,label);console.log("PASS",label)};
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url,{waitUntil:'load'});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}'});
  await page.evaluate(()=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   PLAYERS=Array.from({length:26},(_,i)=>({id:'cosmetic-test-'+i,name:i?'Spieler '+i:'J. Musiala',fullName:i?'Spieler '+i:'Jamal Musiala',position:'CAM',alt:'CM,LM',ovr:90-i%12,pac:85,sho:88,pas:90,dri:94,def:58,phy:76,nation:'Germany',team:'FC Bayern München',league:'Bundesliga',face:'./assets/footera/events/momentum/team2/musiala.webp'}));P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.club=PLAYERS.map(p=>makeItem(p,true));state.squad=state.club.slice(0,18).map(i=>i.uid);state.coins=50000;state.champions={...state.champions,totalWins:16};state.cosmeticClaims={};
   activeEvoTab='cosmetic';renderAll();switchView('evolutionView',{push:false});renderEvos();
  });
  check('four cosmetic offers',await page.locator('.cosmetic-offer').count()===4);
  check('unrelated upgrade summary hidden',await page.locator('#evoSummary').isHidden());
  for(const width of [360,390,412,1100]){
   await page.setViewportSize({width,height:844});
   check('no horizontal overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check('Champions stats clear of PlayStyles at '+width,await page.evaluate(()=>Array.from(document.querySelectorAll('.custom-card.champions-red,.custom-card.champions-pro')).every(card=>{
    const name=card.querySelector('.pname');if(name.clientHeight+1<parseFloat(getComputedStyle(name).lineHeight))return false;
    const stats=card.querySelector('.stats').getBoundingClientRect();const badges=Array.from(card.parentElement.querySelectorAll('.playstyle-card-icon'));
    return badges.every(icon=>icon.getBoundingClientRect().top>=stats.bottom-1);
   })));
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.cosmetic-studio').screenshot({path:path.join(output,'overview.png')});
  await page.locator('[data-cosmetic-open="red"]').click();
  check('player selection paginated',await page.locator('[data-cosmetic-player]').count()===12);
  await page.locator('[data-cosmetic-page="1"]').click();
  check('second page opens',await page.locator('.cosmetic-pagination span').innerText()==='2 / 3');
  await page.locator('[data-cosmetic-search]').fill('Musiala');
  check('search finds one player',await page.locator('[data-cosmetic-player]').count()===1);
  await page.locator('[data-cosmetic-player]').click();
  await page.locator('.cosmetic-studio').screenshot({path:path.join(output,'review.png')});
  check('permanent tradeability warning',await page.locator('.cosmetic-warning').isVisible());
  await page.locator('[data-cosmetic-apply]').click();
  check('one claim, unchanged rating, untradeable',await page.evaluate(()=>state.cosmeticClaims.red===1&&state.club[0].cosmeticDesign==='red'&&!state.club[0].tradeable&&itemRating(state.club[0])===90));
  check('cannot double apply',await page.locator('[data-cosmetic-apply]').isDisabled());
  await page.locator('[data-cosmetic-clear]').click();
  check('reset does not refund or restore tradeability',await page.evaluate(()=>!state.club[0].cosmeticDesign&&!state.club[0].tradeable&&state.cosmeticClaims.red===1));
  await page.locator('[data-cosmetic-players]').click();await page.locator('[data-cosmetic-back]').click();
  await page.locator('[data-cosmetic-open="red-pro"]').click();await page.locator('[data-cosmetic-player]').first().click();
  check('prestige locked below 25 wins',await page.locator('[data-cosmetic-apply]').isDisabled());
  await page.locator('.cosmetic-studio').screenshot({path:path.join(output,'prestige.png')});
  await page.evaluate(()=>{activeEvoTab='available';renderEvos()});
  check('normal evolution summary restored',await page.locator('#evoSummary').isVisible());
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
