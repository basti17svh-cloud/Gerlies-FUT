'use strict';
// Card portraits: the visible player is scaled to fill the portrait window and
// stands on the name plate, whatever margins the source file has.
const test=require('node:test'),assert=require('node:assert/strict');
const html=require('./helpers/app-html.cjs')();
const start=html.indexOf('const PORTRAIT_BOUNDS=new Map();'),end=html.indexOf('\n',html.indexOf("el.style.setProperty('transform',",start));
const code=html.slice(start,end+1)+'\n}';
function run(bounds,{nw=400,nh=300,fw=100,fh=140,shell=true,founder=false}={}){
 const props={};
 const el={naturalWidth:nw,naturalHeight:nh,src:'x.webp',currentSrc:'x.webp',
  parentElement:{clientWidth:fw,clientHeight:fh},
  closest:s=>s==='.card-shell .face'?shell:s==='.founder-shell'?founder:null,
  style:{setProperty:(k,v)=>{props[k]=v},removeProperty:k=>{delete props[k]}}};
 const fit=new Function('document','ResizeObserver',code+';PORTRAIT_BOUNDS.set("x.webp",'+JSON.stringify(bounds)+');return fitCardPortrait;')({},undefined);
 fit(el);return props;
}
const parse=t=>{const m=/translate\((-?[\d.]+)%,(-?[\d.]+)%\) scale\(([\d.]+)\)/.exec(t||'');return m?m.slice(1).map(Number):null};
test('a wide action shot with headroom is enlarged and stays on the name plate',()=>{
 // 400x300 file, player only in the lower 60%: drawn 100x75 at the box bottom.
 const [tx,ty,k]=parse(run({x0:.1,y0:.4,x1:.9,y1:1}).transform);
 assert.ok(k>1.3,'scaled up');assert.ok(Math.abs(ty)<.01,'bottom stays on the plate');assert.ok(Math.abs(tx)<.01);
});
test('a floating player is moved down onto the name plate',()=>{
 const t=parse(run({x0:.2,y0:.1,x1:.8,y1:.75},{nw:300,nh:420}).transform);
 assert.ok(t&&t[1]>0,'moved down');
});
test('a portrait already filling the window and founder art keep the plain layout',()=>{
 assert.equal(run({x0:0,y0:0,x1:1,y1:1},{nw:100,nh:140}).transform,undefined);
 assert.equal(run({x0:.1,y0:.4,x1:.9,y1:1},{founder:true}).transform,undefined);
});
test('cards load the fit from the shared image hook',()=>{
 assert.match(html,/function rememberLoadedImage\(el\)\{[^\n]*fitCardPortrait\(el\)/);
});
test('POTM art is placed by the fit alone, not by hand-tuned CSS on top of it',()=>{
 // Olise V21.307: 186% CSS width plus the 1.6x fit cropped the face off the card.
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','potm.css'),'utf8');
 assert.doesNotMatch(css,/--potm-face-|img\[src\*="events\/potm\/"\]/);
});
