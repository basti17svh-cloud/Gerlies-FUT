'use strict';
// V21.400 Footera Kurier: newspaper front page after a match. Read-only, built from the finished match.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'footera-newspaper.js'),'utf8');
function load(){const ctx={window:{},document:{},Intl,Date,Math};vm.createContext(ctx);vm.runInContext(src,ctx);return ctx.window.FooteraNewspaper}
const api=load();
const g=(side,minute,scorer,type='assist')=>({side,minute,scorer,type});
const base=extra=>({home:'FC Gerlies',away:'Bayern',mode:'rivals',xgHome:1.4,xgAway:1.1,shotsHome:9,shotsAway:7,poss:52,seed:'s1',...extra});

test('a hattrick makes the headline and the player is named',()=>{
 const f=api.facts(base({gh:3,ga:1,goals:[g('home',10,'Kane'),g('away',30,'Musiala'),g('home',55,'Kane'),g('home',80,'Kane','penalty')]}));
 assert.equal(f.result,'win');assert.equal(f.hattrick.name,'Kane');
 const st=api.story(f);assert.equal(st.kicker,'Hattrick');assert.match(st.title,/KANE/);
 assert.match(st.article[0],/Kane \(10\., 55\., 80\. FE\)/);
 assert.match(st.article[0],/in Division Rivals/);
});

test('coming back from 0:2 is a big comeback, a late decider is a last-minute win',()=>{
 const cb=api.facts(base({gh:3,ga:2,goals:[g('away',5,'A'),g('away',20,'B'),g('home',50,'C'),g('home',60,'D'),g('home',70,'E')]}));
 assert.equal(cb.bigComeback,true);assert.equal(api.headline(cb).kicker,'Comeback');
 const late=api.facts(base({gh:2,ga:1,goals:[g('home',10,'C'),g('away',40,'B'),g('home',89,'Wirtz')]}));
 assert.equal(late.lateWinner.scorer,'Wirtz');
 const h=api.headline(late);assert.equal(h.kicker,'Last Minute');assert.match(h.sub,/89\. Minute/);
});

test('draws, goalless games, penalties and losses get their own story',()=>{
 assert.equal(api.headline(api.facts(base({gh:0,ga:0,goals:[]}))).kicker,'Remis');
 assert.equal(api.headline(api.facts(base({gh:1,ga:1,goals:[g('away',20,'X'),g('home',90,'Y')]}))).kicker,'Spätes Glück');
 const pens=api.facts(base({gh:1,ga:1,pensWinner:'home',pensHome:5,pensAway:4,goals:[g('home',20,'Y'),g('away',60,'X')]}));
 assert.equal(pens.result,'win');assert.equal(api.headline(pens).kicker,'Elfmeter-Krimi');
 const blown=api.facts(base({gh:1,ga:2,goals:[g('home',10,'Y'),g('away',50,'X'),g('away',70,'Z')]}));
 assert.equal(blown.result,'loss');assert.equal(api.headline(blown).kicker,'Führung verspielt');
 const late=api.facts(base({gh:1,ga:2,goals:[g('home',10,'Y'),g('away',50,'X'),g('away',88,'Z')]}));
 assert.equal(api.headline(late).kicker,'Bitter');
});

test('the same match always gives the same text',()=>{
 const d=base({gh:2,ga:0,goals:[g('home',10,'A'),g('home',50,'B')]});
 assert.deepEqual(JSON.parse(JSON.stringify(api.story(api.facts(d)))),JSON.parse(JSON.stringify(api.story(api.facts(d)))));
 assert.equal(api.story(api.facts(d)).kicker,'Zu null');
});

test('the newspaper is loaded, cached and offered in the match report',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),app=fs.readFileSync(path.join(root,'footera-app.js'),'utf8');
 const v=(html.match(/footera-newspaper\.js\?v=(\d+)/)||[])[1];assert.ok(v,'script tag');
 assert.ok(html.includes(`footera-newspaper.css?v=${v}`));
 assert.ok(sw.includes(`./footera-newspaper.js?v=${v}`)&&sw.includes(`./footera-newspaper.css?v=${v}`),'service worker shell');
 assert.ok(html.indexOf('footera-newspaper.js')>html.indexOf('footera-app.js'),'loads after the app');
 assert.match(app,/FooteraNewspaper\?\.buttonHTML/);
});
