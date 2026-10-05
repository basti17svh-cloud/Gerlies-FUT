const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const line=prefix=>{
 const value=html.split('\n').find(row=>row.startsWith(prefix));
 assert.ok(value,`Missing app source: ${prefix}`);
 return value;
};
const evolutionCode=['function activeEvolutionEntries(','function activeEvolutionForUid(','function isEvolutionItem('].map(line).join('\n');
const pricingCode=[evolutionCode,line('function packIsSpecial('),line('const SPECIAL_MARKET_MIN='),line('function isSpecialPricedItem(')].join('\n');
module.exports={line,evolutionCode,pricingCode};
