"use strict";
/* Footera Champions Player Picks: pure reward planning and pool validation.
 * No client-side account crediting or entitlement creation is permitted here.
 * The authenticated backend must issue entitlements and commit choices atomically.
 */
(function(root){
 const RANK_PICKS=Object.freeze({"Rang I":3,"Rang II":2,"Rang III":2,"Rang IV":1,"Rang V":1,"Rang VI":1});
 const EXCLUDED=/founder|icon|sbc|objective|evolution/i;
 function rankEntitlements(rank){return Array.from({length:RANK_PICKS[String(rank)]||0},()=>({type:"champions-red",choices:4,minRating:85,tradeable:false}))}
 function eligible(card,activeTotwId,activeEvents=[]){
  if(!card||typeof card!=="object")return false;
  const rating=Number(card.rating??card.ovr??card.ges);
  if(!Number.isFinite(rating)||rating<85)return false;
  const type=String(card.cardType??card.type??card.series??"");
  if(EXCLUDED.test(type)||card.exclusive===true)return false;
  const promo=String(card.promoId??card.eventId??"");
  const totw=String(card.totwId??card.teamOfTheWeek??"");
  return !!((activeTotwId&&totw===String(activeTotwId)&&/totw/i.test(type))||(promo&&activeEvents.includes(promo)));
 }
 function pool(cards,activeTotwId,activeEvents=[]){
  const seen=new Set();
  return (Array.isArray(cards)?cards:[]).filter(card=>{
   const key=String(card.id??card.playerId??"");
   if(!key||seen.has(key)||!eligible(card,activeTotwId,activeEvents))return false;
   seen.add(key);return true
  })
 }
 function validateOptions(cards,activeTotwId,activeEvents=[]){
  const allowed=pool(cards,activeTotwId,activeEvents);
  return {eligible:allowed,canOfferFour:allowed.length>=4,reason:allowed.length>=4?"":"Zu wenige berechtigte 85+-Karten; keine falschen Spieler oder Ratings als Ersatz erzeugen."}
 }
 function validateSelection(offer,selectedId){
  if(!offer||!Array.isArray(offer.options)||offer.options.length!==Number(offer.choices||4))return false;
  const ids=offer.options.map(option=>String(option&&option.id||""));
  return ids.every(Boolean)&&new Set(ids).size===ids.length&&ids.includes(String(selectedId||""));
 }
 const api=Object.freeze({rankEntitlements,eligible,pool,validateOptions,validateSelection});
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.FooteraChampionsPicks=api;
})(typeof globalThis!=="undefined"?globalThis:this);
