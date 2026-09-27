"use strict";
const FOOTERA_TIME_ZONE="Europe/Berlin";
const BERLIN_CLOCK=new Intl.DateTimeFormat("en-GB",{timeZone:FOOTERA_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function berlinParts(at){return Object.fromEntries(BERLIN_CLOCK.formatToParts(at).filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]))}
function berlinInstant(year,month,day,hour=0,minute=0){
 const guess=Date.UTC(year,month-1,day,hour,minute),p=berlinParts(new Date(guess));
 return new Date(guess-(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)-guess))
}
function berlinShiftDays(at,days,hour,minute=0){
 const p=berlinParts(at),d=new Date(Date.UTC(p.year,p.month-1,p.day+days));
 return berlinInstant(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),hour,minute)
}
function berlinWeekStart(at,weekday,hour){
 const date=new Date(at),p=berlinParts(date),d=new Date(Date.UTC(p.year,p.month-1,p.day));
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()-weekday+7)%7);
 let start=berlinInstant(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),hour);
 if(date<start)start=berlinShiftDays(start,-7,hour);
 return start
}
