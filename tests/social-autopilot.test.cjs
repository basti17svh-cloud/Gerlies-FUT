'use strict';
// Social-Autopilot captions follow Basti's posting rules (memory instagram-caption-rules).
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPosts}=require('../scripts/social/social-captions.cjs');
const {posterHTML,reelHTML}=require('../scripts/social/social-layout.cjs');
const at=Date.parse('2026-11-06T19:00:00+01:00');
const cards=[...Array(18)].map((_,i)=>({role:'team',name:'Spieler '+i,ovr:90-i,html:''})).concat([{role:'objective',name:'Heung-min Son',ovr:87,html:''}]);
const samples=[
 [{at,kind:'event',theme:'halloween',title:'HALLOWEEN · TEAM 2',keys:['event-start:halloween-2026-team2','obj-start:halloween-son','evo-start:halloween_blutmond_2']},
  {cards,facts:{event:'HALLOWEEN',team:'TEAM 2',count:18,until:'2026-11-13T19:00:00+01:00',top:[{name:'Antoine Semenyo',ovr:89},{name:'Youri Tielemans',ovr:88},{name:'Yan Diomande',ovr:87}],objective:{name:'Heung-min Son',ovr:87,desc:'Gewinne 6 Rivals-Partien.',target:6,mode:'rivals',until:'2026-11-13T19:00:00+01:00',event:'HALLOWEEN'},evo:{name:'Blutmond II',band:'80-85'}}}],
 [{at:Date.parse('2026-11-02T19:00:00+01:00'),kind:'sbc',theme:'halloween',title:'Geheime Spieler-SBC',keys:['sbc-start:halloween-gyokeres-88']},
  {cards:[{role:'sbc',name:'Viktor Gyökeres',ovr:89,html:''}],facts:{sbc:{name:'Viktor Gyökeres',ovr:89,parts:3,until:'2026-11-09T19:00:00+01:00',event:'HALLOWEEN',segments:['Maskenball – 83er-Team']}}}],
 [{at:Date.parse('2026-11-06T12:30:00+01:00'),kind:'teaser',theme:'halloween',title:'HALLOWEEN · TEAM 2',keys:['event-start:halloween-2026-team2'],releaseAt:at},{cards,silhouette:true,facts:{event:'HALLOWEEN',team:'TEAM 2',count:18}}],
 [{at:Date.parse('2026-11-04T19:00:00+01:00'),kind:'totw',theme:'',title:'Team der Woche 8',keys:['totw:1']},{cards,facts:{totw:8,count:18,top:[{name:'Harry Kane',ovr:93,nation:'England'},{name:'Lamine Yamal',ovr:92,nation:'Spain'}]}}],
 [{at:Date.parse('2026-11-09T12:30:00+01:00'),kind:'last-chance',theme:'halloween',title:'SBC endet',keys:['sbc-end:x'],endAt:Date.parse('2026-11-09T19:00:00+01:00')},{cards:[{role:'sbc',html:''}],facts:{sbc:{name:'Viktor Gyökeres',ovr:89}}}],
 [{at:Date.parse('2026-12-04T12:30:00+01:00'),kind:'season-end',theme:'season',title:'Saison 2',keys:['season-end:s2'],endAt:Date.parse('2026-12-11T19:00:00+01:00'),daysLeft:7},{cards:[{role:'pass',html:''}],facts:{season:{number:2,name:'Blutmond'}}}]
];
const posts=samples.flatMap(([entry,content])=>buildPosts(entry,content));
test('every sample produces one post with a stable id and Berlin time',()=>{
 assert.equal(posts.length,samples.length);
 for(const p of posts){assert.match(p.id,/^\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9-]+$/);assert.match(p.postAt,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+0[12]:00$/);assert.ok(p.slides.length>=1)}
 assert.equal(posts[0].postAt,'2026-11-06T19:00:00+01:00');
});
test('captions: max 5 hashtags, brand tags, no EA terms, Basti wording',()=>{
 for(const p of posts){
  const texts=[p.instagram?.caption,p.tiktok?.caption,p.x?.text].filter(Boolean);
  for(const t of texts){
   assert.ok((t.match(/#\S+/g)||[]).length<=5,p.id);
   assert.doesNotMatch(t,/#(fut|fc2\d|eafc|ultimateteam)\b/i,p.id);
   assert.doesNotMatch(t,/browser|kartenspiel|walkout/i,p.id);
  }
  assert.match(p.instagram.caption,/#footera #buildyourera/);
  assert.ok([...p.x.text].length<=280,`X text too long: ${p.id}`);
  assert.match(p.x.text,/tinyurl\.com\/footera-play/);
 }
});
test('teasers never name event players; launch names modes, not EA',()=>{
 const teaser=posts.find(p=>p.kind==='teaser');
 assert.ok(teaser.slides.every(s=>s.silhouette));
 assert.doesNotMatch(teaser.instagram.caption+teaser.x.text,/Semenyo|Tielemans|Spieler \d/);
 assert.match(posts[0].instagram.caption,/Rivals/);
 assert.match(posts[0].instagram.caption,/Semenyo 89/);
});
test('TOTW caption keeps Basti style',()=>{
 const t=posts.find(p=>p.kind==='totw');
 assert.match(t.instagram.caption,/^🚨 TOTW 8 IST DA!/);
 assert.match(t.instagram.caption,/🏴󠁧󠁢󠁥󠁮󠁧󠁿 93 Harry Kane/);
});
test('layout html renders the slide text and the red logo',()=>{
 const html=posterHTML({theme:'halloween',title:'Gyökeres',titleAccent:'89',cards:['a.png']},'story')+reelHTML({theme:'blackfriday',title:'X',cards:['a.png','b.png']});
 assert.match(html,/assets\/footera\/emblem\.png/);
 assert.match(html,/Gyökeres/);
 assert.match(html,/BUILD YOUR ERA/);
});
test('reel shows the whole team at the end and carries its own soundtrack',()=>{
 const {reelTiming}=require('../scripts/social/social-layout.cjs'),{soundtrackWav}=require('../scripts/social/social-sound.cjs');
 const totw=posts.find(p=>p.kind==='totw');
 assert.equal(totw.reel.cardIdx.length,18,'reel gets all 18 TOTW cards');
 const urls=[...Array(18)].map((_,i)=>`c${i}.png`),html=reelHTML({theme:'totw',title:'TOTW 8',cards:urls}),tm=reelTiming({cards:urls});
 assert.ok(tm.wall&&tm.seconds>9&&tm.endAt>tm.wallAt);
 for(const u of urls)assert.ok(html.includes(`src="${u}"`),u);
 assert.match(html,/Das ganze Team · 18 Karten/);
 assert.equal(reelTiming({cards:['a']}).wall,false);
 for(const theme of ['totw','halloween','blackfriday','season','footera']){
  const wav=soundtrackWav({seconds:3,theme,seed:'x',hits:{flash:1,wall:2,end:2.5}});
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.length,44+3*44100*4);
  let sum=0;for(let i=44;i<wav.length;i+=4)sum+=Math.abs(wav.readInt16LE(i));assert.ok(sum/(wav.length/4)>500,`${theme} is not silent`);
 }
});
