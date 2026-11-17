/*
 * Footera V21.445 — Traumtore: authored signature goals (13), V21.449: +21, V21.450: +15, V21.451: +13 new scenes.
 * Basti (16.11.2026): "Die Tore sehen tatsächlich viele sehr identisch aus."
 * Every older play ends in the same strike: a straight 1.25 s shot from the
 * box edge. These scenes bring their own build-up, their own finishing
 * technique and their own ball flight (real bend, dip, knuckle wobble,
 * heel flick, overhead kick, diving header).
 * PRESENTATION ONLY. The simulator owns scorer, chance and outcome; the
 * same scene is shown for a goal, a save, the post or a miss.
 * Local frame as in 3d-playbook.mjs: -Z is the attacked goal (line -52.5),
 * x is lateral metres, the canonical contact is at 5.4 s.
 */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;

// One authored scene per entry; `mirror` adds the same scene on the other wing.
// routes: actor -> [[t,x,z],...]; beats: pass [release,arrival] per order step;
// arcs: optional height per pass; flight: ball flight after contact.
//  flight.post: fixed far-post side (+1/-1, mirrored) or 0 = simulator placement
//  flight.goal: [|x|,y] of the goal impact, flight.bend: [cp1x,cp2x] lateral
//  control offsets (mirrored), flight.rise: [cp1y,cp2y], flight.wobble: [x,y]
//  rate: shot playback rate (1.5 = every older shot), contact: own contact
//  offset in the scorer's goal-facing frame [lateral,height,-37+forward].
const BASE=[
 {id:'dream_robben_cut_right',sims:['normal','finesse'],mirror:'dream_robben_cut_left',family:'dribble',finish:'finesse',delivery:'short',
  order:[6,7,0],length:'long',weight:9,kinds:['dribble','cutback'],foot:'Left',style:'curl',title:'Robben-Schlenzer',
  routes:{
   0:[[0,25,-21],[1,25.4,-24.2],[2.05,24.6,-28],[2.9,23.3,-32.4],[3.55,20.6,-35.1],[4.25,15.9,-35.9],[4.85,11.9,-35.4],[5.4,9,-34.9],[6.4,7.4,-36.1]],
   5:[[0,27,-14],[2,27,-21],[3.6,26.2,-30],[5.4,24.6,-36.5]],
   6:[[0,-5,-15],[.35,-4.8,-15.4],[1.6,-2.5,-19.5],[3.2,.5,-24.5],[5.4,2.5,-29]],
   7:[[0,9,-17],[1,10.6,-20.2],[1.3,10.9,-20.8],[2.6,11.6,-24],[4,10.4,-27.5],[5.4,7.5,-30]]},
  beats:[[.35,1],[1.3,2.05]],
  flight:{post:-1,goal:[3.02,1.92],bend:[-3.4,-2.7],rise:[1.05,1.0],rate:1.5}},
 {id:'dream_trivela_left',sims:['normal','finesse'],mirror:'dream_trivela_right',family:'combination',finish:'finesse',delivery:'short',
  order:[6,3,0],length:'medium',weight:8,kinds:['combination'],foot:'Right',style:'outside',title:'Außenrist-Schlenzer',
  routes:{
   0:[[0,-12,-22],[1.5,-12.6,-25.2],[3.9,-11.2,-30],[4.6,-10.4,-31.5],[5.4,-9.6,-32.6],[6.4,-8.6,-34]],
   3:[[0,-3,-21],[1.3,-4.2,-25.3],[2.9,-6.2,-28.4],[4,-4.8,-31.5],[5.4,-3.2,-35]],
   6:[[0,-9,-15],[.4,-9,-15.8],[2.4,-7.5,-20.5],[5.4,-5.5,-27]]},
  beats:[[.4,1.3],[2.9,3.9]],
  flight:{post:1,goal:[2.98,1.22],bend:[-2.3,-1.6],rise:[.75,.6],rate:1.5}},
 {id:'dream_rocket_dip',sims:['power','normal'],family:'distance',finish:'power',delivery:'short',
  order:[3,6,0],length:'medium',weight:9,kinds:['distance'],style:'dip',title:'Distanzhammer',
  routes:{
   0:[[0,-7,-14],[1.5,-6.1,-16.6],[3.3,-4.6,-19.6],[4.2,-3.8,-21.4],[4.85,-3.3,-22.6],[5.4,-3,-23.5],[6.4,-2.6,-25]],
   3:[[0,-2,-24],[.4,-1.8,-24.4],[1.4,-1.2,-26.8],[3.1,-1.6,-28.5],[5.4,1.2,-33.5]],
   6:[[0,-10,-12],[1.4,-9.6,-14.8],[3.1,-8.3,-17.8],[5.4,-7.2,-23.5]]},
  beats:[[.4,1.4],[3.1,4.2]],
  flight:{post:0,goal:[2.95,2.12],bend:[0,0],rise:[3.1,2.25],rate:1.5}},
 {id:'dream_knuckle_right',sims:['power','normal'],family:'distance',finish:'power',delivery:'short',
  order:[7,2,0],length:'medium',weight:8,kinds:['distance'],style:'knuckle',title:'Flatterball',
  routes:{
   0:[[0,7,-15],[1.6,6.5,-17.6],[3.4,5.6,-21],[4.3,5,-22.6],[4.9,4.8,-23.5],[5.4,4.6,-24.3],[6.4,4,-25.8]],
   2:[[0,22,-20],[1.3,19.2,-24],[3.2,15.4,-27],[5.4,14,-32]],
   7:[[0,8,-21],[.4,8.4,-21.4],[2,9,-25],[5.4,8,-30]]},
  beats:[[.4,1.3],[3.2,4.3]],
  flight:{post:0,goal:[1.78,1.42],bend:[.2,-.1],rise:[1.35,1.1],wobble:[.42,.2],rate:1.5}},
 {id:'dream_backheel_left',sims:['normal','low_driven'],mirror:'dream_backheel_right',family:'cutback',finish:'backheel',delivery:'driven',
  order:[3,1,0],length:'medium',weight:9,kinds:['cutback'],style:'backheel',title:'Hackentor',direct:true,
  routes:{
   0:[[0,3,-33],[2,2.8,-37.2],[3.6,2.3,-40.6],[4.6,.3,-44.6],[5.15,-1.15,-46.75],[5.4,-1.4,-47.15],[6.3,-1.8,-47.6]],
   1:[[0,-22,-24],[1.25,-21.5,-29],[2.4,-20.5,-36],[3.5,-18.7,-43],[4.45,-16.9,-48.3],[5.4,-15.8,-49.6]],
   3:[[0,-4,-22],[.4,-4.2,-22.5],[2.5,-3,-30],[5.4,2.6,-40.8]]},
  beats:[[.4,1.25],[4.45,5.4]],arcs:[.06,.09],
  contact:[.12,.13,-37.32],
  flight:{post:1,goal:[1.42,.3],bend:[.25,.15],rise:[.12,.06],rate:3.2}},
 {id:'dream_bicycle_right',sims:['header','volley'],mirror:'dream_bicycle_left',family:'cross',finish:'bicycle',delivery:'cross',
  order:[3,2,0],length:'medium',weight:5,kinds:['cross'],style:'bicycle',title:'Fallrückzieher',direct:true,
  routes:{
   0:[[0,-1,-30],[2,-.6,-35],[3.6,.7,-39.5],[4.6,1,-41.7],[5.4,.6,-42.6],[6.6,.5,-43.2]],
   2:[[0,23,-23],[1.4,22.5,-28],[2.6,22,-34],[3.85,21,-40.5],[5.4,20,-43]],
   3:[[0,3,-22],[.4,3.2,-22.4],[2.4,5,-28],[5.4,6.5,-36]]},
  beats:[[.4,1.4],[3.85,5.4]],arcs:[.06,3.1],
  flight:{post:0,goal:[2.32,1.38],bend:[0,0],rise:[.5,.3],rate:2}},
 {id:'dream_diving_header_right',sims:['header'],mirror:'dream_diving_header_left',family:'cross',finish:'header',delivery:'driven',
  order:[6,5,0],length:'medium',weight:7,kinds:['cross'],style:'dive',title:'Flugkopfball',direct:true,
  routes:{
   0:[[0,2,-31],[2,1.5,-36],[3.8,2.8,-41],[4.8,3.25,-44.2],[5.4,3,-45.6],[5.95,2.8,-46.9],[6.6,2.7,-47.25]],
   5:[[0,27,-15],[1.5,26.6,-21],[2.8,25.4,-31],[4.25,22.5,-41.8],[5.4,21,-44]],
   6:[[0,8,-16],[.4,8.2,-16.4],[2,9,-21],[5.4,9.5,-30]]},
  beats:[[.4,1.5],[4.25,5.4]],arcs:[.06,.42],
  contact:[0,.62,-37.78],
  flight:{post:0,goal:[2.42,.62],bend:[0,0],rise:[.05,0],rate:2.4}},
 {id:'dream_layoff_volley',sims:['power','normal','volley'],family:'distance',finish:'volley',delivery:'loft',
  order:[6,4,3,0],length:'long',weight:7,kinds:['distance'],style:'volley',title:'Ablage-Volley',direct:true,
  routes:{
   0:[[0,-4,-18],[1.6,-3.2,-21.5],[3.4,-2,-26],[4.6,-1.6,-28.6],[5.4,-1.5,-30],[6.4,-1.2,-31.6]],
   3:[[0,1,-26],[1.8,1.4,-36],[3.2,1,-41],[4,1.2,-41.6],[5.4,2,-42]],
   4:[[0,-26,-16],[.6,-26,-18],[1.3,-25.6,-24],[2,-25,-30],[5.4,-23,-36]],
   6:[[0,-10,-14],[.4,-10,-14.6],[2.4,-8,-19],[5.4,-6.5,-25]]},
  beats:[[.4,1.3],[2,3.2],[3.45,5.4]],arcs:[.06,2.7,1.75],
  flight:{post:0,goal:[2.88,2.04],bend:[0,0],rise:[.95,.55],rate:1.5}},
 // V21.449 Neue Spielszenen (Basti 17.11.2026: "Baue mir etliche neue Szenen ... neu,
 // abwechslungsreich und vor allem schön"). Every kind of attack gets its own.
 {id:'dream_through_chip_right',sims:['chip','normal','finesse'],mirror:'dream_through_chip_left',family:'through',finish:'chip',delivery:'through',
  order:[3,0],length:'medium',weight:8,kinds:['through'],style:'lob',title:'Lupfer nach Steilpass',
  routes:{
   0:[[0,9,-27],[1.2,8.6,-29.5],[2.6,7.4,-33.6],[3.9,5.2,-38.4],[4.8,3.6,-41.4],[5.4,2.8,-42.8],[6.4,2.2,-44.6]],
   3:[[0,-3,-19],[1.1,-1.8,-21.6],[2.2,-.6,-24.4],[2.6,-.3,-25],[5.4,1.2,-31]],
   1:[[0,-20,-22],[2.6,-17,-30],[5.4,-12,-38]]},
  beats:[[2.6,3.9]],
  flight:{post:0,goal:[2.55,2.08],bend:[0,0],rise:[4.6,3.7],rate:1.25}},
 {id:'dream_rondo_low_left',sims:['normal','low_driven','finesse'],family:'combination',finish:'low_driven',delivery:'short',
  order:[6,7,3,0],length:'long',weight:8,kinds:['combination'],style:'placed',title:'Kurzpass-Kombination',
  routes:{
   0:[[0,-9,-24],[1.4,-8.4,-26],[2.8,-7,-29],[3.8,-5.8,-31.8],[4.7,-4.9,-34.4],[5.4,-4.4,-35.6],[6.4,-3.8,-37]],
   6:[[0,-6,-17],[.35,-6,-17.4],[1.4,-5,-20],[5.4,-3,-27]],
   7:[[0,5,-20],[1.15,3.6,-22.2],[1.75,3.2,-22.8],[3.2,4.4,-26],[5.4,6,-31]],
   3:[[0,1,-30],[1.6,.4,-28.4],[2.75,-.2,-27.4],[3.35,-.4,-27.6],[5.4,.8,-34]]},
  beats:[[.35,1.15],[1.75,2.75],[3.35,4.7]],arcs:[.06,.06,.06],
  flight:{post:0,goal:[3.28,.26],bend:[0,0],rise:[.06,.02],rate:1.7}},
 {id:'dream_switch_volley_left',sims:['normal','low_driven','finesse'],mirror:'dream_switch_volley_right',family:'switch',finish:'volley',delivery:'loft',
  order:[7,5,0],length:'long',weight:8,kinds:['switch'],style:'volley',title:'Seitenwechsel-Volley',direct:true,
  routes:{
   0:[[0,-18,-27],[1.6,-17.4,-31],[3.2,-15.2,-35.8],[4.5,-12.6,-38.8],[5.4,-11.2,-40.2],[6.4,-10.4,-41.4]],
   5:[[0,26,-18],[.9,25.6,-20.4],[1.3,25.2,-21.4],[2.25,24.6,-23],[5.4,23,-29]],
   7:[[0,10,-17],[.35,10.2,-17.4],[2,11,-21],[5.4,10,-27]]},
  beats:[[.35,1.3],[2.25,5.4]],arcs:[.06,3.35],
  flight:{post:-1,goal:[3.12,1.02],bend:[.6,.4],rise:[.35,.18],rate:1.6}},
 {id:'dream_near_post_flick_right',sims:['header'],mirror:'dream_near_post_flick_left',family:'nearpost',finish:'header',delivery:'driven',
  order:[3,2,0],length:'medium',weight:7,kinds:['cross'],style:'flick',title:'Kopfball-Verlängerung',direct:true,
  routes:{
   0:[[0,-3,-34],[2,-1.4,-38],[3.6,1.2,-42.2],[4.7,2.6,-45],[5.4,3,-46.4],[6.4,3.2,-47.4]],
   2:[[0,22,-24],[1.3,22.6,-29],[2.6,22.2,-36],[4.05,20.8,-43.6],[5.4,19.6,-45.6]],
   3:[[0,4,-21],[.4,4.2,-21.4],[2.2,6,-26],[5.4,7,-34]]},
  beats:[[.4,1.3],[4.05,5.4]],arcs:[.06,1.85],
  flight:{post:-1,goal:[3.18,.86],bend:[-.2,-.1],rise:[.18,.05],rate:2.2}},
 {id:'dream_slalom_left',sims:['normal','finesse','low_driven'],mirror:'dream_slalom_right',family:'dribble',finish:'low_driven',delivery:'short',
  order:[6,0],length:'long',weight:8,kinds:['dribble'],style:'slalom',title:'Solo-Slalom',
  routes:{
   0:[[0,-14,-13],[.9,-13.4,-14.6],[1.6,-11.2,-17.4],[2.3,-12.8,-21.2],[3,-10.2,-25],[3.7,-11.6,-29],[4.4,-8.6,-32.4],[5,-7.4,-34.6],[5.4,-6.6,-35.6],[6.4,-5.6,-37]],
   6:[[0,-6,-8],[.4,-6.2,-8.6],[2,-6,-14],[5.4,-4,-22]],
   1:[[0,-24,-20],[2.4,-23,-28],[5.4,-20,-38]]},
  beats:[[.4,.9]],
  flight:{post:1,goal:[3.3,.32],bend:[.5,.3],rise:[.08,.02],rate:1.6}},
 {id:'dream_roof_near_right',sims:['power','normal','low_driven'],mirror:'dream_roof_near_left',family:'dribble',finish:'power',delivery:'short',
  order:[5,0],length:'medium',weight:7,kinds:['dribble','cutback'],style:'roof',title:'Hammer unters Dach',
  routes:{
   0:[[0,22,-30],[1.2,21.6,-32.6],[2.4,20,-36.4],[3.5,17.6,-40.4],[4.5,14.8,-43.4],[5.4,12.6,-45],[6.4,11.2,-46]],
   5:[[0,26,-20],[.45,25.8,-20.6],[2.2,25,-26],[5.4,23,-33]],
   3:[[0,0,-30],[2.4,1,-37],[5.4,3,-43]]},
  beats:[[.45,1.2]],
  flight:{post:1,goal:[3.22,2.3],bend:[.1,0],rise:[.55,.45],rate:1.7}},
 {id:'dream_overlap_drive_left',sims:['normal','low_driven','power'],mirror:'dream_overlap_drive_right',family:'overlap',finish:'low_driven',delivery:'driven',
  order:[6,4,0],length:'long',weight:8,kinds:['cutback'],style:'drive',title:'Hinterlaufen und Direktschuss',direct:true,
  routes:{
   0:[[0,-4,-30],[2,-3.6,-33],[3.6,-2.6,-37],[4.6,-1.6,-39.6],[5.4,-1.2,-40.6],[6.4,-.8,-41.8]],
   4:[[0,-24,-24],[.9,-24.4,-26],[1.5,-24.6,-27.6],[2.6,-23.8,-33.4],[3.6,-21.8,-40.2],[4.45,-19.4,-46.4],[5.4,-17.6,-48.6]],
   6:[[0,-10,-22],[.4,-10.2,-22.4],[2,-9,-26],[5.4,-8,-32]],
   1:[[0,-14,-30],[2.4,-11,-37],[5.4,-8,-43]]},
  beats:[[.4,1.5],[4.45,5.4]],arcs:[.06,.12],
  flight:{post:0,goal:[3.24,.24],bend:[0,0],rise:[.05,0],rate:1.9}},
 {id:'dream_through_far_curl_right',sims:['finesse','normal'],mirror:'dream_through_far_curl_left',family:'through',finish:'finesse',delivery:'through',
  order:[7,0],length:'medium',weight:8,kinds:['through'],foot:'Right',style:'curl',title:'Steilpass und Schlenzer ins lange Eck',
  routes:{
   0:[[0,14,-26],[1.4,13.6,-29],[2.8,12,-33.4],[3.8,10.4,-36.4],[4.7,9,-38.6],[5.4,8.2,-39.6],[6.4,7.4,-41]],
   7:[[0,4,-16],[1.1,4.6,-18.6],[2.05,5,-20.6],[5.4,6,-28]],
   3:[[0,-2,-30],[2.6,-1,-36],[5.4,0,-42]]},
  beats:[[2.05,3.8]],
  flight:{post:-1,goal:[3.28,.68],bend:[-1.9,-1.3],rise:[.55,.4],rate:1.6}},
 {id:'dream_counter_sprint',sims:['normal','power','low_driven'],family:'through',finish:'power',delivery:'loft',
  order:[3,0],length:'long',weight:7,kinds:['through'],style:'sprint',title:'Konter-Sprint',
  routes:{
   0:[[0,-9,-6],[.9,-8.2,-9.6],[1.9,-6.6,-15],[2.9,-5.2,-21],[3.9,-3.8,-27.4],[4.7,-3,-32.4],[5.4,-2.6,-36.2],[6.4,-2.2,-38]],
   3:[[0,3,4],[.5,3,3.4],[.8,2.9,2.8],[5.4,1,-14]],
   1:[[0,-24,-4],[2.8,-22,-18],[5.4,-18,-30]],
   2:[[0,22,-4],[2.8,20,-18],[5.4,15,-31]]},
  beats:[[.8,3.1]],arcs:[3.4],
  flight:{post:0,goal:[3.2,1.86],bend:[0,0],rise:[.62,.45],rate:1.5}},
 {id:'dream_scoop_volley',sims:['normal','volley','finesse'],family:'combination',finish:'volley',delivery:'loft',
  order:[6,3,0],length:'medium',weight:7,kinds:['combination','through'],style:'volley',title:'Heber und Volley',direct:true,
  routes:{
   0:[[0,5,-28],[1.6,4.6,-31],[3,3.6,-35.4],[4.4,2.8,-39.4],[5.4,2.4,-41.6],[6.4,2,-43]],
   3:[[0,-3,-26],[.9,-3.4,-27],[1.5,-3.6,-27.6],[2.6,-3.2,-28.6],[3.6,-2.6,-29.4],[5.4,-2,-33]],
   6:[[0,-9,-16],[.45,-9.2,-16.6],[2.4,-8,-22],[5.4,-6,-28]]},
  beats:[[.45,1.5],[3.6,5.4]],arcs:[.06,3],
  flight:{post:0,goal:[2.96,1.66],bend:[0,0],rise:[.5,.3],rate:1.7}},
 {id:'dream_back_post_header_left',sims:['header','volley'],mirror:'dream_back_post_header_right',family:'cross',finish:'header',delivery:'cross',
  order:[6,4,0],length:'long',weight:7,kinds:['cross'],style:'nod',title:'Kopfball am langen Pfosten',direct:true,
  routes:{
   0:[[0,10,-30],[2,9.6,-35],[3.6,8.4,-40.6],[4.7,7.2,-44],[5.4,6.4,-45.4],[6.4,5.8,-46.4]],
   4:[[0,-24,-22],[.9,-24.6,-25],[1.45,-24.8,-26.8],[2.6,-24.4,-31.4],[3.75,-23.4,-36],[5.4,-22,-39]],
   6:[[0,-9,-20],[.4,-9.2,-20.4],[2,-9,-24],[5.4,-7,-31]]},
  beats:[[.4,1.45],[3.75,5.4]],arcs:[.06,2.95],
  flight:{post:1,goal:[3.18,.32],bend:[0,0],rise:[-.4,-.6],rate:2}},
 {id:'dream_switch_curl_right',sims:['finesse','normal'],mirror:'dream_switch_curl_left',family:'switch',finish:'finesse',delivery:'short',
  order:[6,2,0],length:'long',weight:8,kinds:['switch'],foot:'Right',style:'curl',title:'Seitenwechsel und Schlenzer',
  routes:{
   0:[[0,10,-23],[2,10.4,-26],[3.4,9.6,-30],[4.4,8.8,-31.6],[5.4,8.2,-33],[6.4,7.6,-34.6]],
   2:[[0,24,-27],[1,24.4,-29],[2.15,24,-31.2],[3.1,23.2,-32.4],[5.4,22,-38]],
   6:[[0,-14,-18],[.4,-14,-18.6],[2,-12,-22],[5.4,-9,-28]]},
  beats:[[.4,2.15],[3.1,4.4]],arcs:[3.3,.06],
  flight:{post:-1,goal:[3.3,2.18],bend:[-2.6,-2],rise:[1,.85],rate:1.5}},
// V21.450 Neue Spielszenen, Paket 2.
 {id:'dream_long_lob',sims:['power','normal','finesse'],family:'distance',finish:'chip',delivery:'short',
  order:[6,0],length:'medium',weight:6,kinds:['distance'],style:'lob',title:'Heber aus der Distanz',
  routes:{
   0:[[0,4,-9],[1.5,3.6,-12],[3,3,-15.4],[4.2,2.6,-17.6],[5.4,2.2,-19.6],[6.4,2,-21]],
   6:[[0,-8,-5],[.45,-8,-5.6],[2,-6.6,-9],[5.4,-5,-15]],
   3:[[0,0,-30],[2.4,-1,-34],[5.4,-2,-40]]},
  beats:[[.45,3]],
  flight:{post:0,goal:[2.4,2.12],bend:[0,0],rise:[7,6],rate:1.15}},
 {id:'dream_cutback_sidefoot_left',sims:['normal','finesse','low_driven'],mirror:'dream_cutback_sidefoot_right',family:'cutback',finish:'finesse',delivery:'driven',
  order:[6,1,0],length:'long',weight:7,kinds:['cutback'],style:'placed',title:'Rückpass und Innenseite hoch',direct:true,
  routes:{
   0:[[0,2,-29],[2,1.6,-33],[3.6,.6,-37],[4.6,-.4,-39.2],[5.4,-.8,-40.2],[6.4,-1,-41.4]],
   1:[[0,-21,-24],[.9,-21.4,-26.4],[1.45,-21.6,-28],[2.8,-20.2,-36],[3.9,-18.4,-43.4],[4.45,-17,-47.2],[5.4,-15.6,-49]],
   6:[[0,-9,-20],[.4,-9.2,-20.4],[2,-8,-25],[5.4,-6,-32]]},
  beats:[[.4,1.45],[4.45,5.4]],arcs:[.06,.1],
  flight:{post:1,goal:[3.2,1.74],bend:[.5,.4],rise:[.5,.45],rate:1.8}},
 {id:'dream_back_post_tap_left',sims:['normal','low_driven'],mirror:'dream_back_post_tap_right',family:'lowcross',finish:'low_driven',delivery:'driven',
  order:[7,1,0],length:'medium',weight:7,kinds:['cutback'],style:'tap',title:'Querpass und Abstauber am langen Pfosten',direct:true,
  routes:{
   0:[[0,12,-31],[2,11,-36],[3.6,8.6,-41.4],[4.7,6.2,-45.6],[5.4,5,-47.4],[6.3,4.4,-48.6]],
   1:[[0,-20,-24],[1.3,-20.4,-27],[2,-20.4,-29.2],[2.9,-19.6,-36],[3.85,-17.4,-43],[4.45,-15.6,-47.4],[5.4,-14.2,-48.8]],
   7:[[0,-2,-21],[.4,-2.2,-21.4],[2,-3,-26],[5.4,-4,-34]]},
  beats:[[.4,2],[4.45,5.4]],arcs:[.06,.1],
  flight:{post:1,goal:[2.2,.24],bend:[0,0],rise:[.04,0],rate:2.6}},
 {id:'dream_third_man_drive',sims:['normal','power','low_driven'],family:'combination',finish:'power',delivery:'short',
  order:[3,6,0],length:'medium',weight:7,kinds:['combination','through'],style:'drive',title:'Dritter Mann',
  routes:{
   0:[[0,-2,-16],[1.4,-1.8,-19.4],[2.8,-1.2,-24.4],[3.9,-.6,-28.8],[4.8,0,-32],[5.4,.4,-33.6],[6.4,.8,-35]],
   3:[[0,1,-27],[.35,1,-26.6],[.95,.8,-25.8],[1.5,.6,-25.4],[5.4,2,-30]],
   6:[[0,-9,-24],[1.55,-7.4,-25.4],[2.25,-6.8,-26],[5.4,-5,-31]]},
  beats:[[.35,1.55],[2.25,3.9]],arcs:[.06,.3],
  flight:{post:0,goal:[3.18,1.12],bend:[0,0],rise:[.3,.2],rate:1.5}},
 {id:'dream_edge_curl_near_left',sims:['finesse','normal'],mirror:'dream_edge_curl_near_right',family:'distance',finish:'finesse',delivery:'short',
  order:[4,6,0],length:'medium',weight:7,kinds:['distance','dribble'],foot:'Right',style:'curl',title:'Schlenzer ins kurze Kreuzeck',
  routes:{
   0:[[0,-14,-22],[1.6,-13,-25],[3.2,-11.6,-28],[4.3,-10.6,-30],[5.4,-9.8,-31.6],[6.4,-9.2,-33]],
   4:[[0,-26,-10],[.4,-26,-10.6],[2,-24,-15],[5.4,-22,-22]],
   6:[[0,-11,-14],[1.3,-10.4,-16.2],[2.15,-10,-17.6],[5.4,-8,-24]]},
  beats:[[.4,1.3],[2.15,3.2]],
  flight:{post:-1,goal:[3.26,2.2],bend:[1.6,1.2],rise:[1.1,.9],rate:1.5}},
 {id:'dream_far_post_volley_right',sims:['volley','header'],mirror:'dream_far_post_volley_left',family:'cross',finish:'volley',delivery:'cross',
  order:[7,5,0],length:'long',weight:6,kinds:['cross'],style:'volley',title:'Volley am langen Pfosten',direct:true,
  routes:{
   0:[[0,-10,-31],[2,-9.4,-36],[3.6,-8.4,-40.4],[4.7,-7.2,-43.4],[5.4,-6.4,-44.6],[6.4,-5.8,-45.6]],
   5:[[0,25,-20],[.9,25.6,-23],[1.4,25.8,-24.6],[2.6,25.2,-30],[3.75,23.8,-35.6],[5.4,22,-39]],
   7:[[0,9,-20],[.4,9.2,-20.4],[2,9,-24],[5.4,7,-31]]},
  beats:[[.4,1.4],[3.75,5.4]],arcs:[.06,2.9],
  flight:{post:1,goal:[3.1,2.08],bend:[0,0],rise:[.55,.4],rate:1.9}},
 {id:'dream_counter_square_left',sims:['normal','low_driven','finesse'],mirror:'dream_counter_square_right',family:'through',finish:'low_driven',delivery:'through',
  order:[3,1,0],length:'long',weight:7,kinds:['through'],style:'tap',title:'Konter mit Querpass',direct:true,
  routes:{
   0:[[0,3,-8],[1,2.6,-12],[2,2,-17.6],[3,1.6,-23.6],[4,1.2,-30],[4.8,1,-35],[5.4,.8,-38.4],[6.4,.6,-40]],
   1:[[0,-14,-6],[1.15,-14.6,-11.6],[2.2,-14,-18],[3.3,-12.4,-25.6],[4.3,-10.2,-32.4],[4.85,-9,-35.6],[5.4,-8.4,-37.4]],
   3:[[0,-2,2],[.45,-2.2,1.4],[2,-2,-5],[5.4,-1,-16]]},
  beats:[[.45,2.2],[4.85,5.4]],arcs:[.4,.06],
  flight:{post:0,goal:[3.22,.3],bend:[0,0],rise:[.05,0],rate:1.8}},
 {id:'dream_switch_cutback_left',sims:['normal','low_driven','finesse'],mirror:'dream_switch_cutback_right',family:'switch',finish:'normal',delivery:'loft',
  order:[7,4,0],length:'long',weight:7,kinds:['switch'],style:'placed',title:'Seitenwechsel und Rückpass',direct:true,
  routes:{
   0:[[0,4,-27],[2,3.4,-31],[3.8,1.6,-35.4],[4.8,.4,-37.6],[5.4,0,-38.6],[6.4,-.4,-40]],
   4:[[0,-25,-26],[1,-25.6,-28.6],[2.3,-25.4,-32.2],[3.2,-24.4,-37],[4,-22.6,-42.4],[4.55,-21,-45.4],[5.4,-19.8,-47]],
   7:[[0,12,-19],[.4,12.2,-19.4],[2,12,-23],[5.4,10,-29]]},
  beats:[[.4,2.3],[4.55,5.4]],arcs:[3.2,.08],
  flight:{post:0,goal:[3.2,.62],bend:[0,0],rise:[.18,.1],rate:1.7}},
 {id:'dream_tiki_square_tap',sims:['normal','low_driven','finesse'],family:'combination',finish:'low_driven',delivery:'short',
  order:[6,3,7,2,0],length:'long',weight:7,kinds:['combination'],style:'tap',title:'Tiki-Taka bis ins Tor',direct:true,
  routes:{
   0:[[0,-6,-30],[2,-5.6,-34],[3.6,-4.4,-39],[4.7,-3.2,-43.4],[5.4,-2.6,-45.2],[6.3,-2.2,-46.6]],
   6:[[0,-8,-15],[.3,-8,-15.4],[1.6,-6.4,-19],[5.4,-4,-27]],
   3:[[0,0,-25],[.85,-.4,-22.6],[1.3,.3,-22.3],[2.4,1,-25],[5.4,2,-33]],
   7:[[0,7,-17],[1.6,6.6,-19.6],[1.95,6.6,-20.2],[3.4,7.8,-25],[5.4,8,-31]],
   2:[[0,21,-30],[1.6,20.6,-32.6],[2.65,20,-35],[3.6,18.6,-39.6],[4.2,17.2,-43.4],[4.5,16.4,-45],[5.4,15,-47]]},
  beats:[[.3,.85],[1.3,1.95],[2.4,4.2],[4.5,5.4]],arcs:[.06,.06,.12,.06],
  flight:{post:-1,goal:[2.6,.26],bend:[0,0],rise:[.04,0],rate:2.4}},
// V21.451 Neue Spielszenen, Paket 3.
 {id:'dream_dribble_dink_right',sims:['normal','finesse','chip'],mirror:'dream_dribble_dink_left',family:'dribble',finish:'chip',delivery:'short',
  order:[7,0],length:'medium',weight:6,kinds:['dribble'],style:'lob',title:'Dribbling und Lupfer',
  routes:{
   0:[[0,13,-27],[1.1,12.4,-29.4],[2.2,10.6,-32.8],[3.2,8.2,-36.4],[4.2,6,-39.8],[5,4.6,-42.2],[5.4,4,-43.2],[6.4,3.4,-44.6]],
   7:[[0,6,-19],[.45,6.2,-19.6],[2,6.6,-24],[5.4,6,-31]],
   3:[[0,-4,-30],[2.4,-3,-37],[5.4,-2,-43]]},
  beats:[[.45,1.1]],
  flight:{post:-1,goal:[2.6,1.96],bend:[0,0],rise:[3.6,3],rate:1.3}},
 {id:'dream_central_header_right',sims:['header'],mirror:'dream_central_header_left',family:'cross',finish:'header',delivery:'cross',
  order:[7,5,0],length:'long',weight:6,kinds:['cross'],style:'nod',title:'Wuchtiger Kopfball nach Flanke',direct:true,
  routes:{
   0:[[0,1,-30],[2,1.4,-34.6],[3.6,1,-38.6],[4.7,.4,-41.2],[5.4,.2,-42.2],[6.4,0,-43.2]],
   5:[[0,25,-16],[.9,25.6,-19],[1.4,25.8,-20.6],[2.6,25.4,-25.6],[3.6,24.4,-30],[5.4,22.6,-35]],
   7:[[0,9,-18],[.4,9.2,-18.4],[2,9,-22],[5.4,7,-29]]},
  beats:[[.4,1.4],[3.6,5.4]],arcs:[.06,2.9],
  flight:{post:0,goal:[2.96,.34],bend:[0,0],rise:[-.2,-.4],rate:2}},
 {id:'dream_outside_near_left',sims:['normal','finesse','low_driven'],mirror:'dream_outside_near_right',family:'dribble',finish:'finesse',delivery:'short',
  order:[4,0],length:'medium',weight:6,kinds:['dribble','combination'],foot:'Right',style:'outside',title:'Außenrist ins kurze Eck',
  routes:{
   0:[[0,-20,-24],[1.2,-19.6,-27],[2.4,-17.8,-30.6],[3.5,-15.6,-34],[4.5,-13.4,-37],[5.4,-11.8,-39.2],[6.4,-10.8,-40.6]],
   4:[[0,-26,-14],[.5,-26,-14.6],[2,-25,-19],[5.4,-23,-27]],
   3:[[0,0,-30],[2.4,-1,-37],[5.4,-2,-43]]},
  beats:[[.5,1.2]],
  flight:{post:-1,goal:[3.26,.82],bend:[1.2,.9],rise:[.4,.3],rate:1.6}},
 {id:'dream_diagonal_run_near_left',sims:['normal','low_driven','power'],mirror:'dream_diagonal_run_near_right',family:'through',finish:'low_driven',delivery:'through',
  order:[6,0],length:'medium',weight:7,kinds:['through'],style:'drive',title:'Diagonallauf und Flachschuss ins kurze Eck',
  routes:{
   0:[[0,-20,-25],[1.3,-18.4,-28.6],[2.6,-15.6,-32.8],[3.7,-12.6,-36.6],[4.6,-10.2,-39.4],[5.4,-8.4,-41.2],[6.4,-7.2,-42.6]],
   6:[[0,-4,-17],[1.1,-3.6,-19],[1.9,-3.4,-20.2],[5.4,-3,-27]],
   3:[[0,3,-30],[2.4,4,-37],[5.4,4,-43]]},
  beats:[[1.9,3.7]],
  flight:{post:-1,goal:[3.28,.24],bend:[0,0],rise:[.04,0],rate:1.7}},
 {id:'dream_layoff_curl_far_right',sims:['finesse','normal'],mirror:'dream_layoff_curl_far_left',family:'distance',finish:'finesse',delivery:'short',
  order:[7,3,0],length:'medium',weight:7,kinds:['distance','combination'],foot:'Right',style:'curl',title:'Ablage und Schlenzer ins Kreuzeck',
  routes:{
   0:[[0,9,-18],[1.5,8.6,-21],[3,7.8,-25],[4.2,7.2,-27.6],[5.4,6.8,-29.2],[6.4,6.4,-30.6]],
   3:[[0,2,-32],[.9,2.2,-30.4],[1.5,2.4,-29.6],[2.9,2.6,-30.6],[5.4,1.6,-35]],
   7:[[0,10,-12],[.4,10.2,-12.6],[2,10,-17],[5.4,9,-23]]},
  beats:[[.4,1.5],[2.9,4.2]],arcs:[.06,.06],
  flight:{post:-1,goal:[3.3,2.2],bend:[-2.4,-1.8],rise:[1.05,.9],rate:1.5}},
 {id:'dream_overlap_header_right',sims:['header','volley'],mirror:'dream_overlap_header_left',family:'overlap',finish:'header',delivery:'driven',
  order:[2,5,0],length:'long',weight:6,kinds:['cross'],style:'nod',title:'Hinterlaufen, Flanke, Kopfball am kurzen Pfosten',direct:true,
  routes:{
   0:[[0,-2,-31],[2,-1,-36],[3.6,1.4,-41.4],[4.7,2.8,-44.6],[5.4,3.2,-45.8],[6.4,3.4,-46.8]],
   2:[[0,20,-24],[.45,20.2,-24.6],[2,18.6,-28],[5.4,16,-33]],
   5:[[0,25,-18],[1.3,25.4,-25],[2.6,24.6,-32],[3.9,22.4,-40],[4.5,21,-43.4],[5.4,19.8,-45]]},
  beats:[[.45,1.6],[4.5,5.4]],arcs:[.06,1.5],
  flight:{post:1,goal:[3.2,1.1],bend:[0,0],rise:[.15,.05],rate:2.1}},
 {id:'dream_box_turn_shot',sims:['normal','low_driven','power','finesse'],family:'combination',finish:'normal',delivery:'short',
  order:[6,0],length:'short',weight:7,kinds:['combination','through'],style:'turn',title:'Ballannahme mit Drehung und Abschluss',
  routes:{
   0:[[0,1,-42],[1.4,.8,-39.4],[2.6,.6,-37.4],[3.4,.6,-36.8],[4.2,.2,-37],[4.9,-.4,-37.6],[5.4,-.6,-38.2],[6.4,-.8,-39.4]],
   6:[[0,-7,-20],[.5,-6.8,-21],[2.6,-5.6,-24],[5.4,-4,-30]]},
  beats:[[2.6,3.4]],
  flight:{post:0,goal:[3.26,.3],bend:[0,0],rise:[.06,.02],rate:1.8}}
];
const mirrorPoint=([t,x,z])=>[t,-x,z];
function mirrored(def){
 const routes={};for(const [k,v] of Object.entries(def.routes))routes[k]=v.map(mirrorPoint);
 // Wide actors swap with the wing: 1<->2, 4<->5, 6<->7.
 const swap={1:2,2:1,4:5,5:4,6:7,7:6};
 const swapped={};for(const [k,v] of Object.entries(routes))swapped[swap[k]??k]=v;
 return{...def,id:def.mirror,mirror:undefined,order:def.order.map(a=>swap[a]??a),routes:swapped,
  foot:def.foot==='Left'?'Right':def.foot==='Right'?'Left':def.foot,
  contact:def.contact?[-def.contact[0],def.contact[1],def.contact[2]]:undefined,
  flight:{...def.flight,post:-def.flight.post,bend:def.flight.bend.map(x=>-x),wobble:def.flight.wobble?[-def.flight.wobble[0],def.flight.wobble[1]]:undefined}};
}
const DEFS=Object.freeze(BASE.flatMap(d=>d.mirror?[d,mirrored(d)]:[d]).map(d=>Object.freeze(d)));
const BY_ID=new Map(DEFS.map(d=>[d.id,d]));
export const DREAM_GOAL_IDS=Object.freeze(DEFS.map(d=>d.id));
export const DREAM_CATALOG=Object.freeze(DEFS.map(d=>Object.freeze([d.id,d.family,d.weight,d.finish,d.delivery,Object.freeze([...d.order]),d.length])));
export const DREAM_STORIES=Object.freeze(Object.fromEntries(DEFS.map(d=>[d.id,Object.freeze({routes:d.routes,beats:d.beats,arcs:d.arcs||null,direct:!!d.direct})])));
export const DREAM_RULES=Object.freeze(Object.fromEntries(DEFS.map(d=>[d.id,Object.freeze({kinds:d.kinds,sims:d.sims,foot:d.foot||'',style:d.style,title:d.title,finish:d.finish})])));
export const isDreamGoal=id=>BY_ID.has(String(id));
export const dreamGoal=id=>BY_ID.get(String(id))||null;
export const dreamFinish=id=>BY_ID.get(String(id))?.finish||null;
export const dreamStyle=id=>BY_ID.get(String(id))?.style||'';
// Playback rate of the 5.4-6.65 s shot window: a flick from four metres
// must not take as long as a shot from thirty.
export const dreamShotRate=id=>BY_ID.get(String(id))?.flight.rate||1.5;
export const dreamContact=id=>BY_ID.get(String(id))?.contact||null;
// The simulator's placement picks the side unless the technique has its own:
// a Robben curler always goes to the far post. Height/width are the scene's.
export function dreamImpact(id,type,sign,placement){
 const d=BY_ID.get(String(id));if(!d)return null;
 const f=d.flight,s=f.post||sign||1;
 if(type!=='goal')return{sign:s};
 if(placement?.style)return{sign:s};
 return{sign:s,point:[s*f.goal[0],f.goal[1],-54.25]};
}
// Cubic flight from the boot to the impact point. Control points sit at a
// third and two thirds of the straight line plus the scene's bend and rise.
export function dreamFlightPoint(id,contact,impact,s){
 const d=BY_ID.get(String(id));if(!d)return null;
 const f=d.flight,u=clamp(s),k=1-u;
 const line=w=>contact.map((v,i)=>v+(impact[i]-v)*w);
 // The bend only belongs to shots on target width; a wild miss keeps less.
 const reach=Math.abs(impact[0])>4.2?.55:1;
 const p1=line(1/3),p2=line(2/3);
 p1[0]+=f.bend[0]*reach;p2[0]+=f.bend[1]*reach;p1[1]+=f.rise[0];p2[1]+=f.rise[1];
 const out=[0,1,2].map(i=>k*k*k*contact[i]+3*k*k*u*p1[i]+3*k*u*u*p2[i]+u*u*u*impact[i]);
 if(f.wobble){
  // Knuckle ball: no spin, so the air shoves it sideways and up/down.
  const grow=smooth(u/.35);
  out[0]+=f.wobble[0]*grow*Math.sin(u*Math.PI*3.1)*(1-u*u*.6);
  out[1]+=f.wobble[1]*grow*Math.sin(u*Math.PI*4.3);
 }
 out[1]=Math.max(.11,out[1]);
 return out;
}
// Curve parameter at which the flight crosses the keeper's line (z).
export function dreamGateParam(id,contact,impact,lineZ){
 if(!(impact[2]<lineZ&&contact[2]>lineZ))return 1;
 let a=0,b=1;
 for(let i=0;i<32;i++){const m=(a+b)/2,p=dreamFlightPoint(id,contact,impact,m);if(p[2]>lineZ)a=m;else b=m}
 return(a+b)/2;
}
// Scorer's body over the finish for the techniques the shared kick has not got.
// Same contract as bicycleKickPose (3d-highlights-scene.mjs): pitch (backwards
// turn, rad; negative = forwards), lift and back (pelvis, m), legs [thigh,knee]
// per leg (1 = kicking), arms (spread). null = nothing to add.
export function dreamFinishPose(id,time){
 const style=dreamStyle(id);
 if(style==='dive'){
  // Flugkopfball: two strides of take-off, flat in the air at the contact,
  // lands on the chest, slides, pushes up and gets to his feet.
  const weight=smooth((time-4.95)/.16)*(1-smooth((time-6.75)/.3));
  if(weight<=0)return null;
  const launch=smooth((time-5.05)/.3),land=smooth((time-5.52)/.16),push=smooth((time-6.05)/.38),stand=smooth((time-6.38)/.42);
  const pitch=-(mix(.25*smooth((time-4.95)/.12)+1.2*launch,1.42,land)*(1-push*.55))*(1-stand);
  const lift=(mix(.18*Math.sin(Math.PI*clamp((time-5.05)/.5)),-.58,land)*(1-push)+push*-.3)*(1-stand);
  const legs=[[mix(-.15,-.35,launch),mix(-.4,-.25,launch)],[mix(.2,-.55,launch),mix(-.9,-.45,launch)]]
   .map(([thigh,knee])=>[mix(thigh,1.35,push)*(1-stand),mix(knee,-1.9,push)*(1-stand)]);
  return{weight,pitch,lift,back:0,legs,arms:mix(.35,1.25,land)*(1-push)*(1-stand)+.2};
 }
 if(style==='backheel'){
  // Hackentrick: the trailing leg swings back past the standing leg, the
  // heel meets the ball at 5.4 s, the foot follows up behind the body.
  const weight=smooth((time-5.02)/.16)*(1-smooth((time-5.85)/.25));
  if(weight<=0)return null;
  const load=smooth((time-5.04)/.2),flick=smooth((time-5.28)/.14),follow=smooth((time-5.42)/.24);
  const thigh=mix(mix(.05,.42,load),-.38,flick)*(1-.35*follow),knee=mix(mix(-.25,-.55,load),-1.05,flick)*(1-.25*follow);
  return{weight,pitch:-.08*load,lift:0,back:0,legs:[[-.08,-.3],[thigh,knee]],arms:.42*load};
 }
 return null;
}
// Faces the scorer for his technique: the heel flick turns his back to the
// goal (he runs at the ball), the others shoot facing the goal.
export const dreamFacesAway=id=>{const s=dreamStyle(id);return s==='backheel'||s==='bicycle'};
