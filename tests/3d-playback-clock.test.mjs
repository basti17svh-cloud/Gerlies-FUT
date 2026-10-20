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
 assert.equal(createHighlightPlayback({type:'ball_won',playSeconds:20}).totalSeconds,20);
 // A shot loses only the time its 1.5x faster flight saves.
 const saved=createHighlightPlayback({type:'big_chance_saved',playSeconds:20}).totalSeconds,scale=10.4/20;
 assert.ok(Math.abs(saved-(20-1.25/scale*(1-1/1.5)))<1e-9);
 // A goal adds only its slow-motion moment on top.
 const goal=createHighlightPlayback({type:'goal',playSeconds:20});
 assert.ok(goal.totalSeconds>20&&goal.totalSeconds<23);
});
test('goal slow motion: fast shot, slow net impact only after the keeper, continuous time',()=>{
 const clock=createHighlightPlayback({type:'goal'});
 clock.tick(0);clock.presented(0);
 let previous=0,steps=[];
 for(let now=10;now<=clock.totalSeconds*1000+20;now+=10){const t=clock.tick(now).time;steps.push([previous,t]);assert.ok(t>=previous);previous=t}
 const rate=at=>{const s=steps.find(([a,b])=>a<=at&&b>at);return (s[1]-s[0])/.01};
 assert.ok(Math.abs(rate(5.8)-1.5)<.05,'shot flight 1.5x');
 assert.ok(Math.abs(rate(6.5)-1.5)<.05,'no slow motion before the keeper line');
 assert.ok(Math.abs(rate(6.9)-.4)<.05,'net impact in slow motion');
 assert.ok(Math.abs(rate(8)-1)<.05,'celebration back to full speed');
 assert.equal(previous,10.4);
});
test('V21.196: goals, saves and misses fly at the same pace up to the keeper',()=>{
 const pace=type=>{const c=createHighlightPlayback({type});c.tick(0);c.presented(0);let prev=0,steps=[];for(let now=10;now<=c.totalSeconds*1000+20;now+=10){const t=c.tick(now).time;steps.push([prev,t]);prev=t}
  return [5.6,6.0,6.4,6.6].map(at=>{const s=steps.find(([a,b])=>a<=at&&b>at);return Math.round((s[1]-s[0])/.01*100)/100})};
 const goal=pace('goal');for(const type of ['big_chance_saved','big_chance_missed','shot_post'])assert.deepEqual(pace(type),goal);
});
