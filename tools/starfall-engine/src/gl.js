/* STARFALL ENGINE — offline WebGL2 editor renderer. Art is preview-only. */
(function(root){'use strict';
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),len:a=>Math.hypot(...a),norm:a=>{let k=Math.hypot(...a)||1;return a.map(v=>v/k)},cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0)};
const M={
 mul:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;},
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 perspective:(fov,aspect,near,far)=>{const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);},
 look:(eye,target,up)=>{const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);},
 model:(p,s,r=[0,0,0])=>{const [a,b,c]=r.map(v=>v*Math.PI/180),ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
  return new Float32Array([(cc*cb)*s[0],(sc*cb)*s[0],(-sb)*s[0],0,(cc*sb*sa-sc*ca)*s[1],(sc*sb*sa+cc*ca)*s[1],cb*sa*s[1],0,(cc*sb*ca+sc*sa)*s[2],(sc*sb*ca-cc*sa)*s[2],cb*ca*s[2],0,p[0],p[1],p[2],1]);},
 project:(p,m)=>{const x=p[0],y=p[1],z=p[2];const w=m[3]*x+m[7]*y+m[11]*z+m[15];return w<=0?null:[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w]}
};
const VS=`#version 300 es
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;uniform mat4 uVP,uModel;out vec3 vNormal,vLocal,vWorld;
void main(){vec4 p=uModel*vec4(aPos,1.);vWorld=p.xyz;vLocal=aPos;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uVP*p;}`;
const FS=`#version 300 es
precision highp float;in vec3 vNormal,vLocal,vWorld;out vec4 frag;
uniform vec3 uColor,uLight;uniform int uType,uSelected;uniform float uTime;
float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 n=normalize(vNormal),p=normalize(vLocal);float lit=max(0.,dot(n,normalize(uLight))),a=.05+.95*lit;vec3 c=uColor;
 if(uType==0){float activity=noise(p*17.+uTime*.0002);c=mix(c,c*vec3(1.08,.67,.36),activity*.27);a=1.12+pow(1.-max(0.,dot(n,vec3(0.,0.,1.))),2.)*.10;}
 else if(uType==1){float n1=noise(p*5.3),n2=noise(p*27.);float coast=smoothstep(.42,.53,n1);c=mix(c*vec3(.17,.48,.78),c*vec3(.65,1.14,.72),coast);c*=.75+.33*n2;a=.13+.87*lit;}
 else if(uType==2||uType==3){float n1=noise(p*19.),n2=noise(p*70.);c*=.58+.48*n1+.12*n2;a=.08+.92*lit;}
 else if(uType==4){float band=sin(p.y*49.+noise(p*6.)*3.);float b=smoothstep(-.7,.9,band);c=mix(c*.68,c*1.17,b);a=.19+.81*lit;}
 else {float textureNoise=noise(vLocal*9.);c*=.72+.29*textureNoise;a=.23+.77*lit;}
 if(uSelected==1){c=mix(c,vec3(.97,.69,.35),.11);}
 frag=vec4(c*a,1.);
}`;
const LINE_VS=`#version 300 es
layout(location=0) in vec3 aPos;uniform mat4 uVP,uModel;void main(){gl_Position=uVP*uModel*vec4(aPos,1.);}`;
const LINE_FS=`#version 300 es
precision highp float;uniform vec4 uColor;out vec4 frag;void main(){frag=uColor;}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader compile: '+gl.getShaderInfoLog(s));return s;}
function prog(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Shader link: '+gl.getProgramInfoLog(p));return p;}
function mesh(gl,verts,indices){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(1);let ibo=null;if(indices){ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);}gl.bindVertexArray(null);return{vao,count:indices?indices.length:verts.length/6,indexed:!!indices,vbo,ibo};}
function sphere(gl,lat=36,lon=56){const v=[],i=[];for(let y=0;y<=lat;y++){const t=y*Math.PI/lat;for(let x=0;x<=lon;x++){const a=x*2*Math.PI/lon,n=[Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)];v.push(...n,...n);}}
for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;i.push(a,b,a+1,b,b+1,a+1);}return mesh(gl,v,i);}
function box(gl){const v=[],idx=[];const faces=[[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
for(let f=0;f<6;f++){const n=faces[f],axis=n.findIndex(x=>x!==0),a=(axis+1)%3,b=(axis+2)%3,at=v.length/6;for(const [u,w] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=[0,0,0];p[axis]=n[axis];p[a]=u;p[b]=w;v.push(...p,...n);}idx.push(at,at+1,at+2,at,at+2,at+3);}return mesh(gl,v,idx);}
function lineBuffer(gl,coords){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coords),gl.STATIC_DRAW);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(0);gl.bindVertexArray(null);return {vao,vbo,count:coords.length/3};}
const hex=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)/255);
class Viewport{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,depth:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 unavailable. Enable hardware acceleration in Chrome or Edge.');const gl=this.gl;
  this.surface=prog(gl,VS,FS);this.lines=prog(gl,LINE_VS,LINE_FS);this.sphere=sphere(gl);this.box=box(gl);this.cam={targetKm:[0,0,0],azimuth:.61,elevation:.34,distanceKm:700000};this.drawCalls=0;this.gridVisible=true;this.orbitsVisible=true;this.quality='Balanced';this.lastVP=null;this.lastCamera=null;this.positions=new Map();this.lastScene=null;this.selectedId=null;
  this.cachedOrbits={serial:-1};this.circle=lineBuffer(gl,Array.from({length:161},(_,k)=>{const a=k*Math.PI*2/160;return [Math.cos(a),0,Math.sin(a)];}).flat());
  const grid=[];for(let i=-30;i<=30;i++){grid.push(-400,0,i*12,400,0,i*12,i*12,0,-400,i*12,0,400);}this.grid=lineBuffer(gl,grid);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(.014,.024,.04,1);
 }
 resize(){const ratio=Math.min(window.devicePixelRatio||1,this.quality==='Performance'?1:this.quality==='Quality'?2:1.5);const w=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),h=Math.max(1,Math.round(this.canvas.clientHeight*ratio));if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
 cameraAt(){const c=this.cam,r=c.distanceKm;return [c.targetKm[0]+r*Math.cos(c.elevation)*Math.sin(c.azimuth),c.targetKm[1]+r*Math.sin(c.elevation),c.targetKm[2]+r*Math.cos(c.elevation)*Math.cos(c.azimuth)];}
 orbit(dx,dy){this.cam.azimuth-=dx*.006;this.cam.elevation=Math.max(-1.53,Math.min(1.53,this.cam.elevation+dy*.006));}
 pan(dx,dy){const eye=this.cameraAt(),forward=V.norm(V.sub(this.cam.targetKm,eye)),right=V.norm(V.cross(forward,[0,1,0])),up=V.norm(V.cross(right,forward)),s=this.cam.distanceKm/650;this.cam.targetKm=V.add(this.cam.targetKm,V.add(V.mul(right,-dx*s),V.mul(up,dy*s)));}
 zoom(amount){this.cam.distanceKm=Math.max(200,Math.min(1e13,this.cam.distanceKm*Math.exp(amount*.00125)));}
 focus(pos,radius=18000){this.cam.targetKm=pos.slice();this.cam.distanceKm=Math.max(radius*5,8000);}
 render(scene,selection,options={}){
 const gl=this.gl;this.resize();const t=scene.data.simulationSeconds,scale=scene.data.kmPerUnit,focus=this.cam.targetKm,eye=V.sub(this.cameraAt(),focus).map(x=>x/scale),target=[0,0,0];
 const near=.03,far=Math.max(1e5,this.cam.distanceKm/scale*20);const projection=M.perspective(55*Math.PI/180,this.canvas.width/this.canvas.height,near,far),view=M.look(eye,target,[0,1,0]),vp=M.mul(projection,view);
 this.lastVP=vp;this.lastCamera=eye;this.lastScene=scene;this.positions=scene.worldPositions();this.selectedId=selection;this.drawCalls=0;
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.lines);gl.uniformMatrix4fv(gl.getUniformLocation(this.lines,'uVP'),false,vp);gl.bindVertexArray(this.gridVisible?this.grid.vao:null);
 if(this.gridVisible){gl.uniformMatrix4fv(gl.getUniformLocation(this.lines,'uModel'),false,M.model(V.mul(focus,-1/scale),[1,1,1]));gl.uniform4f(gl.getUniformLocation(this.lines,'uColor'),.11,.24,.33,.35);gl.drawArrays(gl.LINES,0,this.grid.count);this.drawCalls++;}
 if(this.orbitsVisible){for(const node of scene.nodes){if(!node.visible||!node.orbit||!node.parentId)continue;const parent=this.positions.get(node.parentId),center=V.add(parent,node.positionKm),o=node.orbit;
    const inclination=o.inclinationDeg*Math.PI/180;const co=Math.cos(inclination),si=Math.sin(inclination);const r=o.semiMajorAxisKm/scale;
    const transform=M.model(V.mul(V.sub(center,focus),1/scale),[r,r,r],[-inclination*180/Math.PI,0,0]); // basis matches x-z orbital incline
    gl.uniformMatrix4fv(gl.getUniformLocation(this.lines,'uModel'),false,transform);gl.uniform4f(gl.getUniformLocation(this.lines,'uColor'),.36,.49,.59,.45);gl.bindVertexArray(this.circle.vao);gl.drawArrays(gl.LINE_STRIP,0,this.circle.count);this.drawCalls++;
  }}
 gl.useProgram(this.surface);gl.uniformMatrix4fv(gl.getUniformLocation(this.surface,'uVP'),false,vp);gl.uniform1f(gl.getUniformLocation(this.surface,'uTime'),t);
 const star=scene.nodes.find(n=>n.type==='star'),starPosition=star?this.positions.get(star.id):[0,0,0];
 for(const n of scene.nodes){if(!n.visible)continue;const pos=this.positions.get(n.id);if(!pos)continue;const r=n.radiusKm/scale;if(r>far)continue;const rel=V.mul(V.sub(pos,focus),1/scale);const d=Math.hypot(...V.sub(rel,eye));if(d>far+r)continue;
  const model=M.model(rel,[r*n.scale[0],r*n.scale[1],r*n.scale[2]],n.rotationDeg);gl.uniformMatrix4fv(gl.getUniformLocation(this.surface,'uModel'),false,model);gl.uniform3fv(gl.getUniformLocation(this.surface,'uColor'),hex(n.color));
  const type=n.type==='star'?0:n.type==='moon'?2:n.type==='asteroid'?3:n.metadata.surface==='gas'?4:['planet'].includes(n.type)?1:5;gl.uniform1i(gl.getUniformLocation(this.surface,'uType'),type);gl.uniform1i(gl.getUniformLocation(this.surface,'uSelected'),n.id===selection?1:0);
  const light=n.type==='star'?[.6,.7,.5]:V.norm(V.sub(starPosition,pos));gl.uniform3fv(gl.getUniformLocation(this.surface,'uLight'),light);
  const mesh=['star','planet','moon','asteroid'].includes(n.type)?this.sphere:this.box;gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);this.drawCalls++;
 }
 if(selection&&this.positions.has(selection)){const n=scene.getNode(selection);const pos=V.mul(V.sub(this.positions.get(selection),focus),1/scale);const r=n.radiusKm/scale;gl.disable(gl.DEPTH_TEST);gl.useProgram(this.lines);gl.uniformMatrix4fv(gl.getUniformLocation(this.lines,'uVP'),false,vp);gl.uniformMatrix4fv(gl.getUniformLocation(this.lines,'uModel'),false,M.model(pos,[r*1.16,r*1.16,r*1.16],[0,0,0]));gl.uniform4f(gl.getUniformLocation(this.lines,'uColor'),.95,.66,.32,1);gl.bindVertexArray(this.circle.vao);gl.drawArrays(gl.LINE_STRIP,0,this.circle.count);this.drawCalls++;gl.enable(gl.DEPTH_TEST);}
 gl.bindVertexArray(null);
 }
 projectKm(p){if(!this.lastVP||!this.lastScene)return null;const scale=this.lastScene.data.kmPerUnit,rel=V.mul(V.sub(p,this.cam.targetKm),1/scale),q=M.project(rel,this.lastVP);if(!q)return null;return [(q[0]*.5+.5)*this.canvas.clientWidth,(-q[1]*.5+.5)*this.canvas.clientHeight,q[2]];}
 pick(x,y){if(!this.lastScene)return null;const candidates=[];for(const n of this.lastScene.nodes){if(!n.visible)continue;const pos=this.positions.get(n.id),q=this.projectKm(pos);if(!q)continue;const radiusPx=Math.max(9, .5*this.canvas.clientHeight*n.radiusKm/Math.max(1,q[2]*this.lastScene.data.kmPerUnit)*1.7);const err=Math.hypot(x-q[0],y-q[1]);if(err<Math.min(90,radiusPx+10))candidates.push({id:n.id,err:err/Math.max(12,radiusPx),depth:q[2]});}candidates.sort((a,b)=>a.err-b.err||a.depth-b.depth);return candidates[0]?.id||null;}
}
root.StarfallViewport=Viewport;
})(globalThis);
