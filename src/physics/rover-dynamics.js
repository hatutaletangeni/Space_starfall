/* STARFALL 4B — bounded 6 wheel traction/slope model; not full rigidbody suspension. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=a=>{const n=Math.hypot(...a);return n>1e-10?a.map(v=>v/n):[0,1,0];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function material(body,radial){const s=root.StarfallFieldScience,noise=s?s.rand(String(body.seed||body.id)+':soil:'+radial.map(v=>Math.floor(v*34)).join(':')):.5,kind=(body.type||'Rocky').toLowerCase();const base=/ice|frozen/.test(kind)?.26:/desert|sand|dust/.test(kind)?.42:/volcan|basalt/.test(kind)?.75:.65;return{kind:base<.35?'ice':base<.55?'regolith':'rock',friction:clamp(base+(noise-.5)*.18,.12,1.1)};}
function sixWheels({body,local,forward,surfaceHeight,sceneRadius,sceneToMeters=1,vehicle,gravityMS2,command=0,dt=.02,enabled=true}){
 if(!local||!body||!Number.isFinite(dt))throw Error('Rover pose/time missing');const f=norm(forward),up=norm(local),right=norm(cross(f,up));const radius=Math.max(100,sceneRadius||body.radius||1000),h=surfaceHeight(up);
 // Sample 6 contacts in the local tangent plane; no full terrain collider loaded.
 const halfWidth=1.4,halfLength=2.5;let maxSlope=0;const wheels=[];
 for(const side of [-1,1])for(const z of [-1,0,1]){
  const ax=norm(up.map((v,i)=>v+(right[i]*side*halfWidth+f[i]*z*halfLength)/radius));const hg=surfaceHeight(ax);wheels.push({height:hg});maxSlope=Math.max(maxSlope,Math.atan2(Math.abs(hg-h)*sceneToMeters,Math.max(.1,Math.hypot(side*halfWidth,z*halfLength)*sceneToMeters)));}
 const mass=Math.max(1,vehicle?.massKg||1000),g=clamp(gravityMS2||9.81,.01,400),normalN=mass*g*Math.cos(maxSlope),terrain=material(body,up),friction=terrain.friction*clamp(vehicle?.traction??.7,.1,1.3);const torque=Math.max(0,vehicle?.driveTorqueNm||1300),wheelRadius=Math.max(.1,vehicle?.wheelRadiusM||.7);
 const maxForce=Math.max(0,Math.min(torque*6/wheelRadius,normalN*friction)),gravitySlope=mass*g*Math.sin(maxSlope),slip=clamp(gravitySlope/Math.max(1,normalN*friction),0,2),tipRisk=clamp(Math.tan(maxSlope)/(2*halfWidth/Math.max(1,halfLength*2)),0,3),slopeDeg=maxSlope*180/Math.PI;
 const safe=(!enabled||slopeDeg<=34)&&slip<1.1&&tipRisk<1.25;
 const driveFactor=enabled?clamp(1-slip*.55,0,1)*clamp(friction/.7,.2,1):1;
 const speed=clamp(command,-1,1)*(enabled&&(!safe)?0:driveFactor*9.5);
 return{speedSceneS:speed,normalN,maxForceN: maxForce,slip,slopeDeg,tipRisk,material:terrain.kind,friction,wheelHeights:wheels.map(w=>w.height),safe,approximation:'six contact probes + friction/slope limits'};
}
root.StarfallRoverDynamics={material,sixWheels};if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallRoverDynamics;
})(globalThis);
