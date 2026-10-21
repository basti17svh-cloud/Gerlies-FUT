// V21.209 (Basti): share a walkout as a picture, invite friends by link, suggest the home-screen app.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(root,'test-artifacts'),mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.csv':'text/csv'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403).end();return}try{let body=fs.readFileSync(file);if(file.endsWith('index.html')){let html=body.toString(),last=html.lastIndexOf('<script>');html=html.slice(0,last)+html.slice(html.indexOf('</script>',last)+9);body=Buffer.from(html)}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body)}catch(_){res.writeHead(404).end()}});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
  await page.goto(url+'/?invite=ab7k-3p9q&utm_source=share&utm_medium=invite',{waitUntil:'load'});
  await page.addStyleTag({content:'#footeraAccountDialog,#footeraAnalyticsConsent{display:none!important}'});

  // 1. The invite code is kept on the device and removed from the address bar; tracking stays.
  const captured=await page.evaluate(()=>({pending:FooteraShare.pendingInvite()?.code,search:location.search}));
  assert.equal(captured.pending,'AB7K3P9Q','invite code from the link is stored');
  assert.equal(captured.search,'?utm_source=share&utm_medium=invite','invite parameter is removed, UTM tracking stays');

  await page.evaluate(()=>{
   for(const id of ['bootIntro','dbGate','onboarding','usernameRequiredModal'])document.getElementById(id)?.remove();
   const ids=['197781','246420'],names=['Isco','Jérémy Doku'];
   PLAYERS=ids.map((id,i)=>({id,name:names[i],fullName:names[i],position:'CM',ovr:87,pac:84,sho:87,pas:89,dri:88,def:68,phy:76,nation:'Spain',league:'LALIGA EA SPORTS',team:'Real Betis',face:'./assets/footera/totw/5/'+id+'.png'}));
   P_BY_ID=new Map(PLAYERS.map(p=>[p.id,p]));
   state.onboarded=true;state.friends=[];state.stats.packs=0;
   const online=window.FooteraOnline;
   Object.assign(online,{available:true,ready:true,registered:true,userId:'me-uid',friendCode:'',init:async()=>{},getFriendCode:async()=>'XYZW2345',
    resolveFriendCode:async code=>code==='AB7K3P9Q'?{v:5,onlineUid:'friend-uid',clubName:'FC Einlader',squad:PLAYERS.map(p=>({pid:p.id})),rating:84}:null});
   // V21.211 invite reward: the server decides; the same reward id never grants twice.
   window.rpcCalls=[];
   const reward={id:'referral-invitee-11111111-2222-4333-8444-555555555555',role:'invitee'};
   online.authClient=async()=>({rpc:async(name,args)=>{window.rpcCalls.push([name,args]);
    if(name==='footera_register_referral')return{data:'registered',error:null};
    if(name==='footera_referral_progress')return{data:args.p_matches>=3?'qualified':'pending',error:null};
    if(name==='footera_claim_referral_rewards')return{data:{rewards:[reward],invited:0,qualified:0,invitedBy:true,ownQualified:true},error:null};
    return{data:null,error:{message:'unknown'}}}});
   window.shared=[];
   navigator.canShare=data=>!!data.files;
   navigator.share=async data=>{window.shared.push({...data,files:(data.files||[]).map(f=>({name:f.name,type:f.type,size:f.size}))})};
  });

  // 2. Once online, the inviter lands in the friends list.
  await page.evaluate(()=>FooteraShare.acceptInvite());
  const friends=await page.evaluate(()=>({names:state.friends.map(f=>f.clubName),pending:FooteraShare.pendingInvite()}));
  assert.deepEqual(friends,{names:['FC Einlader'],pending:null},'invite link adds the friend once');
  const referral=await page.evaluate(async()=>{
   const before=state.packs['82']||0,registered=window.rpcCalls.find(c=>c[0]==='footera_register_referral')?.[1]?.p_code,pending=state.referral?.pending;
   state.stats.matches=2;await FooteraShare.afterMatch();const early=state.packs['82']||0;
   state.stats.matches=3;await FooteraShare.afterMatch();const after=state.packs['82']||0;
   await FooteraShare.claimReferralRewards();
   return{registered,pending,early:early-before,granted:after-before,again:(state.packs['82']||0)-after,stillPending:state.referral.pending,info:document.getElementById('referralInfo').textContent}
  });
  assert.deepEqual({...referral,info:undefined},{registered:'AB7K3P9Q',pending:true,early:0,granted:1,again:0,stillPending:false,info:undefined},'invite reward: one 82+ pack after 3 matches, never twice');
  assert.match(referral.info,/3 Spiele gespielt hat, bekommt ihr beide ein 82\+ Players Pack/);

  // 3. A TOTW walkout shows the share bar and builds a story picture of the card.
  await page.evaluate(()=>{
   pendingPack=[{uid:'share-1',pid:'197781',variant:'special',eventName:'Team of the Week 5',displayRating:88,tradeable:false}];
   pendingResolved=new Set();finishPack();
  });
  await page.waitForSelector('#resultShare:not([hidden]) #resultShareBtn');
  assert.match(await page.textContent('#resultShare'),/Isco/,'share bar names the pulled player');
  await page.screenshot({path:path.join(out,'share-pack-results.png')});
  const picture=await page.evaluate(async()=>{
   const file=await FooteraShare.renderSharePicture({item:pendingPack[0],label:'TEAM OF THE WEEK'});
   const data=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)});
   return{name:file.name,type:file.type,size:file.size,data}
  });
  assert.equal(picture.type,'image/png');assert.equal(picture.name,'footera-isco.png');
  assert.ok(picture.size>150000,'share picture contains the card art ('+picture.size+' bytes)');
  fs.writeFileSync(path.join(out,'share-picture.png'),Buffer.from(picture.data.split(',')[1],'base64'));

  await page.click('#resultShareBtn');
  await page.waitForFunction(()=>window.shared.length===1);
  const packShare=await page.evaluate(()=>window.shared[0]);
  assert.equal(packShare.files.length,1,'the picture is shared as a file');
  assert.match(packShare.text,/Isco \(88\)/);
  assert.match(packShare.url,/\?invite=XYZW-2345&utm_source=share&utm_medium=pack$/,'share link carries the invite code and tracking');

  // 4. Friends page: invite link button.
  await page.evaluate(()=>FooteraShare.shareInvite());
  const inviteShare=await page.evaluate(()=>window.shared[1]);
  assert.match(inviteShare.text,/XYZW-2345/);assert.match(inviteShare.url,/invite=XYZW-2345&utm_source=share&utm_medium=invite/);

  // 5. After the first pack the add-to-home-screen hint appears once, and can be turned off.
  await page.evaluate(()=>{localStorage.removeItem('footera-install-hint-v1');state.stats.packs=1;closeResolvedPackResults()});
  await page.waitForSelector('#footeraInstallHint');
  await page.screenshot({path:path.join(out,'share-install-hint.png')});
  await page.click('[data-install-hint="never"]');
  const hint=await page.evaluate(()=>({open:!!document.getElementById('footeraInstallHint'),again:FooteraShare.showInstallHint(),saved:JSON.parse(localStorage.getItem('footera-install-hint-v1'))}));
  assert.equal(hint.open,false);assert.equal(hint.again,false,'hint stays away after "Nicht mehr zeigen"');assert.equal(hint.saved.never,true);

  assert.deepEqual(errors,[],'no JavaScript errors');
  console.log('share-invite browser test passed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
