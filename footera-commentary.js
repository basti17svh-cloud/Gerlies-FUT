/* Footera V21.350 – live commentary and tactics read-out.
 * Pure presentation: no Math.random, no timers, no influence on the simulation.
 * Every pick is a hash of the match id and a running counter, so a match reads
 * the same when replayed, and recently used lines are skipped.
 */
(function(root){
 'use strict';
 function hash(value){let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
 const clean=v=>String(v??'').trim();
 function fill(text,v){return text.replace(/\{(\w+)\}/g,(_,k)=>clean(v[k]))}
 function memory(state){
  if(!state||typeof state!=='object')return{n:0,recent:[],notes:{}};
  if(!state.commentaryMemory||typeof state.commentaryMemory!=='object')state.commentaryMemory={n:0,recent:[],notes:{}};
  const m=state.commentaryMemory;if(!Array.isArray(m.recent))m.recent=[];if(!m.notes||typeof m.notes!=='object')m.notes={};m.n=Number(m.n)||0;return m;
 }
 // Picks a template from the list. Lines used in the last few calls are
 // skipped, so the same sentence does not come twice in a row.
 function choose(state,key,list,vars){
  const usable=(list||[]).filter(t=>t&&(!t.includes('{c}')||clean(vars.c))&&(!t.includes('{k}')||clean(vars.k))&&(!t.includes('{d}')||clean(vars.d))&&(!t.includes('{skill}')||clean(vars.skill)));
  if(!usable.length)return'';
  const m=memory(state),seed=hash(`${state?.resultId||'match'}|${key}|${m.n++}`);
  for(let i=0;i<usable.length;i++){
   const text=usable[(seed+i)%usable.length],id=key+':'+text;
   if(!m.recent.includes(id)||i===usable.length-1){m.recent.push(id);if(m.recent.length>18)m.recent.shift();return fill(text,vars)}
  }
  return fill(usable[0],vars);
 }
 const SKILL_NAMES=Object.freeze({'body-feint':'Körpertäuschung','stepover':'Übersteiger','ball-roll':'Ball-Roll','drag-back':'Zieher','roulette':'Roulette','heel-to-heel':'Hacke-Hacke-Trick','croqueta':'La Croqueta','berbatov':'Berbatov-Drehung','elastico':'Elastico','reverse-elastico':'Reverse Elastico'});
 const KIND_LABELS=Object.freeze({combination:'Kombination',through:'Steilpass',dribble:'Dribbling',cross:'Flanke',cutback:'Flach von außen',distance:'Fernschuss',switch:'Seitenwechsel'});

 // How the chance came about. {s}=shooter, {c}=creator, {team}=attacking team.
 const LEADS=Object.freeze({
  combination:['Doppelpass zwischen {c} und {s}.','Schnelles Kurzpassspiel von {team}, {c} legt auf {s}.','{c} und {s} spielen sich durch die Mitte.','Feine Kombination über {c}, am Ende kommt {s} an den Ball.','Direktspiel von {team}: drei Kontakte, dann ist {s} frei.','{team} lässt den Ball laufen, {c} findet {s} zwischen den Linien.'],
  through:['{c} spielt den Steilpass in die Schnittstelle.','Traumpass von {c} hinter die Abwehr, {s} ist durch.','{s} startet in die Tiefe und {c} sieht ihn.','{c} chippt den Ball über die Kette auf {s}.','Ein Pass, eine ganze Abwehr ausgespielt: {c} schickt {s}.'],
  dribble:['{s} nimmt Tempo auf und zieht ins Dribbling.','{s} tanzt an zwei Gegenspielern vorbei.','{s} geht ins Eins-gegen-eins und setzt sich durch.','{s} schüttelt den Gegenspieler mit einem Haken ab.','Solo von {s} über den halben Platz.'],
  dribbleSkill:['{s} lässt den Gegenspieler mit einem {skill} stehen.','{skill} von {s}, und schon ist er vorbei.','{s} packt den {skill} aus, die Fans springen auf.'],
  cross:['Flanke von {c} in den Strafraum, {s} steigt hoch.','{c} schlägt den Ball von außen herein.','Hohe Hereingabe von {c} auf den langen Pfosten.','{c} bringt die Flanke mit viel Schnitt, {s} lauert.','Über die Außenbahn: {c} flankt, {s} ist da.'],
  cutback:['{c} geht bis zur Grundlinie und legt flach zurück auf {s}.','Scharfe flache Hereingabe von {c} an den Fünfer.','Der Außenverteidiger hinterläuft, {c} spielt flach in die Mitte.','{c} zieht nach innen und legt quer auf {s}.','Flach von der Seite: {c} findet {s} am Elfmeterpunkt.'],
  distance:['{s} fasst sich aus der Distanz ein Herz.','Platz vor dem Strafraum, {s} zieht einfach mal ab.','{c} legt ab, {s} nimmt ihn aus 22 Metern.','{s} probiert es aus der zweiten Reihe.'],
  switch:['Langer Seitenwechsel von {c}, {s} hat plötzlich viel Platz.','{c} verlagert das Spiel mit einem Diagonalball auf {s}.','Ballverlagerung über das halbe Feld, {s} nimmt ihn mit.'],
  counter:['Konter! {team} schaltet nach dem Ballgewinn blitzschnell um.','Ballgewinn und sofort nach vorne: {team} kontert.','Umschaltmoment für {team}, drei gegen zwei!','Tempogegenstoß von {team}, {c} treibt den Ball nach vorne.'],
  corner:['Ecke von {c}, {s} geht zum Ball.','Eckball für {team}, {c} bringt ihn scharf herein.','{c} tritt die Ecke, im Strafraum wird geschoben und gezogen.'],
  throw_in:['Schneller Einwurf, {team} überrascht die Abwehr.','Einwurf weit in den Strafraum, {s} kommt an den Ball.','{c} wirft schnell ein und {team} ist sofort im Angriff.'],
  keeper_buildout:['Der Torwart leitet schnell ein, {team} spielt sich nach vorne.','Abstoß kurz, dann geht es über drei Stationen bis vor das Tor.','{team} baut geduldig von hinten auf, am Ende ist {s} frei.','Langer Abwurf, {team} ist sofort in der gegnerischen Hälfte.','{team} löst sich mit flachen Pässen aus der eigenen Hälfte.','Von hinten heraus gespielt, {c} öffnet das Spiel für {s}.'],
  freekick:['Freistoß aus rund 20 Metern, {s} legt sich den Ball zurecht.','Gefährlicher Freistoß für {team}. {s} läuft an.','{s} schaut auf die Mauer, dann auf das Tor.'],
  penalty:['Elfmeter für {team}! {s} schnappt sich den Ball.','Der Schiedsrichter zeigt auf den Punkt! {s} tritt an.','Strafstoß für {team}. {s} gegen {k}.']
 });
 const GOALS=Object.freeze({
  header:['{s} steigt am höchsten und köpft ein!','Kopfball von {s}, unhaltbar im Netz!','{s} nickt den Ball ins Eck!','Wuchtiger Kopfball, {k} ist ohne Chance!'],
  volley:['{s} nimmt ihn volley, der Ball zappelt im Netz!','Direktabnahme von {s}, was für ein Tor!','Volley aus der Luft, {s} trifft!'],
  bicycle:['Fallrückzieher! {s} trifft akrobatisch!','{s} mit dem Fallrückzieher, das Stadion steht Kopf!'],
  chip:['{s} lupft den Ball über {k} ins Tor!','Frech gelupft, {s} trifft!','{s} sieht {k} weit vor dem Tor und lupft ihn rein!'],
  finesse:['{s} zirkelt den Ball ins lange Eck!','Angeschnitten und unhaltbar, {s} trifft!','{s} legt ihn mit Gefühl in den Winkel!'],
  power:['{s} hämmert den Ball unter die Latte!','Ein Strahl von {s}, {k} sieht ihn kaum!','Mit voller Wucht, {s} trifft!'],
  low_driven:['Flach und hart ins Eck, {s} trifft!','{s} schießt flach ins kurze Eck!','Halbhoch und platziert, {s} lässt {k} keine Chance!'],
  normal:['{s} bleibt eiskalt und schiebt ein!','Und drin! {s} trifft!','{s} lässt {k} keine Chance!','{s} vollendet souverän!','{s} trifft ins Tor!','{s} schiebt den Ball an {k} vorbei ins Netz!'],
  distance:['Aus der Distanz! {s} trifft mit einem Traumtor!','Was für ein Hammer von {s}, der schlägt im Winkel ein!','Sonntagsschuss! {s} trifft aus über 20 Metern!'],
  penalty:['{s} verwandelt sicher, {k} ist in der falschen Ecke!','Souverän verwandelt, {s} trifft vom Punkt!','{s} schießt hoch in die Mitte, drin!'],
  freekick:['{s} zirkelt den Freistoß über die Mauer, TOR!','Freistoßtor! {s} trifft genau ins Eck!','Über die Mauer und rein, {s} trifft direkt!']
 });
 const SAVES=Object.freeze({
  normal:['{k} taucht ab und pariert!','Glanzparade von {k}!','{k} ist zur Stelle und hält.','{k} macht sich groß und wehrt ab.','{k} pariert mit dem Fuß!','Starker Reflex von {k}!'],
  header:['{k} fischt den Kopfball aus dem Eck!','{k} kratzt den Kopfball von der Linie!'],
  distance:['{k} lenkt den Fernschuss über die Latte.','{k} streckt sich und hat den Fernschuss.','Der Distanzschuss ist kein Problem für {k}.'],
  chip:['{k} bleibt lange stehen und fängt den Lupfer ab.'],
  big:['Riesenchance! Aber {k} gewinnt das Duell gegen {s}.','Die muss rein, doch {k} hält überragend!','Unglaublich, wie {k} den noch hält!'],
  penalty:['{k} hält den Elfmeter! Was für eine Parade!','{k} ahnt die Ecke und pariert den Strafstoß!'],
  freekick:['{k} ist am Freistoß dran und lenkt ihn zur Ecke.','Der Freistoß ist gut getreten, aber {k} hält.']
 });
 const BLOCKS=['{d} wirft sich in den Schuss!','Geblockt von {d}!','{d} ist mit dem Bein dazwischen.','{d} blockt den Abschluss von {s}.','Der Schuss von {s} bleibt an {d} hängen.'];
 const WIDES=Object.freeze({
  normal:['{s} zielt knapp vorbei.','Drüber! {s} verzieht.','{s} schießt am Tor vorbei.','Knapp daneben, {s} rauft sich die Haare.','Der Abschluss von {s} geht ins Aus.'],
  header:['Der Kopfball von {s} geht am Tor vorbei.','{s} köpft knapp über die Latte.'],
  distance:['Der Fernschuss von {s} rauscht über das Tor.','{s} versucht es aus der Distanz, deutlich drüber.'],
  big:['Die muss er machen! {s} vergibt aus kurzer Distanz.','Riesenchance vertan, {s} schießt frei vor dem Tor vorbei!','Unfassbar, {s} trifft das leere Tor nicht!']
 });
 const POSTS=['Pfosten! {s} hat Pech.','Aluminium! Der Ball klatscht an den Pfosten.','Nur der Pfosten rettet für {opp}!','Latte! {s} war so nah dran.'];
 const INTERCEPTIONS=['{d} liest den Pass von {c} und fängt ihn ab.','{d} geht dazwischen, Ballgewinn.','{d} antizipiert und schnappt sich den Ball.','Der Pass von {c} kommt nicht an, {d} ist zur Stelle.','{d} unterbindet den Spielaufbau von {team}.'];
 const TACKLES=Object.freeze({
  normal:['{d} stoppt {s} im Zweikampf.','Sauberes Tackling von {d} gegen {s}.','{d} grätscht {s} den Ball vom Fuß.','{d} stellt sich {s} in den Weg und gewinnt den Ball.'],
  dribble:['{s} versucht das Dribbling, aber {d} bleibt stehen.','{d} lässt sich von {s} nicht austanzen.'],
  cross:['{d} gewinnt das Kopfballduell gegen {s}.','{d} köpft die Flanke aus der Gefahrenzone.'],
  through:['{d} läuft {s} ab, der Steilpass ist verpufft.','{d} ist schneller als {s} und klärt.']
 });
 const THROWS=['Einwurf für {team}.','Der Ball ist im Aus, Einwurf {team}.','{team} bekommt einen Einwurf in der gegnerischen Hälfte.'];
 const DRAMA=Object.freeze({
  equaliser:['Der Ausgleich!','Alles wieder offen!','Ausgleich für {team}!'],
  lead:['{team} geht in Führung!','Die Führung für {team}!'],
  late:['Spätes Tor, das Stadion bebt!','In der Schlussphase! Was für ein Moment!'],
  winner:['Ist das der Siegtreffer?','Das könnte die Entscheidung sein!'],
  extend:['Das ist die Vorentscheidung.','{team} baut die Führung aus.'],
  comeback:['Was für eine Aufholjagd von {team}!'],
  brace:['Doppelpack für {s}!','{s} schnürt den Doppelpack!'],
  hattrick:['Hattrick! {s} trifft zum dritten Mal!'],
  icebreaker:['Endlich ist der Bann gebrochen!'],
  consolation:['Nur noch Ergebniskosmetik?','Der Anschlusstreffer für {team}!']
 });
 // Tactic notes only describe effects the simulation really applies.
 const NOTES=Object.freeze({
  highLine:['Die hohe Abwehrlinie von {opp} wird überspielt.','{opp} steht hoch und wird hinter der Kette erwischt.'],
  lowBlock:['Der tiefe Block von {opp} lässt kaum Steilpässe zu.'],
  press:['Das hohe Pressing von {dteam} zahlt sich aus.','{dteam} läuft früh an und erzwingt den Ballverlust.'],
  wide:['{team} sucht immer wieder den Weg über die Flügel.','Das Flügelspiel von {team} ist heute die Waffe.'],
  inside:['{team} spielt sich lieber durch das Zentrum.'],
  longShots:['{team} probiert es oft aus der Distanz, so wie es der Plan vorsieht.'],
  fast:['Genau so will {team} spielen: schnell und direkt nach vorne.'],
  patient:['Geduldiger Aufbau von {team}, der Ball läuft durch die Reihen.'],
  attacking:['{team} macht mit der offensiven Ausrichtung ordentlich Druck.'],
  defensive:['{team} steht kompakt und lauert auf Fehler.']
 });
 const teamTactics=raw=>{
  const x=raw&&typeof raw==='object'?raw:{},n=(k)=>Number.isFinite(Number(x[k]))?Number(x[k]):50;
  return{width:n('width'),depth:n('depth'),pressing:n('pressing'),dribbling:n('dribbling'),crossing:n('crossing'),longShots:n('longShots'),buildUp:['fast','patient'].includes(x.buildUp)?x.buildUp:'balanced',attackFocus:['wide','inside'].includes(x.attackFocus)?x.attackFocus:'balanced'};
 };
 // A short tactic note at most every 12 minutes per team.
 function tacticNote(state,ctx,phase){
  const m=memory(state),minute=Number(ctx.minute)||0,owner=phase==='defense'?ctx.defendingSide:ctx.side,last=Number(m.notes[owner]??-99);
  if(minute-last<12)return'';
  const att=teamTactics(ctx.attackTactics),def=teamTactics(ctx.defenseTactics),kind=ctx.kind,list=[];
  if(phase==='defense'){if(ctx.phase==='build'&&def.pressing>=65)list.push('press')}
  else{
   if(kind==='through'&&def.depth>=65)list.push('highLine');
   if(['cross','cutback'].includes(kind)&&(att.attackFocus==='wide'||att.crossing>=65||att.width>=65))list.push('wide');
   if(['combination','dribble'].includes(kind)&&att.attackFocus==='inside')list.push('inside');
   if(kind==='distance'&&att.longShots>=65)list.push('longShots');
   if(ctx.sceneKind==='turnover_counter'&&att.buildUp==='fast')list.push('fast');
   if(kind==='combination'&&att.buildUp==='patient')list.push('patient');
   if(!list.length&&ctx.attackStyle==='attacking'&&ctx.outcome==='goal')list.push('attacking');
  }
  if(!list.length)return'';
  const key=list[hash(`${state?.resultId}|note|${m.n}`)%list.length];
  m.notes[owner]=minute;
  return choose(state,'note-'+key,NOTES[key],ctx.vars);
 }
 function leadFor(state,ctx){
  const v=ctx.vars,scene=ctx.sceneKind,type=ctx.creationType;
  if(type==='penalty')return choose(state,'lead-penalty',LEADS.penalty,v);
  if(type==='freekick')return choose(state,'lead-freekick',LEADS.freekick,v);
  if(scene==='corner')return choose(state,'lead-corner',LEADS.corner,v);
  if(scene==='throw_in')return choose(state,'lead-throw',LEADS.throw_in,v);
  if(scene==='keeper_buildout')return choose(state,'lead-keeper',LEADS.keeper_buildout,v);
  if(scene==='turnover_counter')return choose(state,'lead-counter',LEADS.counter,v);
  if(ctx.kind==='dribble'&&v.skill)return choose(state,'lead-skill',LEADS.dribbleSkill,v);
  return choose(state,'lead-'+ctx.kind,LEADS[ctx.kind]||LEADS.combination,v);
 }
 function dramaFor(state,ctx){
  const v=ctx.vars,f=Number(ctx.scoreFor)||0,a=Number(ctx.scoreAgainst)||0,before=f-1,minute=Number(ctx.minute)||0,goals=Number(ctx.scorerGoals)||0;
  if(goals===3)return choose(state,'drama-hattrick',DRAMA.hattrick,v);
  if(minute>=85&&f===a)return choose(state,'drama-late',DRAMA.late,v)+' '+choose(state,'drama-eq',DRAMA.equaliser,v);
  if(minute>=85&&before===a)return choose(state,'drama-winner',DRAMA.winner,v);
  if(f===a&&Number(ctx.maxDeficit)>=2)return choose(state,'drama-comeback',DRAMA.comeback,v);
  if(f===a)return choose(state,'drama-eq',DRAMA.equaliser,v);
  if(goals===2)return choose(state,'drama-brace',DRAMA.brace,v);
  if(before===0&&a===0&&minute>=60)return choose(state,'drama-ice',DRAMA.icebreaker,v);
  if(before===a)return choose(state,'drama-lead',DRAMA.lead,v);
  if(f-a>=2&&f-a<=3)return choose(state,'drama-extend',DRAMA.extend,v);
  if(a-f>=2)return choose(state,'drama-consolation',DRAMA.consolation,v);
  return'';
 }
 function vars(ctx){
  return{s:ctx.shooter,c:ctx.creator,k:ctx.keeper,d:ctx.defender,team:ctx.team,opp:ctx.opponent,dteam:ctx.opponent,skill:SKILL_NAMES[ctx.skillMove]||''};
 }
 // Main entry. kind: goal|save|block|wide|post|interception|tackle|throw_in.
 function describe(state,kind,raw={}){
  const ctx={...raw,kind:raw.actionKind||raw.kind||'combination'},v=ctx.vars=vars(ctx);
  const finish=String(ctx.finish||'normal'),setPiece=ctx.creationType==='penalty'||ctx.creationType==='freekick';
  const big=Number(ctx.xg)>=.30&&!setPiece;
  if(kind==='throw_in')return{text:choose(state,'throw',THROWS,v),ticker:false};
  if(kind==='interception'||kind==='tackle'){
   const base=kind==='interception'?choose(state,'intercept',INTERCEPTIONS,v):choose(state,'tackle-'+(TACKLES[ctx.kind]?ctx.kind:'normal'),TACKLES[ctx.kind]||TACKLES.normal,v);
   const note=tacticNote(state,{...ctx,vars:{...v,dteam:ctx.opponent}},'defense');
   return{text:note?base+' '+note:base,ticker:!!note||Number(ctx.minute)%3===0,note:!!note};
  }
  const lead=leadFor(state,ctx);let result='';
  if(kind==='goal'){
   const list=ctx.creationType==='penalty'?GOALS.penalty:ctx.creationType==='freekick'?GOALS.freekick:ctx.kind==='distance'?GOALS.distance:GOALS[finish]||GOALS.normal;
   result=choose(state,'goal-'+finish+(ctx.creationType||''),list,v);
   const drama=dramaFor(state,ctx);if(drama)result+=' '+drama;
  }else if(kind==='save'){
   const list=ctx.creationType==='penalty'?SAVES.penalty:ctx.creationType==='freekick'?SAVES.freekick:big?SAVES.big:finish==='header'?SAVES.header:ctx.kind==='distance'?SAVES.distance:finish==='chip'?SAVES.chip:SAVES.normal;
   result=choose(state,'save-'+(big?'big':finish),list,v);
  }else if(kind==='block')result=choose(state,'block',BLOCKS,v);
  else if(kind==='post')result=choose(state,'post',POSTS,v);
  else{
   const list=big?WIDES.big:finish==='header'?WIDES.header:ctx.kind==='distance'?WIDES.distance:WIDES.normal;
   result=choose(state,'wide-'+(big?'big':finish),list,v);
  }
  const note=kind==='goal'||big||kind==='save'?tacticNote(state,ctx,'attack'):'';
  return{text:[lead,result,note].filter(Boolean).join(' '),ticker:true,note:!!note};
 }
 function card(state,color,name,team){
  const v={s:name,team};
  const list=color==='red'?['Rote Karte für {s}! {team} muss mit zehn Mann weiterspielen.','Platzverweis! {s} muss vom Feld.']:['Gelbe Karte für {s}.','{s} sieht Gelb nach einem taktischen Foul.','Verwarnung für {s}, das war zu spät.','{s} holt sich die Gelbe Karte ab.'];
  return choose(state,'card-'+color,list,v);
 }

 // ----- Tactics read-out: counts of real simulated attacks per move -----
 const MOVE_ORDER=Object.freeze(['wing','through','combination','dribble','distance','switch','counter','setpiece']);
 const MOVE_LABELS=Object.freeze({wing:'Über die Flügel',through:'Steilpässe',combination:'Kombinationen',dribble:'Dribblings',distance:'Fernschüsse',switch:'Seitenwechsel',counter:'Konter',setpiece:'Standards'});
 function moveOf(ctx){
  if(ctx.creationType==='penalty'||ctx.creationType==='freekick'||['corner','throw_in'].includes(ctx.sceneKind))return'setpiece';
  if(ctx.sceneKind==='turnover_counter')return'counter';
  if(['cross','cutback'].includes(ctx.kind))return'wing';
  return MOVE_LABELS[ctx.kind]?ctx.kind:'combination';
 }
 function emptySide(){const out={attacks:{},chances:{},goals:{},pressWins:0,duelWins:0};for(const k of MOVE_ORDER){out.attacks[k]=0;out.chances[k]=0;out.goals[k]=0}return out}
 function stats(state){
  if(!state.tacticStats||typeof state.tacticStats!=='object')state.tacticStats={home:emptySide(),away:emptySide()};
  return state.tacticStats;
 }
 function recordAttack(state,side,ctx,stage){
  if(!state||!['home','away'].includes(side))return;
  const s=stats(state)[side],move=moveOf({...ctx,kind:ctx.actionKind||ctx.kind});
  if(stage==='attack')s.attacks[move]++;else if(stage==='chance')s.chances[move]++;else if(stage==='goal')s.goals[move]++;
 }
 function recordWin(state,side,phase){
  if(!state||!['home','away'].includes(side))return;
  const s=stats(state)[side];if(phase==='build')s.pressWins++;else s.duelWins++;
 }
 function topMove(side){
  let best='',n=0;for(const k of MOVE_ORDER)if(side.attacks[k]>n){best=k;n=side.attacks[k]}
  return{move:best,count:n};
 }
 const total=o=>Object.values(o).reduce((a,b)=>a+(Number(b)||0),0);
 // One-line analysis during the match, from the real counts.
 function analysis(state,names){
  const st=stats(state),out=[];
  for(const side of ['home','away']){
   const s=st[side],all=total(s.attacks),top=topMove(s),team=side==='home'?names.home:names.away;
   if(all>=5&&top.move&&top.count/all>=.34)out.push({side,text:`Analyse: ${team} kommt vor allem ${top.move==='wing'?'über die Flügel':top.move==='counter'?'über Konter':top.move==='setpiece'?'über Standards':'mit '+MOVE_LABELS[top.move]}, ${top.count} von ${all} Angriffen.`});
   if(s.pressWins>=4)out.push({side,text:`Analyse: ${team} erobert viele Bälle schon im Aufbau, ${s.pressWins} Ballgewinne.`});
  }
  if(!out.length)return'';
  const m=memory(state),pick=out[hash(`${state?.resultId}|analysis|${m.n++}`)%out.length];
  return pick.text;
 }
 // Halftime and pre-extra-time tips for the player (home side). Each tip names
 // a setting that really changes the simulation.
 function tips(state,ctx){
  const st=stats(state),home=st.home,away=st.away,out=[];
  const opp=teamTactics(ctx.opponentTactics),own=teamTactics(ctx.ownTactics),diff=(Number(ctx.home)||0)-(Number(ctx.away)||0),poss=Number(ctx.poss)||50;
  if(away.pressWins>=3&&own.buildUp!=='patient')out.push(`${ctx.awayName} fängt viele Pässe im Aufbau ab (${away.pressWins}). Ein geduldiger Spielaufbau gibt euch mehr Ballbesitz.`);
  // Only one build-up advice at a time, so the tips never contradict each other.
  if(opp.depth>=62&&own.buildUp!=='fast'&&!out.length)out.push(`${ctx.awayName} verteidigt mit hoher Linie. Schneller Spielaufbau bringt mehr Steilpässe in den Rücken der Abwehr.`);
  if(opp.depth<=38&&own.longShots<60)out.push(`${ctx.awayName} steht tief. Mehr Fernschüsse oder Flanken können den Block knacken.`);
  if(diff<0&&ctx.tactic!=='attacking')out.push('Ihr liegt hinten. „Offensiv“ bringt mehr Druck nach vorne, öffnet aber hinten Räume.');
  if(diff>0&&ctx.tactic!=='defensive'&&Number(ctx.fitness)<82)out.push('Ihr führt und die Kräfte lassen nach. „Defensiv“ spart Kondition und sichert hinten ab.');
  if(poss<42&&diff<=0&&!out.length)out.push('Ihr habt wenig Ballbesitz. Ein geduldiger Spielaufbau oder ein passstarker Mittelfeldspieler hilft.');
  const top=topMove(home),all=total(home.attacks);
  const head=all?`Eure Angriffe bisher: ${MOVE_ORDER.filter(k=>home.attacks[k]).sort((a,b)=>home.attacks[b]-home.attacks[a]).slice(0,3).map(k=>`${MOVE_LABELS[k]} ${home.attacks[k]}`).join(', ')}.`:'';
  return{head,tips:out.slice(0,2),top:top.move};
 }
 function report(state){
  const st=stats(state),rows=MOVE_ORDER.map(k=>({key:k,label:MOVE_LABELS[k],home:st.home.attacks[k],away:st.away.attacks[k],homeGoals:st.home.goals[k],awayGoals:st.away.goals[k],homeChances:st.home.chances[k],awayChances:st.away.chances[k]})).filter(r=>r.home||r.away);
  return{rows,homePress:st.home.pressWins,awayPress:st.away.pressWins,homeDuels:st.home.duelWins,awayDuels:st.away.duelWins};
 }
 const api={describe,card,analysis,tips,report,recordAttack,recordWin,moveOf,SKILL_NAMES,KIND_LABELS,MOVE_LABELS,MOVE_ORDER,_hash:hash};
 root.FooteraCommentary=Object.freeze(api);if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
