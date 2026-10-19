import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHighlightPlayback} from '../3d-playback-clock.mjs';

test('cold first render and long stalls never skip the opening action',()=>{
 const clock=createHighlightPlayback({type:'goal',playSeconds:9});
 assert.equal(clock.tick(100).time,0);
 clock.presented(6100); // Six seconds spent compiling the first frame.
 assert.ok(clock.tick(6116).time<.02);
 assert.ok(clock.tick(12116).time<.1); // A second stall must not jump to the shot.
});
for(const type of ['goal','big_chance_saved','ball_won']){
 test(type+': visible build-up, continuous action and exactly one completion',()=>{
  const clock=createHighlightPlayback({type,playSeconds:8});
  clock.tick(0);clock.presented(0);
  let sample,previous=0;
  const action=type==='ball_won'?4.4:5.4;
  for(let now=20;now<=6800;now+=20){sample=clock.tick(now);assert.ok(sample.time>=previous);previous=sample.time}
  assert.ok(sample.time<action);assert.equal(sample.done,false);
  for(let now=6820;now<=7020;now+=20)sample=clock.tick(now);
  assert.ok(sample.time>=action);
  for(let now=7040;now<=Math.ceil(clock.totalSeconds*50)*20+20;now+=20)sample=clock.tick(now);
  assert.equal(sample.time,10.4);assert.equal(sample.done,true);
 });
}
test('long authored scenes retain their requested duration',()=>{
 for(const type of ['big_chance_saved','ball_won'])assert.equal(createHighlightPlayback({type,playSeconds:20}).totalSeconds,20);
 // A goal adds only its slow-motion moment on top.
 const goal=createHighlightPlayback({type:'goal',playSeconds:20});
 assert.ok(goal.totalSeconds>20&&goal.totalSeconds<23);
});
test('goal slow motion: full-speed shot, slow net impact, continuous time',()=>{
 const clock=createHighlightPlayback({type:'goal'});
 clock.tick(0);clock.presented(0);
 let previous=0,steps=[];
 for(let now=10;now<=clock.totalSeconds*1000+20;now+=10){const t=clock.tick(now).time;steps.push([previous,t]);assert.ok(t>=previous);previous=t}
 const rate=at=>{const s=steps.find(([a,b])=>a<=at&&b>at);return (s[1]-s[0])/.01};
 assert.ok(Math.abs(rate(5.8)-1)<.05,'shot flight at full speed');
 assert.ok(Math.abs(rate(6.7)-.4)<.05,'net impact in slow motion');
 assert.ok(Math.abs(rate(8)-1)<.05,'celebration back to full speed');
 assert.equal(previous,10.4);
});
