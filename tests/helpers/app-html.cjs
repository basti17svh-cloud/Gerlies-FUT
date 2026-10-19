'use strict';
// index.html links its big stylesheet; tests read the page as the one file it used to be.
const fs=require('fs'),path=require('path');
const PARTS=[[/<link rel="stylesheet" href="\.\/footera-app\.css\?v=\d+">/,'footera-app.css','<style>\n','</style>']];
module.exports=function appHtml(root=path.join(__dirname,'..','..')){
 let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const[pattern,file,open,close]of PARTS)html=html.replace(pattern,()=>open+fs.readFileSync(path.join(root,file),'utf8')+close);
 return html;
};
