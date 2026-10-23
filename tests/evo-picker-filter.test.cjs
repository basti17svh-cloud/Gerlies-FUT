const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=require('./helpers/app-html.cjs')();
const css=fs.readFileSync(path.join(__dirname,'../evo-picker.css'),'utf8');
const code=html.slice(html.indexOf('const EVO_PICKER_GROUPS='),html.indexOf('function applyEvoPickerFilter('));

test('evolution picker search ignores accents and groups positions',()=>{
 const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(ctx.evoPickerKey('  Péter  GULÁCSI '),'peter gulacsi');
 assert.deepEqual(['GK','CB','RWB','CDM','CAM','LW','ST'].map(ctx.evoPickerPosGroup),['GK','DEF','DEF','MID','MID','ATT','ATT']);
 const filter=ctx.evoPickerFilterHTML(['GK'],288);
 assert.match(filter,/id="evoPickerSearch"/);
 assert.match(filter,/288 von 288</);
 assert.doesNotMatch(filter,/data-evo-filter-pos/,'one position group needs no position chips');
 assert.match(ctx.evoPickerFilterHTML(['GK','DEF'],5),/data-evo-filter-pos="DEF">ABW</);
});

test('evolution picker list runs to the bottom of the screen',()=>{
 assert.match(html,/<link rel="stylesheet" href="\.\/evo-picker\.css\?v=\d+">/);
 assert.match(css,/#evoPickerBody \.evo-candidate-grid\{[^}]*max-height:none/);
 assert.match(css,/#evoPickerModal \.evo-modalinner\{[^}]*height:100%/);
 assert.match(html,/data-evo-name="\$\{esc\(evoPickerKey\(b\.name\)\)\}"/);
});
