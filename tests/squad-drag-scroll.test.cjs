const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=require('./helpers/app-html.cjs')();
const code=html.slice(html.indexOf('function squadDragScrollSpeed('),html.indexOf('function squadDragAutoScroll('));

test('dragging a squad card to the screen edge scrolls the page',()=>{
 const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(ctx.squadDragScrollSpeed(400,0,844),0,'middle of the screen does not scroll');
 assert.ok(ctx.squadDragScrollSpeed(20,0,844)<0,'top edge scrolls up towards the strikers');
 assert.ok(ctx.squadDragScrollSpeed(830,0,844)>0,'bottom edge scrolls down towards the bench');
 assert.ok(ctx.squadDragScrollSpeed(2,0,844)<ctx.squadDragScrollSpeed(80,0,844),'closer to the edge scrolls faster');
});

test('squad drag keeps the scroll loop wired to the pointer drag',()=>{
 assert.match(html,/requestAnimationFrame\(squadDragAutoScroll\)/);
 assert.match(html,/if\(d\.scrollRaf\)cancelAnimationFrame\(d\.scrollRaf\)/);
 assert.match(html,/function updateSquadDropTarget\(\)/);
});
