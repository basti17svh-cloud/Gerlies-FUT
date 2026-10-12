/* Footera V21.124: Points purchase entry – deliberately sandbox-only. */
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
  open.addEventListener("click",()=>{modal.scrollTop=0;showUiLayer("footeraPointsPurchaseModal","footera-points");});
  close.addEventListener("click",()=>closeUiLayer("footeraPointsPurchaseModal","footera-points"));
  grid.addEventListener("click",e=>{
   const choice=e.target.closest("button[data-footera-points-pack]");
   if(!choice || !permitted.has(choice.dataset.footeraPointsPack))return;
   // Sandbox-only flow. Do not credit client-generated state.points.
   location.assign("./online/stripe-sandbox-test.html?pack="+encodeURIComponent(choice.dataset.footeraPointsPack));
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
