/* STARFALL 3D ENGINE — WebGL2, no external libraries or network dependencies.
 * Planetary geometry, continuous near-field terrain, atmosphere, procedural stars,
 * and ship are rendered in the SAME WebGL scene, including during touchdown.
 */
(function(root){'use strict';
const V={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(a[0],a[1],a[2]),
 norm:a=>{const m=Math.hypot(...a)||1;return [a[0]/m,a[1]/m,a[2]/m];},mix:(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 rot:(v,axis,angle)=>{const a=V.norm(axis),c=Math.cos(angle),s=Math.sin(angle),d=V.dot(a,v);return V.add(V.add(V.mul(v,c),V.mul(V.cross(a,v),s)),V.mul(a,d*(1-c)));}
};
const M={
 perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);},
 look(eye,target,up){const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);},
 mul(a,b){let o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)o[col*4+row]=a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];return o;},
 translate(v){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,v[0],v[1],v[2],1]);},
 scaleTranslate(v,scale){return new Float32Array([scale,0,0,0,0,scale,0,0,0,0,scale,0,v[0],v[1],v[2],1]);},
 spin(pos,axis,angle){const [x,y,z]=V.norm(axis),c=Math.cos(angle),sn=Math.sin(angle),q=1-c;return new Float32Array([c+x*x*q,y*x*q+z*sn,z*x*q-y*sn,0,x*y*q-z*sn,c+y*y*q,z*y*q+x*sn,0,x*z*q+y*sn,y*z*q-x*sn,c+z*z*q,0,pos[0],pos[1],pos[2],1]);},
 basis(r,u,f,pos){return new Float32Array([r[0],r[1],r[2],0,u[0],u[1],u[2],0,-f[0],-f[1],-f[2],0,pos[0],pos[1],pos[2],1]);}
};
// Deterministic noise field, shared by orbit geometry, close-up terrain, and collision.
function fract(x){return x-Math.floor(x)}
function hash3(x,y,z,s){let h=(Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(s,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function noise(x,y,z,seed){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const mix=(l,r,t)=>l+(r-l)*t;
return mix(mix(mix(hash3(ix,iy,iz,seed),hash3(ix+1,iy,iz,seed),a),mix(hash3(ix,iy+1,iz,seed),hash3(ix+1,iy+1,iz,seed),a),b),mix(mix(hash3(ix,iy,iz+1,seed),hash3(ix+1,iy,iz+1,seed),a),mix(hash3(ix,iy+1,iz+1,seed),hash3(ix+1,iy+1,iz+1,seed),a),b),c);}
function field(n,seed){let v=0,a=.55,k=2.9;for(let i=0;i<5;i++){v+=noise(n[0]*k+13,n[1]*k+27,n[2]*k+5,seed)*a;k*=2.03;a*=.49;}return v/1.06;}
function groundHeight(n,planet,value){if(planet.type==='Gas Giant')return 0;const e=value??field(n,planet.seed),sea=planet.type==='Ocean'?.56:planet.type==='Temperate'?.47:planet.type==='Lush'?.48:.19;if(['Temperate','Lush','Ocean'].includes(planet.type)&&e<sea)return 0;const base=Math.max(0,e-sea);const detail=noise(n[0]*88,n[1]*88,n[2]*88,planet.seed+9);return Math.min(110,3+Math.pow(base,1.3)*158+Math.max(0,detail-.5)*11);}
function shade(n,h,planet,value){const t=planet.type;const e=value??field(n,planet.seed),sea=t==='Ocean'?.56:t==='Temperate'?.47:t==='Lush'?.48:.19;
let c;
if(t==='Gas Giant'){const bands=Math.sin(n[1]*57+field(n,planet.seed)*17),storm=Math.sin(n[0]*22+n[2]*29+field(n,planet.seed)*25);return V.mix([.37,.23,.18],[.84,.71,.49],V.clamp(.49+.28*bands+.09*storm,0,1));}
if(['Temperate','Lush','Ocean'].includes(t)&&h<1){const shallow=V.clamp((e-sea+.12)*3,0,1);c=V.mix([.038,.097,.161],[.11,.20,.27],shallow);}
else if(t==='Volcanic')c=V.mix([.16,.125,.125],[.43,.22,.14],V.clamp(h/75,0,1));
else if(t==='Ice')c=V.mix([.38,.52,.60],[.83,.89,.91],V.clamp(h/70,0,1));
else if(t==='Desert')c=V.mix([.40,.275,.17],[.73,.59,.37],V.clamp(h/75,0,1));
else if(t==='Rocky')c=V.mix([.27,.29,.28],[.60,.57,.48],V.clamp(h/80,0,1));
else if(t==='Ocean')c=V.mix([.19,.35,.25],[.64,.66,.53],V.clamp(h/80,0,1));
else c=V.mix(t==='Lush'?[.11,.29,.18]:[.26,.35,.235],[.62,.63,.47],V.clamp(h/85,0,1));
const polar=V.clamp((Math.abs(n[1])-.88)*8.8,0,1)*(t==='Volcanic'||t==='Desert'?0:1);
c=V.mix(c,[.84,.87,.85],polar);return c;
}
function compile(gl,type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vs,fs){const p=gl.createProgram();gl.attachShader(p,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const meshVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;
uniform mat4 uViewProj;uniform mat4 uModel;out vec3 vWorld;out vec3 vNormal;out vec3 vColor;
void main(){vec4 world=uModel*vec4(aPos,1.);vWorld=world.xyz;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;gl_Position=uViewProj*world;}`;
// A moon/planet only reflects light from its own star-lit hemisphere.
function evaluateLighting(body,sys,galaxy,position){
 const sun=V.sub(sys.position,body.position),dist=Math.max(V.len(sun),sys.star.radius*1.001),sunDir=V.norm(sun);
 const starPower=V.clamp(Math.pow((sys.star.radius/dist)/.14,1.25),.16,1.85);
 let moon=[0,0,0],moonColor=[0,0,0],moonPower=0,moonDetail=[];
 const candidates=body.kind==='moon'?[galaxy.byId.get(body.parentId)]:body.moons;
 for(const m of candidates||[]){if(!m)continue;const ray=V.sub(m.position,body.position),d=V.len(ray);if(d<1)continue;
  const litSide=V.norm(V.sub(sys.position,m.position)),view=V.norm(V.sub(body.position,m.position));
  const phase=.5+.5*V.dot(litSide,view);
  const strength=Math.min(.26,19*phase*Math.pow(m.radius/d,2));
  if(strength<.0002)continue;
  moon=V.add(moon,V.mul(V.norm(ray),strength));moonPower+=strength;
  moonColor=V.add(moonColor,V.mul(m.sky||[.7,.75,.8],strength));
  moonDetail.push({name:m.name,phase,strength});
 }
 // A distant system contributes no light to the current system. Ambient is deliberately
 // nearly zero: the sun, moonlight, and the ship floodlight provide the actual illumination.
 const nightGlow=.008;const color=sys.star.tint||[1,1,1];
 let bounceDirection=V.len(moon)>.0001?V.norm(moon):[0,1,0];
 moonColor=moonPower>.0001?V.mul(moonColor,1/moonPower):[.8,.83,.9];
 // Lunar eclipse: a moon's parent can block the star. A ray-sphere intersection in
 // the fragment shader handles the actual shadow instead of a whole-body toggle.
 const parent=body.kind==='moon'?galaxy.byId.get(body.parentId):null;
 return {sunDir,starPower,starColor:color,moonPower:Math.min(.38,moonPower),bounceDirection,bounceColor:moonColor,ambient:nightGlow,occluder:parent?{center:parent.position,radius:parent.radius}:null,moonDetail};
}
const meshFS=`#version 300 es
precision highp float;in vec3 vWorld;in vec3 vNormal;in vec3 vColor;
uniform vec3 uCamera,uLight,uStarColor,uBounceDir,uBounceColor,uHeadlampPos,uHeadlampDir,uFogColor;
uniform vec4 uOccluder;uniform float uStarPower,uAmbient,uBouncePower,uHeadlampPower,uFogDensity,uShip;
out vec4 frag;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){
 vec3 N=normalize(vNormal);
 float diffuse=max(0.,dot(N,normalize(uLight)));
 // If a parent planet lies between this point and the star, the moon is eclipsed.
 float starShadow=1.;
 if(uOccluder.w>0.){vec3 delta=uOccluder.xyz-vWorld;float ahead=dot(delta,uLight);
  if(ahead>0.&&dot(delta,delta)-ahead*ahead<uOccluder.w*uOccluder.w)starShadow=0.;}
 vec3 illumination=uStarColor*(diffuse*uStarPower*starShadow)+vec3(uAmbient);
 illumination+=uBounceColor*max(0.,dot(N,normalize(uBounceDir)))*uBouncePower;
 // Actual distance-attenuated forward-facing spacecraft spotlight, not a flat UI glow.
 vec3 toLamp=uHeadlampPos-vWorld;float distance=length(toLamp);vec3 fromLamp=normalize(-toLamp);
 float beam=smoothstep(.58,.84,dot(fromLamp,normalize(uHeadlampDir)));
 illumination+=vec3(1.,.88,.69)*max(0.,dot(N,normalize(toLamp)))*beam*uHeadlampPower/(1.+distance*distance*.0009);
 // Vertex colors stay attached to the terrain; no camera-relative noise that swims.
 vec3 color=clamp(vColor*illumination,0.,1.);
 if(uShip>.5)color=max(color,vColor*.075);if(uShip>1.5)color=max(color,vColor*.93);
 float fog=1.-exp(-length(uCamera-vWorld)*uFogDensity);color=mix(color,uFogColor,clamp(fog,0.,.96));
 frag=vec4(color,1.);
}`;
const shellVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;uniform mat4 uVP;uniform mat4 uModel;out vec3 vWorld;out vec3 vDir;
void main(){vDir=normalize(mat3(uModel)*aPos);vec4 w=uModel*vec4(aPos,1.);vWorld=w.xyz;gl_Position=uVP*w;}`;
const atmoFS=`#version 300 es
precision highp float;in vec3 vWorld;in vec3 vDir;
uniform vec3 uCam,uTint,uLight,uStarColor;uniform float uOpacity,uStarPower;out vec4 frag;
void main(){float facing=abs(dot(normalize(vDir),normalize(uCam-vWorld)));
 float rim=pow(1.-facing,2.5);float lit=smoothstep(-.22,.25,dot(normalize(vDir),normalize(uLight)));
 frag=vec4(uTint*(.02+.98*lit)*uStarColor*min(1.3,uStarPower),clamp(rim*.83*uOpacity*(.05+.95*lit),0.,.82));}`;
const cloudFS=`#version 300 es
precision highp float;in vec3 vWorld;in vec3 vDir;uniform vec3 uCam,uTint,uLight,uStarColor;uniform float uOpacity,uStarPower;out vec4 frag;
float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float no(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){float n=no(vDir*17.)*.64+no(vDir*39.)*.23+no(vDir*94.)*.13;
 float density=smoothstep(.49,.66,n)*.52*uOpacity;float lit=max(0.,dot(normalize(vDir),normalize(uLight)));
 frag=vec4(mix(uTint,vec3(.88,.89,.85),.28)*uStarColor*(.018+lit*uStarPower),density*(.04+.96*lit));}`;
const ringVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;uniform mat4 uVP;uniform vec3 uCenter;void main(){gl_Position=uVP*vec4(aPos+uCenter,1.);}`;
const ringFS=`#version 300 es
precision highp float;uniform vec4 uTint;out vec4 frag;void main(){frag=uTint;}`;
const sunFS=`#version 300 es
precision highp float;in vec3 vWorld;in vec3 vNormal;uniform vec3 uTint;uniform float uTime;out vec4 frag;
void main(){vec3 n=normalize(vNormal);float f=sin(n.x*53.+uTime*.67)*sin(n.y*39.-uTime*.31)*.055;float hot=0.84+.2*abs(sin(n.x*22.+n.z*17.+uTime*.14));frag=vec4(clamp(uTint*(1.2+f+hot*.16),0.,1.),1.);}`;
const starVS=`#version 300 es
precision highp float;layout(location=0)in vec4 aStar;layout(location=1)in float aBright;uniform mat4 uVP;uniform vec3 uOffset;uniform float uAlpha;uniform float uDpr;uniform float uTime;out float vAlpha;out float vHeat;
void main(){vec4 clip=uVP*vec4(aStar.xyz+uOffset,1.);gl_Position=clip;float dz=max(1.,clip.w);gl_PointSize=clamp(aStar.w*uDpr*(850./(dz+700.)),1.35,6.2);vAlpha=aBright*uAlpha*(.88+.12*sin(uTime*2.1+float(gl_VertexID)*3.83));vHeat=aBright;}`;
const starFS=`#version 300 es
precision highp float;in float vAlpha;in float vHeat;out vec4 frag;
void main(){float r=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.13,r)*vAlpha;vec3 c=mix(vec3(.63,.73,.93),vec3(1.,.88,.67),smoothstep(.72,1.,vHeat));frag=vec4(c,a);}`;
const effectsVS=`#version 300 es
precision highp float;layout(location=0)in vec4 aPosSize;layout(location=1)in vec4 aTint;
uniform mat4 uVP;uniform float uFocal;out vec4 vTint;
void main(){vec4 clip=uVP*vec4(aPosSize.xyz,1.);gl_Position=clip;gl_PointSize=clamp(aPosSize.w*uFocal/max(clip.w,1.),1.,145.);vTint=aTint;}`;
const effectsFS=`#version 300 es
precision highp float;in vec4 vTint;out vec4 frag;
void main(){float radius=length(gl_PointCoord-.5)*2.;float alpha=pow(max(0.,1.-radius*radius),2.9)*vTint.a;frag=vec4(vTint.rgb,alpha);}`;
const bgVS=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const bgFS=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform vec3 uForward,uRight,uUp,uRadial,uSkyColor,uLight,uStarColor;
uniform float uAspect,uTan,uAltitude,uDaylight,uMoonGlow,uStarPower,uSunAngular;
void main(){vec2 xy=(uv-1.)*vec2(uAspect,1.)*uTan;vec3 ray=normalize(uForward+xy.x*uRight+xy.y*uUp);
 float h=dot(ray,uRadial);float atmo=1.-smoothstep(170.,690.,uAltitude);float zen=smoothstep(-.20,.87,h);
 vec3 daySky=mix(mix(uSkyColor*1.30,vec3(.75,.48,.29),.22),uSkyColor*.46,zen);
 vec3 nightSky=mix(vec3(.002,.003,.010),uSkyColor*.032,zen)+uMoonGlow*uSkyColor*.08;
 float twilight=smoothstep(-.18,.22,uDaylight);
 vec3 sky=mix(nightSky,daySky,twilight);
 float sun=max(0.,dot(ray,normalize(uLight)));
 // No fake sun disc when it is underneath the local horizon.
 float visible=step(-.012,h)*smoothstep(-.12,.06,uDaylight);
 sky+=uStarColor*visible*uStarPower*(pow(sun,260.)*.47+pow(sun,14.)*.04);
 frag=vec4(mix(vec3(.006,.010,.018),sky,atmo),1.);
}`;
function makeMesh(gl,positions,normals,colors,indices){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const data=new Float32Array(positions.length+normals.length+colors.length);for(let i=0,j=0;i<positions.length;i+=3){data[j++]=positions[i];data[j++]=positions[i+1];data[j++]=positions[i+2];data[j++]=normals[i];data[j++]=normals[i+1];data[j++]=normals[i+2];data[j++]=colors[i];data[j++]=colors[i+1];data[j++]=colors[i+2];}
const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}let ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);let idx=indices.length>65535?new Uint32Array(indices):new Uint16Array(indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);return{vao,vb,ib,count:idx.length,indexType:idx instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT};}
function makeSphere(gl,r,rows,cols,planet,withTerrain){let p=[],n=[],c=[],idx=[];for(let i=0;i<=rows;i++){const lat=-Math.PI/2+Math.PI*i/rows,cl=Math.cos(lat);for(let j=0;j<=cols;j++){const lon=j/cols*Math.PI*2,d=[Math.sin(lon)*cl,Math.sin(lat),Math.cos(lon)*cl];const e=withTerrain?field(d,planet.seed):0;const h=withTerrain?groundHeight(d,planet,e):0;p.push(d[0]*(r+h),d[1]*(r+h),d[2]*(r+h));n.push(...d);c.push(...(withTerrain?shade(d,h,planet,e):[1,1,1]));}}
for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;if(planet.type==='Shattered'&&withTerrain){const longitude=j/cols*6.28318,latitude=i/rows*3.14159;if((longitude>1.2&&longitude<2.4&&latitude>.52&&latitude<2.35)||(longitude>4.6&&longitude<5.18&&latitude<2.5))continue;}idx.push(a,a+1,b,a+1,b+1,b);}return makeMesh(gl,p,n,c,idx);}
// Smoothed heightfield normals match actual triangle slopes rather than assuming a
// perfectly spherical planet. They also eliminate apparent flickering faceted hills.
function smoothNormals(positions,indices){
 const acc=new Float64Array(positions.length);
 for(let k=0;k<indices.length;k+=3){const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
  const ab=[positions[b]-positions[a],positions[b+1]-positions[a+1],positions[b+2]-positions[a+2]],ac=[positions[c]-positions[a],positions[c+1]-positions[a+1],positions[c+2]-positions[a+2]];
  const face=V.cross(ab,ac);const center=[positions[a],positions[a+1],positions[a+2]];
  if(V.dot(face,center)<0){face[0]*=-1;face[1]*=-1;face[2]*=-1;}
  for(const j of [a,b,c]){acc[j]+=face[0];acc[j+1]+=face[1];acc[j+2]+=face[2];}
 }
 const normals=[];for(let i=0;i<acc.length;i+=3){const out=V.norm([acc[i],acc[i+1],acc[i+2]]);normals.push(...out);}
 return normals;
}
function makeShip(gl){const p=[],n=[],c=[],idx=[];function tri(a,b,d,col){const v=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),base=p.length/3;for(const vert of [a,b,d]){p.push(...vert);n.push(...v);c.push(...col);}idx.push(base,base+1,base+2);}function quad(a,b,c1,d,col){tri(a,b,c1,col);tri(a,c1,d,col);}function box(x1,y1,z1,x2,y2,z2,col){const a=[x1,y1,z1],b=[x2,y1,z1],c0=[x2,y2,z1],d=[x1,y2,z1],e=[x1,y1,z2],f=[x2,y1,z2],g=[x2,y2,z2],h=[x1,y2,z2];quad(a,b,c0,d,col);quad(f,e,h,g,col);quad(e,a,d,h,col);quad(b,f,g,c0,col);quad(d,c0,g,h,col);quad(e,f,b,a,col);}const hull=[.45,.49,.50],panel=[.28,.33,.36],edge=[.72,.73,.69],accent=[.84,.56,.28],glass=[.18,.45,.58],dark=[.10,.14,.17],engine=[.55,.22,.18];
// Larger modular expedition ship inspired by cargo and lander references. Forward is local -Z.
box(-3.0,-1.3,-14.5,3.0,1.6,13.5,hull); // central spine
box(-2.1,1.0,-9.4,2.1,3.1,-0.8,panel); // cockpit module
tri([0,1.15,-18.5],[-2.2,.2,-14.5],[2.2,.2,-14.5],edge);tri([0,2.8,-12.2],[-2.2,.2,-14.5],[0,1.15,-18.5],edge);tri([0,2.8,-12.2],[0,1.15,-18.5],[2.2,.2,-14.5],edge);tri([-2.2,.2,-14.5],[2.2,.2,-14.5],[0,-1.0,-15.2],dark);
tri([0,2.7,-12.4],[-1.65,1.35,-11.2],[1.65,1.35,-11.2],glass);tri([0,2.7,-12.4],[1.65,1.35,-11.2],[0,3.0,-8.9],glass);tri([0,2.7,-12.4],[0,3.0,-8.9],[-1.65,1.35,-11.2],glass);
box(-7.6,-1.0,-5.2,-3.4,.85,8.2,panel);box(3.4,-1.0,-5.2,7.6,.85,8.2,panel); // side cargo pods
box(-2.35,-1.4,5.0,2.35,1.7,15.5,hull); // aft cargo hold
box(-1.7,-0.5,15.5,1.7,0.9,19.5,panel); // aft extension
// docking collar and dorsal bay
box(-1.35,1.8,1.0,1.35,3.15,8.5,edge);box(-5.0,1.2,4.5,-3.8,2.2,8.8,accent);box(3.8,1.2,4.5,5.0,2.2,8.8,accent);
// wings / radiators
quad([-3.0,.1,-3.6],[-15.5,-.55,3.5],[-11.8,-.25,14.8],[-3.2,.38,8.6],hull);quad([3.0,.1,-3.6],[3.2,.38,8.6],[11.8,-.25,14.8],[15.5,-.55,3.5],hull);quad([-2.9,-.3,-3.6],[-3.3,-.7,8.4],[-11.8,-.55,14.8],[-15.5,-.95,3.5],dark);quad([2.9,-.3,-3.6],[15.5,-.95,3.5],[11.8,-.55,14.8],[3.3,-.7,8.4],dark);
// engine pods and nozzles
box(-6.8,-1.35,13.3,-3.8,.45,18.0,dark);box(3.8,-1.35,13.3,6.8,.45,18.0,dark);box(-1.55,-1.05,16.0,1.55,.35,19.2,dark);box(-6.25,-1.0,18.0,-4.35,.1,19.4,engine);box(4.35,-1.0,18.0,6.25,.1,19.4,engine);box(-1.1,-.8,19.2,1.1,.05,20.2,engine);
// landing legs / feet
for(const [x,z] of [[-5.8,8.5],[5.8,8.5],[-2.8,14.6],[2.8,14.6]]){quad([x,-1.05,z],[x+(x<0?-0.5:0.5),-4.2,z+0.6],[x+(x<0?-1.4:1.4),-4.2,z+2.0],[x+(x<0?-0.9:0.9),-1.05,z+1.5],edge);box(x+(x<0?-1.65:0.65),-4.45,z+1.4,x+(x<0?-0.15:1.85),-4.1,z+3.1,accent);} 
// Walkable rear cargo ramp. The tip meets the ground at the landed clearance.
quad([-2.7,-1.5,13.0],[2.7,-1.5,13.0],[3.15,-7.35,29.0],[-3.15,-7.35,29.0],edge);
quad([-2.9,-1.53,13.0],[-2.7,-1.53,13.0],[-3.15,-7.34,29.0],[-3.4,-7.34,29.0],accent);
quad([2.7,-1.53,13.0],[2.9,-1.53,13.0],[3.4,-7.34,29.0],[3.15,-7.34,29.0],accent);
// underside details
box(-1.8,-2.0,-2.5,1.8,-1.35,5.8,panel);box(-.75,-2.2,6.0,.75,-1.5,12.2,panel);
return makeMesh(gl,p,n,c,idx);} 
function makeRover(gl){const p=[],n=[],c=[],idx=[];function tri(a,b,d,col){const v=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),base=p.length/3;for(const vert of [a,b,d]){p.push(...vert);n.push(...v);c.push(...col);}idx.push(base,base+1,base+2);}function quad(a,b,c1,d,col){tri(a,b,c1,col);tri(a,c1,d,col);}function box(x1,y1,z1,x2,y2,z2,col){const a=[x1,y1,z1],b=[x2,y1,z1],c0=[x2,y2,z1],d=[x1,y2,z1],e=[x1,y1,z2],f=[x2,y1,z2],g=[x2,y2,z2],h=[x1,y2,z2];quad(a,b,c0,d,col);quad(f,e,h,g,col);quad(e,a,d,h,col);quad(b,f,g,c0,col);quad(d,c0,g,h,col);quad(e,f,b,a,col);}const hull=[.73,.73,.68],dark=[.14,.16,.18],accent=[.86,.59,.32],glass=[.18,.35,.42];
// Six-wheel science rover with mast and manipulator.
box(-3.0,1.0,-3.8,3.2,2.6,3.6,hull);box(-1.6,2.35,-2.0,1.4,3.2,1.0,[.58,.58,.54]);tri([0,5.5,-.9],[-.65,3.2,-.9],[.65,3.2,-.9],hull);box(-.32,3.1,-1.2,.32,5.1,-.55,dark);box(-.95,5.0,-1.65,.95,6.1,-.2,[.76,.76,.71]);box(-.55,6.1,-1.2,.55,6.9,-.35,dark);tri([3.0,2.2,.2],[5.3,1.7,.9],[4.0,1.3,1.8],dark);tri([3.0,2.2,.2],[4.0,1.3,1.8],[2.6,1.6,2.6],dark);box(2.35,1.4,2.1,2.95,2.0,3.15,accent);box(-2.45,2.55,-2.9,2.55,2.72,-2.2,glass);box(-1.7,2.55,-2.2,-.55,2.72,-1.2,glass);
for(const x of [-2.75,0,2.75]){for(const z of [-2.6,2.5]){quad([x,1.1,z],[x+(x<0?-0.9:x>0?0.9:0.0),.3,z],[x+(x<0?-1.15:x>0?1.15:0.0),-.65,z+(.15*(z>0?1:-1))],[x,0.45,z+(.25*(z>0?1:-1))],dark);const wx=x+(x<0?-1.65:x>0?1.65:0.0);box(wx-.75,-1.95,z-.9,wx+.75,-.45,z+.9,[.06,.06,.07]);box(wx-.42,-1.45,z-.45,wx+.42,-.55,z+.45,[.24,.24,.24]);}}
box(-2.0,1.35,1.2,-.1,2.0,2.9,accent);box(.3,1.35,1.2,2.1,2.0,2.9,accent);
return makeMesh(gl,p,n,c,idx);}
/* Explorer avatar: original, lightweight 3D mesh assembled once per session.
 * Lit by the same star/moon/headlamp shader as the ships and terrain.
 * Local model axes: +Y up, -Z forward. Feet y=0; eyes at y=5.25.
 * Character styling based on the user's coat / goggles / luminous magitech reference.
 */
