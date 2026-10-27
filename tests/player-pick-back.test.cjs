const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../footera-app.js'),'utf8');
const navigation=source.slice(source.indexOf('let uiHistoryApplying='),source.indexOf('function switchView('));
function fixture(busy=false){
 const active=new Set(['active']),modal={id:'playerPickModal',style:{},classList:{contains:x=>active.has(x),remove:x=>active.delete(x)}};
 let closed=0,protectedBack=0;
 const context={$:id=>id===modal.id?modal:null,document:{querySelectorAll:()=>active.has('active')?[modal]:[]},
  window:{FooteraPlayerPicks:{isBusy:()=>busy,onClose(){closed++}}},protectLockedBack(){protectedBack++}};
 vm.createContext(context);vm.runInContext(navigation,context);
 return{context,active,closed:()=>closed,protectedBack:()=>protectedBack};
}
test('Android back closes an idle Pick and notifies its controller exactly once',()=>{
 const f=fixture();assert.equal(f.context.closeTopUiLayer(),true);assert.equal(f.active.has('active'),false);
 assert.equal(f.closed(),1);assert.equal(f.context.closeTopUiLayer(),false);assert.equal(f.closed(),1);
});
test('Android back keeps the Pick open during an in-flight opening or confirmation',()=>{
 const f=fixture(true);assert.equal(f.context.closeTopUiLayer(),true);
 assert.equal(f.active.has('active'),true);assert.equal(f.closed(),0);assert.equal(f.protectedBack(),1);
});
