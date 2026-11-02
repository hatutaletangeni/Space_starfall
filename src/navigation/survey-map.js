/* STARFALL 6G — pure, planet-fixed local map geometry and bounded discovery coverage.
   No camera-relative positions, WebGL dependencies, or simulated data. */
(function(root){'use strict';
const vec={dot:(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(...a),scale:(a,k)=>a.map(x=>x*k),sub:(a,b)=>a.map((x,i)=>x-b[i]),add:(a,b)=>a.map((x,i)=>x+b[i]),norm(a){const n=this.len(a);return n>1e-12?this.scale(a,1/n):[0,1,0]}};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function unit(local){if(!Array.isArray(local)||local.length!==3||!local.every(Number.isFinite)||vec.len(local)<1e-12)throw Error('Invalid map position');return vec.norm(local);}
function basis(local){const up=unit(local);let pole=[0,1,0];if(Math.abs(vec.dot(up,pole))>.995)pole=[0,0,1];const north=vec.norm(vec.sub(pole,vec.scale(up,vec.dot(up,pole))));const east=vec.norm(vec.cross(north,up));return{up,north,east};}
function toLocal(center,target,radius){const b=basis(center),p=unit(target),dot=clamp(vec.dot(b.up,p),-1,1),theta=Math.acos(dot),t=vec.sub(p,vec.scale(b.up,dot)),length=vec.len(t);if(length<1e-12)return{x:0,y:0,distance:theta*radius};const s=theta*radius/length;return{x:vec.dot(t,b.east)*s,y:vec.dot(t,b.north)*s,distance:theta*radius};}
function fromLocal(center,x,y,radius){if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<=0)throw Error('Invalid local map coordinates');const b=basis(center),distance=Math.hypot(x,y),a=distance/radius;if(distance<1e-12)return b.up;const tang=vec.scale(vec.add(vec.scale(b.east,x),vec.scale(b.north,y)),1/distance);return vec.norm(vec.add(vec.scale(b.up,Math.cos(a)),vec.scale(tang,Math.sin(a))));}
function arc(a,b,radius){return Math.acos(clamp(vec.dot(unit(a),unit(b)),-1,1))*radius;}
function bearing(center,target){const d=toLocal(center,target,1);return(Math.atan2(d.x,d.y)*180/Math.PI+360)%360;}
function faceCell(local,res=96){const [x,y,z]=unit(local),ab=[Math.abs(x),Math.abs(y),Math.abs(z)],m=Math.max(...ab);let f,u,v;
 if(m===ab[0]){f=x>=0?0:1;u=x>=0?-z/m:z/m;v=y/m;}else if(m===ab[1]){f=y>=0?2:3;u=x/m;v=y>=0?-z/m:z/m;}else{f=z>=0?4:5;u=z>=0?x/m:-x/m;v=y/m;}
 return f+':'+clamp(Math.floor((u+1)*res/2),0,res-1)+':'+clamp(Math.floor((v+1)*res/2),0,res-1);
}
function coverageKey(bodyId,local){return String(bodyId).slice(0,160)+'|'+faceCell(local);}
function sanitizeCoverage(data){const ret={};if(!data||typeof data!=='object')return ret;for(const [id,keys] of Object.entries(data)){if(!id||id.length>160||!Array.isArray(keys))continue;ret[id]=[...new Set(keys.filter(s=>typeof s==='string'&&/^[0-5]:\d{1,3}:\d{1,3}$/.test(s)&&s.split(':').slice(1).every(n=>Number(n)<96)))];}return ret;}
function addCoverage(coverage,bodyId,local,bodyRadius,revealScene=44){const id=String(bodyId),old=coverage[id]||[],seen=new Set(old);if(seen.size>=2400)return false;let changed=false;for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){if(x*x+y*y>5)continue;const cell=faceCell(fromLocal(local,x*revealScene/2,y*revealScene/2,bodyRadius));if(!seen.has(cell)&&seen.size<2400){seen.add(cell);changed=true;}}if(changed)coverage[id]=[...seen];return changed;}
function visibleByCoverage(coverage,bodyId,position){return(coverage[bodyId]||[]).includes(faceCell(position));}
function markerProjection(center,local,radius,mapRange,width,height){const p=toLocal(center,local,radius),scale=(Math.min(width,height)/2-23)/mapRange;return{px:width/2+p.x*scale,py:height/2-p.y*scale,distance:p.distance,inside:p.distance<=mapRange};}
const API=Object.freeze({vec,unit,basis,toLocal,fromLocal,arc,bearing,faceCell,coverageKey,sanitizeCoverage,addCoverage,visibleByCoverage,markerProjection});
root.StarfallSurveyMap=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
