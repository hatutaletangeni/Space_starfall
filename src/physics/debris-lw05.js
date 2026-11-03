/* LW05 physical ring-moonlets and irregular orbiting asteroid rocks.
 * Existing seeded belts/rings are authoritative; this adapter creates no new
 * star/planet IDs and does not modify orbit, save, or belt arrays.
 */
(function(root){'use strict';
const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function rnd(s){return hash(s)/4294967296}
function irregularMesh(variant=0){
 const phi=(1+Math.sqrt(5))/2;
 let vertices=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(v=>{const len=Math.hypot(...v);return v.map(x=>x/len)});
 let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 // One subdivision: 80 triangles per rotating rock, not a UV sphere.
 const map=new Map(),mid=(a,b)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(map.has(key))return map.get(key);const p=vertices[a].map((v,i)=>v+vertices[b][i]),length=Math.hypot(...p),idx=vertices.length;vertices.push(p.map(x=>x/length));map.set(key,idx);return idx;};
 const subdivided=[];for(const [a,b,c] of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);subdivided.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}
 vertices=vertices.map((v,i)=>{const roughness=.76+.43*rnd('lw05:shape:'+variant+':'+i),stretched=[v[0]*(.8+.36*rnd('x'+variant)),v[1]*(.67+.55*rnd('y'+variant)),v[2]*(.72+.32*rnd('z'+variant))];return stretched.map(x=>x*roughness);});
 const positions=[],normals=[],colors=[],indices=[];
 for(let j=0;j<subdivided.length;j++){
  const f=subdivided[j],a=vertices[f[0]],b=vertices[f[1]],c=vertices[f[2]];
  const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  let length=Math.hypot(...n)||1,norm=n.map(x=>x/length);
  if(norm.reduce((sum,x,i)=>sum+x*a[i],0)<0)norm=norm.map(x=>-x);
  const tone=.58+.35*rnd('rock:facet:'+variant+':'+j),color=[.54*tone,.50*tone,.45*tone];
  const start=positions.length/3;for(const p of [a,b,c]){positions.push(...p);normals.push(...norm);colors.push(...color);}
  indices.push(start,start+1,start+2);
 }
 return Object.freeze({positions,normals,colors,indices,triangles:indices.length/3});
}
function beltRock(system,belt,rock,index,timeS){
 const period=Math.max(1,belt.period),phase=belt.phase+timeS*TAU/period;
 const angularDrift=(rnd(belt.id+':period:'+index)-.5)*.008*timeS/period;
 const a=phase+angularDrift,ca=Math.cos(a),sa=Math.sin(a);
 const x=rock[0]*ca-rock[2]*sa,z=rock[0]*sa+rock[2]*ca;
 // Use original cached debris body position (not a newly randomized orbit).
 const radius=Math.max(12,Math.min(250,Math.max(55,belt.radius*.0018)*rock[3]*.14));
 const spin=timeS*(.05+.27*rnd(belt.id+':spin:'+index));
 return Object.freeze({id:belt.id+':rock:'+index,kind:'asteroid',position:[system.position[0]+x,system.position[1]+rock[1],system.position[2]+z],
  radius,spin,axis:[.35+rnd(belt.id+':axisx:'+index),.25+rnd(belt.id+':axisy:'+index),.3+rnd(belt.id+':axisz:'+index)],
  variant:index%8,estimatedDensityKgM3:1500+1300*rnd(belt.id+':rho:'+index),sourceId:belt.id});
}
function ringRock(body,index,timeS){
 if(!body?.ring)return null;
 const key=body.id+':ring:'+index,theta=TAU*rnd(key+':theta'),radial=body.radius*(1.35+(body.ringWidth-1.39)*rnd(key+':r'));
 const inclination=(rnd(key+':height')-.5)*.014*body.radius,
 orbitPeriodS=Math.max(180,body.spinPeriod||240)*Math.pow(radial/body.radius,1.5)*22,
 a=theta+timeS*TAU/orbitPeriodS;
 const local=[radial*Math.cos(a),inclination,radial*Math.sin(a)],ct=Math.cos(body.ringTilt),st=Math.sin(body.ringTilt);
 const rotated=[local[0],local[1]*ct-local[2]*st,local[1]*st+local[2]*ct];
 const axis=body.spinAxis||[0,1,0],spin=body.spinAngle||0;
 // Same spin owner for body/ring coordinates as the existing ring mesh.
 const len=Math.hypot(...axis)||1,n=axis.map(x=>x/len),c=Math.cos(spin),s=Math.sin(spin),dot=rotated.reduce((a,x,i)=>a+x*n[i],0),cross=[n[1]*rotated[2]-n[2]*rotated[1],n[2]*rotated[0]-n[0]*rotated[2],n[0]*rotated[1]-n[1]*rotated[0]];
 const pos=rotated.map((x,i)=>x*c+cross[i]*s+n[i]*dot*(1-c));
 return Object.freeze({id:key,kind:'ring-moonlet',sourceId:body.id,position:pos.map((x,i)=>body.position[i]+x),
  radius:.45+3.7*Math.pow(rnd(key+':size'),2),spin:timeS*(.06+.2*rnd(key+':spin')),axis:[.1,1,.25],
  variant:index%8,estimatedDensityKgM3:550+700*rnd(key+':rho')});
}
function nearby(galaxy,eye,timeS,maxDistance=18000){
 if(!galaxy?.systems||!Array.isArray(eye))return Object.freeze([]);
 const found=[],max2=maxDistance*maxDistance,dist2=p=>p.reduce((s,x,i)=>s+(x-eye[i])**2,0);
 const nearSystems=typeof galaxy.nearbySystems==='function'?galaxy.nearbySystems(eye,2e8):galaxy.systems;
 for(const sys of nearSystems){
  for(const belt of sys.belts||[]){
   // Belt surface is sparsely occupied; use the original 420 entries,
   // then create a GPU mesh ONLY for the nearest fraction.
   const d=Math.hypot(...sys.position.map((x,i)=>x-eye[i]));
   if(Math.abs(d-belt.radius)>maxDistance+belt.radius*.16)continue;
   for(let i=0;i<belt.rocks.length;i++){
    const item=beltRock(sys,belt,belt.rocks[i],i,timeS);
    if(dist2(item.position)<max2)found.push(item);
   }
  }
  for(const body of sys.bodies||[]){
   if(!body.ring||dist2(body.position)>(body.radius*3.3+maxDistance)**2)continue;
   for(let i=0;i<180;i++){
    const item=ringRock(body,i,timeS);if(item&&dist2(item.position)<max2)found.push(item);
   }
  }
 }
 found.sort((a,b)=>dist2(a.position)-dist2(b.position));
 return Object.freeze(found.slice(0,55));
}
function proximity(rocks,eye,shipRadius=4){
 if(!Array.isArray(rocks)||!Array.isArray(eye))return null;
 let closest=null;
 for(const item of rocks){const d=Math.hypot(...item.position.map((v,i)=>v-eye[i])),clearance=d-item.radius-shipRadius;
  if(!closest||clearance<closest.clearance)closest={rockId:item.id,sourceId:item.sourceId,clearance,collision:clearance<=0,category:item.kind};}
 return closest?Object.freeze(closest):null;
}
const API=Object.freeze({irregularMesh,beltRock,ringRock,nearby,proximity});root.StarfallDebrisLW05=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
