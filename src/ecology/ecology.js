/* STARFALL 6H — Deterministic, cautious, planet-fixed ecology and fossil hypotheses.
   No terrain edits; no simulation claims of discovered biology. Pure and testable.
   Site grid is based on an immutable cubemap coordinate, NOT the player's camera.
*/
(function(root){'use strict';
const B=root.StarfallBiomes,ST=root.StarfallStableTerrain,FS=root.StarfallFieldScience;
if(!B||!ST||!FS)throw Error('6H ecology requires biome, stable-surface and science models');
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(a,k)=>a.map(v=>v*k),norm=ST.normalize;
function arc(a,b,r){return Math.acos(clamp(dot(norm(a),norm(b)),-1,1))*r;}
function basis(local){const up=norm(local),axis=Math.abs(up[1])>.96?[0,0,1]:[0,1,0],east=norm(cross(axis,up)),north=norm(cross(up,east));return{up,east,north};}
function offset(local,x,z,r){const b=basis(local),d=Math.hypot(x,z),theta=d/r;if(d<1e-12)return b.up;return norm(add(scale(b.up,Math.cos(theta)),scale(add(scale(b.east,x),scale(b.north,z)),Math.sin(theta)/d)));}
const KINDS=Object.freeze({microbial:{label:'Microbial film candidate',group:'microbial',living:true,signal:'surface organic film'},spores:{label:'Airborne spore-cloud candidate',group:'microbial',living:true,signal:'particulate organic hypothesis'},grazer:{label:'Lowland grazer candidate',group:'fauna',living:true,signal:'repetitive herbivore-like motion'},crawler:{label:'Arthropod-like crawler candidate',group:'fauna',living:true,signal:'surface locomotion'},flier:{label:'Aerial drifter candidate',group:'fauna',living:true,signal:'suspended biological candidate'},tracks:{label:'Surface track pattern',group:'trace',living:false,signal:'patterned track imprint'},nest:{label:'Possible nesting structure',group:'trace',living:false,signal:'circular shelter cluster'},fossil:{label:'Fossil-like mineral imprint',group:'fossil',living:false,signal:'mineral geometry resembling fossil'}});
function cellResolution(body){return Math.max(22,Math.min(160,Math.ceil(body.radius/48)));}
function cell(body,d){const v=ST.uvForDirection(d),n=cellResolution(body);return{face:v.face,ix:clamp(Math.floor((v.u+1)*n*.5),0,n-1),iy:clamp(Math.floor((v.v+1)*n*.5),0,n-1),n};}
function cellDirection(c){return ST.faceDirection(c.face,-1+2*(c.ix+.5)/c.n,-1+2*(c.iy+.5)/c.n);}
function climate(body,seed=742){const biome=B.profile(body),chem=FS.profile(body,seed);
 const suitable=!!body.landable&&biome.lifePotential&&chem.temperatureK>=235&&chem.temperatureK<=335&&chem.pressurePa>=1800;
 const complexLife=suitable&&chem.temperatureK>=252&&chem.temperatureK<=327&&chem.pressurePa>=18000;
 const pastHabitability=!!body.landable&&body.kind!=='moon'&&['Rocky','Desert','Ice'].includes(body.type)&&FS.rand(seed+':ancient-hab:'+body.id)>.69;
 return Object.freeze({suitable,complexLife,pastHabitability,temperatureK:chem.temperatureK,pressurePa:chem.pressurePa,moisture:biome.moisture,model:'seeded world habitability approximation; no confirmed life'});
}
function siteAt(body,c,surface,seed=742){if(!body?.landable)return null;const local=cellDirection(c),sampling=surface(body,local),biome=B.classify(body,local,sampling.height,sampling.field),cl=climate(body,seed),id='eco-'+FS.hash(seed+':'+body.id+':'+c.face+':'+c.ix+':'+c.iy).toString(36);
 const r=FS.rand(id+':spawn'),choice=FS.rand(id+':kind'),speciesId='sp-'+FS.hash(seed+':'+body.id+':'+Math.floor(c.ix/5)+':'+Math.floor(c.iy/5)+':'+c.face).toString(36);
 let kind=null;
 if(cl.suitable&&biome.lifePotential&&biome.material!=='water'){
  if(r<.42){if(!cl.complexLife)kind=choice<.7?'microbial':'spores';else if(choice<.22)kind='microbial';else if(choice<.37)kind='spores';else if(choice<.57)kind='crawler';else if(choice<.73)kind='grazer';else if(choice<.84)kind='flier';else if(choice<.92)kind='nest';else kind='tracks';}
 }else if(cl.pastHabitability&&biome.material!=='water'&&r<.13){kind='fossil';}
 if(!kind)return null;
 return Object.freeze({id,bodyId:body.id,local:Object.freeze(local),height:sampling.height,biome:biome.name,kind,group:KINDS[kind].group,speciesId,model:'procedurally seeded hypothesis',seed});
}
function nearby(body,position,surface,rangeCells=5,seed=742,limit=26){if(!body?.landable||!position)return[];
 const start=cell(body,position),result=[],seen=new Set();
 for(let j=-rangeCells;j<=rangeCells;j++)for(let i=-rangeCells;i<=rangeCells;i++){
  // Canonicalize indices across cubemap faces before hashing site ID.
  const candidateDir=ST.faceDirection(start.face,-1+2*(start.ix+i+.5)/start.n,-1+2*(start.iy+j+.5)/start.n),c=cell(body,candidateDir),key=c.face+':'+c.ix+':'+c.iy;
  if(seen.has(key))continue;seen.add(key);const site=siteAt(body,c,surface,seed);if(site){const distance=arc(position,site.local,body.radius);if(distance<600)result.push({...site,distance});}
 }
 result.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));return result.slice(0,Math.max(0,limit));
}
function pose(site,body,simTime,viewer,ground){let local=site.local,alt=0,behavior='stationary';
 if(['grazer','crawler','flier','spores'].includes(site.kind)){
  const t=simTime/Math.max(1,body.spinPeriod||600),phase=FS.rand(site.id+':phase')*6.283185307,cycle=site.kind==='crawler'?1.7:site.kind==='grazer'?.32:.6;
  let x=Math.sin(t*cycle+phase)*Math.min(7,body.radius*.004),z=Math.cos(t*cycle*.8+phase)*Math.min(6,body.radius*.003);
  const proximity=viewer?arc(viewer,site.local,body.radius):Infinity;
  if(proximity<23&&site.kind!=='spores'){const away=basis(site.local);x+=Math.sign(Math.sin(phase)||1)*(23-proximity)*.8;z+=(23-proximity)*.15;behavior='flee';}
  else behavior=site.kind==='grazer'?'graze':site.kind==='crawler'?'wander':'drift';
  local=offset(site.local,x,z,body.radius);if(site.kind==='flier')alt=3+2*Math.sin(t*.8+phase)**2;if(site.kind==='spores')alt=1.2+Math.abs(Math.sin(t*.7+phase))*2;
 }
 // All animated sites use the SAME analytical collision sampler as EVA & rover.
 const sampled=ground(body,local);return{local,height:sampled.height,altitude:alt,behavior};
}
function sanitizeRecords(input){const data=Array.isArray(input)?input:[];const seen=new Set(),result=[];
 for(const x of data.slice(-500)){
  if(!x||typeof x.id!=='string'||!/^eco-[a-z0-9]+$/.test(x.id)||typeof x.bodyId!=='string'||x.bodyId.length>180||!KINDS[x.kind]||!Number.isInteger(x.stage)||x.stage<1||x.stage>3||!Number.isFinite(x.timeS)||x.timeS<0||!Array.isArray(x.local)||x.local.length!==3||!x.local.every(v=>Number.isFinite(v)&&Math.abs(v)<=1)||seen.has(x.bodyId+':'+x.id))continue;
  seen.add(x.bodyId+':'+x.id);result.push({id:x.id,bodyId:x.bodyId,kind:x.kind,stage:x.stage,local:norm(x.local),timeS:x.timeS,measurementIds:Array.isArray(x.measurementIds)?x.measurementIds.filter(v=>typeof v==='string'&&v.length<90).slice(0,8):[],note:String(x.note||'').slice(0,1000)});
 }return result.slice(-300);
}
const API=Object.freeze({KINDS,arc,offset,basis,cell,cellDirection,cellResolution,climate,siteAt,nearby,pose,sanitizeRecords,modelVersion:1});root.StarfallEcology=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
