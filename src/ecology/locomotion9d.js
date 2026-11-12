/* STARFALL 9D — finite, near-field animal locomotion and ecological behavior.
 * Inspired by the user's Aurelius System's grazer/flee, stalking, burrowing
 * detritivore and diel aquatic behaviors; no Three.js or external dependencies.
 * Positions are in local metres east/north from the anchored 9A ecology site.
 * Biology/biomass is owned exclusively by LivingBiosphere 9A/9D; this module
 * does not award calories, kill agents, or create phantom resources.
 */
(function(root){'use strict';
const PI=Math.PI,TAU=2*PI,DT=.05,MAX_STEPS=8,MAX_RANGE=34;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const len=(a,b)=>Math.hypot(a,b);
const hash=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++)h=Math.imul(h^String(s).charCodeAt(i),16777619);return h>>>0;};
const seed=s=>hash(s)/4294967296;
const roles=Object.freeze({grazer:'grazer',predator:'stalker',detritivore:'burrower',filterer:'jelly',aquatic_predator:'eel'});
function modelKind(agent,site){
 if(agent.role==='flier')return (agent.phototrophic??(seed(agent.id+':sails')>.32))?'aurora':'flier';
 if(agent.role==='grazer')return site?.kind==='crawler'?'crawler':'grazer';
 return roles[agent.role]||'grazer';
}
function start(agent,timeS=0){
 const angle=TAU*seed(agent.id+':heading'),rad=3+seed(agent.id+':spawn')*7;
 return {id:agent.id,role:agent.role,t:Math.max(0,timeS),p:[rad*Math.cos(angle),rad*Math.sin(angle)],
  v:[Math.cos(angle)*.42,Math.sin(angle)*.42],heading:angle,gait:TAU*seed(agent.id+':gait'),
  pulse:TAU*seed(agent.id+':pulse'),altitude:0,behavior:'foraging',lastEvent:agent.lastEvent};
}
function desired(agent,s,peers=[],env={}){
 const role=agent.role,player=env.player,now=s.t,base=TAU*seed(agent.id+':wander');
 const speed=role==='predator'?2.6:role==='aquatic_predator'?3.2:role==='grazer'?1.35:role==='detritivore'?.8:1.5;
 let tX=Math.sin(now*.23+base)*12,tZ=Math.cos(now*.19+base)*12,pace=speed,action='roaming';
 const hunger=agent.energy<.76||agent.lastEvent==='hungry';
 const preyRoles=role==='aquatic_predator'?['filterer']:role==='predator'?['grazer','detritivore']:[];
 const threats=role==='grazer'||role==='detritivore'||role==='filterer'
  ?(role==='filterer'?['aquatic_predator']:['predator']):[];
 const nearest=(allowed)=>peers.filter(x=>x.id!==agent.id&&allowed.includes(x.role)&&x.p).reduce((best,x)=>{
  const d=len(x.p[0]-s.p[0],x.p[1]-s.p[1]);
  return d<(best?.d??Infinity)?{x,d}:best;
 },null);
 const enemy=nearest(threats);
 if(enemy&&enemy.d<21){
  const dx=s.p[0]-enemy.x.p[0],dz=s.p[1]-enemy.x.p[1],d=Math.max(.01,len(dx,dz));
  tX=s.p[0]+dx/d*22;tZ=s.p[1]+dz/d*22;
  pace=speed*(role==='filterer'?2:3);action='fleeing';
 }else if(player&&role!=='aquatic_predator'&&len(player[0]-s.p[0],player[1]-s.p[1])<11){
  const dx=s.p[0]-player[0],dz=s.p[1]-player[1],d=Math.max(.01,len(dx,dz));
  tX=s.p[0]+dx/d*18;tZ=s.p[1]+dz/d*18;
  pace=speed*2.4;action='avoiding explorer';
 }else if(preyRoles.length&&hunger){
  const prey=nearest(preyRoles);
  if(prey&&prey.d<48){tX=prey.x.p[0];tZ=prey.x.p[1];pace=prey.d<11?speed*2.9:speed*1.45;action=prey.d<11?'pursuing prey':'stalking';}
 }else if(role==='grazer'){
  // Grazer chooses a feeding location from existing patch vegetation.
  const feed=TAU*seed(agent.id+':forage'),r=5+seed(agent.id+':forage-r')*6;
  if(hunger&&env.plantKg>.1){tX=Math.cos(feed)*r;tZ=Math.sin(feed)*r;action='seeking plants';
   if(len(tX-s.p[0],tZ-s.p[1])<3.5){pace=.48;action='grazing';}}
  else if(agent.energy>.83){const friend=nearest(['grazer']);
   if(friend&&friend.d>5&&friend.d<26){tX=friend.x.p[0];tZ=friend.x.p[1];action='herding';}}
 }else if(role==='detritivore'){
  if(env.detritusKg>.1){const m=TAU*seed(agent.id+':litter'),r=4+seed(agent.id+':litter-r')*7;
   tX=Math.cos(m)*r;tZ=Math.sin(m)*r;action='searching detritus';
   if(len(tX-s.p[0],tZ-s.p[1])<2.7){pace=.36;action='burrowing / decomposing';}}
 }else if(role==='filterer'){
  action=env.light<.35?'night ascent / filtering':'day descent / filtering';
  pace=1.0+Math.max(0,Math.sin(s.pulse))*.8;
 }
 const dist=len(tX-s.p[0],tZ-s.p[1]);
 return {tX,tZ,pace,action,dist};
}
function step(original,agent,peers=[],env={},dt=DT){
 if(!(dt>0&&dt<=.1))throw Error('Invalid 9D locomotion time step');
 const s={...original,p:original.p.slice(),v:original.v.slice()};
 const intent=desired(agent,s,peers,env);
 const dx=intent.tX-s.p[0],dz=intent.tZ-s.p[1],d=Math.max(.001,intent.dist);
 const targetSpeed=Math.min(intent.pace,d*1.1);
 const steer=clamp(dt*(intent.action==='fleeing'?6:3.7),0,1);
 s.v[0]+=(dx/d*targetSpeed-s.v[0])*steer;
 s.v[1]+=(dz/d*targetSpeed-s.v[1])*steer;
 let next=[s.p[0]+s.v[0]*dt,s.p[1]+s.v[1]*dt];
 // No crossing cliffs, lakes, ridges or the local model patch edge.
 if(len(...next)>MAX_RANGE){const scale=MAX_RANGE/len(...next);next=next.map(x=>x*scale);s.v[0]*=-.45;s.v[1]*=-.45;}
 if(typeof env.traversable==='function'&&!env.traversable(next[0],next[1],agent.role)){
  s.v=[-s.v[1]*.8,s.v[0]*.8];next=[s.p[0]+s.v[0]*dt,s.p[1]+s.v[1]*dt];
  if(!env.traversable(next[0],next[1],agent.role)){next=s.p.slice();s.v=[0,0];}
  s.behavior='avoiding terrain';
 }else s.behavior=intent.action;
 s.p=next;s.t+=dt;
 const speed=len(...s.v);
 if(speed>.06)s.heading=Math.atan2(s.v[1],s.v[0]);
 s.gait=(s.gait+dt*(agent.role==='grazer'?3.9:agent.role==='detritivore'?6.5:agent.role==='predator'?5.9:4.7)*Math.max(.30,speed))%TAU;
 s.pulse=(s.pulse+dt*(agent.role==='filterer'?4.6:3.2))%TAU;
 if(agent.role==='filterer'||agent.role==='aquatic_predator'){
  const nocturnal=env.light<.35?3.0:6.0;
  s.altitude=-(nocturnal+Math.sin(s.pulse)*.7);
 }else if(agent.role==='detritivore')s.altitude=s.behavior.includes('burrowing')?-.75:0;
 else s.altitude=Math.max(0,.12*Math.abs(Math.sin(s.gait)));
 s.lastEvent=agent.lastEvent;
 if(![...s.p,...s.v,s.t,s.heading,s.gait,s.altitude].every(finite))throw Error('Nonfinite 9D locomotive state');
 return s;
}
function advance(previous,agent,toTimeS,peers=[],env={}){
 if(!finite(toTimeS)||toTimeS<0)throw Error('Invalid 9D scene time');
 let s=previous;
 if(!s||s.id!==agent.id||toTimeS<s.t||toTimeS-s.t>8)s=start(agent,toTimeS);
 let count=0;
 while(toTimeS-s.t>=DT-.000001&&count<MAX_STEPS){s=step(s,agent,peers,env,DT);count++;}
 if(toTimeS-s.t>DT)s={...s,t:toTimeS};
 return s;
}
const API=Object.freeze({DT,MAX_STEPS,MAX_RANGE,modelKind,start,desired,step,advance});
root.StarfallLocomotion9D=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
