'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
// Keep expensive statistical balancing separate from the everyday regression
// suite. Print exclusions so a green run cannot be mistaken for those proofs.
const separate=new Set(['chem-boost-balance.test.cjs','match-simulation.test.cjs','more-goals.test.cjs','footera-opponent-balancing.test.cjs']);
const files=fs.readdirSync(path.join(root,'tests')).filter(name=>/\.test\.(cjs|mjs)$/.test(name)&&!separate.has(name)).sort().map(name=>'tests/'+name);
if(!files.length)throw Error('No standard regression tests found');
console.log(`Standard regression: ${files.length} test files. Separate suites: ${[...separate].join(', ')}`);
const result=spawnSync(process.execPath,['--test','--test-concurrency=4',...files],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
