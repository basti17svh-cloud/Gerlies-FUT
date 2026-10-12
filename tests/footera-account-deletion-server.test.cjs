// Exact deployed function v1 (read-only snapshot). Every SDK call is mocked.
// Never invokes the production deletion endpoint or an auth admin API.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.join(__dirname,'fixtures/footera-delete-account.deployed.ts'),'utf8').replace(/import \{ createClient \} from [^;]+;/,''));
function runtime(options={}){
 const id='isolated-test-user',calls=[];
 let handler;
 const who={id,is_anonymous:false,email:'qa@example.invalid',identities:[{provider:'email'}],last_sign_in_at:new Date().toISOString(),...options.user};
 const client={auth:{getUser:async()=>({data:{user:options.noUser?null:who},error:options.identityError}),signInWithPassword:async()=>({data:{user:{id:options.wrongIdentity?'another-user':id}},error:options.wrongPassword?Error('wrong'):null}),admin:{deleteUser:async(...args)=>{calls.push(args);return{error:options.deleteError?Error('failed'):null}}}}};
 vm.runInNewContext(source,{Request,Response,Date,console,createClient:()=>client,Deno:{env:{get:()=>options.missingConfig?undefined:'mock-only'},serve:fn=>{handler=fn}}});
 async function invoke(body={confirmation:'FOOTERA LÖSCHEN',password:'fixture-only'},headers={},method='POST'){
  return handler(new Request('https://example.invalid/delete',{method,headers:{origin:'https://basti17svh-cloud.github.io',Authorization:'Bearer mock-only',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
 }
 return{invoke,calls};
}
for(const [name,options,body,headers,status] of [
 ['missing configuration',{missingConfig:true},undefined,{},503],
 ['missing token',{},undefined,{Authorization:''},401],
 ['disallowed origin',{},undefined,{origin:'https://untrusted.invalid'},403],
 ['malformed JSON',{},'{',{},400],
 ['wrong phrase',{}, {confirmation:'DELETE'}, {},400],
 ['no authenticated user',{noUser:true},undefined,{},401],
 ['anonymous user',{user:{is_anonymous:true}},undefined,{},401],
 ['invalid token',{identityError:Error('invalid')},undefined,{},401],
 ['missing password',{}, {confirmation:'FOOTERA LÖSCHEN'}, {},400],
 ['wrong password',{wrongPassword:true},undefined,{},403],
 ['different reauthenticated user',{wrongIdentity:true},undefined,{},403],
 ['expired non-email session',{user:{identities:[],last_sign_in_at:'2000-01-01'}},undefined,{},403],
])test('server deletion simulation rejects '+name,async()=>{const t=runtime(options),r=await t.invoke(body,headers);assert.equal(r.status,status);assert.equal(t.calls.length,0)});
test('server uses verified user ID, ignoring a forged target ID',async()=>{const t=runtime(),r=await t.invoke({confirmation:'FOOTERA LÖSCHEN',password:'fixture-only',user_id:'unrelated-target'});assert.equal(r.status,200);assert.equal(t.calls.length,1);assert.equal(t.calls[0][0],'isolated-test-user');assert.equal(t.calls[0][1],false)});
test('server does not report deletion success after admin failure',async()=>{const t=runtime({deleteError:true}),r=await t.invoke();assert.equal(r.status,500);assert.equal((await r.json()).deleted,undefined)});
test('CORS preflight and rejected GET never delete',async()=>{const t=runtime();assert.equal((await t.invoke(undefined,{},'OPTIONS')).status,200);assert.equal((await t.invoke(undefined,{},'GET')).status,405);assert.equal(t.calls.length,0)});
