const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../pack-3d.js'),'utf8');
function setup({reduced=false,unsupported=false}={}){
 const calls=[],listeners=new Map(),classes=new Set();let frame;
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>({loseContext:()=>calls.push('release')})},{get:(o,k)=>o[k]??((...a)=>{calls.push(k);return {}})});
 const canvas={setAttribute(){},getContext:()=>unsupported?null:gl,remove:()=>calls.push('remove'),addEventListener:(k,v)=>listeners.set(k,v),removeEventListener(){}};
 const host={dataset:{},clientWidth:390,clientHeight:844,prepend(){},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}};
 const ctx={window:{matchMedia:()=>({matches:reduced}),devicePixelRatio:3,addEventListener(){},removeEventListener(){}},document:{createElement:()=>canvas,addEventListener(){},removeEventListener(){},hidden:false},performance:{now:()=>0},requestAnimationFrame:f=>{frame=f;return 1},cancelAnimationFrame:()=>calls.push('cancel')};
 vm.runInNewContext(source,ctx);return {api:ctx.window.FooteraPack3D,host,canvas,calls,classes,listeners,draw:()=>frame(100)};
}
test('3D renderer caps resolution, draws and releases GPU resources on finish',()=>{
 const s=setup();assert.equal(s.api.start(s.host),true);assert.equal(s.canvas.width,488);s.draw();assert.ok(s.calls.includes('drawArrays'));s.api.stop();assert.ok(s.calls.includes('deleteBuffer'));assert.ok(s.calls.includes('deleteProgram'));assert.ok(s.calls.includes('cancel'));assert.ok(s.calls.includes('release'));assert.equal(s.classes.size,0);s.api.stop();
});
test('unsupported WebGL and reduced motion retain CSS fallback',()=>{
 for(const options of [{unsupported:true},{reduced:true}]){const s=setup(options);assert.equal(s.api.start(s.host),false);assert.equal(s.classes.size,0);assert.equal(s.host.dataset.renderer,'css');assert.ok(s.host.dataset.rendererReason)}
});
test('context loss returns to CSS and a second start disposes the first renderer',()=>{
 const s=setup();s.api.start(s.host);s.api.start(s.host);assert.ok(s.calls.includes('release'));s.listeners.get('webglcontextlost')({preventDefault(){}});assert.equal(s.classes.size,0);
});
