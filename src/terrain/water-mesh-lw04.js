/* LW04 ocean tile renderer: uses exactly the original cubemap tile addressing.
 * Water mesh is a separate surface above immutable terrain, with bounded GPU ownership.
 */
(function(root){'use strict';
function geometry(body,tile,segments,field,groundHeight){
 const ST=root.StarfallStableTerrain,H=root.StarfallHydrosphereLW04;
 if(!ST||!H||!H.material(body)||!Number.isInteger(segments)||segments<2)return null;
 const positions=[],normals=[],colors=[],indices=[],wet=[];
 const radius=H.material(body).sceneSeaLevel;
 for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
  const d=ST.vertexDirection(tile,i,j,segments),e=field(d,body.seed),depth=groundHeight(d,body,e);
  wet.push(depth<1);positions.push(d[0]*radius,d[1]*radius,d[2]*radius);
  normals.push(...d);colors.push(.10,.36,.49);
 }
 for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  // Triangles are clipped to true sea-level basin cells, not land height.
  if(wet[a]&&wet[a+1]&&wet[b])indices.push(a,a+1,b);
  if(wet[a+1]&&wet[b+1]&&wet[b])indices.push(a+1,b+1,b);
 }
 return indices.length?Object.freeze({positions,normals,colors,indices,
  triangles:indices.length/3,sourceTileKey:tile.key,sourceBodyId:body.id,
  model:'fixed ocean surface using same planet-fixed cubemap grid as terrain; visual-only overlay'}):null;
}
const API=Object.freeze({geometry});root.StarfallWaterMeshLW04=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