function createExplorerMesh(gl){
 const C={suit:[.62,.69,.71],light:[.79,.84,.84],dark:[.09,.15,.20],undersuit:[.12,.20,.25],rubber:[.06,.10,.14],visor:[.12,.52,.68],trim:[.92,.46,.18],steel:[.38,.47,.52],glow:[.03,.82,1.0],glow2:[.23,.91,1.0]};
 function sculpt(){const p=[],n=[],c=[],ix=[];
  function tri(a,b,d,col){const nn=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),j=p.length/3;for(const x of [a,b,d]){p.push(...x);n.push(...nn);c.push(...col);}ix.push(j,j+1,j+2);}
  function quad(a,b,d,e,col){tri(a,b,d,col);tri(a,d,e,col);}
  function box(x1,y1,z1,x2,y2,z2,col){let a=[x1,y1,z1],b=[x2,y1,z1],d=[x2,y2,z1],e=[x1,y2,z1],f=[x1,y1,z2],g=[x2,y1,z2],h=[x1,y2,z2],i=[x1,y2,z2]; // corrected back upper-left follows
   i=[x1,y2,z2];quad(a,b,d,e,col);quad(g,f,i,h,col);quad(f,a,e,i,col);quad(b,g,h,d,col);quad(e,d,h,i,col);quad(f,g,b,a,col);}
  function tube(a,b,r0,r1,col,seg=9){const dir=V.norm(V.sub(b,a)),t=V.norm(V.cross(dir,Math.abs(dir[1])>.9?[1,0,0]:[0,1,0])),z=V.norm(V.cross(dir,t));for(let k=0;k<seg;k++){const u=k*Math.PI*2/seg,v=(k+1)*Math.PI*2/seg;const pt=(ctr,r,q)=>V.add(ctr,V.add(V.mul(t,r*Math.cos(q)),V.mul(z,r*Math.sin(q))));quad(pt(a,r0,u),pt(a,r0,v),pt(b,r1,v),pt(b,r1,u),col);}}
  function oval(center,rx,ry,rz,col,rows=6,cols=10){for(let j=0;j<rows;j++){const lat=(j/rows-.5)*Math.PI,nlat=((j+1)/rows-.5)*Math.PI;for(let k=0;k<cols;k++){const lon=k*2*Math.PI/cols,nlon=(k+1)*2*Math.PI/cols;const pt=(a,b)=>[center[0]+rx*Math.cos(a)*Math.sin(b),center[1]+ry*Math.sin(a),center[2]+rz*Math.cos(a)*Math.cos(b)];quad(pt(lat,lon),pt(lat,nlon),pt(nlat,nlon),pt(nlat,lon),col);}}}
  return {box,tube,oval,tri,quad,finish:()=>makeMesh(gl,p,n,c,ix)};
 }
 const body=sculpt();
 body.oval([0,2.08,0],.38,.62,.30,C.suit,9,12);body.box(-.31,1.65,-.34,.31,2.23,-.20,C.dark);body.box(-.38,1.62,-.29,.38,1.73,.30,C.trim);
 body.box(-.34,1.28,-.20,.34,1.60,.24,C.undersuit);body.box(-.45,2.02,.19,.45,2.64,.47,C.steel);body.box(-.35,2.12,.42,.35,2.52,.57,C.dark);
 body.oval([0,2.87,0],.33,.37,.31,C.light,8,12);body.oval([0,2.92,-.275],.257,.22,.095,C.visor,7,12);body.box(-.26,2.77,-.352,.26,2.81,-.32,C.glow2);
 body.tube([-.29,3.04,-.11],[.29,3.04,-.11],.038,.038,C.dark,7);body.tube([-.30,2.55,.18],[.30,2.55,.18],.08,.08,C.suit,8);
 body.box(-.22,1.70,-.41,.22,2.04,-.32,C.dark);body.box(-.14,1.83,-.43,.14,1.91,-.41,C.trim);
 for(const x of [-.38,.38]){body.box(x-.14,1.56,-.22,x+.14,1.80,.23,C.dark);body.box(x-.14,1.72,-.24,x+.14,1.77,-.19,C.trim);}
 const cape=sculpt();cape.box(-.35,2.03,.50,.35,2.46,.57,C.dark);cape.tube([-.25,2.43,.47],[.25,2.43,.47],.055,.055,C.trim,8);
 const legs=[];for(const side of [-1,1]){const b=sculpt();b.tube([0,-.02,0],[0,-.52,0],.202,.17,C.suit,9);b.oval([0,-.56,-.03],.19,.16,.20,C.dark);b.tube([0,-.61,0],[0,-1.16,0],.17,.145,C.light,9);b.box(-.20,-1.39,-.30,.20,-1.12,.20,C.rubber);b.box(-.19,-1.28,-.36,.19,-1.17,-.24,C.steel);b.box(-.185,-.68,-.21,.185,-.51,-.165,side===-1?C.trim:C.dark);legs.push(b.finish());}
 const arms=[];for(const side of [-1,1]){const a=sculpt();a.oval([0,-.1,0],.245,.20,.25,C.steel);a.tube([0,-.15,0],[side*.10,-.54,0],.194,.16,C.suit,9);a.tube([side*.10,-.56,0],[side*.10,-.86,0],.165,.17,C.undersuit,9);a.box(side*.10-.18,-.83,-.19,side*.10+.18,-.66,.17,C.dark);a.oval([side*.10,-1.02,0],.142,.17,.15,C.rubber);a.box(side*.10-.10,-.79,-.205,side*.10+.10,-.69,-.18,C.trim);arms.push(a.finish());}
 const staff=sculpt(); // folded sampling tool, compact rather than an oversized staff
 staff.box(-.68,.94,-.10,-.58,1.88,-.04,C.steel);staff.box(-.73,1.84,-.14,-.53,2.01,.06,C.light);staff.box(-.68,1.92,-.16,-.58,1.98,-.14,C.visor);
 const glow=sculpt();glow.box(-.10,1.87,-.44,.10,1.93,-.42,C.glow);glow.box(-.15,2.90,-.37,.15,2.94,-.34,C.glow2);
 const staffGlow=sculpt();staffGlow.box(-.67,1.92,-.18,-.59,1.97,-.15,C.glow);
 return{body:body.finish(),cape:cape.finish(),legs,arms,staff:staff.finish(),glow:glow.finish(),staffGlow:staffGlow.finish()};
}

