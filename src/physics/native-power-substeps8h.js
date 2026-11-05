/* STARFALL Update 8H — original native T02 bounded powered-job time warp.
 *
 * Existing T02 outpost store remains the ONLY electrical authority.
 * This is a PURE planning function, not a grid, battery, conveyor, sensor,
 * fake clock, free pump, or new remote resource database.
 *
 * The original outpost scheduler normally uses <=12 coarse sun samples,
 * suitable for batteries/habitats but incapable of servicing 8H fluid/dry
 * packets if their honest native report.dtS is over 10 seconds. Preserve
 * old step count for all bodies without active paid 8H jobs. ONLY while an
 * original 8H job is ACTIVE, sample up to 48 original T02 power pulses of
 * <=10 seconds each, preserving the identical total simulated joules and
 * actual battery/solar origin. Limit CPU to 48 T02 grid solves per site
 * per call. At longer gaps, return truthful unsafeSpan: packet movement
 * holds closed in the original already-existing fail-closed 8H observer.
 *
 * Report "simulatedAtS" as END of the integrated original T02 step; solar
 * angle may be sampled at its midpoint. This makes the gas packet's elapsed
 * seconds equal the native paid electrical interval, rather than leaving
 * half a frame unobserved whenever the original 600s sampler subdivides.
 */
(function(root){'use strict';
const BASE_STEPS=12,ACTIVE_STEPS=48,BASE_SAMPLE_S=600,
 ACTIVE_MAX_STEP_S=10,HORIZON_S=86400,EPS=1e-8;
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
function plan({elapsedS,activePaid8H=false}={}){
 if(!finite(elapsedS))throw Error('8H source-owned native clock requires finite nonnegative elapsed seconds');
 const active=activePaid8H===true,totalS=Math.min(HORIZON_S,elapsedS);
 const stepBudget=active?ACTIVE_STEPS:BASE_STEPS,
  ideal=Math.max(1,Math.ceil(Math.max(0,totalS-EPS)/(active?ACTIVE_MAX_STEP_S:BASE_SAMPLE_S))),
  steps=Math.min(stepBudget,ideal),
  stepS=steps?totalS/steps:0;
 return{totalS,steps,stepS,activePaid8H:active,
  safeForPacket:active&&stepS<=ACTIVE_MAX_STEP_S+EPS,
  deferredS:Math.max(0,elapsedS-totalS),
  status:!active?'ORIGINAL_BASELINE_T02':
   stepS<=ACTIVE_MAX_STEP_S+EPS?'ORIGINAL_NATIVE_T02_PACKET_STEPS':
   'LONG_GAP_FAIL_CLOSED_NO_MATERIAL_MOVEMENT'};
}
function endpoint(startS,planResult,stepIndex){
 if(!Number.isFinite(startS)||!planResult||!finite(planResult.totalS)||
  !Number.isSafeInteger(planResult.steps)||planResult.steps<1||
  !Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=planResult.steps)
  throw Error('8H invalid bounded native T02 sample end');
 return startS+(stepIndex+1)*planResult.totalS/planResult.steps;
}
root.StarfallNativePowerSubsteps8H=Object.freeze({
 plan,endpoint,BASE_STEPS,ACTIVE_STEPS,ACTIVE_MAX_STEP_S,HORIZON_S});
if(typeof module!=='undefined'&&module.exports)
 module.exports=root.StarfallNativePowerSubsteps8H;
})(typeof globalThis!=='undefined'?globalThis:this);
