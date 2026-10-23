/* Handy-Zurück aus der Evolutions-Vorschau führt zurück zur Spielerauswahl (V21.225). Run with NODE_PATH pointing to Playwright. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..");
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
const check=(label,value)=>{assert.ok(value,label);console.log("PASS",label)};
const back=async page=>{await page.goBack({waitUntil:'commit'}).catch(()=>{});await page.waitForTimeout(150)};
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url,{waitUntil:'load'});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important;pointer-events:none!important}'});
  const evoId=await page.evaluate(()=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   PLAYERS=Array.from({length:40},(_,i)=>({id:'evo-back-'+i,name:'Spieler '+i,fullName:'Spieler '+i,position:['ST','CM','CB','LW'][i%4],alt:'',ovr:60+i%25,pac:70,sho:70,pas:70,dri:70,def:60,phy:70,nation:'Germany',team:'FC Bayern München',league:'Bundesliga'}));P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.club=PLAYERS.map(p=>makeItem(p,true));state.squad=state.club.slice(0,18).map(i=>i.uid);state.coins=500000;state.points=5000;
   activeEvoTab='available';renderAll();switchView('evolutionView');
   const evo=EVOLUTION_POOL.find(e=>eligibleEvoPlayers(e).length>=4);openEvoPicker(evo.id);return evo.id;
  });
  check('evolution with several candidates',!!evoId);
  const modalOpen=()=>page.evaluate(()=>document.getElementById('evoPickerModal').classList.contains('active'));
  const listShown=()=>page.locator('#evoPickerBody .evo-candidate-grid').count().then(n=>n===1);
  check('picker list open',await modalOpen()&&await listShown());
  await page.locator('#evoPickerSearch').fill('Spieler 1');
  const visible=await page.locator('.evo-candidate:not([hidden])').count();
  await page.locator('.evo-candidate:not([hidden])').nth(1).click();
  check('preview shown',await page.locator('.evo-selected').count()===1);
  await back(page);
  check('back returns to the player list',await modalOpen()&&await listShown());
  check('search kept',await page.locator('#evoPickerSearch').inputValue()==='Spieler 1'&&await page.locator('.evo-candidate:not([hidden])').count()===visible);
  await back(page);
  check('second back closes picker on evolution list',!await modalOpen()&&await page.evaluate(()=>currentViewId()==='evolutionView'));
  // In-app "← Andere Spieler" button behaves the same and leaves no extra history entry.
  await page.evaluate(id=>openEvoPicker(id),evoId);
  await page.locator('.evo-candidate').first().click();
  await page.locator('[data-evo-picker-back]').click();await page.waitForTimeout(150);
  check('button returns to list',await listShown());
  await back(page);
  check('then back closes picker',!await modalOpen());
  // Schließen from the preview drops both history entries.
  await page.evaluate(id=>openEvoPicker(id),evoId);
  await page.locator('.evo-candidate').first().click();
  await page.locator('#evoPickerClose').click();await page.waitForTimeout(150);
  check('close from preview closes picker',!await modalOpen());
  await page.evaluate(id=>openEvoPicker(id),evoId);
  check('reopened picker shows list',await listShown());
  await back(page);
  check('back after reopen closes picker',!await modalOpen());
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
