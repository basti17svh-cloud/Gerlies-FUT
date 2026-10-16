"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const picks=require("../champions-player-picks.js");
test("Champions rank I yields three red picks",()=>{const rows=picks.rankEntitlements("Rang I");assert.equal(rows.length,3);assert.ok(rows.every(r=>r.choices===4&&r.minRating===85&&r.tradeable===false))});
test("expired event is never eligible",()=>{assert.equal(picks.eligible({id:"a",rating:90,type:"momentum",eventId:"old"},"totw5",[]),false)});
test("current TOTW and active event qualify",()=>{assert.equal(picks.eligible({id:"a",rating:86,type:"totw",totwId:"totw5"},"totw5",[]),true);assert.equal(picks.eligible({id:"b",rating:88,type:"momentum",eventId:"live"},"totw5",["live"]),true)});
test("founders and low rated cards excluded",()=>{assert.equal(picks.eligible({id:"x",rating:99,type:"founder",eventId:"live"},"totw5",["live"]),false);assert.equal(picks.eligible({id:"y",rating:84,type:"totw",totwId:"totw5"},"totw5",[]),false)});
test("pool deduplicates and does not invent four options",()=>{const a=[{id:"1",rating:85,type:"totw",totwId:"t"},{id:"1",rating:85,type:"totw",totwId:"t"}];assert.equal(picks.validateOptions(a,"t").canOfferFour,false);assert.equal(picks.pool(a,"t").length,1)});
