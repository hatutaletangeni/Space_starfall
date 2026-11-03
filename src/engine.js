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
const ST=root.StarfallStableTerrain; if(!ST)throw Error('Stable terrain layer not loaded');
const BIOMES=root.StarfallBiomes; if(!BIOMES)throw Error('Biome layer not loaded');
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
function shade(n,h,planet,value,biome){if(planet.landable)return BIOMES.color(planet,n,h,value??field(n,planet.seed),biome);const t=planet.type;const e=value??field(n,planet.seed),sea=t==='Ocean'?.56:t==='Temperate'?.47:t==='Lush'?.48:.19;
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
 const nightGlow=.008;const color=root.StarfallStellarSpectraCW02?.displayColor(sys.star)||sys.star.tint||[1,1,1];
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
// LW04: animated sea normals and wave displacement live in the same 3D scene.
const waterVS=`#version 300 es
precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;
uniform mat4 uViewProj,uModel;uniform float uTime,uAmplitude;
out vec3 vNormal,vPosition;out float vFoam;
void main(){
 float wave=sin(aPos.x*.39+aPos.z*.21+uTime*1.8)*.58+
            sin(aPos.z*.72-aPos.x*.14-uTime*2.7)*.30+
            sin(aPos.y*.34+aPos.x*.55+uTime*.9)*.12;
 vec3 local=aPos+aNormal*(wave*uAmplitude);
 vec4 world=uModel*vec4(local,1.);
 vNormal=normalize(mat3(uModel)*aNormal);
 vPosition=world.xyz;vFoam=abs(wave);
 gl_Position=uViewProj*world;
}`;
const waterFS=`#version 300 es
precision highp float;in vec3 vNormal,vPosition;in float vFoam;
uniform vec3 uEye,uSun,uSunColor;uniform float uTime,uUnderwater,uWind;
out vec4 frag;
void main(){
 vec3 n=normalize(vNormal);
 vec3 detail=vec3(sin(vPosition.x*.24+uTime*.87),0.,cos(vPosition.z*.23-uTime*1.13));
 n=normalize(n+detail*(.007+.0007*uWind));
 vec3 view=normalize(uEye-vPosition);
 float fresnel=pow(1.-clamp(abs(dot(n,view)),0.,1.),3.0);
 float light=max(.05,dot(n,normalize(uSun)));
 float spec=pow(max(0.,dot(reflect(-normalize(uSun),n),view)),85.);
 vec3 deep=vec3(.025,.11,.18),shallow=vec3(.055,.29,.38);
 vec3 water=mix(deep,shallow,light);
 water+=uSunColor*spec*.78;
 water=mix(water,vec3(.49,.69,.72),fresnel*.53+vFoam*.025);
 if(uUnderwater>.5)water=mix(water,vec3(.013,.15,.22),.35);
 frag=vec4(clamp(water,0.,1.),uUnderwater>.5?.60:mix(.78,.95,fresnel));
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
// Tier-specific interior rooms use shared mesh buffers and planet-fixed transforms.
// Local X is right, Y up, Z into the ruined structure; floors and walls are solid
// at the gameplay collision layer (StarfallInteriors.canStand). No per-frame meshes.
function makeInteriorMesh(gl,tier){
 const I=root.StarfallInteriors;if(!I)return null;
 const layout=I.layout({id:'ruin-layout',bodyId:'layout',tier});
 const p=[],n=[],c=[],idx=[];
 function tri(a,b,d,color){const normal=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),base=p.length/3;for(const v of [a,b,d]){p.push(...v);n.push(...normal);c.push(...color);}idx.push(base,base+1,base+2);}
 function quad(a,b,c0,d,color){tri(a,b,c0,color);tri(a,c0,d,color);}
 function box(x0,y0,z0,x1,y1,z1,color){const a=[x0,y0,z0],b=[x1,y0,z0],c0=[x1,y1,z0],d=[x0,y1,z0],e=[x0,y0,z1],f=[x1,y0,z1],g=[x1,y1,z1],h=[x0,y1,z1];quad(a,b,c0,d,color);quad(f,e,h,g,color);quad(e,a,d,h,color);quad(b,f,g,c0,color);quad(d,c0,g,h,color);quad(e,f,b,a,color);}
 const stone=tier<2?[.39,.35,.28]:tier<4?[.34,.40,.43]:[.29,.37,.46],floor=tier<2?[.47,.39,.30]:[.35,.38,.40],accent=tier<2?[.65,.53,.33]:tier<4?[.36,.66,.65]:[.41,.77,.9],y=layout.floorY,roof=layout.roofY,w=.7;
 for(const room of layout.rooms){
  box(room.x0,y-.45,room.z0,room.x1,y-.04,room.z1,floor);
  box(room.x0,y,room.z0,room.x0+w,roof,room.z1,stone);
  box(room.x1-w,y,room.z0,room.x1,roof,room.z1,stone);
  // Front entrance and inner passages have carved openings.
  box(room.x0,y,room.z0, -2.5,roof,room.z0+w,stone);
  box(2.5,y,room.z0,room.x1,roof,room.z0+w,stone);
  box(-2.5,roof-2,room.z0,2.5,roof,room.z0+w,stone);
  if(room.id==='archive')box(room.x0,y,room.z1-w,room.x1,roof,room.z1,stone);
  else if(!layout.passages.length)box(room.x0,y,room.z1-w,room.x1,roof,room.z1,stone);
  else{box(room.x0,y,room.z1-w,-2.5,roof,room.z1,stone);box(2.5,y,room.z1-w,room.x1,roof,room.z1,stone);box(-2.5,roof-2,room.z1-w,2.5,roof,room.z1,stone);}
  box(room.x0,roof,room.z0,room.x1,roof+.5,room.z1,[.22,.25,.29]);
  for(const x of [room.x0+1.4,room.x1-1.4])for(const z of [room.z0+2,room.z1-2])box(x-.35,y,z-.35,x+.35,roof-.5,z+.35,stone);
 }
 for(const hall of layout.passages){box(hall.x0,y-.43,hall.z0,hall.x1,y-.03,hall.z1,floor);box(hall.x0,y,hall.z0,hall.x0+w,roof,hall.z1,stone);box(hall.x1-w,y,hall.z0,hall.x1,roof,hall.z1,stone);box(hall.x0,roof,hall.z0,hall.x1,roof+.5,hall.z1,[.22,.25,.29]);}
 // Artifact plinths and luminous seams: inspection uses real character proximity.
 for(const [i,a] of layout.artifacts.entries()){
  box(a.x-1.0,y,a.z-1.0,a.x+1.0,y+1.1,a.z+1.0,stone);
  box(a.x-.55,y+1.1,a.z-.55,a.x+.55,y+2.05+(tier>3?.4:0),a.z+.55,accent);
  box(a.x-.75,y+1.1,a.z-.75,a.x+.75,y+1.19,a.z+.75,accent);
 }
 return makeMesh(gl,p,n,c,idx);
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
// A separate four-wheel expedition truck, not a scaled science rover.
function makeTruck(gl){const p=[],n=[],c=[],idx=[];function tri(a,b,d,col){const normal=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),k=p.length/3;for(const v of [a,b,d]){p.push(...v);n.push(...normal);c.push(...col);}idx.push(k,k+1,k+2);}function quad(a,b,d,e,col){tri(a,b,d,col);tri(a,d,e,col);}function box(x,y,z,w,h,l,col){const a=[x,y,z],b=[x+w,y,z],c0=[x+w,y+h,z],d=[x,y+h,z],e=[x,y,z+l],f=[x+w,y,z+l],g=[x+w,y+h,z+l],h0=[x,y+h,z+l];quad(a,b,c0,d,col);quad(f,e,h0,g,col);quad(e,a,d,h0,col);quad(b,f,g,c0,col);quad(d,c0,g,h0,col);quad(e,f,b,a,col);}const white=[.67,.72,.73],alloy=[.24,.28,.31],dark=[.09,.11,.13],glass=[.13,.37,.42],orange=[.95,.52,.20],light=[.89,.85,.62];
 box(-4.7,.6,-5.2,9.4,2.3,14.2,alloy);box(-4.3,2.4,-5.0,8.6,4.8,7.8,white);box(-4.0,4.0,-5.12,8,2.65,.25,glass);box(-4.55,3.8,-5.15,.4,3.3,7.8,white);box(4.14,3.8,-5.15,.4,3.3,7.8,white);box(-4.55,5.9,2.35,9.1,.35,1.2,alloy);box(-4.55,2.95,3.0,9.1,1.0,6.0,white);box(-4.2,3.9,3.5,8.4,.32,4.8,alloy);box(-5.2,1.5,-5.4,10.4,.65,1.2,dark);box(-5.25,2.5,-5.5,1.5,.55,.15,light);box(3.75,2.5,-5.5,1.5,.55,.15,light);
 for(const z of [-3.4,5.9])for(const x of [-5.5,4.5]){box(x,0,z,1.3,3.8,3.2,dark);box(x+0.15,.45,z+.25,1.05,2.9,2.7,[.20,.23,.25]);box(x-.1,1.6,z+.85,1.5,.38,1.4,alloy);}box(-.25,7.2,-1.5,.5,1.2,.5,alloy);box(-1.2,8.25,-1.9,2.4,.5,1.35,orange);box(-3.5,7.2,4.2,7,.32,3.3,[.12,.21,.29]);box(-2.8,3.9,8.7,5.6,.6,.5,orange);box(-1,5.4,6.4,2,1.0,1.5,alloy);return makeMesh(gl,p,n,c,idx);}
function makeSmallSatellite(gl){const p=[],n=[],c=[],ix=[];function tri(a,b,d,col){const v=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),k=p.length/3;for(const q of [a,b,d]){p.push(...q);n.push(...v);c.push(...col);}ix.push(k,k+1,k+2);}function quad(a,b,d,e,col){tri(a,b,d,col);tri(a,d,e,col);}function box(x,y,z,w,h,l,col){const a=[x,y,z],b=[x+w,y,z],d=[x+w,y+h,z],e=[x,y+h,z],f=[x,y,z+l],g=[x+w,y,z+l],h0=[x+w,y+h,z+l],q=[x,y+h,z+l];quad(a,b,d,e,col);quad(g,f,q,h0,col);quad(f,a,e,q,col);quad(b,g,h0,d,col);quad(e,d,h0,q,col);quad(f,g,b,a,col);}box(-1.2,-1.2,-1.2,2.4,2.4,2.4,[.75,.72,.62]);box(-7.5,-.15,-.14,6,.25,2.4,[.09,.31,.53]);box(1.5,-.15,-.14,6,.25,2.4,[.09,.31,.53]);box(-.13,1,0,.27,3,.27,[.56,.58,.61]);return makeMesh(gl,p,n,c,ix);}
function makeRocketMesh(gl){const p=[],n=[],c=[],ix=[];function tri(a,b,d,col){const v=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),k=p.length/3;for(const q of [a,b,d]){p.push(...q);n.push(...v);c.push(...col);}ix.push(k,k+1,k+2);}const rad=2.6,h=33;for(let i=0;i<12;i++){let u=i*Math.PI/6,v=(i+1)*Math.PI/6,a=[rad*Math.cos(u),0,rad*Math.sin(u)],b=[rad*Math.cos(v),0,rad*Math.sin(v)],c0=[a[0],h,a[2]],d=[b[0],h,b[2]];tri(a,b,c0,[.81,.80,.77]);tri(b,d,c0,[.74,.76,.79]);tri(c0,d,[0,h+7,0],[.90,.43,.18]);}return makeMesh(gl,p,n,c,ix);}
// Shared low-poly archaeological silhouettes: one GPU mesh per tier, not one per ruin.
// The same star/moon lighting, depth testing and planet-fixed transform are used.
function makeRuinMesh(gl,tier){const pp=[],nn=[],cc=[],ix=[];
 const stone=[.47,.42,.35],ash=[.22,.24,.26],bronze=[.54,.39,.26],steel=[.37,.48,.52],cyan=[.23,.68,.72],gold=[.74,.62,.39];
 function tri(a,b,c,col){const v=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),j=pp.length/3;for(const w of [a,b,c]){pp.push(...w);nn.push(...v);cc.push(...col);}ix.push(j,j+1,j+2);}
 function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color);}
 function box(x,y,z,X,Y,Z,col){const a=[x,y,z],b=[X,y,z],c=[X,Y,z],d=[x,Y,z],e=[x,y,Z],f=[X,y,Z],g=[X,Y,Z],h=[x,Y,Z];quad(a,b,c,d,col);quad(f,e,h,g,col);quad(e,a,d,h,col);quad(b,f,g,c,col);quad(d,c,g,h,col);quad(e,f,b,a,col);}
 function column(x,z,r,h,color){box(x-r,0,z-r,x+r,h,z+r,color);}
 // Floor remains fixed to the same planet-fixed center; footprint is decorative.
 if(tier===0){for(let k=0;k<10;k++){const a=k*2*Math.PI/10;column(Math.cos(a)*5.1,Math.sin(a)*5.1,.65,.6,stone);}box(-1.8,0,-.65,2.3,.42,.65,bronze);box(3.1,0,2,4.1,1.3,4,ash);}
 if(tier===1){box(-9,0,-7,9,.65,7,stone);for(const [x,z,h] of [[-6,-3,8],[-6,3,5],[0,-4,10],[5,-3,7],[5,3,8]]){column(x,z,1.2,h,stone);box(x-1.6,h,z-1.4,x+1.6,h+.7,z+1.4,bronze);}}
 if(tier===2){box(-11,0,-9,11,.6,9,ash);for(const x of [-9,-4,4,9]){column(x,-7,1.1,8,stone);column(x,7,1.1,6,stone);}box(-2,0,-7,2,13,-5,bronze);box(-7,4,-7,7,5.2,-5,stone);box(4,5,5,7,6.2,8,bronze);}
 if(tier===3){box(-15,0,-11,15,.7,11,steel);for(const x of [-12,-3,7]){column(x,-5,1.8,14,steel);box(x-2,14,-7,x+2,15.4,-3,bronze);}box(-7,0,3,1,8,10,ash);box(7,0,2,13,11,10,ash);box(-15,8,-2,15,9,0,bronze);}
 if(tier===4){box(-20,0,-17,20,.65,17,ash);for(const x of [-15,0,15]){column(x,-7,3,x===0?33:21,steel);box(x-3.5,x===0?32:20,-11,x+3.5,x===0?34:22,-3,cyan);}for(const x of [-18,18]){column(x,8,2.2,17,bronze);}box(-18,16,7,18,18,10,gold);}
 if(tier===5){box(-22,0,-17,22,.7,17,ash);for(const sign of [-1,1])for(let k=0;k<8;k++){const a=(k/8)*Math.PI*.9;const x=Math.cos(a)*24*sign,y=6+Math.sin(a)*42;box(x-2,y-2,-3,x+2,y+2,3,k%3===0?cyan:steel);}box(-7,0,-4,7,4,4,gold);for(const x of [-13,13])column(x,0,2.4,18,bronze);}
 return makeMesh(gl,pp,nn,cc,ix);
}
// STARFALL 6H: eight reusable low-poly ecological silhouettes. Geometry is
// generated once; planet-fixed origins and sampled terrain remain authoritative.
function makeEcologyMesh(gl,kind){const pp=[],nn=[],cc=[],ix=[];
 const soil=[.39,.31,.25],bone=[.64,.62,.47],shell=[.23,.43,.41],skin=[.30,.56,.42],wing=[.37,.70,.70],spore=[.71,.54,.76];
 function tri(a,b,c,color){const normal=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),index=pp.length/3;for(const p of [a,b,c]){pp.push(...p);nn.push(...normal);cc.push(...color);}ix.push(index,index+1,index+2);}
 function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color);}
 function box(x,y,z,X,Y,Z,col){const a=[x,y,z],b=[X,y,z],c=[X,Y,z],d=[x,Y,z],e=[x,y,Z],f=[X,y,Z],g=[X,Y,Z],h=[x,Y,Z];quad(a,b,c,d,col);quad(f,e,h,g,col);quad(e,a,d,h,col);quad(b,f,g,c,col);quad(d,c,g,h,col);quad(e,f,b,a,col);}
 function stem(x,z,h,col){box(x-.10,0,z-.10,x+.10,h,z+.10,col);}
 if(kind==='microbial'){for(let i=0;i<9;i++){const a=i*2.4,x=Math.cos(a)*1.8,z=Math.sin(a)*1.8;box(x-.5,0,z-.5,x+.5,.18+.16*(i%3),z+.5,i%3?skin:shell);}}
 else if(kind==='spores'){for(let i=0;i<7;i++){const a=i*2.3,x=Math.sin(a)*1.4,z=Math.cos(a)*1.5;stem(x,z,1.3+.7*(i%3),skin);box(x-.45,1.1+.7*(i%3),z-.45,x+.45,1.35+.7*(i%3),z+.45,spore);}}
 else if(kind==='grazer'){box(-1.4,1.0,-2.2,1.4,2.25,2.2,skin);box(-.9,1.65,-3.0,.9,2.45,-1.7,shell);for(const x of [-1,1])for(const z of [-1.45,1.45])box(x-.3,0,z-.3,x+.3,1.35,z+.3,shell);stem(-.45,-2.75,3.25,bone);stem(.45,-2.75,3.25,bone);}
 else if(kind==='crawler'){box(-.95,.45,-1.5,.95,1.4,1.5,shell);for(const x of [-1,1])for(const z of [-1.2,-.4,.4,1.2]){const side=x*1.8;tri([x*.75,1.1,z],[side,.18,z+.35],[side,.18,z-.3],skin);}box(-.7,1.3,-1.0,.7,1.62,-.1,spore);}
 else if(kind==='flier'){box(-.5,-.3,-1.7,.5,.3,1.5,shell);tri([-.15,.0,-.5],[-5.0,.02,1.8],[-.25,.02,1.2],wing);tri([.15,.0,-.5],[.25,.02,1.2],[5.0,.02,1.8],wing);tri([-.2,.05,.6],[-3.1,.03,2.0],[-.1,.0,1.1],spore);tri([.2,.05,.6],[.1,.0,1.1],[3.1,.03,2.0],spore);}
 else if(kind==='tracks'){for(let i=0;i<6;i++){const z=i*1.2-3;box(-1.4+(i%2)*1.5,0,z-.4,-.65+(i%2)*1.5,.06,z+.4,soil);}}
 else if(kind==='nest'){for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*2.15,z=Math.sin(a)*2.15;box(x-.52,0,z-.35,x+.52,.55,z+.35,soil);}box(-.6,0,-.6,.6,.24,.6,spore);}
 else if(kind==='fossil'){for(let j=0;j<5;j++){const z=j*1.2-2.5;box(-2.1,.07,z-.13,2.1,.24,z+.13,bone);}box(-.23,.12,-3.4,.23,.35,3.5,bone);}
 return makeMesh(gl,pp,nn,cc,ix);
}
/* Explorer avatar: original, lightweight 3D mesh assembled once per session.
 * Lit by the same star/moon/headlamp shader as the ships and terrain.
 * Local model axes: +Y up, -Z forward. Feet y=0; eyes at y=5.25.
 * Character styling based on the user's coat / goggles / luminous magitech reference.
 */
// Update 5A: seven GPU-resident low-poly outpost meshes; only close surface objects are drawn.
function makeInfrastructureMesh(gl,kind){const pp=[],nn=[],cc=[],ix=[];
 function triangle(a,b,c,color){const norm=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),j=pp.length/3;for(const v of [a,b,c]){pp.push(...v);nn.push(...norm);cc.push(...color);}ix.push(j,j+1,j+2);}
 function quad(a,b,c,d,col){triangle(a,b,c,col);triangle(a,c,d,col);}
 function box(x,y,z,X,Y,Z,col){const a=[x,y,z],b=[X,y,z],c=[X,Y,z],d=[x,Y,z],e=[x,y,Z],f=[X,y,Z],g=[X,Y,Z],h=[x,Y,Z];quad(a,b,c,d,col);quad(f,e,h,g,col);quad(e,a,d,h,col);quad(b,f,g,c,col);quad(d,c,g,h,col);quad(e,f,b,a,col);}
 const dark=[.12,.17,.21],metal=[.42,.48,.50],white=[.66,.68,.67],gold=[.84,.57,.26],solar=[.09,.25,.46],cyan=[.14,.62,.69];
 const base=kind==='hab'?5:kind==='lab'?4.3:kind==='solar'?3.8:kind==='storage'?3.5:kind==='foundation'?4:kind==='antenna'?2.5:kind==='battery'?3:1.6;
 box(-base,.0,-base,base,.45,base,dark);box(-base+.15,.42,-base+.15,base-.15,.65,base-.15,metal);
 if(kind==='foundation'){for(const x of [-3,3])for(const z of [-3,3])box(x-.4,-1,z-.4,x+.4,.2,z+.4,metal);}
 if(kind==='hab'||kind==='lab'){box(-base*.83,.64,-base*.78,base*.83,kind==='hab'?4.8:4.2,base*.78,white);box(-1,.65,-base*.81,1,2.8,-base*.78,dark);for(const x of [-base*.5,base*.5])box(x-.35,2.8,-base*.85,x+.35,3.4,-base*.76,cyan);box(-base*.7,kind==='hab'?4.8:4.2,-base*.68,base*.7,kind==='hab'?5.2:4.6,base*.68,dark);}
 if(kind==='storage'){for(const x of [-2.1,1])box(x,.65,-2.3,x+1.3,3.1,2.3,metal);}
 if(kind==='battery'){box(-2,.65,-2,2,3.35,2,white);for(let x=-1.7;x<2;x+=1.1)box(x,1.1,-2.05,x+.50,3.08,-1.98,cyan);}
 if(kind==='solar'){box(-.27,.6,-.25,.27,2.3,.25,metal);for(const side of [-1,1]){const x=side*3;box(x-2.9,2.3,-2.2,x+2.9,2.53,2.2,solar);for(let k=-2;k<=2;k++)box(x+k*.83-.02,2.51,-2.19,x+k*.83+.02,2.6,2.19,metal);} }
 if(kind==='antenna'){box(-.4,.6,-.4,.4,9,.4,metal);for(const y of [3.5,6.5]){box(-2,y,-.15,2,y+.15,.15,metal);box(-.15,y,-2,.15,y+.15,2,metal);}box(-.75,9,-.75,.75,10.1,.75,cyan);}
 if(kind==='connector'){box(-.9,.65,-.9,.9,1.5,.9,metal);box(-.6,1.5,-.6,.6,1.8,.6,gold);}
 return makeMesh(gl,pp,nn,cc,ix);
}
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
  this.p={mesh:program(gl,meshVS,meshFS),shell:program(gl,shellVS,atmoFS),cloud:program(gl,shellVS,cloudFS),star:program(gl,starVS,starFS),bg:program(gl,bgVS,bgFS),sun:program(gl,meshVS,sunFS),effects:program(gl,effectsVS,effectsFS),water:program(gl,waterVS,waterFS)};
  this.avatarParts=createExplorerMesh(gl);this.avatarAnimation=0;this.avatarDrawCalls=0;
  this.ship=makeShip(gl);this.rover=makeRover(gl);this.truck=makeTruck(gl);this.satellite=makeSmallSatellite(gl);this.rocket=makeRocketMesh(gl);this.ecologyMeshes=new Map();for(const k of ['microbial','spores','grazer','crawler','flier','tracks','nest','fossil'])this.ecologyMeshes.set(k,makeEcologyMesh(gl,k));this.interiorMeshes=new Map();for(let tier=0;tier<=5;tier++)this.interiorMeshes.set(tier,makeInteriorMesh(gl,tier));this.caveMeshes=new Map();this.caveEntranceMeshes=new Map();this.ruins=new Map();for(let tier=0;tier<=5;tier++)this.ruins.set(tier,makeRuinMesh(gl,tier));this.infrastructure=new Map();for(const kind of ["foundation","hab","lab","battery","solar","storage","antenna","connector"])this.infrastructure.set(kind,makeInfrastructureMesh(gl,kind));this.sunSphere=makeSphere(gl,1,36,72,{seed:1,type:'Rocky'},false);this.sunHalo=makeSphere(gl,1.75,28,56,{seed:1,type:'Rocky'},false);
  this.meshCache=new Map();this.ringCache=new Map();this.debrisMeshes=[];this.debrisRendered=0;this.closestDebris=null;this.meshBudget=48;
  this.patch=null;this.patchPlanet=null;this.patchCenter=null;this.patchDraws=0;this.lastPatchAt=0;this.lastPropsAt=0;this.props=null;this.propsPlanet=null;this.propsCenter=null;
  // Planet-fixed tile meshes are immutable. Rendering resolution never changes
  // collision height, which is always sampled from the seeded continuous field.
  this.terrainTiles=new Map();this.activeTerrain=[];this.terrainKeyBody=null;
  this.terrainCacheHits=0;this.terrainCacheMisses=0;this.terrainCacheEvictions=0;this.terrainPropCount=0;
  this.terrainGridSegments=24;this.terrainCacheBudget=110;this.terrainDebugEnabled=false;
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
 renderMesh(p,mesh,model){this.setMat(p,'uModel',model);this.gl.bindVertexArray(mesh.vao);this.gl.drawElements(this.gl.TRIANGLES,mesh.count,mesh.indexType,0);this.frameDrawCalls++;}
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
    for(const rock of belt.rocks){const x=rock[0]*cos-rock[2]*sin,z=rock[0]*sin+rock[2]*cos;const position=[sys.position[0]+x,sys.position[1]+rock[1],sys.position[2]+z];if(V.len(V.sub(position,eye))>18000)add(position,Math.max(55,belt.radius*.0018)*rock[3],[.55,.51,.49],.50);}
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
 renderWeather(state,eye,vp,renderHeight){
  const w=state.weather,W=root.StarfallMeteorologyLW03,body=state.nearest;
  if(!W||!w||!body?.landable||state.interior||state.altitude>170)return;
  if(!(w.precipitationKgM2S>0||w.regime==='dust'||w.regime==='CO2-frost'))return;
  const center=state.viewerPosition||state.position,up=V.norm(V.sub(center,body.position)),
   right=V.norm(V.cross(Math.abs(up[1])>.93?[0,0,1]:[0,1,0],up)),forward=V.norm(V.cross(up,right));
  const count=w.regime==='dust'?110:Math.min(150,Math.ceil(22+w.precipitationKgM2S*18000)),verts=[];
  const snow=w.regime==='snow'||w.regime==='CO2-frost',dust=w.regime==='dust',methane=w.sourceSpecies==='CH4';
  const color=dust?[.64,.48,.31]:snow?[.80,.87,.93]:methane?[.60,.73,.86]:[.65,.77,.89];
  const t=this.galaxy.time,wind=w.windMS*.012;
  for(let i=0;i<count;i++){
   const seed=(i*1664525+1013904223)>>>0,rand=x=>((Math.imul(seed^(x*1013904223),2654435761)>>>0)/4294967296);
   const x=(rand(1)-.5)*95+Math.sin(t*.05+i)*wind;
   const z=(rand(2)-.5)*95+Math.cos(t*.05+i*.32)*wind;
   const fall=dust?1.0:snow?1.4:8,cy=((rand(3)*35-t*fall)%35+35)%35-5;
   const pos=V.add(center,V.add(V.mul(right,x),V.add(V.mul(forward,z),V.mul(up,cy))));
   const radial=V.norm(V.sub(pos,body.position)),base=body.radius+groundHeight(V.rot(radial,body.spinAxis||[0,1,0],-(body.spinAngle||0)),body);
   if(V.len(V.sub(pos,body.position))<base+.3)continue;
   const rel=V.sub(pos,eye);
   if(V.dot(rel,state.camera.forward)<-3||V.len(rel)>150)continue;
   verts.push(rel[0],rel[1],rel[2],dust?1.2:snow?.55:.22,color[0],color[1],color[2],dust?.26:.53);
  }
  // An illuminated flash is permitted only when charged, condensate-driven
  // convection is present. No atmospheric lightning in vacuum.
  if(w.charge>.22&&Math.floor(t/19)%9===0){
   const base=V.add(center,V.add(V.mul(forward,48),V.mul(up,20)));
   for(let j=0;j<18;j++){
    const rel=V.sub(V.add(base,V.add(V.mul(up,-j*1.2),V.mul(right,Math.sin(j*2.8)*.7))),eye);
    verts.push(rel[0],rel[1],rel[2],.7,.86,.91,1,.65*w.charge);
   }
  }
  if(!verts.length)return;
  const gl=this.gl,p=this.p.effects;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setFloat(p,'uFocal',renderHeight*.7);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.effectBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);
  gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.bindVertexArray(this.effectVao);
  gl.drawArrays(gl.POINTS,0,verts.length/8);this.frameDrawCalls++;this.effectsRendered+=verts.length/8;
  gl.depthMask(true);
 }
 renderGeothermal(body,eye,vp,h){
  const G=root.StarfallGeothermalLW01;if(!G||!body?.landable)return;
  const values=[],pressure=root.StarfallFieldScience?.profile(body,this.galaxy.seed).pressurePa??0,
    gravity=Math.max(.25,(body.gravity||1)*9.80665);
  for(const site of G.sources(body,this.galaxy.seed)){
   const d=V.norm(V.rot(site.direction,body.spinAxis||[0,1,0],body.spinAngle||0));
   const base=V.add(body.position,V.mul(d,body.radius+groundHeight(site.direction,body)+.2));
   if(V.len(V.sub(base,eye))>2500)continue;
   const e=G.pulse(site,this.galaxy.time,pressure,gravity);
   if(!e.active||e.intensity<.03){
    const rel=V.sub(base,eye),color=site.kind==='cryovolcano'?[.54,.63,.74]:[.40,.31,.23];
    values.push(rel[0],rel[1],rel[2],.85,color[0],color[1],color[2],.35);
    continue;
   }
   const height=Math.max(1.5,Math.min(35,e.plumeHeightM/1000*9));
   const c=site.kind==='cryovolcano'?[.7,.85,1]:site.kind==='geyser'?[.73,.85,.94]:
    site.kind==='fumarole'?[.73,.78,.77]:site.kind==='mud-pot'?[.50,.44,.35]:site.kind==='explosive-volcano'?[.48,.43,.4]:[1,.4,.16];
   const right=V.norm(V.cross(Math.abs(d[1])>.85?[0,0,1]:[0,1,0],d)),fwd=V.norm(V.cross(d,right));
   for(let i=0;i<25;i++){
    const u=(i+.5)/25,angle=i*2.399963+site.epochOffsetS*.017,spread=(.04+.7*u)*Math.sqrt(u);
    const point=V.add(base,V.add(V.mul(d,height*u),V.add(V.mul(right,Math.cos(angle)*spread),V.mul(fwd,Math.sin(angle)*spread))));
    const rel=V.sub(point,eye);
    values.push(rel[0],rel[1],rel[2],.2+1.8*u,c[0],c[1],c[2],(.15+.5*e.intensity)*(1-u));
    if(values.length>=1600)break;
   }
   // Ground-hugging, solidifying lava trajectories are drawn along the existing
   // authoritative surface; no fake solid tiles or collision height changes.
   if(e.lavaMassFlowKgS>0&&values.length<1500){
    const flowReach=Math.min(24,2+Math.sqrt(e.lavaMassFlowKgS)*.045);
    const cooled=e.intensity>0 ? .38 : .2;
    for(let j=1;j<=24;j++){
     const fraction=j/24,angle=site.epochOffsetS*.011+j*.035;
     const tangent=V.norm(V.add(V.mul(right,Math.cos(angle)),V.mul(fwd,Math.sin(angle))));
     const localDir=V.norm(V.add(site.direction,V.mul(V.rot(tangent,body.spinAxis||[0,1,0],-(body.spinAngle||0)),flowReach*fraction/body.radius)));
     const worldRadial=V.norm(V.rot(localDir,body.spinAxis||[0,1,0],body.spinAngle||0));
     const actual=V.add(body.position,V.mul(worldRadial,body.radius+groundHeight(localDir,body)+.24));
     const rel=V.sub(actual,eye),hot=Math.max(0,1-fraction*.9);
     values.push(rel[0],rel[1],rel[2],.9+1.2*(1-fraction),
      .35+hot*.65,.10+hot*.22,.045,Math.max(0,.6*e.intensity*cooled));
    }
   }
  }
  if(!values.length)return;
  const gl=this.gl,p=this.p.effects;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setFloat(p,'uFocal',h*.7);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.effectBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.DYNAMIC_DRAW);
  gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.bindVertexArray(this.effectVao);
  gl.drawArrays(gl.POINTS,0,values.length/8);this.frameDrawCalls++;this.effectsRendered+=values.length/8;gl.depthMask(true);
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
 // Vertex normals are derived from the immutable analytic surface, so shared
 // edges agree even if adjacent tiles were created in different frames.
 terrainNormal(body,d){const tangent=V.norm(V.cross(Math.abs(d[1])>.95?[0,0,1]:[0,1,0],d)),bitangent=V.norm(V.cross(d,tangent)),eps=.7/Math.max(body.radius,50);
  const a=V.norm(V.add(d,V.mul(tangent,eps))),b=V.norm(V.sub(d,V.mul(tangent,eps))),c=V.norm(V.add(d,V.mul(bitangent,eps))),e=V.norm(V.sub(d,V.mul(bitangent,eps)));
  const ground=x=>V.mul(x,body.radius+groundHeight(x,body));
  let n=V.norm(V.cross(V.sub(ground(a),ground(b)),V.sub(ground(c),ground(e))));return V.dot(n,d)<0?V.mul(n,-1):n;
 }
 buildTerrainTile(body,tile){const positions=[],normals=[],colors=[],indices=[],N=this.terrainGridSegments;
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const d=ST.vertexDirection(tile,i,j,N),a=ST.sample(body,d,groundHeight,field,shade);
   positions.push(...V.mul(d,body.radius+a.height));normals.push(...this.terrainNormal(body,d));colors.push(...a.color);
  }
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
   const a=j*(N+1)+i,b=a+N+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  const ground=makeMesh(this.gl,positions,normals,colors,indices);
  // Permanent tile-anchored geological decorations; no player-coordinate RNG.
  // Decorative geometry has NO collision mesh, preserving 6A ground contacts.
  const p=[],n=[],c=[],idx=[];const random=rand((Math.imul(body.seed,2654435761)^Math.imul(tile.ix,19349663)^Math.imul(tile.iy,83492791)^Math.imul(tile.face+1,73856093))>>>0);
  const triangle=(a,b,d,color)=>{const normal=V.norm(V.cross(V.sub(b,a),V.sub(d,a))),q=p.length/3;for(const point of [a,b,d]){p.push(...point);n.push(...normal);c.push(...color);}idx.push(q,q+1,q+2);};
  const twist=(point,right,front,x,z)=>V.add(point,V.add(V.mul(right,x),V.mul(front,z)));
  const makeSpire=(base,radial,right,front,height,width,color,faces=5)=>{const tip=V.add(base,V.mul(radial,height));for(let j=0;j<faces;j++){const aa=j*Math.PI*2/faces,bb=(j+1)*Math.PI*2/faces;
   const from=twist(base,right,front,Math.cos(aa)*width,Math.sin(aa)*width),to=twist(base,right,front,Math.cos(bb)*width,Math.sin(bb)*width);triangle(from,to,tip,V.mix(color,[.14,.18,.19],(j%3)*.10));}};
  const stone=(base,radial,right,front,size,color)=>{const top=V.add(base,V.mul(radial,size*.9));makeSpire(base,radial,right,front,size*.9,size*1.35,color,5);};
  let propCount=0;const count=body.type==='Lush'?19:body.type==='Temperate'?15:body.type==='Ocean'?10:body.type==='Rocky'?12:13;
  for(let k=0;k<count;k++){
   const d=ST.faceDirection(tile.face,tile.u0+tile.step*(.06+random()*.88),tile.v0+tile.step*(.06+random()*.88));
   const sample=ST.sample(body,d,groundHeight,field,shade);if(sample.material==='water')continue;
   const biome=BIOMES.classify(body,d,sample.height,sample.field),style=BIOMES.decoration(biome,random);if(style==='none')continue;
   const radial=d,base=V.mul(d,body.radius+sample.height+.12),right=V.norm(V.cross(Math.abs(d[1])>.95?[0,0,1]:[0,1,0],d)),front=V.norm(V.cross(d,right)),size=.65+random()*1.45,colors=BIOMES.color(body,d,sample.height,sample.field,biome);
   // Retain open walkable terrain: props are small and purely visual.
   if(style==='flora'){
    const stem=V.add(base,V.mul(d,size*2.4));makeSpire(base,d,right,front,size*2.4,size*.25,[.29,.24,.18],4);
    makeSpire(stem,d,right,front,size*(3.4+random()*1.4),size*2.35,V.mix(colors,[.17,.38,.22],.46),5);
    if(random()>.55)makeSpire(stem,d,right,front,size*2.2,size*2.6,V.mix(colors,[.29,.49,.27],.42),5);
   }else if(style==='scrub'){
    for(let j=0;j<3;j++){const b=twist(base,right,front,(random()-.5)*size*2,(random()-.5)*size*2);makeSpire(b,d,right,front,size*(1.2+random()),size*.75,V.mix(colors,[.20,.37,.24],.5),4);}
   }else if(style==='fungal'){
    const stem=V.add(base,V.mul(d,size*2.1));makeSpire(base,d,right,front,size*2.1,size*.35,[.45,.43,.36],5);makeSpire(stem,d,right,front,size*1.6,size*2.1,[.38,.31,.54],6);
   }else if(style==='ice'||style==='crystal'){
    for(let j=0;j<3;j++){const b=twist(base,right,front,(random()-.5)*size*2,(random()-.5)*size*2);makeSpire(b,d,right,front,size*(1.2+random()*3),size*(.4+random()*.55),style==='ice'?[.60,.79,.87]:[.28,.66,.73],5);}
   }else if(style==='column'){
    makeSpire(base,d,right,front,size*(2.5+random()*3),size*(.68+random()*.4),V.mix(colors,[.3,.32,.33],.38),6);
   }else if(style==='vent'){
    makeSpire(base,d,right,front,size*2.2,size*1.2,[.21,.19,.18],6);
    makeSpire(V.add(base,V.mul(d,size*2.0)),d,right,front,size*1.1,size*.42,[.78,.38,.12],4);
   }else if(style==='dune'||style==='sediment'){
    const side=twist(base,right,front,size*2.9,0),other=twist(base,right,front,-size*2.9,0),frontEdge=twist(base,right,front,0,size*1.7),crest=V.add(base,V.mul(d,size*.65));triangle(side,other,crest,colors);triangle(other,frontEdge,crest,V.mix(colors,[.65,.46,.25],.3));
   }else stone(base,d,right,front,size,colors);
   propCount++;
  }
  const ocean=root.StarfallWaterMeshLW04?.geometry(body,tile,N,field,groundHeight);
  const water=ocean?makeMesh(this.gl,ocean.positions,ocean.normals,ocean.colors,ocean.indices):null;
  return{ground,water,props:idx.length?makeMesh(this.gl,p,n,c,idx):null,propCount,key:tile.key,descriptor:tile};
 }
 updatePatch(planet,position,alt){
  // Old per-frame recentering caused resampling triangles and visible 'breathing'.
  // These face-local tiles have stable boundaries, samples, and material colors.
  this.activeTerrain=[];
  if(!planet||!planet.landable||alt>Math.min(1000,planet.radius*.65)){this.patchPlanet=null;return;}
  const local=this.localDir(planet,V.norm(V.sub(position,planet.position)));
  if(this.terrainKeyBody!==planet.id){for(const tile of this.terrainTiles.values()){this.freeMesh(tile.ground);this.freeMesh(tile.water);this.freeMesh(tile.props);}this.terrainTiles.clear();this.terrainKeyBody=planet.id;}
  this.patchPlanet=planet;this.patchCenter=local;
  const requested=ST.visibleTiles(planet,local,3),needed=new Set(requested.map(t=>t.key));
  let built=0;for(const desc of requested){let tile=this.terrainTiles.get(desc.key);
   if(tile){this.terrainCacheHits++;this.terrainTiles.delete(desc.key);this.terrainTiles.set(desc.key,tile);}else if(built<4){tile=this.buildTerrainTile(planet,desc);this.terrainTiles.set(desc.key,tile);this.patchDraws++;this.terrainCacheMisses++;built++;}
   if(tile)this.activeTerrain.push(tile);
  }
  while(this.terrainTiles.size>this.terrainCacheBudget){const first=[...this.terrainTiles.keys()].find(k=>!needed.has(k));if(!first)break;const old=this.terrainTiles.get(first);this.freeMesh(old.ground);this.freeMesh(old.water);this.freeMesh(old.props);this.terrainTiles.delete(first);this.terrainCacheEvictions++;}
 }
 terrainDiagnostics(){const d=this.patchCenter&&this.patchPlanet?ST.descriptorForDirection(this.patchPlanet,this.patchCenter):null;
  return{body:this.patchPlanet?.id||null,face:d?.face??null,tile:d?.key||null,resolution:this.terrainGridSegments,cached:this.terrainTiles.size,active:this.activeTerrain.length,hits:this.terrainCacheHits,misses:this.terrainCacheMisses,evictions:this.terrainCacheEvictions,built:this.patchDraws,props:this.activeTerrain.reduce((sum,t)=>sum+(t.propCount||0),0),biome:this.patchCenter&&this.patchPlanet?BIOMES.classify(this.patchPlanet,this.patchCenter,groundHeight(this.patchCenter,this.patchPlanet),field(this.patchCenter,this.patchPlanet.seed)).name:null,collision:'continuous deterministic planet-fixed sample',render:'fixed cubemap tiles / no moving tessellation',sampleHeight:this.patchCenter&&this.patchPlanet?groundHeight(this.patchCenter,this.patchPlanet):null,seamError:(()=>{if(!d)return null;const neighbor=d.ix+1<d.n?ST.tileDescriptor(this.patchPlanet,d.face,d.ix+1,d.iy):null;if(!neighbor)return null;let max=0;for(let j=0;j<=this.terrainGridSegments;j+=6){const a=ST.vertexDirection(d,this.terrainGridSegments,j,this.terrainGridSegments),b=ST.vertexDirection(neighbor,0,j,this.terrainGridSegments);max=Math.max(max,Math.abs(groundHeight(a,this.patchPlanet)-groundHeight(b,this.patchPlanet)));}return max;})()};
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
 render(state){if(!this.captureSize)this.latestFrameState=state;const renderW=this.captureSize?.width||this.canvas.width,renderH=this.captureSize?.height||this.canvas.height;this.frameDrawCalls=0;const gl=this.gl,cam=state.camera,near=state.nearest,alt=state.altitude,origin=cam.eye,viewer=state.viewerPosition||state.position,shipPos=state.shipPosition||state.position,lightPos=state.lightPosition||shipPos;
  if(state.interior?.kind!=='cave')this.updatePatch(near,viewer,alt);this.propsPlanet=null;this.updateCelestial(cam);
  const nearSystem=near?this.galaxy.byId.get(near.systemId):this.galaxy.nearestSystem(origin);
  const radial=near?V.norm(V.sub(cam.eye,near.position)):[0,1,0];
  const lightingSystem=near?this.galaxy.byId.get(near.systemId):this.galaxy.nearestSystem(origin);
  const lighting=near&&lightingSystem?evaluateLighting(near,lightingSystem,this.galaxy,origin):{sunDir:[-.66,.75,.43],starColor:[1,1,1],starPower:1,moonPower:0,bounceDirection:[0,1,0],bounceColor:[.75,.82,.9],ambient:.008,occluder:null};
  const dayDot=V.dot(radial,lighting.sunDir);this.daylightLabel=near?(dayDot>.15?'DAYLIGHT':dayDot>-.16?'TWILIGHT':lighting.moonPower>.018?'MOONLIT NIGHT':'NIGHT'):'VACUUM';
  const nearColumn=near?.landable?root.StarfallMeteorologyLW03?.base(near,this.galaxy.seed):null;
  const atmo=near&&near.kind!=='moon'&&near.landable&&!nearColumn?.vacuum?V.clamp((680-alt)/510,0,1):0;
  const optics=near&&near.kind!=='moon'&&near.landable?root.StarfallAtmosphereCW05?.optical(near,this.galaxy.seed):null;const sky=optics&&!optics.vacuum?optics.color:(near?.sky||[.13,.27,.38]);const daytime=V.clamp((dayDot+.16)/.35,0,1);
  const biomeSample=near?.landable&&this.patchCenter&&this.patchPlanet===near?BIOMES.classify(near,this.patchCenter,groundHeight(this.patchCenter,near),field(this.patchCenter,near.seed)):null;
  const biomePalette=biomeSample?BIOMES.PAL[biomeSample.name][0]:sky;
  const fogColor=V.mix(V.mix([.002,.004,.01],sky,atmo*daytime),biomePalette,atmo*daytime*.12);
  const weather=state.weather,weatherOpacity=weather&&atmo>0?Math.min(.75,1-weather.visibility):0;
  const fogDensity=state.swimming?.055:atmo*.00054*(1+weatherOpacity*5);
  const eventFogColor=state.swimming?[.014,.155,.24]:(weatherOpacity?V.mix(fogColor,weather.tint,weatherOpacity*.55):fogColor);
  const view=M.look([0,0,0],V.sub(cam.target,origin),cam.up),proj=M.perspective(this.fov,this.aspect,.35,2e8),vp=M.mul(proj,view),sunVP=M.mul(M.perspective(this.fov,this.aspect,100,3e9),view);
  const light=lighting.sunDir;
  const applyLight=(prog,body=near)=>{let l=lighting;
   if(body&&body!==near){const parentSystem=this.galaxy.byId.get(body.systemId);if(parentSystem)l=evaluateLighting(body,parentSystem,this.galaxy,origin);}
   this.setVec(prog,'uLight',l.sunDir);this.setVec(prog,'uStarColor',l.starColor);this.setFloat(prog,'uStarPower',l.starPower);
   this.setFloat(prog,'uAmbient',l.ambient);this.setVec(prog,'uBounceDir',l.bounceDirection);
   this.setVec(prog,'uBounceColor',l.bounceColor);this.setFloat(prog,'uBouncePower',l.moonPower);
   this.setVec(prog,'uHeadlampPos',V.sub(lightPos,origin));this.setVec(prog,'uHeadlampDir',state.headlampForward||state.shipForward);
   this.setFloat(prog,'uHeadlampPower',state.headlights?2.2:0);
   const occ=l.occluder;this.gl.uniform4fv(this.loc(prog,'uOccluder'),occ?[...V.sub(occ.center,origin),occ.radius]:[0,0,0,0]);
  };
  gl.viewport(0,0,renderW,renderH);gl.clearColor(.006,.012,.023,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  let p=this.p.bg;gl.useProgram(p);gl.bindVertexArray(this.skyVao);this.setVec(p,'uForward',cam.forward);this.setVec(p,'uRight',cam.right);this.setVec(p,'uUp',cam.up);this.setVec(p,'uRadial',radial);this.setVec(p,'uSkyColor',sky);this.setVec(p,'uLight',light);this.setVec(p,'uStarColor',lighting.starColor);this.setFloat(p,'uStarPower',lighting.starPower);this.setFloat(p,'uDaylight',dayDot);this.setFloat(p,'uMoonGlow',lighting.moonPower);this.setFloat(p,'uSunAngular',0.04);this.setFloat(p,'uAspect',this.aspect);this.setFloat(p,'uTan',Math.tan(this.fov/2));this.setFloat(p,'uAltitude',alt);gl.drawArrays(gl.TRIANGLES,0,3);this.frameDrawCalls++;
  p=this.p.star;gl.useProgram(p);this.setMat(p,'uVP',M.mul(M.perspective(this.fov,this.aspect,1,100000),view));this.setFloat(p,'uDpr',this.pixelRatio);this.setFloat(p,'uAlpha',1-atmo*daytime*.97);this.setFloat(p,'uTime',performance.now()*.001);this.setVec(p,'uOffset',[0,0,0]);gl.bindVertexArray(this.deep.vao);gl.drawArrays(gl.POINTS,0,this.deep.count);this.frameDrawCalls++;gl.bindVertexArray(this.celestial.vao);gl.drawArrays(gl.POINTS,0,this.celestial.count);this.frameDrawCalls++;
  this.spaceAlpha=1-atmo*daytime*.97;this.updateEffects(cam,nearSystem);
  p=this.p.effects;gl.useProgram(p);this.setMat(p,'uVP',sunVP);this.setFloat(p,'uFocal',renderH*.7);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindVertexArray(this.effectVao);gl.drawArrays(gl.POINTS,0,this.effectCount);this.frameDrawCalls++;gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  // Massive suns use a separate far-space projection. Their coordinates are relative
  // to the camera so Float32 matrices retain local precision in billion-unit sectors.
  this.visibleSystems=0;for(const sys of this.galaxy.nearbySystems(origin,2e9)){const rel=V.sub(sys.position,origin),dist=V.len(rel);if(dist>Math.min(2e9,sys.star.radius*110)||V.dot(V.norm(rel),cam.forward)<-.2)continue;const pixels=sys.star.radius/Math.max(dist-sys.star.radius,1)*renderH;if(pixels<1.5)continue;
   p=this.p.sun;gl.useProgram(p);this.setMat(p,'uViewProj',sunVP);this.setVec(p,'uTint',root.StarfallStellarSpectraCW02?.displayColor(sys.star)||sys.star.tint);this.setFloat(p,'uTime',this.galaxy.time);const model=M.scaleTranslate(rel,sys.star.radius);this.renderMesh(p,this.sunSphere,model);
   p=this.p.shell;gl.useProgram(p);this.setMat(p,'uVP',sunVP);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',root.StarfallStellarSpectraCW02?.displayColor(sys.star)||sys.star.tint);this.setFloat(p,'uOpacity',.20);this.renderMesh(p,this.sunHalo,model);this.visibleSystems++;
  }
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
  p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',0);
  const rendered=[],rings=[];this.renderedBodies=0;this.culledBodies=0;
  // Star-system broad-phase culling, then view-frustum + projected-size LOD.
  for(const sys of this.galaxy.nearbySystems(origin,1600000)){const starDist=V.len(V.sub(sys.position,origin));if(starDist>sys.maxOrbit+1600000)continue;
   for(const body of sys.bodies){const rel=V.sub(body.position,origin),dist=V.len(rel),facing=V.dot(V.norm(rel),cam.forward),angular=body.radius/Math.max(1,dist-body.radius),pixels=angular*renderH;
    if(dist>1600000||facing<-.26&&dist>body.radius*1.8||pixels<1.55){this.culledBodies++;continue;}
    const lod=pixels>180?2:pixels>30?1:0;
    const geometry=this.geometry(body,lod);applyLight(p,body);const nearPatch=body===this.patchPlanet&&alt<340;const caveOcclusion=state.interior?.kind==='cave'&&body===near;if(!nearPatch&&!caveOcclusion)this.renderMesh(p,geometry.world,this.spinModel(body,rel));this.renderedBodies++;rendered.push({body,rel,dist,geometry,lod});if(body.ring&&dist<body.radius*130&&pixels>4)rings.push({body,rel});
   }
  }
  if(this.patchPlanet&&alt<340&&state.interior?.kind!=='cave'){applyLight(p,this.patchPlanet);const model=this.spinModel(this.patchPlanet,V.sub(this.patchPlanet.position,origin));
    for(const tile of this.activeTerrain){this.renderMesh(p,tile.ground,model);if(tile.props)this.renderMesh(p,tile.props,model);}
     if(root.StarfallHydrosphereLW04?.material(this.patchPlanet,this.galaxy.seed)){
      const H=root.StarfallHydrosphereLW04,pw=this.p.water,local=this.patchCenter,
       surface=H.sample(this.patchPlanet,local,groundHeight(local,this.patchPlanet),this.galaxy.time,this.galaxy.seed),
       wet=!!state.swimming,
       wind=state.weather?.windMS||5;
      gl.useProgram(pw);this.setMat(pw,'uViewProj',vp);this.setMat(pw,'uModel',model);
      this.setFloat(pw,'uTime',this.galaxy.time);this.setFloat(pw,'uAmplitude',Math.min(.012,.002+wind*.00012));
      this.setVec(pw,'uEye',[0,0,0]);this.setVec(pw,'uSun',lighting.sunDir);
      this.setVec(pw,'uSunColor',lighting.starColor);this.setFloat(pw,'uUnderwater',wet?1:0);
      this.setFloat(pw,'uWind',wind);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      for(const tile of this.activeTerrain)if(tile.water)this.renderMesh(pw,tile.water,model);
      gl.depthMask(true);p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);
      applyLight(p,this.patchPlanet);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
     }

  }
  // LW02: render surface-anchored 3D cave mouths, without altering original terrain.
  if(near?.landable&&state.interior?.kind!=='cave'&&root.StarfallGeologyLW02&&root.StarfallCaveMeshLW02&&root.StarfallInteriors){
   const geology=root.StarfallGeologyLW02,spin=near.spinAngle||0,axis=near.spinAxis||[0,1,0];
   for(const cave of geology.sites(near,this.galaxy.seed)){
    const up=V.norm(V.rot(cave.local,axis,spin)),point=V.add(near.position,V.mul(up,near.radius+groundHeight(cave.local,near)+.2)),
     relative=V.sub(point,origin);
    if(V.len(relative)>550||V.dot(V.norm(relative),cam.forward)<-.4)continue;
    let mesh=this.caveEntranceMeshes.get(cave.id);
    if(!mesh){const g=root.StarfallCaveMeshLW02.entranceGeometry(cave);
     mesh=makeMesh(gl,g.positions,g.normals,g.colors,g.indices);this.caveEntranceMeshes.set(cave.id,mesh);
     while(this.caveEntranceMeshes.size>12){const first=this.caveEntranceMeshes.keys().next().value;
      this.freeMesh(this.caveEntranceMeshes.get(first));this.caveEntranceMeshes.delete(first);}
    }
    const basis=root.StarfallInteriors.basis(cave.local),forward=V.norm(V.rot(V.mul(basis.forward,-1),axis,spin)),
      right=V.norm(V.cross(forward,up));
    p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);
    this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
    this.renderMesh(p,mesh,M.basis(right,up,forward,relative));
   }
  }
  // LW05 physical irregular rocks: one small shared set of meshes, <=55 nearby actors.
  if(root.StarfallDebrisLW05&&!state.interior){
   if(!this.debrisMeshes.length)for(let i=0;i<8;i++){
    const g=root.StarfallDebrisLW05.irregularMesh(i);
    this.debrisMeshes.push(makeMesh(gl,g.positions,g.normals,g.colors,g.indices));
   }
   const rockSet=root.StarfallDebrisLW05.nearby(this.galaxy,origin,this.galaxy.time,18000);
   this.debrisRendered=rockSet.length;
   this.closestDebris=root.StarfallDebrisLW05.proximity(rockSet,viewer,4);
   if(rockSet.length){
    p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);
    applyLight(p,near);this.setVec(p,'uFogColor',[.005,.007,.01]);this.setFloat(p,'uFogDensity',0);this.setFloat(p,'uShip',1);
    for(const rock of rockSet){
     const delta=V.sub(rock.position,origin);
     if(V.dot(delta,cam.forward)<-rock.radius)continue;
     this.renderMesh(p,this.debrisMeshes[rock.variant],M.mul(M.spin(delta,rock.axis,rock.spin),M.scaleTranslate([0,0,0],rock.radius)));
    }
   }
  }
  // Rings are actual tilted annular triangle meshes, not decorative orbit lines.
  gl.depthMask(false);for(const obj of rings){p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,obj.body);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',0);this.setFloat(p,'uShip',0);this.renderMesh(p,this.ringMesh(obj.body),M.translate(obj.rel));}
  for(const obj of rendered){if(!obj.geometry.atmo||root.StarfallMeteorologyLW03?.base(obj.body,this.galaxy.seed).vacuum||obj.dist<obj.body.radius+150||obj.dist>obj.body.radius+11000)continue;
   p=this.p.shell;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',obj.body.sky);const objSun=this.galaxy.byId.get(obj.body.systemId);const objLit=evaluateLighting(obj.body,objSun,this.galaxy,origin);this.setVec(p,'uLight',objLit.sunDir);this.setVec(p,'uStarColor',objLit.starColor);this.setFloat(p,'uStarPower',objLit.starPower);this.setFloat(p,'uOpacity',.9);this.renderMesh(p,obj.geometry.atmo,this.spinModel(obj.body,obj.rel));
   if(obj.geometry.cloud&&obj.dist>obj.body.radius+18){p=this.p.cloud;gl.useProgram(p);this.setMat(p,'uVP',vp);this.setVec(p,'uCam',[0,0,0]);this.setVec(p,'uTint',[.70,.75,.74]);this.setVec(p,'uLight',objLit.sunDir);this.setVec(p,'uStarColor',objLit.starColor);this.setFloat(p,'uStarPower',objLit.starPower);this.setFloat(p,'uOpacity',obj.body===near&&state.weather?.cloudFraction!==undefined?Math.max(.12,state.weather.cloudFraction*1.9):.45);this.renderMesh(p,obj.geometry.cloud,this.spinModel(obj.body,obj.rel,this.galaxy.time*.0008));}
  }
  gl.depthMask(true);this.renderGeothermal(near,origin,vp,renderH);this.renderWeather(state,origin,vp,renderH);p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
  if(!state.hidePlayerShip){const right=V.norm(V.cross(state.shipForward,state.shipUp)),model=M.basis(right,state.shipUp,state.shipForward,V.sub(shipPos,origin));this.renderMesh(p,this.ship,model);}
  if(state.roverPosition&&state.roverForward&&state.roverUp){const rr=V.norm(V.cross(state.roverForward,state.roverUp)),rModel=M.basis(rr,state.roverUp,state.roverForward,V.sub(state.roverPosition,origin));this.renderMesh(p,this.rover,rModel);}
  if(!state.hidePlayerTruck&&state.truckPosition&&state.truckForward&&state.truckUp){const tr=V.norm(V.cross(state.truckForward,state.truckUp));this.renderMesh(p,this.truck,M.basis(tr,state.truckUp,state.truckForward,V.sub(state.truckPosition,origin)));}
  for(const probe of (state.extraRovers||[]).slice(0,15)){if(V.len(V.sub(probe.position,viewer))>2600)continue;const right=V.norm(V.cross(probe.forward,probe.up));this.renderMesh(p,this.rover,M.basis(right,probe.up,probe.forward,V.sub(probe.position,origin)));}
  for(const sat of (state.satellites||[]).slice(0,48)){if(V.len(V.sub(sat.position,viewer))>85000)continue;const up=V.norm(sat.up||[0,1,0]),front=V.norm(V.sub([0,0,1],V.mul(up,V.dot([0,0,1],up))));const right=V.norm(V.cross(front,up));this.renderMesh(p,this.satellite,M.basis(right,up,front,V.sub(sat.position,origin)));}
  for(const rocket of (state.rockets||[]).slice(0,3)){if(V.len(V.sub(rocket.position,viewer))>7000)continue;const up=V.norm(rocket.up),right=V.norm(V.cross([1,0,0],up)),front=V.norm(V.cross(right,up));this.renderMesh(p,this.rocket,M.basis(right,up,front,V.sub(rocket.position,origin)));}
  // Real 3D EVA character. These meshes are small, instanced only for the
  // player, and share existing star/moon lighting and depth occlusion.
  if(state.avatarBase&&state.avatarUp&&state.avatarForward){
   p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);
   this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',eventFogColor);
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
  // Infrastructure uses fixed meshes, scene-relative transforms and normal depth testing.
  // No geometry allocation or global structure traversal occurs in render().
  if(Array.isArray(state.infrastructure)){
   p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
   for(const item of state.infrastructure){const mesh=this.infrastructure.get(item.kind);if(!mesh||!item.position||V.len(V.sub(item.position,origin))>370)continue;
    const worldUp=V.norm(item.up),front=V.norm(V.sub(item.forward,V.mul(worldUp,V.dot(item.forward,worldUp)))),right=V.norm(V.cross(front,worldUp));
    this.setFloat(p,'uShip',item.preview?2:1);this.renderMesh(p,mesh,M.basis(right,worldUp,front,V.sub(item.position,origin)));
   }
  }
  // Ancient ruins: geometry is shared per technology tier. No procedural mesh
  // generation or planet-wide archaeological discovery occurs in the draw loop.
  if(Array.isArray(state.ruins)&&state.ruins.length){
   p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
   for(const item of state.ruins){const mesh=this.ruins.get(item.tier);if(!mesh||!item.position||V.len(V.sub(item.position,origin))>375)continue;
    const worldUp=V.norm(item.up),front=V.norm(V.sub(item.forward,V.mul(worldUp,V.dot(item.forward,worldUp))));
    if(V.len(front)<.01)continue;const right=V.norm(V.cross(front,worldUp));this.renderMesh(p,mesh,M.basis(right,worldUp,front,V.sub(item.position,origin)));
   }
  }
  // Ecology near-field: strict draw cap, shared meshes and normal depth testing.
  // Animated poses are recomputed in BODY-FIXED coordinates, never camera grids.
  if(Array.isArray(state.ecology)&&state.ecology.length){
   p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',fogDensity);this.setFloat(p,'uShip',1);
   let count=0;for(const item of state.ecology){if(count++>=18)break;const mesh=this.ecologyMeshes.get(item.kind);if(!mesh||!item.position||V.len(V.sub(item.position,origin))>240)continue;
    const u=V.norm(item.up),f=V.norm(V.sub(item.forward,V.mul(u,V.dot(item.forward,u))));if(V.len(f)<.01)continue;const r=V.norm(V.cross(f,u));this.renderMesh(p,mesh,M.basis(r,u,f,V.sub(item.position,origin)));
   }
  }
  // Draw the active ruin interior in the same 3D scene. The camera, avatar and
  // corridor layout are all site-local; no extra rendering surface or scene load.
  if(state.interior){
   const item=state.interior;
    let mesh=item.kind==='cave'?this.caveMeshes.get(item.siteId):this.interiorMeshes.get(item.tier);
    if(item.kind==='cave'&&!mesh&&root.StarfallCaveMeshLW02){
      const g=root.StarfallCaveMeshLW02.geometry(item.site);mesh=makeMesh(gl,g.positions,g.normals,g.colors,g.indices);
      this.caveMeshes.set(item.siteId,mesh);
      while(this.caveMeshes.size>8){const oldest=this.caveMeshes.keys().next().value;
       this.freeMesh(this.caveMeshes.get(oldest));this.caveMeshes.delete(oldest);}
    }
   if(mesh&&item.position){p=this.p.mesh;gl.useProgram(p);this.setMat(p,'uViewProj',vp);this.setVec(p,'uCamera',[0,0,0]);applyLight(p,near);this.setVec(p,'uFogColor',eventFogColor);this.setFloat(p,'uFogDensity',0);this.setFloat(p,'uShip',1.6);
      if(item.kind==='cave'){this.setFloat(p,'uStarPower',0);this.setFloat(p,'uBouncePower',0);this.setFloat(p,'uAmbient',.015);}
    const u=V.norm(item.up),f=V.norm(V.sub(item.forward,V.mul(u,V.dot(item.forward,u)))),r=V.norm(V.cross(f,u));this.renderMesh(p,mesh,M.basis(r,u,f,V.sub(item.position,origin)));
   }
  }
  gl.bindVertexArray(null);this.lastDrawCalls=this.frameDrawCalls;
 }
 // 7F: World-only capture. The SAME scene renderer, shaders and planet mesh
 // are drawn to a bounded offscreen RGBA8/depth framebuffer; HUD is never captured.
 captureScience(camera,body,{size=512,caption='',quality=.82,wide=false}={}){
  if(![256,512,1024].includes(size))throw Error('Unsupported camera resolution');
  if(!body?.id||!body.position||!this.latestFrameState)throw Error('A loaded world scene is required');
  if(!this.galaxy.byId.has(body.id))throw Error('Camera target is not currently loaded; visit its system');
  if(this.captureSize)throw Error('Camera is already capturing');
  if(!Array.isArray(camera?.eye)||!Array.isArray(camera?.forward)||!Array.isArray(camera?.up))throw Error('Missing 3-D camera pose');
  const gl=this.gl,oldFbo=gl.getParameter(gl.FRAMEBUFFER_BINDING),oldViewport=gl.getParameter(gl.VIEWPORT);
  const previous={aspect:this.aspect,fov:this.fov,pixelRatio:this.pixelRatio};
  let fb=null,color=null,depth=null;
  try{
   fb=gl.createFramebuffer();color=gl.createTexture();depth=gl.createRenderbuffer();
   if(!fb||!color||!depth)throw Error('Insufficient GPU resources for imaging');
   gl.bindTexture(gl.TEXTURE_2D,color);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size,size);
   gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);
   gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Offscreen camera framebuffer is incomplete');
   this.captureSize={width:size,height:size};this.aspect=1;this.fov=wide?1.68:1.05;this.pixelRatio=1;
   this.lastPatchAt=0;this.lastSkyAt=0;
   const base=this.latestFrameState,up=V.norm(camera.up),forward=V.norm(camera.forward),right=V.norm(V.cross(forward,up));
   if(V.len(right)<.01)throw Error('Degenerate camera orientation');
   const eye=camera.eye,target=V.add(eye,V.mul(forward,500)),pose={eye,target,forward,right,up:V.norm(V.cross(right,forward))};
   const altitude=Math.max(0,V.len(V.sub(eye,body.position))-body.radius);
   this.render({...base,camera:pose,nearest:body,altitude,position:eye,viewerPosition:eye,
     weather:null,interior:null,avatarBase:null,avatarWalking:false,avatarDelta:0,headlights:false,hidePlayerShip:false,hidePlayerTruck:false,
     shipPosition:base.shipPosition,shipForward:base.shipForward||forward,shipUp:base.shipUp||up,
     infrastructure:base.infrastructure||[],ruins:base.ruins||[],ecology:base.ecology||[]});
   const pixels=new Uint8Array(size*size*4);
   gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   if(gl.getError()!==gl.NO_ERROR)throw Error('Camera readback failed');
   const out=document.createElement('canvas');out.width=size;out.height=size;
   const ctx=out.getContext('2d',{willReadFrequently:false});if(!ctx)throw Error('Image encoder unavailable');
   const frame=ctx.createImageData(size,size),rowBytes=size*4;
   for(let row=0;row<size;row++)frame.data.set(pixels.subarray((size-1-row)*rowBytes,(size-row)*rowBytes),row*rowBytes);
   ctx.putImageData(frame,0,0);
   if(caption){ctx.fillStyle='#070e19bd';ctx.fillRect(0,size-40,size,40);
    ctx.fillStyle='#f3e2c8';ctx.font=Math.max(10,Math.round(size/46))+'px monospace';
    ctx.fillText(String(caption).slice(0,68),12,size-16,size-24);}
   let image=out.toDataURL('image/webp',quality);
   if(!image.startsWith('data:image/webp'))image=out.toDataURL('image/jpeg',quality);
   if(!/^data:image\/(webp|jpeg);base64,/.test(image))throw Error('Camera image encoder failed');
   return{image,mime:image.slice(5,image.indexOf(';')),width:size,height:size,
     bytes:Math.floor(image.slice(image.indexOf(',')+1).length*3/4),camera:{eye:[...eye],forward:[...forward],up:[...up]}};
  }finally{
   this.captureSize=null;this.aspect=previous.aspect;this.fov=previous.fov;this.pixelRatio=previous.pixelRatio;
   gl.bindFramebuffer(gl.FRAMEBUFFER,oldFbo);gl.viewport(...oldViewport);
   gl.bindRenderbuffer(gl.RENDERBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);
   if(depth)gl.deleteRenderbuffer(depth);if(color)gl.deleteTexture(color);if(fb)gl.deleteFramebuffer(fb);
  }
 }

 dispose(){for(const tile of this.terrainTiles.values()){this.freeMesh(tile.ground);this.freeMesh(tile.props);}this.terrainTiles.clear();for(const obj of this.meshCache.values()){this.freeMesh(obj.world);this.freeMesh(obj.atmo);this.freeMesh(obj.cloud);}for(const m of this.ringCache.values())this.freeMesh(m);for(const mesh of this.debrisMeshes)this.freeMesh(mesh);this.debrisMeshes.length=0;this.freeMesh(this.sunSphere);this.freeMesh(this.sunHalo);this.freeMesh(this.ship);this.freeMesh(this.rover);for(const mesh of this.infrastructure.values())this.freeMesh(mesh);this.infrastructure.clear();for(const mesh of this.ruins.values())this.freeMesh(mesh);this.ruins.clear();for(const mesh of this.ecologyMeshes.values())this.freeMesh(mesh);this.ecologyMeshes.clear();for(const mesh of this.interiorMeshes.values())if(mesh)this.freeMesh(mesh);this.interiorMeshes.clear();for(const mesh of this.caveMeshes.values())this.freeMesh(mesh);this.caveMeshes.clear();for(const mesh of this.caveEntranceMeshes.values())this.freeMesh(mesh);this.caveEntranceMeshes.clear();for(const part of [this.avatarParts.body,this.avatarParts.cape,...this.avatarParts.legs,...this.avatarParts.arms,this.avatarParts.staff,this.avatarParts.glow,this.avatarParts.staffGlow])this.freeMesh(part);this.gl.deleteBuffer(this.effectBuffer);this.gl.deleteVertexArray(this.effectVao);for(const p of Object.values(this.p))this.gl.deleteProgram(p);}
}
root.Starfall3D={Renderer,V,M,groundHeight,field,evaluateLighting,sampleTerrain:(planet,localDirection)=>ST.sample(planet,localDirection,groundHeight,field,shade,(body,d)=>Renderer.prototype.terrainNormal.call(null,body,d))};
})(globalThis);
