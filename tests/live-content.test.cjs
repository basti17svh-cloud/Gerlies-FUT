const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const weeks=html.slice(html.indexOf('const TOTW_WEEK_1='),html.indexOf('const MID_ICON_DATA='));
const active=html.slice(html.indexOf('function totwIsActive('),html.indexOf('function updateTotwMarketOption('));
const ctx={Intl,Date};
vm.createContext(ctx);vm.runInContext([weeks,active].join('\n'),ctx);

test('Team der Woche wechselt mittwochs um 19 Uhr Berliner Zeit und läuft eine Woche',()=>{
 const current=iso=>ctx.activeTotwWeek(new Date(iso))?.id||null;
 assert.equal(current('2026-09-23T16:59:59Z'),1);
 assert.equal(current('2026-09-23T17:00:00Z'),2);
 assert.equal(current('2026-09-30T16:59:59Z'),2);
 assert.equal(current('2026-09-30T17:00:00Z'),null);
 assert.equal(ctx.totwIsActive(new Date('2026-09-30T17:00:00Z')),false);
 assert.equal(ctx.totwDisplayName('Team of the Week 2'),'Team der Woche 2');
});
