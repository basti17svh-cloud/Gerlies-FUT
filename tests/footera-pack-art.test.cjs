const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const artCode=html.slice(html.indexOf('const STORE_PACK_ART='),html.indexOf('let storeTab='));
const sbcCode=html.slice(html.indexOf('function sbcOverviewCard('),html.indexOf('function sbcPickerTargetLabel('));

test('every SBC reward uses the matching new Footera foil pack',()=>{
 const ctx={sbcDraftStats:()=>({count:0,ok:false}),sbcRewardPackLabel:r=>r.pack,esc:String};
 vm.createContext(ctx);
 vm.runInContext(`${artCode}\n${sbcCode}`,ctx);
 for(const [id,file] of Object.entries({silver:'silber.webp',gold:'gold.webp','82':'promo.webp',goldplayers:'promo.webp'})){
  const markup=vm.runInContext(`sbcOverviewCard({id:'challenge',name:'Challenge',desc:'',req:'11 Spieler',count:11,reward:{pack:'${id}'}})`,ctx);
  assert.match(markup,new RegExp(`class="sbc-hub-pack"><img src="\\./assets/footera/${file}"`));
  assert.match(markup,new RegExp(`alt="${id}"`));
 }
 for(const file of ['silber.webp','gold.webp','promo.webp'])assert.ok(fs.existsSync(path.join(root,'assets/footera',file)));
});

test('the opening and starter pack use the shared artwork without old placeholder labels',()=>{
 assert.match(html,/id="starterPack"[^>]*><img src="\.\/assets\/footera\/promo\.webp"/);
 assert.match(html,/id="bigPack"[^>]*><img id="bigPackArt"/);
 assert.match(html,/\$\("bigPackArt"\)\.src=packArtSrc\(id\)/);
 assert.doesNotMatch(html,/<div class="mini-pack[^>]*>UT<\/div>/);
});
