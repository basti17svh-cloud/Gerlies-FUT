import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPerimeterBoard} from '../3d-advertising.mjs';

function context(){
 const ops=[];
 const ctx={
  save(){},restore(){},scale(...a){ops.push(['scale',...a])},
  fillRect(...a){ops.push(['rect',...a])},beginPath(){},roundRect(){},fill(){},stroke(){},
  arc(){},createLinearGradient(){return {addColorStop(){}};},
  drawImage(...a){ops.push(['image',...a.slice(1)])},
  fillText(...a){ops.push(['text',...a])},
 };
 return {ctx,ops};
}
test('Footera displays original crest at both ends and centered FOOTERA',()=>{
 const {ctx,ops}=context();
 drawPerimeterBoard(ctx,2048,256,'footera',{complete:true,naturalWidth:512});
 const images=ops.filter(op=>op[0]==='image');
 assert.equal(images.length,2);
 assert.deepEqual(images[0].slice(1),[24,12,232,232]);
 assert.deepEqual(images[1].slice(1),[1792,12,232,232]);
 assert.deepEqual(ops.find(op=>op[1]==='FOOTERA'),['text','FOOTERA',1024,137,1420]);
});
test('Footera never displays the old green placeholder before crest loads',()=>{
 const {ctx,ops}=context();drawPerimeterBoard(ctx,2048,256,'footera');
 assert.equal(ops.filter(op=>op[0]==='image').length,0);
 assert.ok(ops.some(op=>op[1]==='FOOTERA'));
});
test('Instagram shows two camera glyphs and a centered handle',()=>{
 const {ctx,ops}=context();drawPerimeterBoard(ctx,1024,128,'instagram');
 assert.deepEqual(ops.find(op=>op[1]==='official_footera'),['text','official_footera',1024,136,1440]);
 assert.ok(ops.some(op=>op[0]==='scale'&&op[1]===0.5&&op[2]===0.5));
});
