'use strict';
// V21.495: a realistic, very large club (default 5.000 cards) for save-size tests.
const NAMES=['Ibrahimović','Modrić','Šeško','Gündoğan','Ødegaard','Müller','Mbappé','Gvardiol','Kovačić','Szoboszlai','Yıldız','Dembélé','Rüdiger','Çalhanoğlu','Núñez'];
const VARIANTS=['gold','silver','bronze','totw','halloween','blackfriday','icon','evo'];
function bigClub(count=5000){
 const club=[];
 for(let i=0;i<count;i++){
  const item={uid:'u'+i.toString(36)+'-'+(i*7919%100000).toString(36),pid:String(10000+(i*37)%17000),variant:VARIANTS[i%VARIANTS.length],
   tradeable:i%3!==0,rare:i%2===0,createdAt:1763000000000+i*60000,acquisitionSource:i%5?'pack':'sbc',
   clubGoals:i%11,clubAssists:i%7,chem:i%4,contract:20+(i%30)};
  item.baseSnapshot={id:item.pid,name:NAMES[i%NAMES.length]+' '+i,ovr:70+(i%25),pos:['ST','CM','CB','GK'][i%4],club:'Club '+(i%180),league:'Liga '+(i%30),nation:'Land '+(i%90),stats:[60+i%30,55+i%40,70+i%20,50+i%45,65+i%30,72+i%25],playstyles:['Finesse Shot','Quick Step','Incisive Pass'].slice(0,1+i%3),altPos:['LW','RW','CAM'].slice(0,i%3),img:'https://cdn.example/players/'+item.pid+'.png'};
  if(i%2===0)item.clubStats={version:1,overall:{matches:5+i%30,goals:i%9,assists:i%6,minutes:400+i%2000,ratingTotal:31.5+i%40,ratedMatches:5+i%30},modes:{squad:{matches:3+i%20,goals:i%5}}};
  club.push(item);
 }
 return {version:128,onboarded:true,coins:1234567,points:4321,profile:{saveId:'GF-TEST5000',clubName:'Großer Verein FC'},club,sbcStorage:[],squad:club.slice(0,23).map(c=>c.uid),stats:{wins:812,draws:99,losses:201}};
}
module.exports={bigClub};
