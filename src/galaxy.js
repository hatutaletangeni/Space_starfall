/* STARFALL GALAXY — deterministic seeded star systems, planets and moons.
 * Star-to-star separation >= 100 times the diameter of the larger of the pair.
 * Runtime orbital positions are calculated in JS double precision. */
(function(root){'use strict';
const TAU=Math.PI*2, MAX_PLANET_RADIUS=2400, MIN_STAR_RADIUS=MAX_PLANET_RADIUS*10;
const types=['Rocky','Desert','Ice','Temperate','Ocean','Volcanic','Lush','Gas Giant','Shattered'];
const sky={Rocky:[.46,.44,.40],Desert:[.75,.49,.31],Ice:[.48,.70,.83],Temperate:[.40,.65,.85],Ocean:[.38,.74,.95],Volcanic:[.83,.38,.24],Lush:[.43,.72,.58],'Gas Giant':[.76,.63,.51],Shattered:[.48,.39,.32]};
function rngFactory(seed){let s=(seed>>>0)||1;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);}
function choose(r,items){return items[Math.floor(r()*items.length)];}
function rarity(r){const x=r();return x<.58?0:x<.83?1:x<.94?2:x<.985?3:4;}
function starSpec(r,home){if(home)return {type:'K dwarf',radius:28000,tint:[1,.79,.53],rarity:'Common'};
const k=rarity(r),bands=[['M dwarf',24000,48000,[1,.48,.36],'Common'],['G / K star',48000,140000,[1,.83,.57],'Uncommon'],['White star',140000,420000,[.75,.85,1],'Rare'],['Giant',420000,3600000,[1,.65,.43],'Epic'],['Supergiant',3600000,24000000,[.67,.79,1],'Legendary']];
const b=bands[k];return{type:b[0],radius:Math.round(b[1]+r()*(b[2]-b[1])),tint:b[3],rarity:b[4]};}
function worldType(r,gasAllowed){if(r()<.018)return 'Shattered';let t=choose(r,types.slice(0,-1));if(!gasAllowed&&t==='Gas Giant')t='Rocky';return t;}
function moonCount(r){const x=r();return x<.23?0:x<.44?1:x<.62?2:x<.77?3:x<.88?4:x<.95?5:x<.985?6:7;}
function stats(type){const list={Rocky:['Trace atmosphere','None',false],Desert:['CO₂, N₂','Scarce',false],Ice:['Trace N₂','Frozen',false],Temperate:['Thin, O₂, N₂','Moderate',true],Ocean:['N₂, O₂, H₂O','Abundant',true],Volcanic:['Dense, CO₂, SO₂','None',false],Lush:['N₂, O₂','Abundant',true],'Gas Giant':['H₂, He, CH₄','Cloud layers',false],Shattered:['Vacuum / debris field','None',false]};return list[type];}
function makeWorld(id,name,type,radius,seed,system,kind){const [atmosphere,water,life]=stats(type);return{id,name,type,radius,seed,system:system.name,systemId:system.id,kind,position:[0,0,0],gravity:kind==='moon'?.1+.5*radius/2400:.34+radius/2400,atmosphere,water,life,sky:sky[type],landable:type!=='Gas Giant'&&type!=='Shattered',ring:false,moons:[],sites:[],orbitRadius:0,orbitPeriod:0,phase:0,tilt:0,spinPeriod:180,spinPhase:0,spinAngle:0,axialTilt:0,spinAxis:[0,1,0]};}
function makeSites(body,r){const labels={Rocky:['Crater Basin','Ridge Plateau','Canyon Floor'],Desert:['Amber Dunes','Dry River Basin','Sunfall Plateau'],Ice:['Aurora Shelf','Glacier Basin','Frostline Ridge'],Temperate:['River Basin','Highland Ridge','Valley Outpost'],Ocean:['Tidal Plateau','Island Shelf','Coastal Basin'],Lush:['Canopy Clearing','River Plateau','Emerald Valley'],Volcanic:['Caldera Rim','Obsidian Flats','Ember Ridge'],'Gas Giant':['Upper Clouds','Northern Band','Storm Rim'],Shattered:['Fragment Core','Debris Field','Impact Remnant']}[body.type];body.sites=labels.map(name=>[name,Math.round(71+r()*28),+(r()*125-62.5).toFixed(1),+(r()*360-180).toFixed(1)]);}
function orbitOffset(radius,angle,tilt){return[Math.cos(angle)*radius,Math.sin(angle)*radius*Math.sin(tilt),Math.sin(angle)*radius*Math.cos(tilt)];}
function generateGalaxy(seed=742,count=64){if(!Number.isInteger(count)||count<1||count>128)throw Error('System count must be between 1 and 128.');
const r=rngFactory(seed),systems=[],byId=new Map(),allWorlds=[];
for(let s=0;s<count;s++){
 const starData=(s===count-1&&count>=32)?{type:'Blue hypergiant',radius:MIN_STAR_RADIUS*1000,tint:[.66,.77,1],rarity:'Legendary'}:starSpec(r,s===0),id='star-'+s,system={id,name:s===0?'Kepler-742':choose(r,['Aster','Vesper','Naiad','Orion','Cygni','Lyra','Eos','Sirius','Vela','Draco','Pavo','Altair','Helios'])+'-'+String(Math.floor(r()*890)+110),position:[0,0,0],star:{...starData,id},planets:[],bodies:[],maxOrbit:0};
 system.star.position=system.position;system.star.name=system.name;system.star.systemId=id;system.star.kind='star';system.star.id=id+'-sun';
 if(s>0){let accepted=false;
 // Grow a branching 3D cluster and reject coordinates that violate the full pairwise star-spacing rule.
 for(let trial=0;trial<480&&!accepted;trial++){
  const parent=systems[Math.floor(r()*systems.length)],theta=r()*TAU,y=r()*2-1,q=Math.sqrt(1-y*y),dist=2*Math.max(parent.star.radius,system.star.radius)*(105+r()*65);
  const candidate=[parent.position[0]+Math.cos(theta)*q*dist,parent.position[1]+y*dist,parent.position[2]+Math.sin(theta)*q*dist];
  if(systems.every(other=>Math.hypot(...candidate.map((v,i)=>v-other.position[i]))>=200*Math.max(other.star.radius,system.star.radius))){system.position=candidate;accepted=true;}
 }
 if(!accepted){const far=Math.max(...systems.map(t=>Math.hypot(...t.position)+200*Math.max(system.star.radius,t.star.radius)));system.position=[far*(1+r()*.2),far*(r()-.5)*.1,far*(r()-.5)*.1];}
 }
 system.star.position=system.position;
 const n=s===0?6:1+Math.floor(r()*20);let last=system.star.radius*1.95+28000;
 for(let j=0;j<n;j++){
  const type=(s===0&&j===0)?'Temperate':worldType(r,true);
  const radius=(s===0&&j===0)?2150:Math.round(680+r()*(MAX_PLANET_RADIUS-680));
  const pid=id+'-p'+j,body=makeWorld(pid,s===0&&j===0?'Kepler-742 b':system.name+' '+String.fromCharCode(98+j),type,radius,(seed+Math.imul(s+1,7919)+Math.imul(j+3,1013))>>>0,system,'planet');
  // Conservative orbital lanes leave space for wide moon systems and rings.
  body.orbitRadius=last+Math.max(radius*14,system.star.radius*.19);
  last=body.orbitRadius+Math.max(radius*14,system.star.radius*.19);
  body.orbitPeriod=Math.max(500,Math.sqrt(Math.pow(body.orbitRadius/500,3))*(2.2+r()*1.8));
  body.phase=(s===0&&j===0)?Math.PI/2:r()*TAU;body.spinPeriod=130+r()*710;body.spinPhase=r()*TAU;body.axialTilt=(r()-.5)*.85;body.spinAxis=[Math.sin(body.axialTilt),Math.cos(body.axialTilt),0];
  body.tilt=(r()-.5)*.22;
  body.ring=(type==='Gas Giant'?r()<.64:r()<.14);
  body.ringTilt=(r()-.5)*.8;
  body.ringWidth=1.55+r()*.65;
  makeSites(body,r);
  const mn=(s===0&&j===0)?2:moonCount(r);
  for(let m=0;m<mn;m++){
   const moonRadius=Math.round(Math.max(105,Math.min(radius*.42,130+r()*radius*.37)));
   const moonType=worldType(r,false);
   const mid=pid+'-m'+m,moon=makeWorld(mid,body.name+' / '+(m+1),moonType,moonRadius,(body.seed+Math.imul(m+1,1297))>>>0,system,'moon');
   moon.parentId=pid;moon.orbitRadius=radius*(2.7+m*1.8);moon.orbitPeriod=140+m*67+r()*230;moon.phase=r()*TAU;moon.tilt=(r()-.5)*.85;moon.spinPeriod=r()<.72?moon.orbitPeriod:65+r()*540;moon.spinPhase=r()*TAU;moon.axialTilt=(r()-.5)*.55;moon.spinAxis=[Math.sin(moon.axialTilt),Math.cos(moon.axialTilt),0];makeSites(moon,r);
   body.moons.push(moon);system.bodies.push(moon);allWorlds.push(moon);byId.set(mid,moon);
  }
  system.planets.push(body);system.bodies.push(body);allWorlds.push(body);byId.set(pid,body);
 }
 // Cached deterministic orbital debris instead of one 3D draw call per rock.
 system.belts=[];system.comets=[];system.nebulae=[];
 const beltCount=r()<.82?1+(r()<.38?1:0):0;
 for(let k=0;k<beltCount;k++){const lane=system.planets[Math.floor(r()*system.planets.length)];const radius=lane.orbitRadius+(r()-.5)*Math.min(lane.orbitRadius*.17,system.star.radius*.1);const rocks=[];
  for(let j=0;j<420;j++){let a=r()*TAU,rr=radius*(.87+r()*.26),y=(r()-.5)*radius*.085;rocks.push([Math.cos(a)*rr,y,Math.sin(a)*rr,.7+r()*1.9]);}
  system.belts.push({id:id+'-belt'+k,radius,rocks,period:700+r()*1500,phase:r()*TAU,rarity:'Common'});
 }
 if(r()<.14){const a=system.planets[Math.floor(r()*system.planets.length)].orbitRadius;system.comets.push({id:id+'-comet',name:system.name+' comet',a:Math.max(system.star.radius*3,a),eccentricity:.65+r()*.21,period:450+r()*1600,phase:r()*TAU,inclination:(r()-.5)*1.1,position:[...system.position],tail:[1,0,0],rarity:'Rare'});}
 if(r()<.5||s===0){const d=system.star.radius*(5+r()*13),center=[(r()-.5)*d,(r()-.5)*d*.65,(r()-.5)*d],cloud=[];
  for(let j=0;j<130;j++){const a=r()*TAU,polar=r()*2-1,q=Math.sqrt(1-polar*polar),dist=Math.cbrt(r())*d*.56;cloud.push([center[0]+Math.cos(a)*q*dist,center[1]+polar*dist*.52,center[2]+Math.sin(a)*q*dist,d*(.09+r()*.19),.12+r()*.24]);}
  system.nebulae.push({id:id+'-nebula',name:system.name+' molecular cloud',cloud,color:r()<.45?[.30,.43,.93]:r()<.55?[.55,.23,.83]:[.22,.72,.62],rarity:'Uncommon'});
 }
 // Rare active pulsars and expanding supernova remnants are separately classified phenomena.
 system.phenomenon=system.star.type==='Blue hypergiant'?'supernova':r()<.052?'pulsar':r()<.025?'supernova':null;
 if(system.phenomenon==='pulsar'){system.star.type='Pulsar';system.star.tint=[.55,.80,1];system.star.rarity='Rare';}
 system.maxOrbit=last+Math.max(system.star.radius*.15,65000);systems.push(system);byId.set(id,system);byId.set(system.star.id,system.star);
 }
 // Additional twinkles are real, deterministic, navigable star systems.
 // Sparse 3D cells keep every pair >=100 diameters of the larger star, including hypergiants.
 const originalSystems=systems.slice(),catalog=[],catalogCells=new Map(),CATALOG_CELL=6.4e9;
 const used=new Set(),rr=rngFactory((seed^0x71ac95e3)>>>0);
 for(let i=0;i<2304;i++){
  let cell=null,position=null,starData=null;
  for(let tries=0;tries<800;tries++){
   const x=Math.floor(rr()*29)-14,y=Math.floor(rr()*17)-8,z=Math.floor(rr()*29)-14;
   const key=x+','+y+','+z;if(used.has(key))continue;
   const jitter=CATALOG_CELL*.105;
   const candidate=[x*CATALOG_CELL+(rr()*2-1)*jitter,y*CATALOG_CELL+(rr()*2-1)*jitter,z*CATALOG_CELL+(rr()*2-1)*jitter];
   const spec=starSpec(rr,false);
   if(originalSystems.some(other=>Math.hypot(...candidate.map((v,k)=>v-other.position[k]))<200*Math.max(spec.radius,other.star.radius)+5e7))continue;
   used.add(key);cell=key;position=candidate;starData=spec;break;
  }
  if(!cell)break;
  const id='catalog-'+i,sys={id,name:'Sector '+String(i+1).padStart(4,'0'),position,
   star:{...starData,id:id+'-sun',name:'Sector '+String(i+1).padStart(4,'0'),systemId:id,kind:'star',position},
   planets:[],bodies:[],belts:[],comets:[],nebulae:[],phenomenon:null,maxOrbit:0,dormant:true,catalogIndex:i,cell};
  systems.push(sys);catalog.push(sys);byId.set(id,sys);byId.set(sys.star.id,sys.star);
  catalogCells.set(cell,sys);
 }
 const galaxy={seed,systems,byId,allWorlds,time:0,MIN_STAR_RADIUS,MAX_PLANET_RADIUS,starSpacingDiameters:100,
  update(t){this.time=t;for(const sys of systems){if(sys.dormant)continue;for(const p of sys.planets){p.spinAngle=p.spinPhase+t*TAU/p.spinPeriod;const a=p.phase+t*TAU/p.orbitPeriod,d=orbitOffset(p.orbitRadius,a,p.tilt);p.position=[sys.position[0]+d[0],sys.position[1]+d[1],sys.position[2]+d[2]];
   for(const moon of p.moons){moon.spinAngle=moon.spinPhase+t*TAU/moon.spinPeriod;const b=moon.phase+t*TAU/moon.orbitPeriod,o=orbitOffset(moon.orbitRadius,b,moon.tilt);moon.position=[p.position[0]+o[0],p.position[1]+o[1],p.position[2]+o[2]];}
  }for(const comet of sys.comets){const a=comet.phase+t*TAU/comet.period,e=comet.eccentricity,rr=comet.a*(1-e*e)/(1+e*Math.cos(a));const rel=orbitOffset(rr,a,comet.inclination);comet.position=sys.position.map((v,i)=>v+rel[i]);comet.tail=rel.map(v=>v/(rr||1));}}},
  nearestSystem(pos){let best=null,min=Infinity;const cx=Math.round(pos[0]/6.4e9),cy=Math.round(pos[1]/6.4e9),cz=Math.round(pos[2]/6.4e9);const candidates=originalSystems.slice();for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const s=catalogCells.get((cx+dx)+','+(cy+dy)+','+(cz+dz));if(s)candidates.push(s);}if(candidates.length===originalSystems.length)candidates.push(...catalog);for(const sys of candidates){const d=Math.hypot(...pos.map((v,i)=>v-sys.position[i]))-sys.maxOrbit;if(d<min){best=sys;min=d;}}return best;},
  nearbySystems(pos,range=3e8){const out=originalSystems.filter(sys=>Math.hypot(...pos.map((v,i)=>v-sys.position[i]))<range+sys.maxOrbit+sys.star.radius);if(range>6e9){for(const sys of catalog)if(Math.hypot(...pos.map((v,i)=>v-sys.position[i]))<range+sys.maxOrbit+sys.star.radius)out.push(sys);return out;}const cx=Math.round(pos[0]/6.4e9),cy=Math.round(pos[1]/6.4e9),cz=Math.round(pos[2]/6.4e9);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const sys=catalogCells.get((cx+dx)+','+(cy+dy)+','+(cz+dz));if(sys&&Math.hypot(...pos.map((v,i)=>v-sys.position[i]))<range+sys.maxOrbit+sys.star.radius)out.push(sys);}return out;},
  nearestBody(pos){let chosen=null,distance=Infinity;for(const sys of [...originalSystems,...liveCatalog.values()]){const centerDist=Math.hypot(...pos.map((v,i)=>v-sys.position[i]));if(centerDist-sys.maxOrbit>distance+20000)continue;
   for(const body of sys.bodies){const d=Math.hypot(...pos.map((v,i)=>v-body.position[i]))-body.radius;if(d<distance){distance=d;chosen=body;}}
  }return {planet:chosen,alt:distance};},
  nearestStar(pos){let chosen=null,distance=Infinity;const cx=Math.round(pos[0]/6.4e9),cy=Math.round(pos[1]/6.4e9),cz=Math.round(pos[2]/6.4e9),candidates=originalSystems.slice();for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){const sys=catalogCells.get((cx+dx)+','+(cy+dy)+','+(cz+dz));if(sys)candidates.push(sys);}if(candidates.length===originalSystems.length)candidates.push(...catalog);for(const sys of candidates){const d=Math.hypot(...pos.map((v,i)=>v-sys.position[i]))-sys.star.radius;if(d<distance){distance=d;chosen=sys;}}return {system:chosen,alt:distance};}
 };

 // The catalog stores stars only. A star becomes a full system on chart inspection or approach.
 const liveCatalog=new Map(),MAX_LIVE=24;
 galaxy.activate=function(sys){
  if(!sys||!sys.dormant){if(sys&&liveCatalog.has(sys.id)){liveCatalog.delete(sys.id);liveCatalog.set(sys.id,sys);}return sys;}
  const rr=rngFactory(((seed^Math.imul(sys.catalogIndex+1,2654435761))>>>0)||1);
  const n=1+Math.floor(rr()*20);let last=sys.star.radius*1.95+28000;
  sys.planets=[];sys.bodies=[];sys.belts=[];sys.comets=[];sys.nebulae=[];
  for(let j=0;j<n;j++){
   const type=worldType(rr,true),radius=Math.round(680+rr()*(MAX_PLANET_RADIUS-680)),pid=sys.id+'-p'+j;
   const p=makeWorld(pid,sys.name+' '+String.fromCharCode(98+j),type,radius,(seed+Math.imul(sys.catalogIndex+3,7919)+Math.imul(j+4,1013))>>>0,sys,'planet');
   p.orbitRadius=last+Math.max(radius*14,sys.star.radius*.19);last=p.orbitRadius+Math.max(radius*14,sys.star.radius*.19);
   p.orbitPeriod=Math.max(500,Math.sqrt(Math.pow(p.orbitRadius/500,3))*(2.2+rr()*1.8));p.phase=rr()*TAU;
   p.spinPeriod=130+rr()*710;p.spinPhase=rr()*TAU;p.axialTilt=(rr()-.5)*.85;p.spinAxis=[Math.sin(p.axialTilt),Math.cos(p.axialTilt),0];p.tilt=(rr()-.5)*.22;
   p.ring=type==='Gas Giant'?rr()<.64:rr()<.14;p.ringTilt=(rr()-.5)*.8;p.ringWidth=1.55+rr()*.65;makeSites(p,rr);
   const mn=moonCount(rr);
   for(let k=0;k<mn;k++){
    const moonRadius=Math.round(Math.max(105,Math.min(radius*.42,130+rr()*radius*.37))),mt=worldType(rr,false),mid=pid+'-m'+k;
    const m=makeWorld(mid,p.name+' / '+(k+1),mt,moonRadius,(p.seed+Math.imul(k+1,1297))>>>0,sys,'moon');
    m.parentId=pid;m.orbitRadius=radius*(2.7+k*1.8);m.orbitPeriod=140+k*67+rr()*230;m.phase=rr()*TAU;m.tilt=(rr()-.5)*.85;
    m.spinPeriod=rr()<.72?m.orbitPeriod:65+rr()*540;m.spinPhase=rr()*TAU;m.axialTilt=(rr()-.5)*.55;m.spinAxis=[Math.sin(m.axialTilt),Math.cos(m.axialTilt),0];makeSites(m,rr);
    p.moons.push(m);sys.bodies.push(m);allWorlds.push(m);byId.set(mid,m);
   }
   sys.planets.push(p);sys.bodies.push(p);allWorlds.push(p);byId.set(pid,p);
  }
  if(rr()<.77){const lane=sys.planets[Math.floor(rr()*sys.planets.length)],rocks=[],radius=lane.orbitRadius;
   for(let j=0;j<360;j++){const a=rr()*TAU,rad=radius*(.88+rr()*.24);rocks.push([Math.cos(a)*rad,(rr()-.5)*rad*.05,Math.sin(a)*rad,1+rr()]);}
   sys.belts.push({id:sys.id+'-belt',radius,rocks,period:850+rr()*1200,phase:rr()*TAU,rarity:'Common'});
  }
  if(rr()<.12){sys.comets.push({id:sys.id+'-comet',name:sys.name+' comet',a:sys.planets[0].orbitRadius*1.5,eccentricity:.65+rr()*.21,period:450+rr()*1500,phase:rr()*TAU,inclination:(rr()-.5)*1.1,position:[...sys.position],tail:[1,0,0]});}
  sys.phenomenon=rr()<.045?'pulsar':rr()<.025?'supernova':null;
  sys.maxOrbit=last+Math.max(sys.star.radius*.15,65000);sys.dormant=false;
  liveCatalog.set(sys.id,sys);galaxy.updateSystem(sys,galaxy.time);
  while(liveCatalog.size>MAX_LIVE){const oldest=liveCatalog.keys().next().value,old=liveCatalog.get(oldest);
   if(old===sys){break;}if(old.id===galaxy.pinnedSystemId){liveCatalog.delete(oldest);liveCatalog.set(oldest,old);continue;}liveCatalog.delete(oldest);
   for(const b of old.bodies){byId.delete(b.id);const i=allWorlds.indexOf(b);if(i>=0)allWorlds.splice(i,1);}
   old.bodies=[];old.planets=[];old.belts=[];old.comets=[];old.nebulae=[];old.maxOrbit=0;old.dormant=true;
  }
  return sys;
 };
 galaxy.updateSystem=function(sys,t){for(const p of sys.planets){p.spinAngle=p.spinPhase+t*TAU/p.spinPeriod;const a=p.phase+t*TAU/p.orbitPeriod,d=orbitOffset(p.orbitRadius,a,p.tilt);
  p.position=sys.position.map((v,i)=>v+d[i]);for(const m of p.moons){m.spinAngle=m.spinPhase+t*TAU/m.spinPeriod;const b=m.phase+t*TAU/m.orbitPeriod,o=orbitOffset(m.orbitRadius,b,m.tilt);m.position=p.position.map((v,i)=>v+o[i]);}}
  for(const comet of sys.comets){const a=comet.phase+t*TAU/comet.period,e=comet.eccentricity,rr=comet.a*(1-e*e)/(1+e*Math.cos(a)),rel=orbitOffset(rr,a,comet.inclination);comet.position=sys.position.map((v,i)=>v+rel[i]);comet.tail=rel.map(v=>v/(rr||1));}
 };
 galaxy.hydrateNear=function(pos,targetSys){
  if(targetSys?.dormant){const d=Math.hypot(...pos.map((v,i)=>v-targetSys.position[i]));if(d<Math.max(3e7,targetSys.star.radius*12))this.activate(targetSys);}
  const cx=Math.round(pos[0]/CATALOG_CELL),cy=Math.round(pos[1]/CATALOG_CELL),cz=Math.round(pos[2]/CATALOG_CELL);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
   const sys=catalogCells.get((cx+dx)+','+(cy+dy)+','+(cz+dz));if(!sys||!sys.dormant)continue;
   if(Math.hypot(...pos.map((v,i)=>v-sys.position[i]))<Math.max(3e7,sys.star.radius*12))this.activate(sys);
  }
 };
 galaxy.skyCatalog=catalog;galaxy.catalogCells=catalogCells;galaxy.originalCount=count;galaxy.pinnedSystemId=null;
 galaxy.update(0);return galaxy;
}
root.StarfallGalaxy={generateGalaxy,rngFactory,MAX_PLANET_RADIUS,MIN_STAR_RADIUS,moonCount};
if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallGalaxy;
})(globalThis);