function rand(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function starBuffer(gl,arr,usage){let vao=gl.createVertexArray();gl.bindVertexArray(vao);let vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,arr,usage);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,20,16);gl.bindVertexArray(null);return{vao,vb,count:arr.length/5};}
class Renderer{
 constructor(canvas,galaxy){
  this.canvas=canvas;this.galaxy=galaxy;
  this.gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL 2 is unavailable.');const gl=this.gl;
  this.p={mesh:program(gl,meshVS,meshFS),shell:program(gl,shellVS,atmoFS),cloud:program(gl,shellVS,cloudFS),star:program(gl,starVS,starFS),bg:program(gl,bgVS,bgFS),sun:program(gl,meshVS,sunFS),effects:program(gl,effectsVS,effectsFS)};
  this.avatarParts=createExplorerMesh(gl);this.avatarAnimation=0;this.avatarDrawCalls=0;
  this.ship=makeShip(gl);this.rover=makeRover(gl);this.sunSphere=makeSphere(gl,1,36,72,{seed:1,type:'Rocky'},false);this.sunHalo=makeSphere(gl,1.75,28,56,{seed:1,type:'Rocky'},false);
  this.meshCache=new Map();this.ringCache=new Map();this.meshBudget=48;
  this.patch=null;this.patchPlanet=null;this.patchCenter=null;this.patchDraws=0;this.lastPatchAt=0;this.lastPropsAt=0;this.props=null;this.propsPlanet=null;this.propsCenter=null;
  this.pixelRatio=Math.min(devicePixelRatio||1,1.4);this.dprTarget=this.pixelRatio;this.starPoints=0;this.renderedBodies=0;this.culledBodies=0;this.visibleSystems=0;
  // No decorative stars: every point in the night sky is an actual navigable system.
  const deep=new Float32Array(0);
  this.effectVao=gl.createVertexArray();this.effectBuffer=gl.createBuffer();gl.bindVertexArray(this.effectVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.effectBuffer);gl.bufferData(gl.ARRAY_BUFFER,8*4*3600,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,16);gl.bindVertexArray(null);this.effectCount=0;this.effectsRendered=0;
  // Fixed angular nebula haze is visual-only; it does not invent nearby navigable stars.
  this.skyClouds=[];const nebR=rand(280719),cloudColors=[[.28,.48,.82],[.53,.31,.71],[.17,.59,.61],[.54,.30,.50],[.31,.42,.74],[.25,.50,.55]];
  for(let i=0;i<cloudColors.length;i++){const a=nebR()*Math.PI*2,y=nebR()*1.6-.8,q=Math.sqrt(1-y*y),center=[Math.cos(a)*q,y,Math.sin(a)*q];
   const side=V.norm(V.cross(center,[0,1,0])),up=V.norm(V.cross(side,center));for(let j=0;j<34;j++){const x=(nebR()-.5)*.46,z=(nebR()-.5)*.28,dir=V.norm(V.add(center,V.add(V.mul(side,x),V.mul(up,z))));this.skyClouds.push({dir,size:1800+nebR()*5200,color:cloudColors[i],alpha:.045+nebR()*.075});}}
  this.deep=starBuffer(gl,deep,gl.STATIC_DRAW);this.celestial=starBuffer(gl,new Float32Array(5),gl.DYNAMIC_DRAW);this.skyVao=gl.createVertexArray();
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);this.resize();
 }
 resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;const iw=Math.max(2,Math.floor(w*this.pixelRatio)),ih=Math.max(2,Math.floor(h*this.pixelRatio));if(this.canvas.width!==iw||this.canvas.height!==ih){this.canvas.width=iw;this.canvas.height=ih;}this.gl.viewport(0,0,iw,ih);this.aspect=w/h;this.fov=Math.PI/3.12;}
 loc(p,n){return this.gl.getUniformLocation(p,n)}
 setMat(p,k,m){this.gl.uniformMatrix4fv(this.loc(p,k),false,m)}
 setVec(p,k,v){this.gl.uniform3fv(this.loc(p,k),v)}
 setFloat(p,k,f){this.gl.uniform1f(this.loc(p,k),f)}
 renderMesh(p,mesh,model){this.setMat(p,'uModel',model);this.gl.bindVertexArray(mesh.vao);this.gl.drawElements(this.gl.TRIANGLES,mesh.count,mesh.indexType,0);}
 freeMesh(mesh){if(!mesh)return;const gl=this.gl;gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.vb);gl.deleteBuffer(mesh.ib);}
 // Use one star-relative illumination solution for geometry, atmosphere, and sky.
 spinModel(body,rel,phase=0){return M.spin(rel,body.spinAxis||[0,1,0],(body.spinAngle||0)+phase);}
 localDir(body,worldDir){return V.rot(worldDir,body.spinAxis||[0,1,0],-(body.spinAngle||0));}
 updateEffects(cam,nearSystem){const gl=this.gl,list=[],limit=3500,eye=cam.eye,fwd=cam.forward;
  const add=(absolute,size,color,alpha)=>{if(list.length>=limit*8)return;const rel=V.sub(absolute,eye),distance=V.len(rel);if(distance<1||distance>2.2e9||V.dot(rel,fwd)<-size*.2)return;list.push(rel[0],rel[1],rel[2],size,color[0],color[1],color[2],alpha*this.spaceAlpha);};
  if(this.spaceAlpha<=.04){this.effectCount=0;this.effectsRendered=0;return;}
  for(const c of this.skyClouds){add(V.add(eye,V.mul(c.dir,44000)),c.size,c.color,c.alpha);}
  const systems=this.galaxy.systems;
  for(const sys of systems){const delta=V.sub(sys.position,eye),distance=V.len(delta);const near=distance<sys.maxOrbit+sys.star.radius*22;
   if(!near)continue;
   for(const belt of sys.belts){if(Math.abs(distance-belt.radius)>belt.radius*.9+220000)continue;const a=belt.phase+this.galaxy.time*Math.PI*2/belt.period,cos=Math.cos(a),sin=Math.sin(a);
    for(const rock of belt.rocks){const x=rock[0]*cos-rock[2]*sin,z=rock[0]*sin+rock[2]*cos;add([sys.position[0]+x,sys.position[1]+rock[1],sys.position[2]+z],Math.max(55,belt.radius*.0018)*rock[3],[.55,.51,.49],.50);}
   }
   for(const neb of sys.nebulae){if(distance>sys.star.radius*45)continue;for(const point of neb.cloud){add(V.add(sys.position,point.slice(0,3)),point[3],neb.color,point[4]);}}
   for(const comet of sys.comets){const dir=comet.tail,scale=Math.max(3000,sys.star.radius*.22);add(comet.position,scale*.27,[.80,.94,1],.98);
    for(let j=1;j<38;j++){const dist=j/37,drift=Math.sin(j*4.9+sys.star.radius)*scale*.055*dist;add([comet.position[0]+dir[0]*scale*j*.60+drift,comet.position[1]+dir[1]*scale*j*.60,comet.position[2]+dir[2]*scale*j*.60-drift],scale*(.48+dist*.8),[.35,.72,1],.68*(1-dist));}
   }
   if(sys.phenomenon==='pulsar') {const t=this.galaxy.time*1.7,axis=V.norm([Math.cos(t)*.32,.92,Math.sin(t)*.32]);for(const sign of [-1,1])for(let j=0;j<46;j++){const len=sys.star.radius*(1.15+j*.21),scatter=Math.sin(j*18.71+t)*sys.star.radius*.04*j/46;add([sys.position[0]+axis[0]*len*sign+scatter,sys.position[1]+axis[1]*len*sign,sys.position[2]+axis[2]*len*sign-scatter],sys.star.radius*.28,[.44,.77,1],.47*(1-j/52));}}
   if(sys.phenomenon==='supernova'){const r=sys.star.radius*(2.8+.5*Math.sin(this.galaxy.time*.08));for(let j=0;j<150;j++){const a=j*2.3999632,y=1-2*(j+.5)/150,q=Math.sqrt(1-y*y),d=r*(.7+.25*Math.sin(j*37.13));add([sys.position[0]+Math.cos(a)*q*d,sys.position[1]+y*d,sys.position[2]+Math.sin(a)*q*d],sys.star.radius*.49,j%4===0?[.49,.75,1]:[1,.47,.29],.25);}}
   for(const body of sys.planets){if(body.type!=='Shattered'||V.len(V.sub(body.position,eye))>body.radius*180)continue;for(let j=0;j<110;j++){const a=j*2.3999632,y=1-2*(j+.5)/110,q=Math.sqrt(1-y*y),r=body.radius*(1.1+(j%13)/16);const spin=this.galaxy.time*.025;add([body.position[0]+Math.cos(a+spin)*q*r,body.position[1]+y*r*.62,body.position[2]+Math.sin(a+spin)*q*r],body.radius*.10,[.66,.47,.36],.85);}}
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,this.effectBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(list),gl.DYNAMIC_DRAW);this.effectCount=list.length/8;this.effectsRendered=this.effectCount;
 }
 geometry(body,lod){const key=body.id+':'+lod;let cached=this.meshCache.get(key);if(cached){this.meshCache.delete(key);this.meshCache.set(key,cached);return cached;}
  const gl=this.gl,detail=lod===2?[80,160]:lod===1?[36,72]:[16,32];cached={world:makeSphere(gl,body.radius,...detail,body,true),atmo:null,cloud:null};
  if(lod===2&&body.kind!=='moon'&&body.landable){cached.atmo=makeSphere(gl,body.radius+Math.min(260,body.radius*.12),30,60,body,false);if(['Temperate','Ocean','Lush','Ice'].includes(body.type))cached.cloud=makeSphere(gl,body.radius+Math.min(114,body.radius*.06),28,56,body,false);}
  this.meshCache.set(key,cached);while(this.meshCache.size>this.meshBudget){const oldest=this.meshCache.keys().next().value,old=this.meshCache.get(oldest);this.freeMesh(old.world);this.freeMesh(old.atmo);this.freeMesh(old.cloud);this.meshCache.delete(oldest);}return cached;
 }
 ringMesh(body){let mesh=this.ringCache.get(body.id);if(mesh){this.ringCache.delete(body.id);this.ringCache.set(body.id,mesh);return mesh;}
  const p=[],n=[],c=[],indices=[],segments=128,bands=10,sin=Math.sin(body.ringTilt),cos=Math.cos(body.ringTilt);
  for(let j=0;j<=bands;j++){const v=j/bands,r=body.radius*(1.33+v*(body.ringWidth-1.33));for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,x=Math.cos(a)*r,z=Math.sin(a)*r;p.push(x,-z*sin,z*cos);n.push(0,cos,sin);const stripe=.46+Math.sin(v*52+body.seed)*.14+(j%3)*.045;c.push(stripe*.95,stripe*.82,stripe*.67);}}
  for(let j=0;j<bands;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  mesh=makeMesh(this.gl,p,n,c,indices);this.ringCache.set(body.id,mesh);while(this.ringCache.size>16){const oldest=this.ringCache.keys().next().value;this.freeMesh(this.ringCache.get(oldest));this.ringCache.delete(oldest);}return mesh;
 }
 // The actual stars are separated by >=100 larger-star diameters. The 2,500-point
 // deep backdrop is purely a direction-only sky texture, not navigable bodies.
 updateCelestial(cam){
  // Rate-limit sky buffers; star positions are fixed while camera orientation/position changes.
  const now=performance.now();
  if(this.lastSkyAt&&now-this.lastSkyAt<110&&V.len(V.sub(cam.eye,this.lastSkyPos))<2e7&&V.dot(cam.forward,this.lastSkyForward)>.995)return;
  this.lastSkyAt=now;this.lastSkyPos=[...cam.eye];this.lastSkyForward=[...cam.forward];
  const list=[],picks=[];
  for(const system of this.galaxy.systems){const delta=V.sub(system.position,cam.eye),distance=V.len(delta);
   if(distance<system.star.radius*70)continue;
   const unit=V.norm(delta);if(V.dot(unit,cam.forward)<-.16)continue;
   const luminous=system.star.rarity==='Legendary'?2.8:system.star.rarity==='Epic'?2.4:system.star.rarity==='Rare'?2.1:1.75;
   // The fixed-depth point is only a precision-safe impostor: its source is a real star at system.position.
   list.push(...V.mul(unit,44000),luminous,.80);picks.push({system,dir:unit});
  }
  const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.celestial.vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(list),gl.DYNAMIC_DRAW);
  this.celestial.count=list.length/5;this.starPoints=this.celestial.count;this.skyPicks=picks;
 }
 updatePatch(planet,position,alt){if(!planet||!planet.landable||alt>Math.min(1000,planet.radius*.65)){this.patchPlanet=null;return;}const dir=V.norm(V.sub(position,planet.position)),spacing=alt<110?22:alt<380?65:130;
  const local=this.localDir(planet,dir);if(this.patchPlanet===planet&&(V.len(V.sub(local,this.patchCenter))*planet.radius<spacing||performance.now()-this.lastPatchAt<125))return;this.lastPatchAt=performance.now();
  this.patchPlanet=planet;this.patchCenter=[...local];this.freeMesh(this.patch);const gl=this.gl;const east=V.norm(V.cross(Math.abs(local[1])>.94?[0,0,1]:[0,1,0],local)),north=V.norm(V.cross(local,east));
  const dirLocal=local;const grids=planet.kind==='moon'?64:96,half=Math.max(950,Math.min(2800,planet.radius*1.6)),p=[],n=[],c=[],ix=[];
  for(let iz=0;iz<=grids;iz++){const tz=iz/grids*2-1,z=Math.sign(tz)*Math.pow(Math.abs(tz),1.83)*half;for(let j=0;j<=grids;j++){const tx=j/grids*2-1,x=Math.sign(tx)*Math.pow(Math.abs(tx),1.83)*half;const d=V.norm(V.add(V.mul(local,planet.radius),V.add(V.mul(east,x),V.mul(north,z)))),e=field(d,planet.seed),h=groundHeight(d,planet,e),v=V.mul(d,planet.radius+h);p.push(...v);n.push(...d);c.push(...shade(d,h,planet,e));}}
  for(let i=0;i<grids;i++)for(let j=0;j<grids;j++){const a=i*(grids+1)+j,b=a+grids+1;ix.push(a,a+1,b,a+1,b+1,b);}this.patch=makeMesh(gl,p,smoothNormals(p,ix),c,ix);this.patchDraws++;
 }
 updateProps(planet,position,alt){if(!planet||!planet.landable||alt>Math.min(310,planet.radius*.45)){this.propsPlanet=null;return;}const dir=this.localDir(planet,V.norm(V.sub(position,planet.position)));if(this.propsPlanet===planet&&(V.len(V.sub(dir,this.propsCenter))*planet.radius<90||performance.now()-this.lastPropsAt<300))return;this.lastPropsAt=performance.now();
  this.propsPlanet=planet;this.propsCenter=[...dir];this.freeMesh(this.props);const east=V.norm(V.cross(Math.abs(dir[1])>.92?[0,0,1]:[0,1,0],dir)),north=V.norm(V.cross(dir,east));const p=[],n=[],c=[],indices=[];
  const triangle=(a,b,d,color)=>{const normal=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),base=p.length/3;for(const point of [a,b,d]){p.push(...point);n.push(...normal);c.push(...color);}indices.push(base,base+1,base+2);};
  const rng=rand(planet.seed^Math.floor(dir[0]*5000)^Math.floor(dir[2]*5000)*29);
  for(let i=0;i<95;i++){const radius=25+Math.sqrt(rng())*Math.min(510,planet.radius*.55),angle=rng()*Math.PI*2,rough=V.norm(V.add(V.mul(dir,planet.radius),V.add(V.mul(east,Math.cos(angle)*radius),V.mul(north,Math.sin(angle)*radius))));const e=field(rough,planet.seed),height=groundHeight(rough,planet,e);
   if(['Temperate','Lush','Ocean'].includes(planet.type)&&height<1)continue;
   const base=V.mul(rough,planet.radius+height+.3),size=(.55+rng()*1.7)*(i%7===0?2.2:1),right=V.norm(V.cross(Math.abs(rough[1])>.95?[0,0,1]:[0,1,0],rough)),ahead=V.norm(V.cross(rough,right));
   const ax=V.add(base,V.mul(right,size*2)),bx=V.add(base,V.mul(right,-size*2)),cx=V.add(base,V.mul(ahead,size*2)),dx=V.add(base,V.mul(ahead,-size*2));let tip=V.add(base,V.mul(rough,size*(2.5+rng()*2)));const tree=(planet.type==='Temperate'||planet.type==='Lush')&&rng()>.33;
   if(tree){const trunk=V.add(base,V.mul(rough,3+size*1.4)),brown=[.24,.23,.17];triangle(ax,bx,trunk,brown);triangle(cx,dx,trunk,brown);tip=V.add(base,V.mul(rough,size*7));const mid=V.add(base,V.mul(rough,size*3.4)),f=V.add(mid,V.mul(right,size*3.7)),g=V.add(mid,V.mul(right,-size*3.7)),h=V.add(mid,V.mul(ahead,size*3.7)),j=V.add(mid,V.mul(ahead,-size*3.7)),leaf=planet.type==='Lush'?[.20,.39,.25]:[.31,.37,.25];triangle(f,h,tip,leaf);triangle(h,g,tip,leaf);triangle(g,j,tip,leaf);triangle(j,f,tip,leaf);}
   else{const rocky=planet.type==='Volcanic'?[.34,.21,.17]:planet.type==='Ice'?[.61,.72,.75]:planet.type==='Desert'?[.58,.43,.29]:[.39,.43,.40];triangle(ax,cx,tip,rocky);triangle(cx,bx,tip,V.mix(rocky,[.16,.18,.20],.24));triangle(bx,dx,tip,rocky);triangle(dx,ax,tip,V.mix(rocky,[.14,.19,.16],.14));}
  }this.props=makeMesh(this.gl,p,n,c,indices);
 }
 render(state){const gl=this.gl,cam=state.camera,near=state.nearest,alt=state.altitude,origin=cam.eye,viewer=state.viewerPosition||state.position,shipPos=state.shipPosition||state.position,lightPos=state.lightPosition||shipPos;
  this.updatePatch(near,viewer,alt);this.updateProps(near,viewer,alt);this.updateCelestial(cam);
  const nearSystem=near?this.galaxy.byId.get(near.systemId):this.galaxy.nearestSystem(origin);
  const radial=near?V.norm(V.sub(cam.eye,near.position)):[0,1,0];
  const lightingSystem=near?this.galaxy.byId.get(near.systemId):this.galaxy.nearestSystem(origin);
  const lighting=near&&lightingSystem?evaluateLighting(near,lightingSystem,this.galaxy,origin):{sunDir:[-.66,.75,.43],starColor:[1,1,1],starPower:1,moonPower:0,bounceDirection:[0,1,0],bounceColor:[.75,.82,.9],ambient:.008,occluder:null};
  const dayDot=V.dot(radial,lighting.sunDir);this.daylightLabel=near?(dayDot>.15?'DAYLIGHT':dayDot>-.16?'TWILIGHT':lighting.moonPower>.018?'MOONLIT NIGHT':'NIGHT'):'VACUUM';
  const atmo=near&&near.kind!=='moon'&&near.landable?V.clamp((680-alt)/510,0,1):0;
  const sky=near?.sky||[.13,.27,.38];const daytime=V.clamp((dayDot+.16)/.35,0,1);
  const fogColor=V.mix([.002,.004,.01],sky,atmo*daytime);
  const fogDensity=atmo*.00054;
  const view=M.look([0,0,0],V.sub(cam.target,origin),cam.up),proj=M.perspective(this.fov,this.aspect,.35,2e8),vp=M.mul(proj,view),sunVP=M.mul(M.perspective(this.fov,this.aspect,100,3e9),view);
  const light=lighting.sunDir;
  const applyLight=(prog,body=near)=>{let l=lighting;
   if(body&&body!==near){const parentSystem=this.galaxy.byId.get(body.systemId);if(parentSystem)l=evaluateLighting(body,parentSystem,this.galaxy,origin);}
   this.setVec(prog,'uLight',l.sunDir);this.setVec(prog,'uStarColor',l.starColor);this.setFloat(prog,'uStarPower',l.starPower);
   this.setFloat(prog,'uAmbient',l.ambient);this.setVec(prog,'uBounceDir',l.bounceDirection);
   this.setVec(prog,'uBounceColor',l.bounceColor);this.setFloat(prog,'uBouncePower',l.moonPower);
   this.setVec(prog,'uHeadlampPos',V.sub(lightPos,origin));this.setVec(prog,'uHeadlampDir',state.shipForward);
   this.setFloat(prog,'uHeadlampPower',state.headlights?2.2:0);
   const occ=l.occluder;this.gl.uniform4fv(this.loc(prog,'uOccluder'),occ?[...V.sub(occ.center,origin),occ.radius]:[0,0,0,0]);
  };
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.006,.012,.023,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  let p=this.p.bg;gl.useProgram(p);gl.bindVertexArray(this.skyVao);this.setVec(p,'uForward',cam.forward);this.setVec(p,'uRight',cam.right);this.setVec(p,'uUp',cam.up);this.setVec(p,'uRadial',radial);this.setVec(p,'uSkyColor',sky);this.setVec(p,'uLight',light);this.setVec(p,'uStarColor',lighting.starColor);this.setFloat(p,'uStarPower',lighting.starPower);this.setFloat(p,'uDaylight',dayDot);this.setFloat(p,'uMoonGlow',lighting.moonPower);this.setFloat(p,'uSunAngular',0.04);this.setFloat(p,'uAspect',this.aspect);this.setFloat(p,'uTan',Math.tan(this.fov/2));this.setFloat(p,'uAltitude',alt);gl.drawArrays(gl.TRIANGLES,0,3);
  p=this.p.star;gl.useProgram(p);this.setMat(p,'uVP',M.mul(M.perspective(this.fov,this.aspect,1,100000),view));this.setFloat(p,'uDpr',this.pixelRatio);this.setFloat(p,'uAlpha',1-atmo*daytime*.97);this.setFloat(p,'uTime',performance.now()*.001);this.setVec(p,'uOffset',[0,0,0]);gl.bindVertexArray(this.deep.vao);gl.drawArrays(gl.POINTS,0,this.deep.count);gl.bindVertexArray(this.celestial.vao);gl.drawArrays(gl.POINTS,0,this.celestial.count);
  this.spaceAlpha=1-atmo*daytime*.97;this.updateEffects(cam,nearSystem);
  p=this.p.effects;gl.useProgram(p);this.setMat(p,'uVP',sunVP);this.setFloat(p,'uFocal',this.canvas.height*.7);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindVertexArray(this.effectVao);gl.drawArrays(gl.POINTS,0,this.effectCount);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  // Massive suns use a separate far-space projection. Their coordinates are relative
  // to the camera so Float32 matrices retain local precision in billion-unit sectors.
  this.visibleSystems=0;for(const sys of this.galaxy.nearbySystems(origin,2e9)){const rel=V.sub(sys.position,origin),dist=V.len(rel);if(dist>Math.min(2e9,sys.star.radius*110)||V.dot(V.norm(rel),cam.forward)<-.2)continue;const pixels=sys.star.radius/Math.max(dist-sys.star.radius,1)*this.canvas.height;if(pixels<1.5)continue;
   p=this.p.sun;gl.useProgram(p);this.setMat(p,'uViewProj',sunVP);this.setVec(p,'uTint',sys.star.tint);this.setFloat(p,'uTime',this.galaxy.time);const model=M.scaleTranslate(rel,sys.star.radius);this.renderMesh(p,this.sunSphere,model);
   p=this.p.shell;gl.useProgram(p);this.setMat(p,'uVP',sunVP);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',sys.star.tint);this.setFloat(p,'uOpacity',.20);this.renderMesh(p,this.sunHalo,model);this.visibleSystems++;
  }
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
  p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p);this.setVec(p,'uFogColor',fogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',0);
  const rendered=[],rings=[];this.renderedBodies=0;this.culledBodies=0;
  // Star-system broad-phase culling, then view-frustum + projected-size LOD.
  for(const sys of this.galaxy.nearbySystems(origin,1600000)){const starDist=V.len(V.sub(sys.position,origin));if(starDist>sys.maxOrbit+1600000)continue;
   for(const body of sys.bodies){const rel=V.sub(body.position,origin),dist=V.len(rel),facing=V.dot(V.norm(rel),cam.forward),angular=body.radius/Math.max(1,dist-body.radius),pixels=angular*this.canvas.height;
    if(dist>1600000||facing<-.26&&dist>body.radius*1.8||pixels<1.55){this.culledBodies++;continue;}
    const lod=pixels>180?2:pixels>30?1:0;
    const geometry=this.geometry(body,lod);applyLight(p,body);const nearPatch=body===this.patchPlanet&&alt<340; if(!nearPatch)this.renderMesh(p,geometry.world,this.spinModel(body,rel));this.renderedBodies++;rendered.push({body,rel,dist,geometry,lod});if(body.ring&&dist<body.radius*130&&pixels>4)rings.push({body,rel});
   }
  }
  if(this.patchPlanet&&this.patch&&alt<340){applyLight(p,this.patchPlanet);this.renderMesh(p,this.patch,this.spinModel(this.patchPlanet,V.sub(this.patchPlanet.position,origin)));}
  if(this.propsPlanet&&this.props){applyLight(p,this.propsPlanet);this.renderMesh(p,this.props,this.spinModel(this.propsPlanet,V.sub(this.propsPlanet.position,origin)));}
  // Rings are actual tilted annular triangle meshes, not decorative orbit lines.
  gl.depthMask(false);for(const obj of rings){p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,obj.body);this.setVec(p,'uFogColor',fogColor);this.setFloat(p,'uFogDensity',0);this.setFloat(p,'uShip',0);this.renderMesh(p,this.ringMesh(obj.body),M.translate(obj.rel));}
  for(const obj of rendered){if(!obj.geometry.atmo||obj.dist<obj.body.radius+150||obj.dist>obj.body.radius+11000)continue;
   p=this.p.shell;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',obj.body.sky);const objSun=this.galaxy.byId.get(obj.body.systemId);const objLit=evaluateLighting(obj.body,objSun,this.galaxy,origin);this.setVec(p,'uLight',objLit.sunDir);this.setVec(p,'uStarColor',objLit.starColor);this.setFloat(p,'uStarPower',objLit.starPower);this.setFloat(p,'uOpacity',.9);this.renderMesh(p,obj.geometry.atmo,this.spinModel(obj.body,obj.rel));
   if(obj.geometry.cloud&&obj.dist>obj.body.radius+18){p=this.p.cloud;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',[.70,.75,.74]);this.setVec(p,'uLight',objLit.sunDir);this.setVec(p,'uStarColor',objLit.starColor);this.setFloat(p,'uStarPower',objLit.starPower);this.setFloat(p,'uOpacity',1);this.renderMesh(p,obj.geometry.cloud,this.spinModel(obj.body,obj.rel,this.galaxy.time*.0008));}
  }
  gl.depthMask(true);p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p);this.setVec(p,'uFogColor',fogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
  const right=V.norm(V.cross(state.shipForward,state.shipUp)),model=M.basis(right,state.shipUp,state.shipForward,V.sub(shipPos,origin));this.renderMesh(p,this.ship,model);
  if(state.roverPosition&&state.roverForward&&state.roverUp){const rr=V.norm(V.cross(state.roverForward,state.roverUp)),rModel=M.basis(rr,state.roverUp,state.roverForward,V.sub(state.roverPosition,origin));this.renderMesh(p,this.rover,rModel);}
  // Real 3D EVA character. These meshes are small, instanced only for the
  // player, and share existing star/moon lighting and depth occlusion.
  if(state.avatarBase&&state.avatarUp&&state.avatarForward){
   p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);
   this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',fogColor);
   this.setFloat(p,'uFogDensity',fogDensity);
   const worldUp=V.norm(state.avatarUp),front=V.norm(V.sub(state.avatarForward,V.mul(worldUp,V.dot(state.avatarForward,worldUp))));
   const worldForward=V.len(front)>.1?front:cam.forward;
   let worldRight=V.norm(V.cross(worldForward,worldUp));
   const walk=state.avatarWalking?1:0;
   if(walk)this.avatarAnimation+=(state.avatarSpeed||1)*state.avatarDelta*8.2;
   const phase=this.avatarAnimation,gait=Math.sin(phase)*.43*walk;
   const bob=walk?.027*(1-Math.cos(2*phase)) : 0;
   const bodyPos=V.add(state.avatarBase,V.mul(worldUp,bob));
   const basis=M.basis(worldRight,worldUp,worldForward,V.sub(bodyPos,origin));
   const parts=this.avatarParts;
   this.setFloat(p,'uShip',1);
   this.renderMesh(p,parts.body,basis);this.renderMesh(p,parts.cape,basis);
   const bone=(x,y,z,angle)=>M.mul(basis,M.mul(M.translate([x,y,z]),M.spin([0,0,0],[1,0,0],angle)));
   this.renderMesh(p,parts.legs[0],bone(-.18,1.37,0,gait));
   this.renderMesh(p,parts.legs[1],bone(.18,1.37,0,-gait));
   this.renderMesh(p,parts.arms[0],bone(-.42,2.42,0,-gait*.50));
   this.renderMesh(p,parts.arms[1],bone(.42,2.42,0,gait*.50));
   this.renderMesh(p,parts.staff,M.mul(basis,M.spin([0,0,0],[1,0,0],-.018*Math.sin(phase))));
   this.setFloat(p,'uShip',2); // Only the cyan devices are emissive at night.
   this.renderMesh(p,parts.glow,basis);
   this.renderMesh(p,parts.staffGlow,M.mul(basis,M.spin([0,0,0],[1,0,0],-.018*Math.sin(phase))));
   this.avatarDrawCalls=9;
  }else this.avatarDrawCalls=0;
  gl.bindVertexArray(null);
 }
 dispose(){for(const obj of this.meshCache.values()){this.freeMesh(obj.world);this.freeMesh(obj.atmo);this.freeMesh(obj.cloud);}for(const m of this.ringCache.values())this.freeMesh(m);this.freeMesh(this.sunSphere);this.freeMesh(this.sunHalo);this.freeMesh(this.ship);this.freeMesh(this.rover);for(const part of [this.avatarParts.body,this.avatarParts.cape,...this.avatarParts.legs,...this.avatarParts.arms,this.avatarParts.staff,this.avatarParts.glow,this.avatarParts.staffGlow])this.freeMesh(part);this.gl.deleteBuffer(this.effectBuffer);this.gl.deleteVertexArray(this.effectVao);for(const p of Object.values(this.p))this.gl.deleteProgram(p);}
}
root.Starfall3D={Renderer,V,M,groundHeight,field,evaluateLighting};
})(globalThis);
