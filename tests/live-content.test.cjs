const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const totw=html.slice(html.indexOf('const LIVE_TOTW='),html.indexOf('const MID_ICON_DATA='));
const active=html.slice(html.indexOf('function totwIsActive('),html.indexOf('function updateTotwMarketOption('));
const info=html.slice(html.indexOf('function totwInfo('),html.indexOf('function currentTotwBases('));
const prewarm=html.match(/^function prewarmLiveTotw\(\)\{.*$/m)?.[0];
const ctx={totwAliasMatch:()=>100,hydrateTotwFromEa:()=>{throw new Error('Expired content should not fetch')},setTimeout};
vm.createContext(ctx);vm.runInContext([totw,active,info,prewarm].join('\n'),ctx);

test('Team of the Week stops being live after its real expiry',()=>{
 assert.equal(ctx.totwIsActive(new Date(2026,8,23,23,59,59)),true);
 assert.equal(ctx.totwIsActive(new Date(2026,8,24,0,0,0)),false);
 assert.equal(ctx.totwIsActive(new Date(2026,8,24,12,0,0)),false);
 assert.equal(ctx.totwInfo({id:'277643'}),null);
 assert.doesNotThrow(()=>ctx.prewarmLiveTotw());
});
