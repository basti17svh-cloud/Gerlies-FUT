/* Champions + Rivals qualification mobile integration smoke test. Run with NODE_PATH pointing to Playwright. */
const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),output=path.join(root,"test-artifacts");fs.mkdirSync(output,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(file===root)file=path.join(root,"index.html");if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)}catch(_){res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const url=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",timezoneId:"Europe/Berlin"});
  await context.addInitScript(()=>{const Real=Date,fixed=Real.parse('2026-10-30T10:00:00+01:00');window.Date=class extends Real{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}}});
  await context.route("**/*",r=>r.request().url().startsWith(url)?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'load'});
  const hide=()=>page.addStyleTag({content:'#bootIntro,#dbGate,#onboard,#onboarding,#usernameRequiredModal,#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}'});await hide();
  const week=await page.evaluate(()=>{state.onboarded=true;state.profile.username='WL QA';state.profile.clubName='QA FC';state.points=500;state.coins=100;state.weeklyRewards=[];state.champions={week:String(Date.parse('2026-10-30T19:00:00+01:00')),games:15,wins:15,losses:0,active:true,qualPoints:0};settleChampionsRun();renderAll();switchView('playView',{push:false});FooteraPlayHub.open('champions');return state.champions.week});
  assert.match(await page.locator('#championsWindowSchedule').textContent(),/Freitag 09:00 – Mo.*09:00/);
  assert.match(await page.locator('#championsRanks').textContent(),/12\.000 Footera Points/);assert.match(await page.locator('#championsRanks').textContent(),/1\.000 Footera Points/);
  await page.evaluate(week=>FooteraWeeklyRewards.open('champions',week),week);
  assert.match(await page.locator('.weekly-reward-points').innerText(),/12\.000[\s\S]*Footera Points/);
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow '+width);await page.locator('#weeklyRewardModalBody').screenshot({path:path.join(output,'champions-points-'+width+'.png')})}
  await page.locator('[data-weekly-reward-claim="champions"]').click();
  assert.equal(await page.evaluate(()=>state.points),12500);assert.equal(await page.evaluate(week=>claimCompetitionReward('champions',week),week),false);assert.equal(await page.evaluate(()=>state.points),12500);
  await page.evaluate(()=>flushSave());await page.reload({waitUntil:'load'});await hide();assert.equal(await page.evaluate(()=>state.points),12500);assert.equal(await page.evaluate(week=>claimCompetitionReward('champions',week),week),false);assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: all rank labels, 360/390/412 reward previews, real claim handler, wallet credit once, reload keeps Points');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
