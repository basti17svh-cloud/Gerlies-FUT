/* Isolated Chromium + real Supabase SDK, mocked HTTP backend. No production writes.
 * Run with FOOTERA_TEST_CHROMIUM, FOOTERA_TEST_SDK and FOOTERA_TEST_PLAYERS_CSV.
 * Fixtures: Supabase UMD SDK and the CSV at DB_SOURCES[0] (assets/players-db.csv).
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const repo=path.resolve(__dirname,'..'),base='https://basti17svh-cloud.github.io/Gerlies-FUT/';
const sdk=fs.readFileSync(process.env.FOOTERA_TEST_SDK),csv=fs.readFileSync(process.env.FOOTERA_TEST_PLAYERS_CSV);
const users=new Map(),clouds=new Map(),calls=[],results=[];
let counter=0;
const password='isolated-fixture-password';
function user(anonymous=false,email='qa@example.invalid'){
 const id=`10000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`;
 const u={id,aud:'authenticated',role:'authenticated',is_anonymous:anonymous,email:anonymous?'':email,email_confirmed_at:anonymous?null:new Date().toISOString(),created_at:new Date().toISOString(),identities:anonymous?[]:[{id,provider:'email',identity_data:{email}}],app_metadata:{provider:anonymous?'anonymous':'email'},user_metadata:{}};
 users.set(id,u);return u;
}
function session(u){return{access_token:[{alg:'HS256',typ:'JWT'},{sub:u.id,role:'authenticated',is_anonymous:u.is_anonymous,exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.test-signature',refresh_token:'test-refresh-'+u.id,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:u};}
function identity(req){try{return users.get(JSON.parse(Buffer.from((req.headers().authorization||'').split('.')[1],'base64url')).sub)}catch{return null}}
async function routes(ctx){
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='idxydyrihtyecvfjvtuk.supabase.co'){
   const u=identity(req),p=url.pathname;let body={};try{body=req.postDataJSON()||{}}catch{}
   const respond=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status>=400?{...v,error_code:v.code}:v)});
   if(p.includes('/functions/'))throw Error('Deletion and edge endpoints must never be called by browser tests');
   calls.push({path:p,method:req.method(),userId:u?.id}); // No credentials or request bodies in logs.
   if(p==='/auth/v1/signup'){
    if(!body.email)return respond(session(user(true)));
    if([...users.values()].some(x=>x.email===body.email))return respond({...user(false,'obfuscated@example.invalid'),identities:[]});
    const created=user(false,body.email);created.email_confirmed_at=null;return respond(created);
   }
   if(p==='/auth/v1/user'){
    if(!u)return respond({code:'bad_jwt',message:'Invalid token'},401);
    if(req.method()==='PUT'&&body.email){u.new_email=body.email;return respond(u)}
    if(req.method()==='PUT'&&body.password&&!u.email_confirmed_at)return respond({message:'Verify email first'},422);
    return respond(u);
   }
   if(p==='/auth/v1/token'){
    const found=[...users.values()].find(x=>x.email===body.email);
    if(!found||body.password!==password)return respond({code:'invalid_credentials',message:'Invalid login credentials'},400);
    if(!found.email_confirmed_at)return respond({code:'email_not_confirmed',message:'Email not confirmed'},400);
    return respond(session(found));
   }
   if(p==='/auth/v1/logout')return route.fulfill({status:204});
   if(p==='/auth/v1/resend'||p==='/auth/v1/recover')return respond({});
   if(p==='/rest/v1/footera_cloud_saves')return respond(clouds.get(u?.id)||null);
   if(p==='/rest/v1/rpc/footera_store_cloud_save'){
    if(!u||u.is_anonymous)return respond({message:'not allowed'},403);
    const old=clouds.get(u.id);if((old?.revision||0)!==body.p_base_revision)return respond({message:'revision conflict'},409);
    const revision=(old?.revision||0)+1;clouds.set(u.id,{save_data:body.p_save,revision,saved_at:new Date().toISOString()});return respond(revision);
   }
   return respond([]);
  }
  if(url.href.includes('supabase-js@'))return route.fulfill({contentType:'application/javascript',body:sdk});
  if(url.pathname.endsWith('players-db.csv'))return route.fulfill({contentType:'text/csv',body:csv});
  if(url.origin===new URL(base).origin&&url.pathname.startsWith('/Gerlies-FUT/')){
   const rel=decodeURIComponent(url.pathname.slice('/Gerlies-FUT/'.length))||'index.html',file=path.resolve(repo,rel);
   if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   const type={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.csv':'text/csv','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4'}[path.extname(file)]||'application/octet-stream';
   return route.fulfill({contentType:type,body:fs.readFileSync(file)});
  }
  return route.abort();
 });
}
function ok(name){results.push(name);console.log('PASS '+name)}
async function launch(profile){
 const ctx=await chromium.launchPersistentContext(profile,{executablePath:process.env.FOOTERA_TEST_CHROMIUM,headless:true,args:['--no-sandbox'],viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await routes(ctx);const page=ctx.pages()[0];page.on('dialog',d=>d.accept());return {ctx,page};
}
async function go(page,url=base){if(url.includes('#'))await page.goto('about:blank');await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForSelector('#footeraAccountEntry');}
async function clickReload(page,selector){await Promise.all([page.waitForEvent('domcontentloaded'),page.locator(selector).click()]);}
async function settle(page){await page.waitForFunction(()=>document.querySelector('#footeraAccountStatus')?.textContent!=='Konto wird geprüft …')}
async function confirm(page,u){u.email_confirmed_at=new Date().toISOString();u.is_anonymous=false;const s=session(u);await go(page,base+'#access_token='+s.access_token+'&refresh_token='+s.refresh_token+'&expires_in=3600&token_type=bearer&type=signup');await page.waitForFunction(()=>document.querySelector('#footeraAccountStatus')?.textContent.includes('dauerhaft'));}
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'footera-registration-'));let ctx,page;
 try{
  ({ctx,page}=await launch(dir));await go(page);await settle(page);
  assert.equal(await page.locator('#footeraAccountDialog').isVisible(),true);
  assert.equal(await page.locator('#footeraGoogle,#footeraSwitchGoogle').count(),0);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#footeraAccountDialog')).zIndex),'9999');
  ok('account choice before club setup; no Google buttons');
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const box=await page.locator('.footera-account-modal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width)}ok('account dialog fits 360/390/412 px');
  await page.locator('#footeraAccountEmail').fill('bad');await page.locator('#footeraEmailRegister').click();
  await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('gültige'));
  await page.locator('#footeraAccountEmail').fill('qa@example.invalid');await page.locator('#footeraAccountPassword').fill('short');await page.locator('#footeraEmailRegister').click();
  await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('10 Zeichen'));
  assert.equal(await page.locator('#footeraAccountSave').isDisabled(),true);ok('invalid email, short password, disabled cloud actions');
  user(false,'duplicate@example.invalid');await page.locator('#footeraAccountEmail').fill('duplicate@example.invalid');await page.locator('#footeraAccountPassword').fill(password);await page.locator('#footeraEmailRegister').click();
  await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('Falls die Adresse neu ist'));assert.equal(await page.evaluate(()=>localStorage.getItem('footera-pending-email-v1')),null);ok('duplicate signup gives login/reset guidance without adopting a club');
  await page.locator('#footeraAccountEmail').fill('qa@example.invalid');await page.locator('#footeraAccountPassword').fill(password);await page.locator('#footeraEmailRegister').click();
  await page.waitForFunction(()=>!document.querySelector('#footeraPendingEmail').hidden);
  const u=[...users.values()].find(x=>x.email==='qa@example.invalid');assert.ok(u);assert.equal(u.email_confirmed_at,null);
  await page.locator('#footeraResendEmail').click();await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('erneut angefordert'));
  await page.locator('#footeraEmailLogin').click();await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('zuerst'));
  ok('signup and resend; unconfirmed login rejected (HTTP simulation)');
  await confirm(page,u);await page.locator('#footeraAccountContinue').click();
  await page.locator('#firstUsername').waitFor({state:'visible',timeout:60000});
  await page.locator('#firstUsername').fill('QA Isolated');await page.locator('#saveFirstUsername').click();
  await page.locator('#leagueGrid button:not([disabled])').first().click();await page.locator('#starterOpen').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gerliesFutV9')||'{}').onboarded===true);
  await page.evaluate(()=>FooteraAccount.autoAttachAndBackup());
  await page.waitForFunction(()=>localStorage.getItem('footera-cloud-sync-point-v1')!==null);
  const own=clouds.get(u.id);assert.equal(own.save_data.profile.username,'QA Isolated');assert.equal(own.save_data.club.length,18);
  ok('callback, username, league and starter pack; correct automatic account ownership');
  await page.locator('#footeraAccountEntry').click();await page.waitForFunction(()=>document.querySelector('#footeraProfileUsername').textContent==='QA Isolated');
  assert.equal(await page.locator('#footeraProfileClub').textContent(),'QA Isolated FC');assert.equal(await page.locator('#footeraProfileEmail').textContent(),'qa@example.invalid');assert.equal(await page.locator('#footeraProfileCards').textContent(),'18');
  assert.equal(await page.evaluate(p=>Object.values(localStorage).some(v=>v.includes(p)),password),false);ok('Mein Profil matches account, username, club and cards; no persisted password');
  await clickReload(page,'#footeraProfileSignOut');await page.waitForFunction(()=>document.querySelector('#footeraAccountEntry')?.textContent==='Konto');
  await page.locator('#footeraAccountEntry').click();await page.locator('#footeraAccountEmail').fill('qa@example.invalid');await page.locator('#footeraAccountPassword').fill('wrong');await page.locator('#footeraEmailLogin').click();
  await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('stimmt nicht'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gerliesFutV9')).profile.username),'QA Isolated');
  await page.locator('#footeraAccountPassword').fill(password);await clickReload(page,'#footeraEmailLogin');await page.waitForFunction(()=>document.querySelector('#footeraAccountEntry')?.textContent==='Mein Profil');
  ok('logout, wrong password and successful repeat login retain club');
  await page.waitForLoadState('load');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#footeraAccountEntry')?.textContent==='Mein Profil');
  await ctx.close();({ctx,page}=await launch(dir));await go(page);await page.waitForFunction(()=>document.querySelector('#footeraAccountEntry')?.textContent==='Mein Profil');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gerliesFutV9')).profile.username),'QA Isolated');ok('reload and actual Chromium process restart retain account and club');
  await ctx.close();({ctx,page}=await launch(fs.mkdtempSync(path.join(os.tmpdir(),'footera-new-device-'))));await go(page);await settle(page);
  await page.locator('#footeraAccountEmail').fill('qa@example.invalid');await page.locator('#footeraAccountPassword').fill(password);await clickReload(page,'#footeraEmailLogin');
  await page.waitForFunction(()=>typeof state!=='undefined'&&state.profile?.username==='QA Isolated'&&window.FooteraAccount&&!window.FooteraAccountReplacingSave);
  await page.waitForFunction(()=>document.querySelector('#footeraAccountEntry')?.textContent==='Mein Profil');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gerliesFutV9')).club.length),18);ok('new browser restores matching cloud club despite empty boot autosave');
  await ctx.close();({ctx,page}=await launch(fs.mkdtempSync(path.join(os.tmpdir(),'footera-guest-'))));await go(page);await settle(page);await page.locator('#footeraGuest').click();
  await page.locator('#firstUsername').waitFor({state:'visible',timeout:60000});await page.locator('#firstUsername').fill('QA Guest');await page.locator('#saveFirstUsername').click();await page.locator('#leagueGrid button:not([disabled])').first().click();await page.locator('#starterOpen').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gerliesFutV9')||'{}').onboarded===true);
  await page.locator('#footeraAccountEntry').click();await page.locator('#footeraAccountEmail').fill('guest@example.invalid');await page.locator('#footeraEmailRegister').click();await page.waitForFunction(()=>!document.querySelector('#footeraPendingEmail').hidden);
  const guest=[...users.values()].find(x=>x.new_email==='guest@example.invalid');const id=guest.id;guest.email=guest.new_email;guest.identities=[{id,provider:'email',identity_data:{email:guest.email}}];await confirm(page,guest);
  await page.locator('#footeraAccountPassword').fill(password);await page.locator('#footeraSetPassword').click();await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('Passwort gespeichert'));
  await page.evaluate(()=>FooteraAccount.autoAttachAndBackup());assert.equal(clouds.get(id).save_data.profile.username,'QA Guest');ok('guest club upgraded in place; same account ID and club preserved');
  await go(page,base+'#error=access_denied&error_code=otp_expired');await page.waitForFunction(()=>document.querySelector('#footeraAccountMessage').textContent.includes('abgelaufen'));ok('expired confirmation link is visible and actionable');
  assert.equal(calls.some(x=>x.path.includes('/functions/')),false);
  console.log(JSON.stringify({passed:results.length,realEmailDelivery:false,productionWrites:0,installedPwa:false}));
 }catch(e){if(page)console.log(JSON.stringify({status:await page.locator("#footeraAccountStatus").textContent(),message:await page.locator("#footeraAccountMessage").textContent(),pending:await page.locator("#footeraPendingEmail").textContent(),calls:calls.slice(-8)}));throw e}finally{if(ctx)await ctx.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
