/* Footera V21.127: Points purchase entry – deliberately sandbox-only. */
(()=>{
 "use strict";
 const offers=[
  {id:"100",amount:"100",price:"0,59 €"},
  {id:"500",amount:"500",price:"2,99 €"},
  {id:"1050",amount:"1.050",price:"5,99 €"},
  {id:"1600",amount:"1.600",price:"8,99 €"},
  {id:"2800",amount:"2.800",price:"14,99 €"},
  {id:"5900",amount:"5.900",price:"29,99 €"},
  {id:"12000",amount:"12.000",price:"59,99 €"},
  {id:"18500",amount:"18.500",price:"89,99 €"},
 ];
 const permitted=new Set(offers.map(o=>o.id));
 function init(){
  const open=document.getElementById("footeraPointsBuyTrigger");
  const modal=document.getElementById("footeraPointsPurchaseModal");
  const close=document.getElementById("footeraPointsPurchaseClose");
  const grid=document.getElementById("footeraPointsOffers");
  if(!open||!modal||!close||!grid)return;
  grid.innerHTML=offers.map(o=>
    '<button class="footera-points-pack" type="button" data-footera-points-pack="'+o.id+'" aria-label="'+o.amount+' Footera Points für '+o.price+' im Testmodus auswählen">'+
    '<span class="footera-points-pack-head"><img src="./assets/footera/points.webp" alt="" aria-hidden="true">FOOTERA POINTS</span>'+
    '<strong class="footera-points-pack-amount">'+o.amount+'</strong>'+
    '<span class="footera-points-pack-cost">'+o.price+'<span>Testkauf →</span></span>'+
    '</button>'
  ).join("");
  function showOffers({required=0,available=0,source=""}={}){
   const note=document.getElementById("footeraPointsNeedNote");
   const price=Math.max(0,Math.trunc(Number(required)||0));
   const usable=Math.max(0,Math.trunc(Number(available)||0));
   if(note){
    note.hidden=!price;
    note.textContent=price?("Für "+(source||"diesen Kauf")+" benötigst du "+price.toLocaleString("de-DE")+" Points. "+
     "Es fehlen "+Math.max(0,price-usable).toLocaleString("de-DE")+" Points."+
     (source==="Premium Season Pass"||source.startsWith("Evolution ")?
      " Hinweis: Gekaufte Sandbox-Points sind momentan nur für Packs einsetzbar, nicht für Evolutions oder den Season Pass.":
      " Kostenloses und gekauftes Guthaben werden beim Packkauf derzeit getrennt verwendet.")):"";
   }
   modal.scrollTop=0;
   showUiLayer("footeraPointsPurchaseModal","footera-points");
   return true;
  }
  window.FooteraPointsShop=Object.freeze({open:showOffers});
  open.addEventListener("click",()=>showOffers());
  close.addEventListener("click",()=>closeUiLayer("footeraPointsPurchaseModal","footera-points"));
  grid.addEventListener("click",async e=>{
   const choice=e.target.closest("button[data-footera-points-pack]");
   if(!choice || !permitted.has(choice.dataset.footeraPointsPack))return;
   // LIVE only after explicit public release; server still verifies identity,
   // EUR price, independent keys and payment flags.
   if(window.FOOTERA_LIVE_STORE_ENABLED===true){
    if(typeof window.FooteraPaidWallet?.checkoutLive!=="function"){
     if(typeof toast==="function")toast("Echtgeld-Checkout nicht verfügbar.");
     return;
    }
    choice.disabled=true;
    try{
     const url=await window.FooteraPaidWallet.checkoutLive(choice.dataset.footeraPointsPack);
     location.assign(url);
    }catch(error){
     if(typeof toast==="function")toast(error?.message||"Stripe Checkout nicht erreichbar.");
     else console.warn("Footera LIVE Checkout",error);
    }finally{choice.disabled=false}
    return;
   }
   // Default remains Sandbox. Never credit browser-generated local Points.
   location.assign("./online/stripe-sandbox-test.html?pack="+encodeURIComponent(choice.dataset.footeraPointsPack));
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

 // Analytics is optional and isolated from the Points Store.
 (()=>{
   if(document.getElementById("footeraVisitorAnalyticsScript"))return;
   const s=document.createElement("script");
   s.id="footeraVisitorAnalyticsScript";
   s.src="./footera-visitor-analytics.js";
   s.defer=true;
   document.head.append(s);
 })();
