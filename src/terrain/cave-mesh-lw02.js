/* STARFALL LW02: bounded triangulated interior cavern mesh.
 * Geometry and collision sample the same StarfallGeologyLW02 path.
 */
(function(root){'use strict';
function geometry(site){
 const G=root.StarfallGeologyLW02;if(!G)throw Error('Cave geology not loaded');
 const p=[],n=[],c=[],idx=[],steps=48,facets=12;
 const frozen=site.kind.includes('ice')||site.kind.includes('cryogenic');
 const volcanic=site.kind.includes('lava')||site.kind.includes('fissure');
 const rock=frozen?[.29,.46,.60]:volcanic?[.26,.23,.23]:[.39,.36,.32],floor=rock.map(x=>x*.75);
 function triangle(a,b,d,color){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
  const w=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.max(1e-12,Math.hypot(...w)),normal=w.map(x=>x/l),q=p.length/3;
  for(const pt of [a,b,d]){p.push(...pt);n.push(...normal);c.push(...color);}idx.push(q,q+1,q+2);}
 function quad(a,b,d,e,color){triangle(a,b,d,color);triangle(a,d,e,color);}
 function roof(o,z,width,t){return[o.x+width*Math.cos(t),o.y+Math.sin(t)*Math.min(5.3,width*1.7),z];}
 for(let i=0;i<steps;i++){
  const z0=site.lengthScene*i/steps,z1=site.lengthScene*(i+1)/steps,
   a=G.center(site,z0),b=G.center(site,z1),w0=G.width(site,z0),w1=G.width(site,z1);
  quad([a.x-w0,a.y,z0],[b.x-w1,b.y,z1],[b.x+w1,b.y,z1],[a.x+w0,a.y,z0],floor);
  for(let k=0;k<facets;k++){const t0=Math.PI*(1-k/facets),t1=Math.PI*(1-(k+1)/facets),
   m=.85+.13*Math.sin(i*.83+k*1.27+site.seed*.00001),color=rock.map(v=>v*m);
   quad(roof(a,z0,w0,t0),roof(b,z1,w1,t0),roof(b,z1,w1,t1),roof(a,z0,w0,t1),color);}
 }
 // Enclosed terminal wall and seeded crystals, stalagmites and sediment.
 const end=G.center(site,site.lengthScene),w=G.width(site,site.lengthScene);
 for(let k=0;k<facets;k++){
  const a=Math.PI*(1-k/facets),b=Math.PI*(1-(k+1)/facets);
  triangle([end.x,end.y,site.lengthScene],roof(end,site.lengthScene,w,a),roof(end,site.lengthScene,w,b),rock);
 }
 for(let j=1;j<=12;j++){
  const z=j*site.lengthScene/14,o=G.center(site,z),w=G.width(site,z),
   x=o.x+w*(j%2?-.62:.62),height=.35+(j%5)*.24,col=frozen?[.58,.73,.84]:volcanic?[.49,.34,.27]:[.56,.53,.40];
  triangle([x-.24,o.y,z-.2],[x+.24,o.y,z+.2],[x+.1,o.y+height,z],col);
  triangle([x+.24,o.y,z-.2],[x-.24,o.y,z+.2],[x+.1,o.y+height,z],col);
 }
 return Object.freeze({positions:p,normals:n,colors:c,indices:idx,
  triangles:idx.length/3,model:'enclosed tunnel mesh; matching LW02 planar cross-section collision'});
}
function entranceGeometry(site){
 const p=[],n=[],c=[],idx=[],width=Math.max(2,site.widthScene),height=4.4,
 rock=site.kind.includes('ice')?[.47,.59,.67]:site.kind.includes('lava')?[.31,.28,.26]:[.43,.39,.34];
 function tri(a,b,d,color){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]],
 w=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.max(1e-9,Math.hypot(...w)),
 k=p.length/3;for(const q of [a,b,d]){p.push(...q);n.push(...w.map(x=>x/len));c.push(...color);}idx.push(k,k+1,k+2);}
 function quad(a,b,d,e,color){tri(a,b,d,color);tri(a,d,e,color);}
 // Rock portal around a black recessed mouth, with a real thickness.
 quad([-width-1,0,0],[-width+1,0,0],[-width+1,height,0],[-width-1,height,0],rock);
 quad([width-1,0,0],[width+1,0,0],[width+1,height,0],[width-1,height,0],rock);
 quad([-width+1,height-1,0],[width-1,height-1,0],[width-1,height,0],[-width+1,height,0],rock);
 quad([-width+1,.1,.14],[width-1,.1,.14],[width-1,height-1,.14],[-width+1,height-1,.14],[.016,.020,.024]);
 quad([-width-1,0,0],[-width-1,0,1],[-width-1,height,1],[-width-1,height,0],rock);
 quad([width+1,0,1],[width+1,0,0],[width+1,height,0],[width+1,height,1],rock);
 return Object.freeze({positions:p,normals:n,colors:c,indices:idx});
}
const API=Object.freeze({geometry,entranceGeometry});root.StarfallCaveMeshLW02=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
