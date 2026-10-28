/* Isolated profile UI with the real account module and a mock backend. No live writes. */
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(root,'test-artifacts');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://test').pathname);try{res.setHeader('Content-Type',file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');
  await page.setContent('<html><head></head><body><div class="topbar"><div class="toprow"></div></div><section id="clubView"><div class="headline"></div></section></body></html>');
  for(const file of ['footera-app.css','footera-theme.css','footera-backup.css','footera-account.css'])await page.addStyleTag({url:base+'/'+file});
  await page.evaluate(()=>{
   window.qaUser={id:'qa-user',email:'qa@example.invalid',is_anonymous:false,email_confirmed_at:'2026-10-24',created_at:'2026-10-12',identities:[{provider:'email'}]};
   window.qaSave={version:128,onboarded:true,profile:{username:'Trainer',clubName:'Test FC',saveId:'qa-save'},club:Array.from({length:23},(_,i)=>({uid:'c'+i,pid:'p'+i})),squad:[],coins:3736540,points:294400,champions:{wins:4,losses:0,games:4}};
   window.qaCloud={save_data:structuredClone(qaSave),revision:101,saved_at:'2026-10-24T20:56:50Z'};window.qaWrites=[];window.qaOffline=false;
   localStorage.setItem('gerliesFutV9',JSON.stringify(qaSave));localStorage.setItem('footera-cloud-owner','qa-user');localStorage.setItem('footera-account-welcome-v1','1');
   window.FOOTERA_ONLINE_CONFIG={url:'https://test.supabase.co'};
   window.FooteraPlayerPicks={isActive:()=>true}; // Pause background automation; test manual UI explicitly.
   window.FooteraOnline={available:true,ready:true,friendCode:'QA12345',authClient:async()=>({
    auth:{getUser:async()=>({data:{user:qaUser}}),onAuthStateChange:()=>({}),updateUser:async()=>({error:null})},
    from:()=>({select:()=>({maybeSingle:async()=>{if(qaOffline)throw Error('offline');return{data:qaCloud,error:null}}})}),
    rpc:async(name,args)=>{qaWrites.push({name,args});if(args.p_base_revision!==(qaCloud?.revision||0))return{error:Error('conflict')};qaCloud={save_data:args.p_save,revision:(qaCloud?.revision||0)+1,saved_at:new Date().toISOString()};return{data:qaCloud.revision,error:null}}
   })};
  });
  await page.addScriptTag({url:base+'/footera-backup.js'});await page.addScriptTag({url:base+'/footera-account.js'});
  await page.evaluate(()=>FooteraAccount.showProfile());
  await page.waitForFunction(()=>document.querySelector('#footeraSaveOverview').dataset.state==='saved');
  // The club view no longer carries profile or save panels; the header button is the only entry.
  assert.equal(await page.locator('#clubView .footera-account-panel, #clubView #footeraBackupPanel').count(),0);
  assert.equal(await page.locator('#footeraSaveTitle').textContent(),'✓ Gesichert');
  assert.equal(await page.locator('#footeraSaveCompare').isVisible(),false,'no comparison while both saves agree');
  for(const width of [360,390,412,768,1366]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('#footeraProfileSettings').getAttribute('open'),null);
   assert.equal(await page.locator('#footeraProfileDelete').isVisible(),false);
   assert.equal(await page.locator('#footeraProfileBackup').isVisible(),false,'saving is automatic, no sync button');
   await page.screenshot({path:path.join(out,'profile-overview-'+width+'.png')});
  }
  await page.setViewportSize({width:390,height:844});
  // Equal timestamps do not imply equal content. The overview detects wallet and Champions differences.
  await page.evaluate(()=>{qaCloud.save_data.coins=3479390;qaCloud.save_data.champions={wins:1,losses:0,games:1};return FooteraAccount.showProfile()});
  assert.equal(await page.locator('#footeraSaveOverview').getAttribute('data-state'),'different');
  assert.equal(await page.locator('#footeraSaveTitle').textContent(),'Mit welchem Stand weiterspielen?');
  assert.equal(await page.locator('#footeraSaveCompare').isVisible(),true,'the choice is shown directly');
  const comparison=await page.locator('#footeraSaveComparisonRows').textContent();
  assert.match(comparison,/3.736.540/);assert.match(comparison,/3.479.390/);assert.match(comparison,/4 S/);assert.match(comparison,/1 S/);
  assert.equal(await page.evaluate(()=>qaWrites.length),0,'viewing comparison does not write');
  for(const width of [360,412,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'profile-comparison-'+width+'.png'),fullPage:true})}
  // Cancel on both replacement paths: no cloud write, no local replacement.
  let acceptDialogs=false;page.on('dialog',d=>acceptDialogs?d.accept():d.dismiss());
  const before=await page.evaluate(()=>localStorage.getItem('gerliesFutV9'));
  await page.locator('#footeraSaveUseDevice').click();
  await page.waitForFunction(()=>document.querySelector('#footeraProfileBackupFeedback').textContent.includes('Abgebrochen'));
  assert.equal(await page.evaluate(()=>qaWrites.length),0);
  await page.locator('#footeraSaveUseCloud').click();
  await page.waitForFunction(()=>!document.querySelector('#footeraProfileBackup').disabled);
  assert.equal(await page.evaluate(()=>localStorage.getItem('gerliesFutV9')),before);
  // Owner mismatch can be inspected but can never upload the unrelated local club.
  await page.evaluate(()=>{localStorage.setItem('footera-cloud-owner','someone-else');return FooteraAccount.showProfile()});
  assert.equal(await page.locator('#footeraSaveOverview').getAttribute('data-state'),'unlinked');
  assert.equal(await page.locator('#footeraSaveUseDevice').isDisabled(),true);
  // Offline uses a retry state, never a green 'saved' claim or a stale load action.
  await page.evaluate(()=>{qaOffline=true;return FooteraAccount.showProfile()});
  assert.equal(await page.locator('#footeraSaveOverview').getAttribute('data-state'),'offline');
  assert.equal(await page.locator('#footeraProfileLoad').isDisabled(),true);
  assert.equal(await page.locator('#footeraProfileBackup').textContent(),'Erneut prüfen');
  assert.equal(await page.locator('#footeraProfileBackup').isVisible(),true);
  assert.equal(await page.locator('#footeraSaveTitle').textContent(),'Offline · wird nachgeholt');
  await page.evaluate(async()=>{
   qaOffline=false;localStorage.setItem('footera-cloud-owner','qa-user');qaCloud.save_data=structuredClone(qaSave);
   await FooteraAccount.saveCloud(); // Establish the real production sync point.
   const local=JSON.parse(localStorage.getItem('gerliesFutV9'));local.coins+=100;localStorage.setItem('gerliesFutV9',JSON.stringify(local));
   qaWrites.length=0;
   return FooteraAccount.showProfile();
  });
  // Opening the profile with unsaved local progress finishes the upload by itself.
  await page.waitForFunction(()=>document.querySelector('#footeraSaveOverview').dataset.state==='saved');
  assert.equal(await page.evaluate(()=>qaWrites.length),1,'exactly one automatic upload');
  assert.equal(await page.locator('#footeraProfileBackup').isVisible(),false);
  assert.equal(await page.evaluate(()=>qaCloud.save_data.coins),3736640);
  await page.locator('#footeraProfileSettings summary').click();
  assert.equal(await page.locator('#footeraProfileUsernameValue').textContent(),'Trainer');
  assert.equal(await page.locator('#footeraProfileSaveId').textContent(),'qa-save');
  await page.locator('#footeraProfileChangeEmail').click();
  assert.equal(await page.locator('#footeraNewEmail').isVisible(),true,'email form opens inside settings');
  assert.equal(await page.locator('#footeraAccountDialog').isVisible(),false,'no second settings dialog');
  // No online snapshot yet: the first upload happens automatically, once.
  await page.evaluate(()=>{qaCloud=null;qaWrites.length=0;return FooteraAccount.showProfile()});
  await page.waitForFunction(()=>document.querySelector('#footeraSaveOverview').dataset.state==='saved');
  assert.equal(await page.evaluate(()=>qaWrites.length),1);
  assert.equal(await page.evaluate(()=>qaWrites[0].args.p_base_revision),0);
  assert.deepEqual(errors,[]);
  console.log('PASS profile overview, responsive layouts, content comparison, cancelled replacements, ownership and offline states');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
