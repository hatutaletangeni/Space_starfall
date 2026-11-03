/* STARFALL LW02 — deterministic geology interpretation and finite 3D cave networks.
 * Read-only surface data: NEVER modifies authoritative groundHeight, seed, or saves.
 * Cave site IDs and paths are stable in planet-fixed coordinates.
 */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function rnd(s){let x=hash(s);x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return((x^(x>>>16))>>>0)/4294967296;}
function norm(v){let l=Math.hypot(...v);if(!(l>1e-10))throw Error('Invalid geological direction');return v.map(x=>x/l);}
function arc(a,b,radius){const u=norm(a),v=norm(b);return Math.acos(clamp(u.reduce((s,x,i)=>s+x*v[i],0),-1,1))*radius;}
const CLASSES=Object.freeze({
 Rocky:['impact-fracture','fault-scarp'],Desert:['impact-fracture','fault-fracture'],
 Ice:['ice-crevasse','cryogenic-fracture'],Temperate:['solution-cave','fault-fracture'],
 Ocean:['solution-cave','sea-cliff'],Volcanic:['lava-tube','fissure-cave'],
 Lush:['solution-cave','weathered-cavern'],Shattered:[], 'Gas Giant':[]
});
const cache=new Map();
function sites(body,seed=742){
 if(!body?.id||!body.landable||!CLASSES[body.type]?.length)return Object.freeze([]);
 const key=String(seed)+':'+body.id+':LW02';if(cache.has(key))return cache.get(key);
 const names=CLASSES[body.type],out=[],count=body.type==='Volcanic'?3:body.type==='Ice'?2:2;
 for(let i=0;i<count;i++){
  const k=key+':'+i,ground=root.Starfall3D?.groundHeight;
  let selected=null,selectedHeight=-Infinity;
  for(let attempt=0;attempt<48;attempt++){
   const lat=(rnd(k+':lat:'+attempt)-.5)*2.25,lon=rnd(k+':lon:'+attempt)*TAU,cos=Math.cos(lat);
   const candidate=[cos*Math.cos(lon),Math.sin(lat),cos*Math.sin(lon)],height=ground?ground(candidate,body):10;
   if(height>selectedHeight){selected=candidate;selectedHeight=height;}
   if(height>8){selected=candidate;selectedHeight=height;break;}
  }
  if(body.type==='Ocean'&&selectedHeight<3)continue;
  const kind=names[i%names.length],lengthScene=28+Math.round(22*rnd(k+':length')),widthScene=2.6+2*rnd(k+':width');
  out.push(Object.freeze({schema:1,id:'cave-'+hash(k).toString(36),bodyId:body.id,
   kind,local:Object.freeze(selected),
   seed:hash(k+':path'),lengthScene,widthScene,depthScene:6+5*rnd(k+':depth'),
   provenance:'seeded geological candidate; passage shape is procedural, not measured',uncertainty:'high'}));
 }
 const frozen=Object.freeze(out);if(cache.size>96)cache.delete(cache.keys().next().value);cache.set(key,frozen);return frozen;
}
function center(site,z){const t=clamp(z/Math.max(1,site.lengthScene));
 return {x:Math.sin(t*TAU*1.25+(site.seed%100)*.01)*2.2*t, y:-site.depthScene*Math.sin(Math.PI*.5*t), z};}
