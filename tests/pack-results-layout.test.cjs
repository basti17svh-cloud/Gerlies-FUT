const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// V21.197 (Basti): the pack result list must not scroll sideways on a phone.
test('pack result columns may shrink below their long button labels and buttons stack',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','footera-app.css'),'utf8');
 assert.match(css,/@media\(max-width:560px\)\{\.result-items-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
 assert.match(css,/\.result-item-actions\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.result-item\{min-width:0\}/);
});
