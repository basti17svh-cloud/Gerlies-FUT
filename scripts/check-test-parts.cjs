'use strict';
// V21.408: the full Node regression runs match-simulation and chem-boost-balance in parallel parts
// selected by --test-name-pattern. This guard fails if a test of those files is in no part
// (would silently stop running) or in two parts (wasted time).
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const wf=fs.readFileSync(path.join(root,'.github/workflows/footera-v21259-regression.yml'),'utf8');
const parts=[...wf.matchAll(/- part: (.+)\n\s+files: (.+)\n\s+pattern: '(.*)'/g)].map(m=>({part:m[1].trim(),file:m[2].trim(),pattern:m[3]}));
let bad=0;
for(const file of [...new Set(parts.filter(p=>p.file!=='REST').map(p=>p.file))]){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const names=[...src.matchAll(/^test\((['"`])(.+?)\1/gm)].map(m=>m[2]);
 if(!names.length){console.error('no tests found in',file);bad++;continue}
 for(const name of names){
  const hits=parts.filter(p=>p.file===file&&new RegExp(p.pattern).test(name)).map(p=>p.part);
  if(hits.length!==1){console.error(`${file}: "${name}" is in ${hits.length} parts (${hits.join(', ')||'none'})`);bad++}
 }
 console.log(`${file}: ${names.length} tests, each in exactly one part`);
}
if(bad)process.exit(1);
