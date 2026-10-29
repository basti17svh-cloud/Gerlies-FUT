import {sampleSkill} from './3d-skill-actions.mjs?v=21303';
import {sampleFlowRun} from './3d-attack-flow.mjs?v=2160';
/* Footera V21.86 — football playbook. Pure, deterministic visual choreography.
   All turnovers are AUTHORED by the match simulator, never by this module. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const mix=(a,b,t)=>a+(b-a)*t;
const interpolate=(a,b,u)=>a.map((v,i)=>mix(v,b[i],ease(u)));
const catalog=[
 // short passing, third-man runs, switches, wall passes
 ['triangle_left','combination',7,'normal','short',[6,3,1,3,0],'short'],
 ['triangle_right','combination',7,'normal','short',[7,3,2,3,0],'short'],
 ['tiki_short','combination',8,'normal','short',[6,7,3,0],'short'],
 ['tiki_quick','combination',7,'normal','short',[7,6,3,0],'short'],
 ['wall_pass_left','combination',7,'normal','short',[3,1,3,0],'short'],
 ['wall_pass_right','combination',7,'normal','short',[3,2,3,0],'short'],
 ['central_recycle','combination',6,'normal','short',[6,3,7,3,0],'medium'],
 ['midfield_switch','switch',5,'normal','loft',[6,3,7,2,0],'long'],
 ['first_touch_triangle','combination',7,'normal','short',[3,7,6,0],'medium'],
 ['third_man_run','combination',8,'normal','short',[6,3,1,0],'medium'],
 // timed through balls, gap penetration and direct goal-facing receiving touches
 ['split_defenders','through',8,'low_driven','through',[6,3,0],'short'],
 ['curved_striker_run','through',8,'normal','through',[7,3,0],'short'],
 ['left_halfspace_thread','through',7,'normal','through',[6,1,3,0],'medium'],
 ['right_halfspace_thread','through',7,'normal','through',[7,2,3,0],'medium'],
 ['deep_playmaker_lob','through',4,'normal','loft',[6,0],'medium'],
 // overlapping fullbacks, low crosses, aerial deliveries and switches of play
 ['overlap_left_low','overlap',7,'normal','driven',[6,1,4,0],'medium'],
 ['overlap_right_low','overlap',7,'normal','driven',[7,2,5,0],'medium'],
 ['overlap_left_high','overlap',6,'header','cross',[3,1,4,0],'medium'],
 ['overlap_right_high','overlap',6,'header','cross',[3,2,5,0],'medium'],
 ['early_low_delivery_left','lowcross',6,'low_driven','driven',[6,1,0],'short'],
 ['early_low_delivery_right','lowcross',6,'low_driven','driven',[7,2,0],'short'],
 ['switch_overlap_low','switch',5,'normal','loft',[6,3,2,5,0],'long'],
 ['switch_overlap_high','switch',5,'header','loft',[7,3,1,4,0],'long'],
 // close control into actual assisted finishes
 ['quick_burst_left','dribble',5,'normal','short',[6,1,0],'short'],
 ['quick_burst_right','dribble',5,'normal','short',[7,2,0],'short'],
 ['inside_link_left','dribble',5,'finesse','short',[6,1,3,0],'medium'],
 ['inside_link_right','dribble',5,'finesse','short',[7,2,3,0],'medium'],
 // angled cut-back to shooting zone, driven first time and near-post strike
 ['edge_cutback_finesse','cutback',5,'finesse','driven',[6,1,3,0],'medium'],
 ['first_time_power','distance',4,'power','short',[6,3,0],'short'],
 ['near_post_tap','nearpost',5,'low_driven','driven',[3,1,0],'short'],
 // V21.89: distinct channels, late runners, overlapping wide breaks and quick switches
 ['reverse_cutback_left','cutback',7,'finesse','driven',[6,1,4,3,0],'medium'],
 ['reverse_cutback_right','cutback',7,'finesse','driven',[7,2,5,3,0],'medium'],
 ['blindside_overlap_left','overlap',7,'normal','driven',[3,1,4,0],'medium'],
 ['blindside_overlap_right','overlap',7,'normal','driven',[3,2,5,0],'medium'],
 ['diagonal_counter_left','through',8,'low_driven','through',[7,3,1,0],'short'],
 ['diagonal_counter_right','through',8,'low_driven','through',[6,3,2,0],'short'],
 ['edge_of_box_recycle','combination',7,'power','short',[7,3,6,1,0],'medium'],
 ['back_post_sweep','lowcross',6,'normal','driven',[7,2,5,0],'medium'],
 ['late_midfield_runner','combination',6,'normal','through',[6,7,3,0],'short'],
 ['short_corner_combo','combination',5,'finesse','short',[3,1,6,0],'medium'],
 ['halfspace_overload_left','combination',7,'finesse','short',[6,1,3,7,0],'medium'],
 ['halfspace_overload_right','combination',7,'finesse','short',[7,2,3,6,0],'medium'],
 ['counter_reversal_left','switch',6,'low_driven','loft',[7,3,1,0],'long'],
 ['counter_reversal_right','switch',6,'low_driven','loft',[6,3,2,0],'long'],
 ['wing_isolation_left','dribble',7,'finesse','short',[6,1,0],'medium'],
 ['wing_isolation_right','dribble',7,'finesse','short',[7,2,0],'medium'],
 ['late_cutback_left','cutback',7,'normal','driven',[6,1,4,3,0],'medium'],
 ['late_cutback_right','cutback',7,'normal','driven',[7,2,5,3,0],'medium'],
 // V21.146: twelve distinct finishes with authored positions, not central aliases.
 ["layoff_distance","distance",7,"power","short",[6,3,0],"short"],
 ["switch_distance_left","distance",6,"finesse","short",[7,1,0],"medium"],
 ["near_post_driven_left","nearpost",8,"low_driven","driven",[3,1,0],"medium"],
 ["near_post_header_right","nearpost",7,"header","cross",[7,2,0],"medium"],
 ["six_yard_square_left","lowcross",8,"low_driven","driven",[6,1,0],"medium"],
 ["counter_square_right","through",8,"normal","driven",[7,2,0],"medium"],
 ["byline_pullback_left","cutback",7,"normal","driven",[6,1,4,0],"medium"],
 ["edge_pullback_right","cutback",7,"power","driven",[7,2,0],"medium"],
 ["back_post_volley_left","lowcross",6,"volley","cross",[6,1,0],"medium"],
 ["overlap_clipped_right","overlap",6,"header","cross",[3,2,5,0],"long"],
 ["striker_wall_return","combination",8,"low_driven","through",[6,0,3,0],"medium"],
 ["diagonal_lob_finish","through",6,"chip","through",[7,3,0],"medium"],
 // V21.204 (Basti: many more attacks): forty-two further plays, each with
 // its own finishing spot so the shot never comes from the same place.
 ["false_nine_drop_left", "combination", 6, "finesse", "short", [6, 0, 1, 0], "medium"],
 ["false_nine_drop_right", "combination", 6, "finesse", "short", [7, 0, 2, 0], "medium"],
 ["winger_one_two_left", "combination", 7, "normal", "short", [1, 3, 1, 0], "short"],
 ["winger_one_two_right", "combination", 7, "normal", "short", [2, 3, 2, 0], "short"],
 ["box_rondo", "combination", 6, "low_driven", "short", [3, 6, 3, 7, 0], "medium"],
 ["fullback_link_left", "combination", 6, "normal", "short", [4, 6, 1, 3, 0], "medium"],
 ["fullback_link_right", "combination", 6, "normal", "short", [5, 7, 2, 3, 0], "medium"],
 ["channel_ball_left", "through", 7, "low_driven", "through", [3, 1, 0], "short"],
 ["channel_ball_right", "through", 7, "low_driven", "through", [3, 2, 0], "short"],
 ["playmaker_slide_left", "through", 7, "normal", "through", [6, 0], "short"],
 ["playmaker_slide_right", "through", 7, "normal", "through", [7, 0], "short"],
 ["dink_over_line", "through", 5, "chip", "loft", [3, 0], "short"],
 ["long_ball_sprint", "through", 5, "normal", "loft", [4, 0], "medium"],
 ["underlap_left", "overlap", 6, "normal", "driven", [1, 4, 0], "medium"],
 ["underlap_right", "overlap", 6, "normal", "driven", [2, 5, 0], "medium"],
 ["overlap_volley_left", "overlap", 4, "volley", "cross", [6, 4, 0], "medium"],
 ["overlap_volley_right", "overlap", 4, "volley", "cross", [7, 5, 0], "medium"],
 ["byline_drive_left", "lowcross", 6, "low_driven", "driven", [3, 1, 0], "short"],
 ["byline_drive_right", "lowcross", 6, "low_driven", "driven", [3, 2, 0], "short"],
 ["far_post_slide_right", "lowcross", 5, "normal", "driven", [7, 2, 0], "medium"],
 ["whipped_header_left", "nearpost", 6, "header", "cross", [6, 1, 0], "medium"],
 ["whipped_header_right", "nearpost", 6, "header", "cross", [3, 2, 0], "medium"],
 ["deep_cross_header_left", "overlap", 5, "header", "cross", [6, 4, 0], "long"],
 ["deep_cross_header_right", "overlap", 5, "header", "cross", [7, 5, 0], "long"],
 ["slalom_left", "dribble", 5, "finesse", "short", [6, 0], "short"],
 ["slalom_right", "dribble", 5, "power", "short", [7, 0], "short"],
 ["winger_takeon_left", "dribble", 6, "finesse", "short", [3, 1, 0], "medium"],
 ["winger_takeon_right", "dribble", 6, "finesse", "short", [3, 2, 0], "medium"],
 ["pullback_power_left", "cutback", 6, "power", "driven", [6, 1, 0], "medium"],
 ["pullback_power_right", "cutback", 6, "power", "driven", [7, 2, 0], "medium"],
 ["cutback_volley_left", "cutback", 4, "volley", "driven", [3, 1, 0], "medium"],
 ["edge_rocket", "distance", 5, "power", "short", [3, 0], "short"],
 ["recycle_rocket_left", "distance", 5, "power", "short", [1, 6, 0], "medium"],
 ["recycle_curler_right", "distance", 5, "finesse", "short", [2, 7, 0], "medium"],
 ["halfvolley_drive", "distance", 4, "volley", "loft", [6, 3, 0], "short"],
 ["switch_cut_left", "switch", 5, "finesse", "loft", [7, 1, 0], "long"],
 ["switch_cut_right", "switch", 5, "finesse", "loft", [6, 2, 0], "long"],
 ["near_post_flick_header_left", "nearpost", 5, "header", "cross", [4, 0], "medium"],
 ["near_post_flick_header_right", "nearpost", 5, "header", "cross", [5, 0], "medium"],
 ["counter_sprint_left", "through", 7, "normal", "through", [6, 1, 0], "short"],
 ["counter_sprint_right", "through", 7, "normal", "through", [7, 2, 0], "short"],
 ["rebound_drive", "combination", 5, "power", "short", [3, 7, 0], "short"],
 // V21.259: fifteen new attacks using the existing order, delivery and finish grammar.
 ["box_wall_triangle_left","combination",7,"finesse","short",[6,3,1,3,0],"medium"],
 ["split_line_surge_right","through",7,"low_driven","through",[7,3,2,0],"medium"],
 ["byline_high_header_left","overlap",6,"header","cross",[6,1,4,0],"long"],
 ["penalty_spot_pullback_right","cutback",7,"normal","driven",[7,2,3,0],"medium"],
 ["turnover_counter_diagonal","through",7,"low_driven","through",[6,7,3,0],"short"],
 ["far_switch_volley_right","switch",5,"volley","loft",[6,3,2,0],"long"],
 ["double_marker_slalom_central","dribble",6,"finesse","short",[3,6,0],"short"],
 ["heel_flick_release_left","combination",6,"finesse","short",[6,3,1,0],"medium"],
 ["keeper_rush_dink_right","through",5,"chip","loft",[7,3,0],"short"],
 ["second_ball_recycle_left","combination",6,"power","short",[7,6,0],"medium"],
 ["late_edge_cutback_left","cutback",7,"finesse","driven",[7,1,6,0],"medium"],
 ["first_touch_layoff_rocket","distance",5,"power","short",[6,3,7,0],"short"],
 ["touchline_sprint_cut_right","dribble",7,"low_driven","short",[7,2,0],"medium"],
 ["five_man_central_carve","combination",7,"normal","short",[6,7,3,6,0],"medium"],
 ["blindside_chip_through_left","through",5,"chip","loft",[7,6,1,0],"medium"],
 ["skill_body-feint_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_body-feint_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_stepover_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_stepover_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_ball-roll_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_ball-roll_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_drag-back_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_drag-back_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_roulette_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_roulette_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_heel-to-heel_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_heel-to-heel_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_croqueta_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_croqueta_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_berbatov_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_berbatov_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_elastico_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_elastico_right","dribble",9,"normal","short",[7,0],"medium"],
 ["skill_reverse-elastico_left","dribble",9,"normal","short",[6,0],"medium"],
 ["skill_reverse-elastico_right","dribble",9,"normal","short",[7,0],"medium"],
 ["give_go_triangle_left","combination",9,"normal","short",[6,1,3,1,0],"long"],
 ["give_go_triangle_right","combination",9,"normal","short",[7,2,3,2,0],"long"],
 ["third_man_wall_left","combination",9,"normal","short",[6,3,7,1,0],"long"],
 ["third_man_wall_right","combination",9,"normal","short",[7,3,6,2,0],"long"],
 ["five_pass_carousel_left","combination",9,"normal","short",[6,7,3,1,3,0],"long"],
 ["five_pass_carousel_right","combination",9,"normal","short",[7,6,3,2,3,0],"long"],
 ["overload_release_left","combination",9,"normal","short",[7,6,1,4,3,0],"long"],
 ["overload_release_right","combination",9,"normal","short",[6,7,2,5,3,0],"long"],
 ["channel_overlap_thread_left","through",8,"normal","through",[6,3,1,0],"medium"],
 ["channel_overlap_thread_right","through",8,"normal","through",[7,3,2,0],"medium"],
 ["counter_wall_release_left","through",8,"normal","through",[6,3,1,0],"medium"],
 ["counter_wall_release_right","through",8,"normal","through",[7,3,2,0],"medium"]
];
// Coordinates are lateral/forward metres; 5.4s is the shared shot instant.
// Only these new plays override routes. Existing 48 plays retain their geometry.
const V146_STORIES={
 "layoff_distance":{"routes":{"0":[[0,1,-24],[2.6,0,-25],[4.6,1,-27],[5.4,1,-28]],"3":[[0,-5,-29],[2,-3,-32],[5.4,-1,-34]]},"beats":[[0.45,1.15],[3.95,5.4]],"direct":true},
 "switch_distance_left":{"routes":{"0":[[0,-12,-23],[2.4,-11,-25],[4.5,-9,-29],[5.4,-8,-30]],"1":[[0,-21,-27],[2.4,-19,-31],[5.4,-18,-36]]},"beats":[[0.45,1.75],[3.7,4.75]],"direct":false},
 "near_post_driven_left":{"routes":{"0":[[0,0,-32],[2.5,-1,-36],[4.3,-2,-42],[5.4,-3,-47]],"1":[[0,-19,-33],[2,-17,-38],[3.9,-14,-45],[5.4,-13,-47]]},"beats":[[0.4,1.2],[3.95,5.4]],"direct":true},
 "near_post_header_right":{"routes":{"0":[[0,-2,-33],[2.6,0,-37],[4.4,2,-43],[5.4,3,-46]],"2":[[0,20,-32],[2,20,-36],[3.8,18,-42],[5.4,17,-44]]},"beats":[[0.4,1.3],[3.8,5.4]],"direct":true},
 "six_yard_square_left":{"routes":{"0":[[0,6,-34],[2.7,6,-39],[4.3,4,-44],[5.4,2,-47]],"1":[[0,-15,-33],[2.1,-13,-39],[4,-10,-47],[5.4,-9,-49]]},"beats":[[0.4,1.2],[4.05,5.4]],"direct":true},
 "counter_square_right":{"routes":{"0":[[0,-7,-27],[2.5,-5,-34],[4.3,-3,-41],[5.4,-2,-45]],"2":[[0,12,-26],[2,12,-33],[3.9,11,-43],[5.4,10,-47]]},"beats":[[0.45,1.4],[4.0,5.4]],"direct":true},
 "byline_pullback_left":{"routes":{"0":[[0,1,-29],[2.6,1,-33],[4.3,0,-36],[5.4,0,-39]],"1":[[0,-22,-30],[2.3,-20,-38],[5.4,-19,-42]],"4":[[0,-26,-32],[2.4,-23,-40],[4.05,-18,-48],[5.4,-16,-49]]},"beats":[[0.4,1.0],[2.0,2.7],[4.05,5.4]],"direct":true},
 "edge_pullback_right":{"routes":{"0":[[0,3,-24],[2.5,4,-27],[4.4,4,-30],[5.4,4,-32]],"2":[[0,21,-30],[2.5,20,-37],[3.8,18,-45],[5.4,16,-48]]},"beats":[[0.4,1.15],[3.8,5.4]],"direct":true},
 "back_post_volley_left":{"routes":{"0":[[0,10,-31],[2.6,9,-36],[4.4,6,-42],[5.4,4,-46]],"1":[[0,-23,-30],[2.4,-22,-35],[3.5,-21,-40],[5.4,-20,-43]]},"beats":[[0.45,1.3],[3.5,5.4]],"direct":true},
 "overlap_clipped_right":{"routes":{"0":[[0,-6,-30],[2.5,-6,-34],[4.3,-4,-40],[5.4,-3,-44]],"2":[[0,20,-29],[2.2,19,-34],[5.4,16,-39]],"5":[[0,26,-30],[2.5,25,-37],[3.85,22,-43],[5.4,20,-46]]},"beats":[[0.4,1.05],[2,2.7],[3.85,5.4]],"direct":true},
 "striker_wall_return":{"routes":{"0":[[0,-5,-29],[1.6,-4,-31],[2.7,-6,-33],[4.1,-6,-38],[5.4,-4,-42]],"3":[[0,3,-29],[2,2,-32],[3.5,1,-35],[5.4,2,-39]]},"beats":[[0.45,1.25],[2.0,2.6],[3.5,4.65]],"direct":false},
 "diagonal_lob_finish":{"routes":{"0":[[0,16,-28],[2.5,13,-32],[4.4,9,-38],[5.4,7,-41]],"3":[[0,2,-25],[2.4,3,-29],[5.4,4,-34]]},"beats":[[0.4,1.2],[3.1,4.5]],"direct":false}
};
// V21.204: only the finisher's run is authored; support runs stay generic.
const V204_STORIES={
 "false_nine_drop_left":{"routes":{"0":[[0,-2.7,-25],[2.7,-4.8,-32.5],[5.4,-6,-40]]}},
 "false_nine_drop_right":{"routes":{"0":[[0,2.7,-25],[2.7,4.8,-32.5],[5.4,6,-40]]}},
 "winger_one_two_left":{"routes":{"0":[[0,-1.35,-25],[2.7,-2.4,-34.0],[5.4,-3,-43]]}},
 "winger_one_two_right":{"routes":{"0":[[0,1.35,-25],[2.7,2.4,-34.0],[5.4,3,-43]]}},
 "box_rondo":{"routes":{"0":[[0,0.9,-25],[2.7,1.6,-33.5],[5.4,2,-42]]}},
 "fullback_link_left":{"routes":{"0":[[0,-1.8,-25],[2.7,-3.2,-33.0],[5.4,-4,-41]]}},
 "fullback_link_right":{"routes":{"0":[[0,1.8,-25],[2.7,3.2,-33.0],[5.4,4,-41]]}},
 "channel_ball_left":{"routes":{"0":[[0,-3.6,-25],[2.7,-6.4,-34.5],[5.4,-8,-44]]}},
 "channel_ball_right":{"routes":{"0":[[0,3.6,-25],[2.7,6.4,-34.5],[5.4,8,-44]]}},
 "playmaker_slide_left":{"routes":{"0":[[0,-2.25,-25],[2.7,-4.0,-35.0],[5.4,-5,-45]]}},
 "playmaker_slide_right":{"routes":{"0":[[0,2.25,-25],[2.7,4.0,-35.0],[5.4,5,-45]]}},
 "dink_over_line":{"routes":{"0":[[0,0.45,-25],[2.7,0.8,-34.5],[5.4,1,-44]]}},
 "long_ball_sprint":{"routes":{"0":[[0,-1.35,-25],[2.7,-2.4,-34.5],[5.4,-3,-44]]}},
 "underlap_left":{"routes":{"0":[[0,-0.9,-25],[2.7,-1.6,-35.0],[5.4,-2,-45]]}},
 "underlap_right":{"routes":{"0":[[0,0.9,-25],[2.7,1.6,-35.0],[5.4,2,-45]]}},
 "overlap_volley_left":{"routes":{"0":[[0,0.45,-25],[2.7,0.8,-33.5],[5.4,1,-42]]}},
 "overlap_volley_right":{"routes":{"0":[[0,-0.45,-25],[2.7,-0.8,-33.5],[5.4,-1,-42]]}},
 "byline_drive_left":{"routes":{"0":[[0,0.45,-25],[2.7,0.8,-36.0],[5.4,1,-47]]}},
 "byline_drive_right":{"routes":{"0":[[0,-0.45,-25],[2.7,-0.8,-36.0],[5.4,-1,-47]]}},
 "far_post_slide_right":{"routes":{"0":[[0,-1.8,-25],[2.7,-3.2,-36.0],[5.4,-4,-47]]}},
 "whipped_header_left":{"routes":{"0":[[0,-0.9,-25],[2.7,-1.6,-35.5],[5.4,-2,-46]]}},
 "whipped_header_right":{"routes":{"0":[[0,0.9,-25],[2.7,1.6,-35.5],[5.4,2,-46]]}},
 "deep_cross_header_left":{"routes":{"0":[[0,1.35,-25],[2.7,2.4,-35.0],[5.4,3,-45]]}},
 "deep_cross_header_right":{"routes":{"0":[[0,-1.35,-25],[2.7,-2.4,-35.0],[5.4,-3,-45]]}},
 "slalom_left":{"routes":{"0":[[0,-3.15,-25],[2.7,-5.6,-32.5],[5.4,-7,-40]]}},
 "slalom_right":{"routes":{"0":[[0,3.15,-25],[2.7,5.6,-32.5],[5.4,7,-40]]}},
 "winger_takeon_left":{"routes":{"0":[[0,-4.05,-25],[2.7,-7.2,-33.0],[5.4,-9,-41]]}},
 "winger_takeon_right":{"routes":{"0":[[0,4.05,-25],[2.7,7.2,-33.0],[5.4,9,-41]]}},
 "pullback_power_left":{"routes":{"0":[[0,-0.9,-25],[2.7,-1.6,-31.5],[5.4,-2,-38]]}},
 "pullback_power_right":{"routes":{"0":[[0,0.9,-25],[2.7,1.6,-31.5],[5.4,2,-38]]}},
 "cutback_volley_left":{"routes":{"0":[[0,0.0,-25],[2.7,0.0,-32.5],[5.4,0,-40]]}},
 "edge_rocket":{"routes":{"0":[[0,0.0,-25],[2.7,0.0,-28.0],[5.4,0,-31]]}},
 "recycle_rocket_left":{"routes":{"0":[[0,-2.7,-25],[2.7,-4.8,-28.5],[5.4,-6,-32]]}},
 "recycle_curler_right":{"routes":{"0":[[0,3.6,-25],[2.7,6.4,-29.0],[5.4,8,-33]]}},
 "halfvolley_drive":{"routes":{"0":[[0,1.35,-25],[2.7,2.4,-28.5],[5.4,3,-32]]}},
 "switch_cut_left":{"routes":{"0":[[0,-4.5,-25],[2.7,-8.0,-31.5],[5.4,-10,-38]]}},
 "switch_cut_right":{"routes":{"0":[[0,4.5,-25],[2.7,8.0,-31.5],[5.4,10,-38]]}},
 "near_post_flick_header_left":{"routes":{"0":[[0,-0.9,-25],[2.7,-1.6,-36.0],[5.4,-2,-47]]}},
 "near_post_flick_header_right":{"routes":{"0":[[0,0.9,-25],[2.7,1.6,-36.0],[5.4,2,-47]]}},
 "counter_sprint_left":{"routes":{"0":[[0,-2.7,-25],[2.7,-4.8,-34.0],[5.4,-6,-43]]}},
 "counter_sprint_right":{"routes":{"0":[[0,2.7,-25],[2.7,4.8,-34.0],[5.4,6,-43]]}},
 "rebound_drive":{"routes":{"0":[[0,-0.9,-25],[2.7,-1.6,-30.0],[5.4,-2,-35]]}}
};

// V21.259: authored actor routes and ball-release beats at the canonical 5.4s kick.
const V259_STORIES={
 "box_wall_triangle_left": {
  "routes": {
   "0": [
    [
     0,
     -1,
     -26
    ],
    [
     2.5,
     -3,
     -31
    ],
    [
     5.4,
     -5,
     -40
    ]
   ],
   "1": [
    [
     0,
     -19,
     -25
    ],
    [
     2.7,
     -18,
     -31
    ],
    [
     5.4,
     -14,
     -38
    ]
   ],
   "3": [
    [
     0,
     -4,
     -26
    ],
    [
     2.6,
     -6,
     -30
    ],
    [
     5.4,
     -3,
     -37
    ]
   ],
   "6": [
    [
     0,
     -10,
     -20
    ],
    [
     2.7,
     -9,
     -26
    ],
    [
     5.4,
     -8,
     -31
    ]
   ]
  },
  "beats": [
   [
    0.4,
    0.94
   ],
   [
    1.2,
    1.67
   ],
   [
    2.22,
    2.7
   ],
   [
    3.79,
    4.94
   ]
  ],
  "direct": false
 },
 "split_line_surge_right": {
  "routes": {
   "0": [
    [
     0,
     6,
     -25
    ],
    [
     2.2,
     8,
     -31
    ],
    [
     4.1,
     8,
     -39
    ],
    [
     5.4,
     7,
     -45
    ]
   ],
   "2": [
    [
     0,
     19,
     -24
    ],
    [
     2.7,
     18,
     -31
    ],
    [
     5.4,
     14,
     -41
    ]
   ],
   "3": [
    [
     0,
     3,
     -26
    ],
    [
     2.5,
     5,
     -30
    ],
    [
     5.4,
     5,
     -36
    ]
   ],
   "7": [
    [
     0,
     12,
     -20
    ],
    [
     2.4,
     12,
     -27
    ],
    [
     5.4,
     11,
     -33
    ]
   ]
  },
  "beats": [
   [
    0.42,
    1.11
   ],
   [
    1.59,
    2.2
   ],
   [
    3.81,
    4.96
   ]
  ],
  "direct": false
 },
 "byline_high_header_left": {
  "routes": {
   "0": [
    [
     0,
     2,
     -28
    ],
    [
     2.5,
     1,
     -35
    ],
    [
     4.2,
     -2,
     -40
    ],
    [
     5.4,
     -4,
     -46
    ]
   ],
   "1": [
    [
     0,
     -21,
     -25
    ],
    [
     2.7,
     -22,
     -34
    ],
    [
     4.25,
     -23,
     -43
    ],
    [
     5.4,
     -22,
     -45
    ]
   ],
   "4": [
    [
     0,
     -28,
     -27
    ],
    [
     2.5,
     -27,
     -34
    ],
    [
     4.12,
     -25,
     -41
    ],
    [
     5.4,
     -24,
     -43
    ]
   ],
   "6": [
    [
     0,
     -10,
     -21
    ],
    [
     2.7,
     -11,
     -27
    ],
    [
     5.4,
     -12,
     -32
    ]
   ]
  },
  "beats": [
   [
    0.43,
    1.1
   ],
   [
    2.28,
    2.81
   ],
   [
    4,
    5.4
   ]
  ],
  "direct": true
 },
 "penalty_spot_pullback_right": {
  "routes": {
   "0": [
    [
     0,
     -3,
     -25
    ],
    [
     2.4,
     -2,
     -30
    ],
    [
     4,
     -1,
     -35
    ],
    [
     5.4,
     1,
     -40
    ]
   ],
   "2": [
    [
     0,
     20,
     -26
    ],
    [
     2.6,
     21,
     -36
    ],
    [
     4.1,
     22,
     -46
    ],
    [
     5.4,
     20,
     -48
    ]
   ],
   "3": [
    [
     0,
     4,
     -28
    ],
    [
     2.5,
     4,
     -34
    ],
    [
     5.4,
     4,
     -41
    ]
   ],
   "7": [
    [
     0,
     11,
     -23
    ],
    [
     2.7,
     12,
     -29
    ],
    [
     5.4,
     12,
     -33
    ]
   ]
  },
  "beats": [
   [
    0.42,
    1.08
   ],
   [
    1.83,
    2.32
   ],
   [
    3.93,
    4.96
   ]
  ],
  "direct": false
 },
 "turnover_counter_diagonal": {
  "routes": {
   "0": [
    [
     0,
     -7,
     -23
    ],
    [
     2.2,
     -6,
     -31
    ],
    [
     4,
     -3,
     -39
    ],
    [
     5.4,
     -2,
     -44
    ]
   ],
   "3": [
    [
     0,
     -2,
     -25
    ],
    [
     2.5,
     -2,
     -31
    ],
    [
     5.4,
     -1,
     -40
    ]
   ],
   "6": [
    [
     0,
     -14,
     -17
    ],
    [
     2,
     -11,
     -24
    ],
    [
     5.4,
     -9,
     -30
    ]
   ],
   "7": [
    [
     0,
     8,
     -21
    ],
    [
     2.5,
     7,
     -27
    ],
    [
     5.4,
     6,
     -34
    ]
   ]
  },
  "beats": [
   [
    0.42,
    1.09
   ],
   [
    1.47,
    2.05
   ],
   [
    3.59,
    4.99
   ]
  ],
  "direct": false
 },
 "far_switch_volley_right": {
  "routes": {
   "0": [
    [
     0,
     5,
     -27
    ],
    [
     2.8,
     9,
     -32
    ],
    [
     4.4,
     8,
     -40
    ],
    [
     5.4,
     6,
     -44
    ]
   ],
   "2": [
    [
     0,
     22,
     -27
    ],
    [
     2.5,
     21,
     -34
    ],
    [
     5.4,
     18,
     -43
    ]
   ],
   "3": [
    [
     0,
     -4,
     -23
    ],
    [
     2.4,
     -2,
     -27
    ],
    [
     5.4,
     1,
     -33
    ]
   ],
   "6": [
    [
     0,
     -14,
     -22
    ],
    [
     2.5,
     -12,
     -27
    ],
    [
     5.4,
     -11,
     -32
    ]
   ]
  },
  "beats": [
   [
    0.39,
    1.05
   ],
   [
    1.69,
    2.32
   ],
   [
    3.67,
    5.4
   ]
  ],
  "direct": true
 },
 "double_marker_slalom_central": {
  "routes": {
   "0": [
    [
     0,
     -5,
     -25
    ],
    [
     1.8,
     -8,
     -30
    ],
    [
     2.9,
     0,
     -35
    ],
    [
     4.1,
     -6,
     -38
    ],
    [
     5.4,
     -3,
     -43
    ]
   ],
   "3": [
    [
     0,
     -3,
     -20
    ],
    [
     2.4,
     -2,
     -27
    ],
    [
     5.4,
     0,
     -32
    ]
   ],
   "6": [
    [
     0,
     -10,
     -23
    ],
    [
     2.2,
     -9,
     -31
    ],
    [
     5.4,
     -7,
     -37
    ]
   ]
  },
  "beats": [
   [
    0.43,
    1.1
   ],
   [
    1.89,
    2.47
   ]
  ],
  "direct": false
 },
 "heel_flick_release_left": {
  "routes": {
   "0": [
    [
     0,
     0,
     -26
    ],
    [
     2.6,
     -3,
     -32
    ],
    [
     4,
     -5,
     -37
    ],
    [
     5.4,
     -6,
     -42
    ]
   ],
   "1": [
    [
     0,
     -21,
     -28
    ],
    [
     2.5,
     -18,
     -34
    ],
    [
     5.4,
     -14,
     -41
    ]
   ],
   "3": [
    [
     0,
     -6,
     -25
    ],
    [
     2.5,
     -7,
     -31
    ],
    [
     5.4,
     -4,
     -36
    ]
   ],
   "6": [
    [
     0,
     -12,
     -22
    ],
    [
     2.2,
     -10,
     -28
    ],
    [
     5.4,
     -10,
     -34
    ]
   ]
  },
  "beats": [
   [
    0.38,
    0.99
   ],
   [
    1.61,
    2.07
   ],
   [
    3.73,
    4.96
   ]
  ],
  "direct": false
 },
 "keeper_rush_dink_right": {
  "routes": {
   "0": [
    [
     0,
     4,
     -28
    ],
    [
     2.7,
     5,
     -36
    ],
    [
     4.35,
     3,
     -42
    ],
    [
     5.4,
     2,
     -47
    ]
   ],
   "3": [
    [
     0,
     -2,
     -25
    ],
    [
     2.6,
     0,
     -32
    ],
    [
     5.4,
     1,
     -40
    ]
   ],
   "7": [
    [
     0,
     9,
     -20
    ],
    [
     2.5,
     10,
     -27
    ],
    [
     5.4,
     11,
     -32
    ]
   ]
  },
  "beats": [
   [
    0.43,
    1.18
   ],
   [
    3.6,
    4.98
   ]
  ],
  "direct": false
 },
 "second_ball_recycle_left": {
  "routes": {
   "0": [
    [
     0,
     2,
     -25
    ],
    [
     2.7,
     0,
     -29
    ],
    [
     4.2,
     -4,
     -32
    ],
    [
     5.4,
     -5,
     -35
    ]
   ],
   "6": [
    [
     0,
     -10,
     -24
    ],
    [
     2.5,
     -9,
     -29
    ],
    [
     5.4,
     -7,
     -34
    ]
   ],
   "7": [
    [
     0,
     8,
     -23
    ],
    [
     2.3,
     7,
     -28
    ],
    [
     5.4,
     5,
     -32
    ]
   ]
  },
  "beats": [
   [
    0.5,
    1.35
   ],
   [
    3.7,
    4.97
   ]
  ],
  "direct": false
 },
 "late_edge_cutback_left": {
  "routes": {
   "0": [
    [
     0,
     -2,
     -26
    ],
    [
     2.3,
     -4,
     -31
    ],
    [
     4.1,
     -6,
     -36
    ],
    [
     5.4,
     -7,
     -40
    ]
   ],
   "1": [
    [
     0,
     -20,
     -27
    ],
    [
     2.5,
     -22,
     -36
    ],
    [
     4.2,
     -23,
     -45
    ],
    [
     5.4,
     -21,
     -47
    ]
   ],
   "6": [
    [
     0,
     -9,
     -25
    ],
    [
     2.7,
     -9,
     -31
    ],
    [
     5.4,
     -9,
     -39
    ]
   ],
   "7": [
    [
     0,
     11,
     -22
    ],
    [
     2.4,
     8,
     -27
    ],
    [
     5.4,
     4,
     -33
    ]
   ]
  },
  "beats": [
   [
    0.41,
    1.05
   ],
   [
    1.92,
    2.4
   ],
   [
    3.88,
    4.94
   ]
  ],
  "direct": false
 },
 "first_touch_layoff_rocket": {
  "routes": {
   "0": [
    [
     0,
     2,
     -22
    ],
    [
     2.5,
     3,
     -26
    ],
    [
     4.3,
     4,
     -30
    ],
    [
     5.4,
     4,
     -33
    ]
   ],
   "3": [
    [
     0,
     -3,
     -26
    ],
    [
     2.5,
     -3,
     -31
    ],
    [
     5.4,
     0,
     -34
    ]
   ],
   "6": [
    [
     0,
     -9,
     -20
    ],
    [
     2.4,
     -9,
     -26
    ],
    [
     5.4,
     -7,
     -29
    ]
   ],
   "7": [
    [
     0,
     8,
     -23
    ],
    [
     2.5,
     8,
     -27
    ],
    [
     5.4,
     6,
     -32
    ]
   ]
  },
  "beats": [
   [
    0.4,
    1.09
   ],
   [
    1.58,
    2.16
   ],
   [
    3.82,
    5.04
   ]
  ],
  "direct": false
 },
 "touchline_sprint_cut_right": {
  "routes": {
   "0": [
    [
     0,
     5,
     -26
    ],
    [
     2,
     8,
     -31
    ],
    [
     3.3,
     10,
     -38
    ],
    [
     4.35,
     7,
     -43
    ],
    [
     5.4,
     5,
     -45
    ]
   ],
   "2": [
    [
     0,
     23,
     -24
    ],
    [
     2,
     24,
     -31
    ],
    [
     3.3,
     23,
     -38
    ],
    [
     5.4,
     20,
     -43
    ]
   ],
   "7": [
    [
     0,
     13,
     -21
    ],
    [
     2.7,
     13,
     -28
    ],
    [
     5.4,
     12,
     -33
    ]
   ]
  },
  "beats": [
   [
    0.43,
    1.09
   ],
   [
    3.64,
    4.93
   ]
  ],
  "direct": false
 },
 "five_man_central_carve": {
  "routes": {
   "0": [
    [
     0,
     -2,
     -26
    ],
    [
     2.4,
     0,
     -31
    ],
    [
     4.15,
     2,
     -36
    ],
    [
     5.4,
     1,
     -41
    ]
   ],
   "3": [
    [
     0,
     -2,
     -25
    ],
    [
     2.5,
     -1,
     -30
    ],
    [
     5.4,
     0,
     -38
    ]
   ],
   "6": [
    [
     0,
     -10,
     -21
    ],
    [
     2.5,
     -9,
     -27
    ],
    [
     5.4,
     -4,
     -36
    ]
   ],
   "7": [
    [
     0,
     9,
     -21
    ],
    [
     2.5,
     7,
     -28
    ],
    [
     5.4,
     5,
     -37
    ]
   ]
  },
  "beats": [
   [
    0.36,
    0.92
   ],
   [
    1.22,
    1.68
   ],
   [
    2.13,
    2.64
   ],
   [
    3.79,
    4.96
   ]
  ],
  "direct": false
 },
 "blindside_chip_through_left": {
  "routes": {
   "0": [
    [
     0,
     -6,
     -25
    ],
    [
     2.6,
     -8,
     -33
    ],
    [
     4.2,
     -8,
     -41
    ],
    [
     5.4,
     -7,
     -46
    ]
   ],
   "1": [
    [
     0,
     -22,
     -26
    ],
    [
     2.5,
     -20,
     -32
    ],
    [
     5.4,
     -16,
     -43
    ]
   ],
   "6": [
    [
     0,
     -10,
     -21
    ],
    [
     2.5,
     -11,
     -28
    ],
    [
     5.4,
     -10,
     -34
    ]
   ],
   "7": [
    [
     0,
     10,
     -20
    ],
    [
     2.5,
     8,
     -27
    ],
    [
     5.4,
     6,
     -31
    ]
   ]
  },
  "beats": [
   [
    0.45,
    1.15
   ],
   [
    1.72,
    2.29
   ],
   [
    3.75,
    4.96
   ]
  ],
  "direct": false
 }
};

const V303_STORIES={"skill_body-feint_left":{"routes":{"0":[[0,-8.0,-24],[1.1,-8.0,-27.2],[1.65,-6.72,-29.4],[2.6,-8.82,-30.1],[3.35,-4.96,-32.5],[4.7,-1.4,-36.8],[5.4,-1.4,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_body-feint_right":{"routes":{"0":[[0,8.0,-24],[1.1,8.0,-27.2],[1.65,6.72,-29.4],[2.6,8.82,-30.1],[3.35,4.96,-32.5],[4.7,1.4,-36.8],[5.4,1.4,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_stepover_left":{"routes":{"0":[[0,-8.23,-24],[1.1,-8.23,-27.2],[1.65,-6.9132,-29.4],[2.6,-9.363199999999999,-30.1],[3.35,-5.1026,-32.5],[4.7,-2.0,-36.8],[5.4,-2.0,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_stepover_right":{"routes":{"0":[[0,8.23,-24],[1.1,8.23,-27.2],[1.65,6.9132,-29.4],[2.6,9.363199999999999,-30.1],[3.35,5.1026,-32.5],[4.7,2.0,-36.8],[5.4,2.0,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_ball-roll_left":{"routes":{"0":[[0,-8.46,-24],[1.1,-8.46,-27.2],[1.65,-7.106400000000001,-29.4],[2.6,-9.906400000000001,-30.1],[3.35,-5.2452000000000005,-32.5],[4.7,-2.5999999999999996,-36.8],[5.4,-2.5999999999999996,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_ball-roll_right":{"routes":{"0":[[0,8.46,-24],[1.1,8.46,-27.2],[1.65,7.106400000000001,-29.4],[2.6,9.906400000000001,-30.1],[3.35,5.2452000000000005,-32.5],[4.7,2.5999999999999996,-36.8],[5.4,2.5999999999999996,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_drag-back_left":{"routes":{"0":[[0,-8.69,-24],[1.1,-8.69,-27.2],[1.65,-7.299599999999999,-29.4],[2.6,-10.449599999999998,-29.1],[3.35,-5.3877999999999995,-32.5],[4.7,-1.4,-36.8],[5.4,-1.4,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_drag-back_right":{"routes":{"0":[[0,8.69,-24],[1.1,8.69,-27.2],[1.65,7.299599999999999,-29.4],[2.6,10.449599999999998,-29.1],[3.35,5.3877999999999995,-32.5],[4.7,1.4,-36.8],[5.4,1.4,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_roulette_left":{"routes":{"0":[[0,-8.92,-24],[1.1,-8.92,-27.2],[1.65,-7.4928,-29.4],[2.6,-9.5928,-30.1],[3.35,-5.5304,-32.5],[4.7,-2.0,-36.8],[5.4,-2.0,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_roulette_right":{"routes":{"0":[[0,8.92,-24],[1.1,8.92,-27.2],[1.65,7.4928,-29.4],[2.6,9.5928,-30.1],[3.35,5.5304,-32.5],[4.7,2.0,-36.8],[5.4,2.0,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_heel-to-heel_left":{"routes":{"0":[[0,-9.15,-24],[1.1,-9.15,-27.2],[1.65,-7.686,-29.4],[2.6,-10.136,-30.1],[3.35,-5.673,-32.5],[4.7,-2.5999999999999996,-36.8],[5.4,-2.5999999999999996,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_heel-to-heel_right":{"routes":{"0":[[0,9.15,-24],[1.1,9.15,-27.2],[1.65,7.686,-29.4],[2.6,10.136,-30.1],[3.35,5.673,-32.5],[4.7,2.5999999999999996,-36.8],[5.4,2.5999999999999996,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_croqueta_left":{"routes":{"0":[[0,-9.38,-24],[1.1,-9.38,-27.2],[1.65,-7.8792,-29.4],[2.6,-10.6792,-30.1],[3.35,-5.815600000000001,-32.5],[4.7,-1.4,-36.8],[5.4,-1.4,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_croqueta_right":{"routes":{"0":[[0,9.38,-24],[1.1,9.38,-27.2],[1.65,7.8792,-29.4],[2.6,10.6792,-30.1],[3.35,5.815600000000001,-32.5],[4.7,1.4,-36.8],[5.4,1.4,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_berbatov_left":{"routes":{"0":[[0,-9.61,-24],[1.1,-9.61,-27.2],[1.65,-8.0724,-29.4],[2.6,-11.2224,-30.1],[3.35,-5.9582,-32.5],[4.7,-2.0,-36.8],[5.4,-2.0,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_berbatov_right":{"routes":{"0":[[0,9.61,-24],[1.1,9.61,-27.2],[1.65,8.0724,-29.4],[2.6,11.2224,-30.1],[3.35,5.9582,-32.5],[4.7,2.0,-36.8],[5.4,2.0,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_elastico_left":{"routes":{"0":[[0,-9.84,-24],[1.1,-9.84,-27.2],[1.65,-8.2656,-29.4],[2.6,-10.365599999999999,-30.1],[3.35,-6.1008,-32.5],[4.7,-2.5999999999999996,-36.8],[5.4,-2.5999999999999996,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_elastico_right":{"routes":{"0":[[0,9.84,-24],[1.1,9.84,-27.2],[1.65,8.2656,-29.4],[2.6,10.365599999999999,-30.1],[3.35,6.1008,-32.5],[4.7,2.5999999999999996,-36.8],[5.4,2.5999999999999996,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_reverse-elastico_left":{"routes":{"0":[[0,-10.07,-24],[1.1,-10.07,-27.2],[1.65,-8.4588,-29.4],[2.6,-10.9088,-30.1],[3.35,-6.2434,-32.5],[4.7,-1.4,-36.8],[5.4,-1.4,-38.2]],"6":[[0,-16,-20],[0.45,-15,-23],[2.0,-12,-27],[5.4,-9,-32]]},"beats":[[0.45,1.1]],"direct":false},"skill_reverse-elastico_right":{"routes":{"0":[[0,10.07,-24],[1.1,10.07,-27.2],[1.65,8.4588,-29.4],[2.6,10.9088,-30.1],[3.35,6.2434,-32.5],[4.7,1.4,-36.8],[5.4,1.4,-38.2]],"7":[[0,16,-20],[0.45,15,-23],[2.0,12,-27],[5.4,9,-32]]},"beats":[[0.45,1.1]],"direct":false},"give_go_triangle_left":{"routes":{"0":[[0,-2,-18.0],[1.5,1,-23.0],[3.2,-4,-28.0],[5.4,-1,-37]],"1":[[0,-6,-18.5],[1.5,-3,-23.4],[3.2,-7,-28.4],[5.4,-4,-31.5]],"3":[[0,-14,-19.5],[1.5,-11,-24.2],[3.2,-4,-29.2],[5.4,-1,-32.5]],"6":[[0,-10,-21.0],[1.5,-7,-25.4],[3.2,-4,-30.4],[5.4,-1,-34.0]]},"beats":[[0.42,1.1],[1.42,2.1],[2.42,3.1],[3.42,4.1]],"direct":false},"give_go_triangle_right":{"routes":{"0":[[0,2,-18.0],[1.5,-1,-23.0],[3.2,4,-28.0],[5.4,1,-37]],"2":[[0,10,-19.0],[1.5,7,-23.8],[3.2,10,-28.8],[5.4,7,-32.0]],"3":[[0,14,-19.5],[1.5,11,-24.2],[3.2,4,-29.2],[5.4,1,-32.5]],"7":[[0,14,-21.5],[1.5,11,-25.8],[3.2,7,-30.8],[5.4,4,-34.5]]},"beats":[[0.42,1.1],[1.42,2.1],[2.42,3.1],[3.42,4.1]],"direct":false},"third_man_wall_left":{"routes":{"0":[[0,-2,-18.0],[1.5,1,-23.0],[3.2,-4,-28.0],[5.4,-1,-37]],"1":[[0,-6,-18.5],[1.5,-3,-23.4],[3.2,-7,-28.4],[5.4,-4,-31.5]],"3":[[0,-14,-19.5],[1.5,-11,-24.2],[3.2,-4,-29.2],[5.4,-1,-32.5]],"6":[[0,-10,-21.0],[1.5,-7,-25.4],[3.2,-4,-30.4],[5.4,-1,-34.0]],"7":[[0,-14,-21.5],[1.5,-11,-25.8],[3.2,-7,-30.8],[5.4,-4,-34.5]]},"beats":[[0.42,1.1],[1.42,2.1],[2.42,3.1],[3.42,4.1]],"direct":false},"third_man_wall_right":{"routes":{"0":[[0,2,-18.0],[1.5,-1,-23.0],[3.2,4,-28.0],[5.4,1,-37]],"2":[[0,10,-19.0],[1.5,7,-23.8],[3.2,10,-28.8],[5.4,7,-32.0]],"3":[[0,14,-19.5],[1.5,11,-24.2],[3.2,4,-29.2],[5.4,1,-32.5]],"6":[[0,10,-21.0],[1.5,7,-25.4],[3.2,4,-30.4],[5.4,1,-34.0]],"7":[[0,14,-21.5],[1.5,11,-25.8],[3.2,7,-30.8],[5.4,4,-34.5]]},"beats":[[0.42,1.1],[1.42,2.1],[2.42,3.1],[3.42,4.1]],"direct":false},"five_pass_carousel_left":{"routes":{"0":[[0,-2,-18.0],[1.5,1,-23.0],[3.2,-4,-28.0],[5.4,-1,-37]],"1":[[0,-6,-18.5],[1.5,-3,-23.4],[3.2,-7,-28.4],[5.4,-4,-31.5]],"3":[[0,-14,-19.5],[1.5,-11,-24.2],[3.2,-4,-29.2],[5.4,-1,-32.5]],"6":[[0,-10,-21.0],[1.5,-7,-25.4],[3.2,-4,-30.4],[5.4,-1,-34.0]],"7":[[0,-14,-21.5],[1.5,-11,-25.8],[3.2,-7,-30.8],[5.4,-4,-34.5]]},"beats":[[0.42,0.964],[1.22,1.764],[2.02,2.564],[2.82,3.364],[3.62,4.164]],"direct":false},"five_pass_carousel_right":{"routes":{"0":[[0,2,-18.0],[1.5,-1,-23.0],[3.2,4,-28.0],[5.4,1,-37]],"2":[[0,10,-19.0],[1.5,7,-23.8],[3.2,10,-28.8],[5.4,7,-32.0]],"3":[[0,14,-19.5],[1.5,11,-24.2],[3.2,4,-29.2],[5.4,1,-32.5]],"6":[[0,10,-21.0],[1.5,7,-25.4],[3.2,4,-30.4],[5.4,1,-34.0]],"7":[[0,14,-21.5],[1.5,11,-25.8],[3.2,7,-30.8],[5.4,4,-34.5]]},"beats":[[0.42,0.964],[1.22,1.764],[2.02,2.564],[2.82,3.364],[3.62,4.164]],"direct":false},"overload_release_left":{"routes":{"0":[[0,-2,-18.0],[1.5,1,-23.0],[3.2,-4,-28.0],[5.4,-1,-37]],"1":[[0,-6,-18.5],[1.5,-3,-23.4],[3.2,-7,-28.4],[5.4,-4,-31.5]],"3":[[0,-14,-19.5],[1.5,-11,-24.2],[3.2,-4,-29.2],[5.4,-1,-32.5]],"4":[[0,-2,-20.0],[1.5,1,-24.6],[3.2,-7,-29.6],[5.4,-4,-33.0]],"6":[[0,-10,-21.0],[1.5,-7,-25.4],[3.2,-4,-30.4],[5.4,-1,-34.0]],"7":[[0,-14,-21.5],[1.5,-11,-25.8],[3.2,-7,-30.8],[5.4,-4,-34.5]]},"beats":[[0.42,0.964],[1.22,1.764],[2.02,2.564],[2.82,3.364],[3.62,4.164]],"direct":false},"overload_release_right":{"routes":{"0":[[0,2,-18.0],[1.5,-1,-23.0],[3.2,4,-28.0],[5.4,1,-37]],"2":[[0,10,-19.0],[1.5,7,-23.8],[3.2,10,-28.8],[5.4,7,-32.0]],"3":[[0,14,-19.5],[1.5,11,-24.2],[3.2,4,-29.2],[5.4,1,-32.5]],"5":[[0,6,-20.5],[1.5,3,-25.0],[3.2,10,-30.0],[5.4,7,-33.5]],"6":[[0,10,-21.0],[1.5,7,-25.4],[3.2,4,-30.4],[5.4,1,-34.0]],"7":[[0,14,-21.5],[1.5,11,-25.8],[3.2,7,-30.8],[5.4,4,-34.5]]},"beats":[[0.42,0.964],[1.22,1.764],[2.02,2.564],[2.82,3.364],[3.62,4.164]],"direct":false},"channel_overlap_thread_left":{"routes":{"0":[[0,-3,-18],[2.0,-6,-23],[3.1,-9,-28],[4.7,-4,-36],[5.4,-3,-39]],"3":[[0,0,-22],[2.4,-3,-29],[5.4,-5,-33]],"1":[[0,-18,-22],[2.6,-15,-30],[5.4,-11,-37]]},"beats":[[0.45,1.05],[1.7,2.3],[3.35,4.35]],"direct":false},"channel_overlap_thread_right":{"routes":{"0":[[0,3,-18],[2.0,6,-23],[3.1,9,-28],[4.7,4,-36],[5.4,3,-39]],"3":[[0,0,-22],[2.4,3,-29],[5.4,5,-33]],"2":[[0,18,-22],[2.6,15,-30],[5.4,11,-37]]},"beats":[[0.45,1.05],[1.7,2.3],[3.35,4.35]],"direct":false},"counter_wall_release_left":{"routes":{"0":[[0,-3,-18],[2.0,-6,-23],[3.1,-9,-28],[4.7,-4,-36],[5.4,-3,-39]],"3":[[0,0,-22],[2.4,-3,-29],[5.4,-5,-33]],"1":[[0,-18,-22],[2.6,-15,-30],[5.4,-11,-37]]},"beats":[[0.45,1.05],[1.7,2.3],[3.35,4.35]],"direct":false},"counter_wall_release_right":{"routes":{"0":[[0,3,-18],[2.0,6,-23],[3.1,9,-28],[4.7,4,-36],[5.4,3,-39]],"3":[[0,0,-22],[2.4,3,-29],[5.4,5,-33]],"2":[[0,18,-22],[2.6,15,-30],[5.4,11,-37]]},"beats":[[0.45,1.05],[1.7,2.3],[3.35,4.35]],"direct":false}};
export const V303_ATTACK_IDS=Object.freeze(Object.keys(V303_STORIES));
const STORIES={...V146_STORIES,...V204_STORIES,...V259_STORIES,...V303_STORIES};
export const NEW_ATTACK_IDS=Object.freeze(Object.keys(V146_STORIES));
export const MORE_ATTACK_IDS=Object.freeze(Object.keys(V204_STORIES));
export const V259_ATTACK_IDS=Object.freeze(Object.keys(V259_STORIES));
export const hasAuthoredFinish=id=>Object.hasOwn(STORIES,id);
const tags=Object.freeze({
 combination:['tiki-taka','first-touch','incisive-pass'],
 switch:['long-ball-pass','flair'],
 through:['incisive-pass','through-ball'],
 overlap:['rapid','quick-step','pinged-pass'],
 lowcross:['pinged-pass','first-touch'],
 dribble:['technical','trickster','rapid'],
 cutback:['pinged-pass','finesse-shot'],
 distance:['power-shot','first-touch'],
 nearpost:['first-touch','low-driven-shot']
});
export const PLAYBOOK=Object.freeze(catalog.map(([id,family,weight,finish,delivery,order,length],index)=>
 Object.freeze({id,family,weight,finish,delivery,order:Object.freeze(order),length,
  seconds:length==='long'?17+(index%3):length==='medium'?13+(index%3):9+(index%3),
  tags:tags[family]||tags.combination})));
const plans=new Map(PLAYBOOK.map(p=>[p.id,p]));
export const getPlay=id=>plans.get(id)||null;
export const PLAYBOOK_IDS=Object.freeze(PLAYBOOK.map(p=>p.id));
export const DEFENSIVE_SCENES=Object.freeze([
 'defense_interception','defense_standing_tackle','defense_slide_tackle','defense_press_recovery',
 'defense_standing_tackle_wide','defense_slide_tackle_wide'
]);
// Match Engine 2.0: deterministic, result-neutral multi-phase highlight plans.
// These plans describe possession and camera beats; they never award a goal.
export const EXTENDED_HIGHLIGHT_TYPES=Object.freeze(['keeper_buildout','turnover_counter','corner','free_kick','penalty','throw_in']);
const EXTENDED_BEATS=Object.freeze({
 keeper_buildout:[['keeper_control',0,4,'home'],['short_distribution',4,9,'home'],['midfield_progression',9,17,'home'],['final_third',17,25,'home']],
 turnover_counter:[['possession_build',0,7,'home'],['interception',7,9,'contested'],['transition',9,17,'away'],['counter_finish',17,25,'away']],
 corner:[['setup',0,4,'home'],['delivery',4,8,'home'],['aerial_duel',8,11,'contested'],['second_ball',11,18,'contested']],
 free_kick:[['setup',0,5,'home'],['run_up',5,8,'home'],['delivery',8,11,'home'],['rebound',11,16,'contested']],
 penalty:[['setup',0,6,'home'],['run_up',6,9,'home'],['strike',9,10,'home'],['keeper_response',10,13,'contested']],
 throw_in:[['setup',0,3,'home'],['throw',3,5,'home'],['reception',5,8,'home'],['combination',8,16,'home']]
});
export function createExtendedHighlightPlan(kind,options={}){
 if(!Object.hasOwn(EXTENDED_BEATS,kind))return null;
 const attackingTeam=options.team==='away'?'away':'home';
 const opposite=attackingTeam==='home'?'away':'home';
 const beats=EXTENDED_BEATS[kind].map(([action,start,end,owner])=>Object.freeze({
  action,start,end,team:owner==='contested'?null:owner==='away'?opposite:attackingTeam
 }));
 return Object.freeze({kind,duration:beats[beats.length-1].end,beats:Object.freeze(beats),
  result:String(options.result||'unresolved'),presentationOnly:true});
}
export function sampleExtendedHighlight(plan,time){
 if(!plan?.beats?.length)return null;
 const t=clamp(Number.isFinite(time)?time:0,0,plan.duration);
 const beat=plan.beats.find(b=>t<b.end)||plan.beats[plan.beats.length-1];
 return Object.freeze({action:beat.action,team:beat.team,elapsed:t-beat.start,
  progress:clamp((t-beat.start)/(beat.end-beat.start)),time:t});
}
const STARTS=[[-7,-28],[-23,-22],[23,-22],[-4,-21],[-27,-15],[27,-15],[-9,-16],[8,-17]];
// Stable per-play movement fingerprint; no RNG or additional match events.
const routeHash=plan=>Array.from(plan.id).reduce((n,c)=>(Math.imul(n,33)+c.charCodeAt(0))|0,5381)>>>0;
export function playRouteSignature(plan){
 const n=routeHash(plan);
 return Object.freeze({bend:((n%9)-4)*.31,hold:((n>>>4)%7)*.04,
  attackLane:((n>>>9)%7-3)*.18,side:plan.id.includes('_left')?-1:plan.id.includes('_right')?1:0});
}

const ENDS=[[0,-37],[-24,-39],[24,-39],[-1,-32],[-26,-42],[26,-42],[-6,-30],[6,-31]];
function basePlayPosition(index,time,plan){
 if(!plan||index<0||index>7)return null;
 const route=STORIES[plan.id]?.routes[index];
 if(route)return sampleFlowRun(route,time,0,-1.3);
 const start=STARTS[index],end=ENDS[index],u=clamp(time/5.4),shape=playRouteSignature(plan);
 let p=interpolate(start,end,u);
 // All player tracks are distinct even when the same passer appears across
 // several presets. Passing ball windows sample these exact actor positions.
 const flow=Math.sin(Math.PI*u),lane=shape.side*(index===4||index===5?1:.55);
 if(index!==0){
  p[0]+=flow*(shape.bend*(index%2?1:-1)+lane*.9);
  p[1]+=flow*(shape.attackLane*(index%3-1)-shape.hold*2);
 }
 // The final attacker accelerates through the line while support keeps moving.
 if(index===0){p=interpolate(start,end,ease((time-.45)/4.95));p[0]+=(plan.family==='dribble'?(plan.id.includes('left')?-1.4:1.4):0)*Math.sin(Math.PI*u)}
 if(index===4||index===5){
  // On an overlap, fullbacks actually sprint past their wingers.
  if(plan.family==='overlap'||plan.id.startsWith('switch_overlap')){
   const run=ease((time-.6)/3.7);p[1]=mix(start[1],end[1]-2,run);
   p[0]+=(index===4?-1:1)*2.2*Math.sin(Math.PI*u);
  }else p[1]=mix(start[1],end[1]+7,ease(time/5.6));
 }
 // Smooth inside feint and byline acceleration give a real visible wing duel.
 if((index===1||index===2)&&['overlap','lowcross','cutback','nearpost'].includes(plan.family)){
  const side=index===1?-1:1,feint=ease((time-1.35)/.35)*(1-ease((time-2.12)/.48));
  p[0]-=side*1.35*feint;p[1]-=2.1*ease((time-2.35)/.92);
 }
 // Strong, family-specific movement arcs. Deviations taper to zero at kick contact.
 const side=plan.id.includes('_left')?-1:plan.id.includes('_right')?1:(routeHash(plan)&1?1:-1);
 const beat=Math.sin(Math.PI*u),check=Math.sin(Math.PI*2*u),late=ease((time-1.25)/2.45)*(1-ease((time-3.85)/1.45));
 const family=plan.family,variation=playRouteSignature(plan).bend;
 if(index===0){
  const carve=family==='dribble'?4.7:family==='through'?2.9:family==='cutback'?2.2:family==='distance'?.7:family==='switch'?1.8:1.4;
  p[0]+=side*carve*beat+variation*.85*check;
  p[1]+=(family==='through'?-2.25:family==='combination'?1.05:family==='cutback'?.8:0)*beat;
 }
 if(index===1||index===2){
  const active=side<0?index===1:index===2;
  if(active&&['overlap','lowcross','cutback'].includes(family)){
   p[0]+=side*(family==='cutback'?3.8:2.5)*beat;p[1]-=(family==='cutback'?5.3:3.1)*late;
  }
  if(family==='switch'){p[0]+=side*(active?-5.1:4.2)*beat;p[1]+=(active?-2.4:1.6)*beat}
  if(family==='through')p[0]+=side*(active?2.6:-1.8)*beat;
  if(family==='dribble'&&active)p[0]-=side*3.3*check*beat;
 }
 if(index===3||index===6||index===7){
  if(family==='combination'){p[0]+=side*(index===3?-3.2:index===6?2.6:-2.4)*beat;p[1]+=(index===3?2.2:-1.1)*check*beat}
  else if(family==='through')p[1]-=(index===3?3.2:1.6)*late;
  else if(family==='cutback'&&index===3){p[1]+=3.7*late;p[0]-=side*2.3*beat}
 }
 // A receiver checks towards the ball before running beyond the passer.
 if(plan.order.includes(index)&&index!==0&&index!==4&&index!==5){
  p[0]+=(index%2?-1:1)*1.15*Math.sin(time*1.12);
  p[1]+=.85*Math.sin(time*1.7);
 }
 return p;
}
const touchCache=new WeakMap();
export function playTouches(plan){
 if(!plan)return [];
 if(touchCache.has(plan))return touchCache.get(plan);
 const count=plan.order.length-1,slot=4.38/count;
 // Distinct passing tempos preserve the 1-v-1 before the final cross.
 const beats=STORIES[plan.id]?.beats||(plan.family==='overlap'&&count===3?[[.42,1.06],[2.58,2.99],[3.72,4.80]]:
  plan.family==='lowcross'&&count===2?[[.42,1.10],[3.62,4.82]]:
  plan.family==='cutback'&&count===4?[[.40,.94],[2.35,2.76],[3.25,3.60],[4.02,4.84]]:
  plan.family==='switch'&&count===4?[[.34,.88],[1.10,1.77],[2.12,2.69],[3.60,4.83]]:
  plan.family==='nearpost'&&count===2?[[.42,1.10],[3.69,4.79]]:null);
 const touches=Object.freeze(Array.from({length:count},(_,i)=>Object.freeze({
  passer:plan.order[i],receiver:plan.order[i+1],
  release:beats?beats[i][0]:.45+i*slot,arrival:beats?beats[i][1]:.45+i*slot+slot*.80,
  arc:plan.delivery==='cross'&&i===count-1?2.3:
      plan.delivery==='loft'&&(i===count-1||plan.family==='switch')?2.1:
      plan.delivery==='driven'&&i===count-1?.10:
      plan.delivery==='through'&&i===count-1?.15:.06
 })));
 touchCache.set(plan,touches);return touches;
}
// Reception and the next run share the pass schedule. Keep every contact anchor
// and direct finish intact; all offsets are absolute-time visual choreography.
export function playReception(plan,index,time){
 if(!plan||index<0||index>7)return null;
 const touches=playTouches(plan);
 for(let n=0;n<touches.length;n++){
  const touch=touches[n];
  if(touch.receiver!==index)continue;
  const next=touches.slice(n+1).find(p=>p.passer===index);
  const end=Math.min(touch.arrival+.42,next?next.release-.21:index===0?4.9:5.14);
  // One-touch finishes keep their shot preparation, without a fake trap.
  if(end-touch.arrival<.08)continue;
  const start=Math.max(touch.release+.05,touch.arrival-.22);
  if(time<=start||time>=end)continue;
  const cushion=ease((time-start)/(touch.arrival-start))*(1-ease((time-touch.arrival)/(end-touch.arrival)));
  return{touch,start,end,cushion,open:ease((time-touch.arrival)/(end-touch.arrival)),
   routeTime:time-.35*(time-touch.arrival)*cushion};
 }
 return null;
}
export function playSupportRun(plan,index,time){
 if(!plan||index<0||index>7)return[0,0];
 const touches=playTouches(plan);
 for(let n=touches.length-1;n>=0;n--){
  const touch=touches[n];
  if(touch.passer!==index||time<=touch.release+.20)continue;
  const next=touches.slice(n+1).find(p=>p.receiver===index||p.passer===index);
  const start=touch.release+.20,end=Math.min(5.14,next?(next.receiver===index?next.arrival-.25:next.release-.25):5.14);
  if(end-start<.65||time>=end)continue;
  const u=(time-start)/(end-start),weight=16*u*u*(1-u)*(1-u);
  const from=basePlayPosition(index,touch.release,plan),to=basePlayPosition(touch.receiver,touch.arrival,plan);
  // Offer an inside return lane, while keeping the passer behind the receiver.
  const lateral=clamp((to[0]-from[0])*.10,-1.1,1.1);
  return[lateral*weight,-.65*weight];
 }
 return[0,0];
}
export function playPosition(index,time,plan){
 const reception=playReception(plan,index,time),p=basePlayPosition(index,reception?.routeTime??time,plan);
 if(!p)return null;
 const support=playSupportRun(plan,index,time);
 return[p[0]+support[0],p[1]+support[1]];
}
function foot(index,time,plan){
 const p=playPosition(index,time,plan);
 if(!p)return[0,.14,-31];
 // Place the ball ahead of the receiver's moving boot.
 const future=playPosition(index,Math.min(5.4,time+.05),plan);
 const vx=future[0]-p[0],vz=future[1]-p[1],len=Math.hypot(vx,vz)||1;
 const lead=.45-.16*(playReception(plan,index,time)?.cushion||0);
 const skill=index===0?sampleSkill(plan.id,time):null;
 const side=skill?.ballSide||0,forward=skill?.ballForward||0;
 return[p[0]+vx/len*(lead+forward)-vz/len*side,.14,p[1]+vz/len*(lead+forward)+vx/len*side];
}
export function playCarrier(plan,time){
 if(!plan||time>=5.15)return -1;
 const touches=playTouches(plan);
 let owner=plan.order[0];
 for(const pass of touches){
  if(time>=pass.release&&time<pass.arrival)return -1;
  if(time>=pass.arrival)owner=pass.receiver;
 }
 return owner;
}
export function playBall(plan,time,shotContact){
 if(!plan)return null;
 const touches=playTouches(plan),t=clamp(time,0,5.4);
 if(t>=5.4)return shotContact.slice();
 if(t>=5.14&&!STORIES[plan.id]?.direct){const pos=foot(0,5.14,plan),u=clamp((t-5.14)/.26);return interpolate(pos,shotContact,u)}
 for(const pass of touches){
  if(t>=pass.release&&t<pass.arrival){
   const start=foot(pass.passer,pass.release,plan),direct=STORIES[plan.id]?.direct&&pass===touches.at(-1),
    end=direct?shotContact:foot(pass.receiver,pass.arrival,plan);
   const u=clamp((t-pass.release)/(pass.arrival-pass.release));
   const p=interpolate(start,end,u);p[1]=mix(start[1],end[1],ease(u))+pass.arc*Math.sin(Math.PI*u);
   return p;
  }
 }
 return foot(playCarrier(plan,t),t,plan);
}
export function playPassWindows(plan){
 if(!plan)return[];
 return playTouches(plan).map(pass=>Object.freeze({
  actor:pass.passer,start:pass.release-.21,end:pass.release+.31
 }));
}
const isInterception=sequence=>sequence==='defense_interception'||sequence==='defense_press_recovery';
function interceptedPass(){
 const passer=interpolate([-14,-26],[-7.25,-34.35],3.2/4.4);
 const from=[passer[0]+.27,.14,passer[1]-.42],to=[3.27,.14,-39.42];
 const contact=from.map((v,i)=>mix(v,to[i],(4.4-3.2)/(4.95-3.2)));
 return{from,to,contact};
}
export function defensePosition(index,time,sequence){
 if(!DEFENSIVE_SCENES.includes(sequence))return null;
 const t=clamp(time,0,10.4),slide=sequence.startsWith('defense_slide_tackle');
 const mirrored=sequence==='defense_press_recovery'||sequence.endsWith('_wide');
 const orient=point=>mirrored?[-point[0],point[1]]:point;
 if(index===1){
  // The opposition's midfielder starts in possession and supplies a visible pass.
  return orient(interpolate([-18,-21],[-12,-29],t/3.15));
 }
 if(index===2&&isInterception(sequence))return orient(interpolate([7,-30],[3,-39],t/4.95));
 if(index===0){
  const a=interpolate([-14,-26],[-7.25,-34.35],t/4.4);
  if(t>4.4){a[0]-=1.1*ease((t-4.4)/2);a[1]+=2*ease((t-4.4)/2)}
  return orient(a);
 }
 if(index===8){
  const hit=interceptedPass().contact;
  const intercept=isInterception(sequence)?[hit[0]-.12,hit[2]+.3]:slide?[-6.45,-34.45]:[-6.05,-34.35];
  if(t<=4.4)return orient(interpolate([-3.2,-42],intercept,t/4.4));
  if(slide){
   const settled=[intercept[0]-.35,intercept[1]-.32];
   if(t<5.8)return orient(interpolate(intercept,settled,(t-4.4)/.6));
   return orient(interpolate(settled,[5.8,-15.5],(t-5.8)/4.6));
  }
  // The ball winner drives toward midfield (+Z), AWAY from the
  // defended -Z goal, rather than turning into that goal's box.
  return orient(interpolate(intercept,[5.8,-14.5],(t-4.4)/5.2));
 }
 if(index>=9&&index<=15){
  const n=index-9,from=[-21+n*6,-40+(n%3)*4],u=ease((t-4.45)/5.2);
  return orient([from[0]+(n%2?2.2:-1.2)*u,from[1]+(10+(n%3)*2.3)*u]);
 }
 return null;
}
export function defenseBall(time,sequence){
 if(!DEFENSIVE_SCENES.includes(sequence))return null;
 const t=clamp(time,0,10.4),side=sequence==='defense_press_recovery'||sequence.endsWith('_wide')?-1:1;
 const a=defensePosition(0,Math.min(t,4.15),sequence),d=defensePosition(8,4.4,sequence);
 // Possession -> opening pass -> advancing attacker -> visible ball win.
 // The chosen tackle/interception and result still come only from the simulator.
 const release=.65,receive=1.42,passer=defensePosition(1,release,sequence);
 const from=[passer[0]+.2*side,.14,passer[1]-.46];
 const receiver=defensePosition(0,receive,sequence);
 const to=[receiver[0]+.27*side,.14,receiver[1]-.42];
 if(t<release){const owner=defensePosition(1,t,sequence);return[owner[0]+.2*side,.14,owner[1]-.46]}
 if(t<receive){const u=(t-release)/(receive-release),point=interpolate(from,to,u);
  point[1]+=.28*Math.sin(Math.PI*u);return point}
 if(isInterception(sequence)&&t>=3.2&&t<4.4){
  const pass=interceptedPass(),u=(t-3.2)/(4.95-3.2);
  const point=pass.from.map((v,i)=>mix(v,pass.to[i],u));return sequence==='defense_press_recovery'?[-point[0],point[1],point[2]]:point;
 }
 if(t<(isInterception(sequence)?3.2:4.03))return[a[0]+.27*side,.14,a[1]-.42];
 if(!isInterception(sequence)&&t<4.4){
  const u=ease((t-4.03)/.37);
  return interpolate([a[0]+.27*side,.14,a[1]-.42],[d[0]+.12*side,.14,d[1]-.3],u);
 }
 const owner=defensePosition(8,t,sequence),future=defensePosition(8,Math.min(10.4,t+.10),sequence);
 const dx=future[0]-owner[0],dz=future[1]-owner[1],len=Math.hypot(dx,dz)||1;
 // The first recovered touch MUST start exactly where the ball was intercepted.
 // Blend its short escape dribble from that contact instead of teleporting.
 const taken=[owner[0]+.12*side,.14,owner[1]-.3],carried=[owner[0]+dx/len*.43,.14,owner[1]+dz/len*.43];
 return interpolate(taken,carried,(t-(sequence.startsWith('defense_slide_tackle')?5.8:4.4))/.32);
}
