// V21.429 Anzeigetafel: video boards in the arena with the real score, the
// minute and a TOR! flash; the goal replay opens on the board. Presentation
// only: nothing is stored, the simulation and online data stay untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scoreboardInfo,scoreboardState,boardName,BOARD,GOAL_FLASH,SCOREBOARD_VERSION} from '../3d-scoreboard.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

const goal={type:'goal',team:'home',homeName:'FC Gerlies',awayName:'Borussia Dortmund',scoreBeforeHome:1,scoreBeforeAway:1,homeScore:2,awayScore:1,minute:67,playerName:'Harry Kane'};

test('a home goal: old score, then TOR! with the scorer, then the new score',()=>{
 const info=scoreboardInfo(goal,{goalAt:6.6});
 assert.deepEqual(info.before,[1,1]);assert.deepEqual(info.after,[2,1]);assert.equal(info.scorer,'home');
 const before=scoreboardState(info,5);assert.equal(before.mode,'score');assert.deepEqual(before.score,[1,1]);assert.equal(before.top,"67'");
 const flash=scoreboardState(info,7.2);assert.equal(flash.mode,'goal');assert.equal(flash.top,'TOR!');
 const keys=new Set();for(let t=6.9;t<6.6+.25+GOAL_FLASH;t+=.05)keys.add(scoreboardState(info,t).key[1]);
 assert.ok(keys.has('1')&&keys.has('0'),'it blinks');
 const after=scoreboardState(info,6.6+.25+GOAL_FLASH+.1);assert.equal(after.mode,'score');assert.deepEqual(after.score,[2,1]);assert.match(after.line,/Harry Kane 67'/);
});

test('an away goal counts for the away side, also without score-before fields',()=>{
 const info=scoreboardInfo({...goal,team:'away',scoreBeforeHome:undefined,scoreBeforeAway:undefined,homeScore:1,awayScore:2},{goalAt:6});
 assert.deepEqual(info.before,[1,1]);assert.deepEqual(info.after,[1,2]);assert.equal(info.scorer,'away');
});

test('the replay never takes the goal back off the board',()=>{
 const info=scoreboardInfo(goal,{goalAt:6.6});
 for(const t of [4.5,5,6,7]){const s=scoreboardState(info,t,10.4);assert.equal(s.mode,'goal');assert.deepEqual(s.score,[2,1]);assert.equal(s.line,'Harry Kane')}
});

test('walk-out shows ANPFIFF 0:0, the final whistle the final score, chances the current score',()=>{
 const k=scoreboardState(scoreboardInfo({homeName:'A',awayName:'B',homeScore:3,awayScore:2},{ceremony:'kickoff'}),2);
 assert.equal(k.top,'ANPFIFF');assert.deepEqual(k.score,[0,0]);
 const f=scoreboardState(scoreboardInfo({homeName:'A',awayName:'B',homeScore:3,awayScore:2},{ceremony:'fulltime'}),2);
 assert.equal(f.top,'ENDSTAND');assert.deepEqual(f.score,[3,2]);
 const c=scoreboardState(scoreboardInfo({type:'big_chance_saved',homeScore:1,awayScore:0,minute:12},{goalAt:6}),8);
 assert.equal(c.mode,'score');assert.deepEqual(c.score,[1,0]);assert.equal(c.top,"12'");
});

test('names are cleaned and long ones shortened to their longest word',()=>{
 const info=scoreboardInfo({homeName:'<b>x</b>',awayName:'  '});assert.equal(info.away,'GAST');assert.ok(!/[<>]/.test(info.home));
 assert.equal(boardName('BORUSSIA DORTMUND',()=>false),'DORTMUND');
 assert.equal(boardName('FC GERLIES',()=>true),'FC GERLIES');
 assert.equal(boardName('FC BAYERN MÜNCHEN',()=>false),'MÜNCHEN');
});

test('boards stand on the balcony front, outside the lower stands, and are wired into the scene',()=>{
 assert.ok(BOARD.z>74&&BOARD.z<78.25,'behind the goals, in front of the balcony');
 assert.ok(BOARD.y-BOARD.height/2>=12.5,'above the balcony ribbon');
 const scene=read('3d-highlights-scene.mjs'),sw=read('service-worker.js');
 assert.match(scene,/import \{createScoreboards,scoreboardInfo,footeraScoreboardWanted\} from '\.\/3d-scoreboard\.mjs\?v=21429'/);
 assert.match(scene,/scoreboard\?\.update\(time\)/);
 assert.ok(sw.includes('"./3d-scoreboard.mjs?v=21429"'),'cached for offline play');
 assert.ok(read('3d-scoreboard.mjs').includes("'footera-3d-scoreboard'"),'opt-out flag');
 assert.equal(SCOREBOARD_VERSION,'21.429-anzeigetafel');
 const src=read('3d-scoreboard.mjs');assert.ok(!/localStorage\.setItem|fetch\(|supabase/i.test(src),'presentation only');
});
