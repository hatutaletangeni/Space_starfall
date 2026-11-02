/* STARFALL 6A — immutable planet-fixed cubemap tile addressing.
   This module has no GL, clock, camera, or mutable world state. All sampling in
   engine.js ultimately uses its existing seeded groundHeight/field functions.
   Tiles are a presentation cache; authoritative collision remains analytic.
*/
(function(root){'use strict';
function normalize(v){const l=Math.hypot(...v);if(!Number.isFinite(l)||l<1e-15)throw Error('Terrain direction must be finite and nonzero');return v.map(x=>x/l);}
function faceDirection(face,u,v){if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('Invalid terrain UV');
 const a=face===0?[1,v,-u]:face===1?[-1,v,u]:face===2?[u,1,-v]:face===3?[u,-1,v]:face===4?[u,v,1]:face===5?[-u,v,-1]:null;
 if(!a)throw Error('Unknown cubemap face');return normalize(a);
}
function uvForDirection(d){const a=normalize(d),[x,y,z]=a,X=Math.abs(x),Y=Math.abs(y),Z=Math.abs(z);
 if(X>=Y&&X>=Z)return x>=0?{face:0,u:-z/X,v:y/X}:{face:1,u:z/X,v:y/X};
 if(Y>=X&&Y>=Z)return y>=0?{face:2,u:x/Y,v:-z/Y}:{face:3,u:x/Y,v:z/Y};
 return z>=0?{face:4,u:x/Z,v:y/Z}:{face:5,u:-x/Z,v:y/Z};
}
function tileResolution(body){if(!Number.isFinite(body?.radius)||body.radius<=0)throw Error('Invalid terrain radius');return Math.max(6,Math.ceil(body.radius/Math.min(160,Math.max(40,body.radius*.12))));}
function tileDescriptor(body,face,ix,iy){const n=tileResolution(body);if(!Number.isInteger(ix)||!Number.isInteger(iy)||ix<0||iy<0||ix>=n||iy>=n)throw Error('Terrain tile index out of range');
 const key=String(body.id)+'|'+String(body.seed)+'|'+n+'|'+face+'|'+ix+'|'+iy;
 return{key,bodyId:body.id,face,ix,iy,n,u0:-1+2*ix/n,v0:-1+2*iy/n,step:2/n};
}
function descriptorForDirection(body,dir){const uv=uvForDirection(dir),n=tileResolution(body);return tileDescriptor(body,uv.face,Math.min(n-1,Math.max(0,Math.floor((uv.u+1)*n/2))),Math.min(n-1,Math.max(0,Math.floor((uv.v+1)*n/2))));}
function visibleTiles(body,dir,radius=3){const center=descriptorForDirection(body,dir),seen=new Map(),size=center.step;
 for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  const p=faceDirection(center.face,-1+(center.ix+dx+.5)*size,-1+(center.iy+dz+.5)*size);
  const tile=descriptorForDirection(body,p);const score=dx*dx+dz*dz;
  if(!seen.has(tile.key)||seen.get(tile.key).score>score)seen.set(tile.key,{...tile,score});
 }
 return[...seen.values()].sort((a,b)=>a.score-b.score||a.key.localeCompare(b.key));
}
function vertexDirection(tile,i,j,segments=16){return faceDirection(tile.face,tile.u0+tile.step*i/segments,tile.v0+tile.step*j/segments);}
function materialCode(body,height,fieldValue){const t=body.type;
 if(['Temperate','Lush','Ocean'].includes(t)&&height<1)return'water';
 if(t==='Ice')return'ice';if(t==='Volcanic')return'igneous';if(t==='Desert')return'sand';
 if(t==='Lush'||t==='Temperate')return fieldValue>.58?'upland':'soil';return'rock';
}
function sample(body,localDirection,groundHeight,field,shade,normalAt){const dir=normalize(localDirection),e=field(dir,body.seed),height=groundHeight(dir,body,e),normal=normalAt?normalize(normalAt(body,dir)):dir;
 const biome=root.StarfallBiomes&&body.landable?root.StarfallBiomes.classify(body,dir,height,e):null;
 return Object.freeze({direction:Object.freeze(dir),height,material:biome?biome.material:materialCode(body,height,e),biome:biome?.name||null,feature:biome?.feature||null,normal:Object.freeze(normal),color:Object.freeze(shade(dir,height,body,e,biome)),field:e});}
const API=Object.freeze({normalize,faceDirection,uvForDirection,tileResolution,tileDescriptor,descriptorForDirection,visibleTiles,vertexDirection,materialCode,sample});
root.StarfallStableTerrain=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
