/* STARFALL 4C/4D — incremental bounded A*, deterministic rover task scripts.
   Physics updates are applied by host to its existing planet-fixed rover anchor. */
(function(root){'use strict';
const V={len:a=>Math.hypot(...a),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),mul:(a,k)=>a.map(x=>x*k),norm:a=>{const n=Math.hypot(...a);return n?a.map(x=>x/n):[0,1,0]},cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function localBasis(origin,forward){const up=V.norm(origin),north=V.norm(V.sub(forward,V.mul(up,V.dot(up,forward)))),east=V.norm(V.cross(north,up));return{up,north,east};}
function offset(basis,x,y,radius){return V.norm(V.add(basis.up,V.mul(V.add(V.mul(basis.east,x),V.mul(basis.north,y)),1/Math.max(10,radius))));}
function localCoords(basis,position,radius){const v=V.sub(V.norm(position),basis.up);return[V.dot(v,basis.east)*radius,V.dot(v,basis.north)*radius];}
class Planner{
 constructor({origin,forward,destination,radius,height,friction=0.65,cell=5,maxCells=1000,range=160}){
  if(!origin||!destination||typeof height!=='function')throw Error('Invalid planner terrain');
  this.radius=Math.max(20,radius);this.basis=localBasis(origin,forward);this.height=height;this.cell=cell;this.maxCells=maxCells;this.nodes=new Map();this.open=[];this.closed=new Set();this.status='PLANNING';this.reason='';this.expanded=0;
  const [x,y]=localCoords(this.basis,destination,this.radius);this.target=[Math.round(x/cell),Math.round(y/cell)];this.limit=Math.ceil(range/cell);this.path=[];
  if(Math.hypot(x,y)>range||Math.abs(this.target[0])>this.limit||Math.abs(this.target[1])>this.limit){this.status='FAULT';this.reason='Waypoint exceeds local navigation range';return;}
  this.put(0,0,0,null);
 }
 key(x,y){return x+','+y;}
 h(x,y){return Math.hypot(x-this.target[0],y-this.target[1])*this.cell;}
 put(x,y,cost,parent){const key=this.key(x,y),node={x,y,cost,priority:cost+this.h(x,y),parent};this.nodes.set(key,node);this.open.push(node);}
 terrain(x,y){const d=offset(this.basis,x*this.cell,y*this.cell,this.radius);const h=this.height(d);return{dir:d,h};}
 advance(budget=30){if(this.status!=='PLANNING')return this.status;let n=0;while(this.open.length&&n<Math.max(1,budget)){
  this.open.sort((a,b)=>a.priority-b.priority||a.y-b.y||a.x-b.x);const node=this.open.shift(),key=this.key(node.x,node.y);
  if(this.closed.has(key)||this.nodes.get(key)!==node)continue;this.closed.add(key);n++;this.expanded++;
  if(node.x===this.target[0]&&node.y===this.target[1]){const path=[];let cur=node;while(cur){path.push(this.terrain(cur.x,cur.y).dir);cur=cur.parent;}this.path=path.reverse();this.status='READY';return this.status;}
  if(this.expanded>=this.maxCells){this.status='FAULT';this.reason='Route computation budget exhausted';return this.status;}
  const origin=this.terrain(node.x,node.y);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,y=node.y+dy,k=this.key(x,y);if(Math.max(Math.abs(x),Math.abs(y))>this.limit||this.closed.has(k))continue;
   const next=this.terrain(x,y);if(!Number.isFinite(next.h))continue;const distance=Math.hypot(dx,dy)*this.cell,slope=Math.atan2(Math.abs(next.h-origin.h),distance);
   if(slope>0.48)continue;const factor=1+Math.tan(slope)*3+(dx&&dy?.04:0),candidate=node.cost+distance*factor;
   if(candidate<(this.nodes.get(k)?.cost??Infinity))this.put(x,y,candidate,node);
  }
 }
 if(!this.open.length){this.status='FAULT';this.reason='No traversable terrain route';}return this.status;
 }
}
const VALID_OPS=['GOTO','WAIT','SCAN','SAMPLE','IF','RETURN','DOCK','STOP'];
function validateProgram(steps){if(!Array.isArray(steps)||steps.length>40||steps.length<1)throw Error('Script must contain 1–40 commands');return steps.map((s,i)=>{if(!s||!VALID_OPS.includes(s.op))throw Error('Invalid opcode at line '+(i+1));const item={op:s.op};
 if(s.op==='GOTO'){if(!Number.isFinite(s.forward)||!Number.isFinite(s.right)||Math.hypot(s.forward,s.right)>130)throw Error('GOTO requires bounded forward/right');item.forward=s.forward;item.right=s.right;}
 if(s.op==='WAIT'){if(!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>600)throw Error('WAIT must be 0–600 seconds');item.seconds=s.seconds;}
 if(s.op==='SCAN'||s.op==='SAMPLE'){if(typeof s.instrument!=='string'||!root.StarfallFieldScience.INSTRUMENTS[s.instrument])throw Error('Unknown instrument');item.instrument=s.instrument;if(s.op==='SAMPLE'&&s.instrument!=='sampler')throw Error('SAMPLE requires contact sampler');}
 if(s.op==='IF'){if(!['energyPercent','temperatureK','distanceHome'].includes(s.field)||!['<','>','<=','>='].includes(s.operator)||!Number.isFinite(s.value)||!Number.isInteger(s.skip)||s.skip<1||s.skip>10)throw Error('IF condition invalid');item.field=s.field;item.operator=s.operator;item.value=s.value;item.skip=s.skip;}
 return item;});}
const compare=(a,op,b)=>op==='<'?a<b:op==='>'?a>b:op==='<='?a<=b:a>=b;
class Controller{
 constructor(){this.state='IDLE';this.script=[];this.index=0;this.elapsed=0;this.totalElapsed=0;this.planner=null;this.path=[];this.pathIndex=0;this.target=null;this.home=null;this.bodyId=null;this.reason='';this.event='';this.stepCount=0;this.timeBudget=1800;this.stall=0;this.wasActive=false;}
 start(steps,context){const validated=validateProgram(steps);if(!context?.bodyId||!context?.local)throw Error('Rover must be placed on surface');this.script=validated;this.index=0;this.elapsed=0;this.home=[...(context.home||context.local)];this.bodyId=context.bodyId;this.state='IDLE';this.totalElapsed=0;this.stall=0;this.reason='';this.event='Script armed';this.stepCount=0;this.wasActive=true;this.path=[];this.planner=null;}
 pause(){if(this.state!=='IDLE'&&this.state!=='FAULT'&&this.state!=='DOCKED'){this.previous=this.state;this.state='PAUSED';this.event='Paused';}}
 resume(){if(this.state==='PAUSED'){this.state=this.previous||'IDLE';this.event='Resumed';}}
 abort(reason='Emergency stop'){this.state='FAULT';this.reason=reason;this.planner=null;this.path=[];this.target=null;this.event=reason;}
 next(){this.index++;this.state='IDLE';this.planner=null;this.path=[];this.pathIndex=0;this.elapsed=0;this.target=null;}
 serialize(){return{schema:1,state:this.state,index:this.index,script:this.script,home:this.home,bodyId:this.bodyId,reason:this.reason,elapsed:this.elapsed,stepCount:this.stepCount};}
 restore(data){if(!data||!Array.isArray(data.script))return;try{this.script=validateProgram(data.script);this.index=clamp(data.index||0,0,this.script.length);this.home=data.home;this.bodyId=data.bodyId;this.stepCount=clamp(data.stepCount||0,0,500);this.elapsed=0;this.totalElapsed=0;this.state=['FAULT','DOCKED','IDLE'].includes(data.state)?data.state:'PAUSED';this.previous='IDLE';this.event='Recovered script; resume to replan from current rover position';}catch(_){this.abort('Invalid saved script');}}
 tick(dt,ctx){if(!this.script.length||['FAULT','PAUSED','DOCKED'].includes(this.state))return;dt=clamp(dt,0,.05);this.elapsed+=dt;this.totalElapsed+=dt;if(this.totalElapsed>this.timeBudget||this.stepCount>500){this.abort('Script safety budget exceeded');return;}if(ctx.bodyId!==this.bodyId){this.abort('Rover changed celestial body');return;}if(ctx.energyPercent<Math.min(35,Math.max(4,6+Math.max(0,ctx.distanceHome||0)*.1))){this.abort('Battery reserve below safe return threshold');return;}
  const cmd=this.script[this.index];if(!cmd){this.state='DOCKED';this.event='Program complete';return;}
  if(this.state==='IDLE'){this.stepCount++;this.elapsed=0;if(cmd.op==='STOP'){this.state='DOCKED';this.event='Stopped safely';return;}
   if(cmd.op==='IF'){const value=ctx[cmd.field];if(!compare(value,cmd.operator,cmd.value))this.index=Math.min(this.script.length,this.index+cmd.skip);else this.index++;return;}
   if(cmd.op==='WAIT'){this.state='WAITING';return;}
   if(cmd.op==='SCAN'||cmd.op==='SAMPLE'){this.state='SAMPLING';this.event='Reading '+cmd.instrument;return;}
   if(cmd.op==='RETURN'||cmd.op==='DOCK'){this.target=this.home;this.state='PLANNING';return;}
   if(cmd.op==='GOTO'){this.target=ctx.destination(cmd.forward,cmd.right);this.state='PLANNING';return;}}
  if(this.state==='WAITING'){if(this.elapsed>=cmd.seconds)this.next();return;}
  if(this.state==='SAMPLING'){if(this.elapsed>=ctx.instrumentTime(cmd.instrument)){try{ctx.measure(cmd.instrument);this.event='Recorded '+cmd.instrument;this.next();}catch(e){this.abort('Instrument fault: '+e.message);}}return;}
  if(this.state==='PLANNING'){
    if(!this.planner){this.planner=ctx.createPlanner(ctx.local,this.target);if(this.planner.status==='FAULT'){this.abort(this.planner.reason);return;}}
    const st=this.planner.advance(24);if(st==='FAULT'){this.abort(this.planner.reason);return;}if(st==='READY'){this.path=this.planner.path;this.pathIndex=0;this.state=cmd.op==='RETURN'?'RETURNING':cmd.op==='DOCK'?'RETURNING':'MOVING';this.event='Route ready ('+this.path.length+' nodes)';}return;
  }
  if(this.state==='MOVING'||this.state==='RETURNING'){
   const waypoint=this.path[this.pathIndex];if(!waypoint){if(cmd.op==='DOCK'){this.state='DOCKED';this.event='Rover docked';}else this.next();return;}
   const remaining=ctx.driveToward(waypoint,dt);if(remaining<2.2){this.pathIndex++;this.stall=0;}else{const dist=Number.isFinite(remaining)?remaining:Infinity;if(this.previousRemaining!==undefined&&(this.previousRemaining===dist||Math.abs(this.previousRemaining-dist)<1e-5))this.stall+=dt;else this.stall=0;this.previousRemaining=dist;if(this.stall>12)this.abort('Rover halted: blocked terrain or unavailable drive power');}
  }
 }
}
root.StarfallRobotics={V,localBasis,offset,localCoords,Planner,Controller,validateProgram};if(typeof module!=='undefined'&&module.exports)module.exports=root.StarfallRobotics;
})(globalThis);
