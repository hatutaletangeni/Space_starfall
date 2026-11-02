/* STARFALL 6F — deterministic bounded walkable archaeological interiors.
 * Fixed site-local scene coordinates (X right, Y up, Z into ruins), unrelated to
 * terrain LOD. This module has NO DOM, WebGL, network or wall-clock dependence.
 */
(function(root){'use strict';
const A=root.StarfallArchaeology||(typeof require==='function'?require('./ruins.js'):null);
if(!A)throw Error('Archaeology required for interiors');
const LIMIT=240;
const ARTIFACTS=[
 ['Worked tool','Hearth pigment','Stone inscription'],
 ['Ceremonial carving','Masonry registry','Metalwork fragment'],
 ['Astronomical dial','Mechanical archive','Transmission cylinder'],
 ['Industrial log','Shielding sample','Power junction'],
 ['Memory core','Structural alloy','Collapsed neural interface'],
 ['Stellar relay shard','Spectrum recorder','Megastructure lattice']
];
const HAZARDS=['dust and poor visibility','unstable rockfall','low-frequency vibration','electrical interference','radiation pocket (instrument advisory)','magnetic flux disturbance'];
function hash(s){return A.hash(s);}function clamp(x,a,b){return Math.min(b,Math.max(a,x));}
function layout(site){if(!site||typeof site.id!=='string'||!/^ruin-[0-9a-z]+$/.test(site.id)||!Number.isInteger(site.tier)||site.tier<0||site.tier>5)throw Error('Invalid archaeological site');
 const t=site.tier,seed=hash(site.id+':6f'),width=8+2*Math.min(3,t),length=9+Math.min(t,3),secondary=t>=2;
 const rooms=[{x0:-width,x1:width,z0:-length,z1:length,id:'entry'}];
 if(secondary)rooms.push({x0:-width*.85,x1:width*.85,z0:length+7,z1:length+7+length*.9,id:'archive'});
 const hallway=secondary?{x0:-3.5,x1:3.5,z0:length-3,z1:length+10,id:'hall'}:null;
 const far=secondary?rooms[1].z1:length;
 const artifacts=[{id:'a',x:t%2===0?-width*.53:width*.55,z:1,label:ARTIFACTS[t][0]},
   {id:'b',x:secondary?0:width*.50,z:secondary?far-4:Math.min(length-2,5),label:ARTIFACTS[t][1]}];
 if(t>=4)artifacts.push({id:'c',x:-width*.36,z:far-2,label:ARTIFACTS[t][2]});
 return Object.freeze({id:site.id,bodyId:site.bodyId,tier:t,seed,rooms,passages:hallway?[hallway]:[],width,length,far,floorY:5,roofY:13+(t>=4?4:0),entry:{x:0,z:-length+2},exit:{x:0,z:-length+1},artifacts:artifacts.map(a=>Object.freeze({...a})),hazard:HAZARDS[t],model:'stylized walkable structure with bounded planar collision; no fluid, radiation or rigid-body simulation'});
}
function canStand(l,x,z,margin=.8){if(!Number.isFinite(x)||!Number.isFinite(z))return false;const rectangles=[...l.rooms,...l.passages];return rectangles.some(r=>x>=r.x0+margin&&x<=r.x1-margin&&z>=r.z0+margin&&z<=r.z1-margin);}
function move(l,at,delta){const dx=Number(delta?.x),dz=Number(delta?.z);if(!Number.isFinite(dx)||!Number.isFinite(dz))throw Error('Invalid movement');const capped=Math.hypot(dx,dz)>6?6/Math.hypot(dx,dz):1;let x=at.x,z=at.z;if(canStand(l,x+dx*capped,z))x+=dx*capped;if(canStand(l,x,z+dz*capped))z+=dz*capped;return{x,z};}
function nearestArtifact(l,at,max=3.8){let result=null,dist=max;for(const a of l.artifacts){const d=Math.hypot(a.x-at.x,a.z-at.z);if(d<=dist){dist=d;result=a;}}return result;}
function validateRecords(value){if(!Array.isArray(value))return[];const m=new Map();for(const raw of value.slice(-LIMIT)){
 if(!raw||typeof raw.siteId!=='string'||!/^ruin-[0-9a-z]+$/.test(raw.siteId)||typeof raw.bodyId!=='string'||!Number.isInteger(raw.tier)||raw.tier<0||raw.tier>5||typeof raw.artifactId!=='string'||!['a','b','c'].includes(raw.artifactId)||!Number.isFinite(raw.timeS)||raw.timeS<0||raw.timeS>=1e13)continue;
 const k=raw.bodyId+':'+raw.siteId+':'+raw.artifactId;m.set(k,{siteId:raw.siteId,bodyId:raw.bodyId,tier:raw.tier,artifactId:raw.artifactId,label:String(raw.label||'Ancient artifact').slice(0,72),timeS:raw.timeS,method:'in-situ visual inspection',certainty:'artifact presence observed; provenance hypothetical',model:'fictional seeded archaeology'});
 }return [...m.values()].slice(-LIMIT);}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function basis(local){const up=A.norm(local),guess=Math.abs(up[1])>.92?[0,0,1]:A.norm([up[2],.13,-up[0]]),forward=A.norm(guess.map((v,i)=>v-up[i]*A.dot(guess,up))),right=A.norm(cross(up,forward));return{up,forward,right};}
function direction(local,basis,x,z,radius){const p=local.map((v,i)=>v+(basis.right[i]*x+basis.forward[i]*z)/Math.max(radius,1));return A.norm(p);}
const api=Object.freeze({ARTIFACTS,layout,canStand,move,nearestArtifact,validateRecords,basis,direction});
root.StarfallInteriors=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
