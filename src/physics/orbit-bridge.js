/* Experimental analytic Kepler ephemerides. OFF by default for old saves/visual parity.
 * Converts classical perifocal XY to scene XZY and uses legacy-period-compatible mu.
 */
(function(root){'use strict';
const P=root.StarfallPhysics;if(!P)throw Error('Load foundation first');
function attach(galaxy){const orig=galaxy.update.bind(galaxy),origSys=galaxy.updateSystem.bind(galaxy);let enabled=false;
 function one(body,parent,t,sys){const parentProfile=parent.kind==='star'?P.starProfile(parent):P.bodyProfile(parent,P.starProfile(sys.star));
 const info=P.bodyProfile(body,parentProfile),o=info.orbit;const state=P.keplerState({...o,ascendingNodeRad:0,argumentPeriapsisRad:0,inclinationRad:body.tilt||0},o.compatibilityMu,t);
 const x=state.positionM;body.position=[parent.position[0]+x[0]/P.SCENE_METERS_PER_UNIT,parent.position[1]+x[2]/P.SCENE_METERS_PER_UNIT,parent.position[2]+x[1]/P.SCENE_METERS_PER_UNIT];
 }
 function apply(sys,t){if(sys.dormant)return;for(const b of sys.planets){one(b,sys.star,t,sys);for(const m of b.moons)one(m,b,t,sys);}}
 galaxy.update=function(t){orig(t);if(enabled)for(const sys of galaxy.systems)apply(sys,t);};
 galaxy.updateSystem=function(sys,t){origSys(sys,t);if(enabled)apply(sys,t);};
 galaxy.physicsOrbits={get enabled(){return enabled;},setEnabled(on){enabled=!!on;galaxy.update(galaxy.time);},applyOne:one};return galaxy.physicsOrbits;
 }
 root.StarfallOrbitBridge={attach};if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallOrbitBridge;
})(globalThis);
