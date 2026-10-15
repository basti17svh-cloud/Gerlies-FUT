/* Legacy Event V21.158: real shared renderer at market, squad, collection and pack sizes. */
const {chromium}=require("playwright");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.join(__dirname,".."),out=path.join(root,"test-artifacts","legacy-v21158");
fs.mkdirSync(out,{recursive:true});
const mime={".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".webmanifest":"application/manifest+json"};
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
 if(file===root)file=path.join(root,"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{let body=fs.readFileSync(file);
  if(file.endsWith("index.html")){let html=body.toString(),last=html.lastIndexOf("<script>");if(last>=0)html=html.slice(0,last)+html.slice(html.indexOf("</script>",last)+9);body=Buffer.from(html)}
  res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");res.end(body)
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const baseUrl="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
  await page.goto(baseUrl,{waitUntil:"load"});
  await page.evaluate(()=>{
   for(const id of ["bootIntro","dbGate","onboarding","usernameRequiredModal"])document.getElementById(id)?.remove();
   const player={id:"legacy-layout-test",name:"E. Anderson",position:"CDM",alt:"CAM,RM",ovr:88,nation:"England",team:"Manchester City",league:"Premier League",pac:71,sho:83,pas:82,dri:87,def:85,phy:78};
   const item={pid:player.id,uid:"legacy-v21158-test",variant:"special",eventName:"Legacy Event",displayRating:88,playstyles:["power-shot","through-ball","finesse-shot"]};
   const box=document.createElement("section");box.id="legacy-v21158-fixtures";
   box.style.cssText="position:relative;z-index:9999;background:#07040d;padding:10px;display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;width:100%;";
   const contexts=[["market",150,false],["squad",98,true],["profile",205,false],["pack",185,false]];
   for(const [name,width,mini] of contexts){
    const wrap=document.createElement("div");wrap.dataset.context=name;wrap.style.cssText="width:"+width+"px;max-width:100%;flex:none;";
    wrap.innerHTML=cardHTML(player,item,mini);box.appendChild(wrap)
   }
   document.body.appendChild(box);
  });
  for(const viewport of [320,360,390,412,768]){
   await page.setViewportSize({width:viewport,height:844});
   const result=await page.evaluate(()=>{
    const rect=el=>el.getBoundingClientRect(),inside=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    return Array.from(document.querySelectorAll("#legacy-v21158-fixtures [data-context]")).map(wrap=>{
     const shell=wrap.querySelector(".card-shell"),card=wrap.querySelector(".custom-card.legacy");
     const name=card?.querySelector(".pname"),stats=card?.querySelector(".stats"),face=card?.querySelector(".face"),alt=card?.querySelector(".card-alt-positions");
     const top=card?.querySelector(".card-top"),emblems=card?.querySelector(".card-icons");
     const styles=shell?.querySelector(".playstyle-card-row"),statItems=stats?Array.from(stats.querySelectorAll("span")):[];
     if(!card||!name||!stats||!face||!alt||!top||!styles)return {context:wrap.dataset.context,error:"missing renderer fields"};
     const cardRect=rect(card),nameRect=rect(name),statsRect=rect(stats),faceRect=rect(face),altRect=rect(alt),playRect=rect(styles);
     const six=statItems.length===6&&statItems.every(el=>rect(el).width>0&&inside(rect(el),statsRect));
     const order=faceRect.bottom<=nameRect.top+1.5&&nameRect.bottom<=statsRect.top+1.5&&statsRect.bottom<=playRect.top+1.5&&playRect.bottom<=altRect.top+1.5;
     const bounds=[name,stats,face,alt,top,emblems,styles].filter(Boolean).every(el=>inside(rect(el),cardRect));
     const readable=statItems.every(el=>el.querySelector("b")?.textContent.trim()&&el.querySelector("small")?.textContent.trim())&&name.textContent.trim()==="E. Anderson";
     const purple=getComputedStyle(card).backgroundImage.includes("rgb(50, 16, 82)")||getComputedStyle(card).backgroundImage.includes("#321052");
     return {context:wrap.dataset.context,six,order,bounds,readable,purple,styles:styles.querySelectorAll(".playstyle-card-icon").length};
    });
   });
   for(const r of result){
    assert.equal(r.error,undefined,viewport+"px "+r.context+" "+r.error);
    assert.equal(r.six,true,viewport+"px "+r.context+" all six stats visible");
    assert.equal(r.order,true,viewport+"px "+r.context+" portrait/name/stats/PlayStyles/positions separated");
    assert.equal(r.bounds,true,viewport+"px "+r.context+" within card bounds");
    assert.equal(r.readable,true,viewport+"px "+r.context+" readable six fields");
    assert.equal(r.purple,true,viewport+"px "+r.context+" violet theme");
    assert.ok(r.styles>=1,viewport+"px "+r.context+" PlayStyle badge");
   }
   await page.locator("#legacy-v21158-fixtures").screenshot({path:path.join(out,"legacy-"+viewport+".png")});
   console.log("PASS",viewport+"px",result.map(x=>x.context).join(","));
  }
  assert.equal(errors.length,0,"No browser runtime exceptions: "+errors.join(" | "));
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>server.close());