function width(site,z){const t=clamp(z/site.lengthScene);return site.widthScene*(.88+.12*Math.sin(t*6.28+site.seed));}
function caveLayout(site){
 if(!site||typeof site.id!=='string'||!site.id.startsWith('cave-'))throw Error('Invalid cave site');
 const samples=48,points=[];for(let i=0;i<=samples;i++){const z=i*site.lengthScene/samples,at=center(site,z);points.push(Object.freeze({...at,width:width(site,z)}));}
 return Object.freeze({kind:'cave',siteId:site.id,bodyId:site.bodyId,rooms:[],passages:[],points:Object.freeze(points),
  length:site.lengthScene,width:site.widthScene,floorY:0,roofY:8,entry:Object.freeze({x:center(site,2).x,z:2}),exit:Object.freeze({x:center(site,1).x,z:1}),
  floorHeightAt:z=>center(site,z).y,model:'finite enclosed tunnel with analytical planar-wall collision and visual vertical floor descent'});
}
function canStand(layout,x,z,margin=.7){
 if(!layout?.points||!Number.isFinite(x)||!Number.isFinite(z)||z<.5||z>layout.length-1)return false;
 // Interpolate the actual authored centerline rather than a generic sine.
 const points=layout.points,step=layout.length/(points.length-1),i=Math.min(points.length-2,Math.max(0,Math.floor(z/step))),t=z/step-i;
 const cx=points[i].x+(points[i+1].x-points[i].x)*t;
 const w=points[i].width+(points[i+1].width-points[i].width)*t;
 return Math.abs(x-cx)<w-margin;
}
function move(layout,at,delta){
 const dx=Number(delta?.x),dz=Number(delta?.z);if(!Number.isFinite(dx)||!Number.isFinite(dz))throw Error('Invalid cave movement');
 const factor=Math.min(1,6/Math.max(1e-12,Math.hypot(dx,dz)));let x=at.x,z=at.z;
 if(canStand(layout,x+dx*factor,z))x+=dx*factor;
 if(canStand(layout,x,z+dz*factor))z+=dz*factor;
 return Object.freeze({x,z});
}
function landform(body,dir,height,field=.5){
 if(!body?.id||!dir)return null;
 const d=norm(dir),lat=Math.abs(d[1]),h=Math.max(0,height),t=body.type,noise=rnd(body.id+':'+body.seed+':lw02:'+d.map(x=>Math.round(x*120)).join('/'));
 const tectonic=t==='Rocky'||t==='Temperate'||t==='Desert'||t==='Lush',volcanic=t==='Volcanic',glacial=t==='Ice'||(lat>.65&&t==='Temperate');
 let kind='weathered-upland',cause='weathering and uplift';
 if(volcanic)kind=h>50?'volcanic-ridge':'basaltic-plain',cause='geothermal upwelling and volcanic deposits';
 else if(glacial)kind=h>35?'glacial-arete':'glacial-valley',cause='ice erosion and frost weathering';
 else if(tectonic&&h>65)kind='compressional-ridge',cause='modeled crustal compression and differential erosion';
 else if(tectonic&&h>32&&noise>.54)kind='fault-scarp',cause='modeled differential block uplift';
 else if(t==='Desert'&&h<25)kind='alluvial-fan',cause='slope-fed sediment transport under intermittent runoff';
 else if(t==='Rocky'&&noise>.80)kind='impact-uplift',cause='impact excavation and rebound';
 else if(t==='Ocean')kind=h>55?'coastal-cliff':'sedimentary-lowland',cause='marine weathering and deposition';
 return Object.freeze({kind,cause,heightScene:h,regionalPrior:noise,classification:'interpretation of unchanged legacy heightfield; not new tectonic deformation'});
}
function strataTint(body,dir,height,field,base,biome){
 if(!body?.landable||!Array.isArray(base)||['water','ice','soil'].includes(biome?.material))return base;
 const type=body.type;if(!['Rocky','Desert','Volcanic','Temperate','Lush','Ocean'].includes(type))return base;
 const horizon=Math.sin(height*.22+(field||0)*17),erosion=Math.sin(height*.053+dir[0]*29+dir[2]*13);
 const mix=clamp(.12+.08*horizon+.06*erosion,0,.26);
 const mineral=type==='Volcanic'?[.33,.28,.24]:type==='Desert'?[.61,.44,.30]:
  type==='Rocky'?[.43,.43,.40]:[.52,.48,.39];
 return Object.freeze(base.map((x,i)=>clamp(x*(1-mix)+mineral[i]*mix)));
}
const API=Object.freeze({sites,center,width,caveLayout,canStand,move,landform,strataTint,arc});
root.StarfallGeologyLW02=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
