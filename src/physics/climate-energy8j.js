/* Shared production energy-balance numerics. SI only; references and benchmark
 * limits: docs/CLIMATE-VALIDATION.md. Numerical verification is not evidence
 * of forecast skill on procedurally generated worlds. */
(function(root){'use strict';
const SIGMA=5.670374419e-8,VERSION=3,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function valid(x){return typeof x==='number'&&Number.isFinite(x);}
function saturationPa(T){
 if(!valid(T)||T<=0)throw Error('Positive water temperature required');
 if(T<273.16)return Math.exp(9.550426-5723.265/T+3.53068*Math.log(T)-.00728332*T); // Murphy & Koop (2005), ice; supported >=110 K
 if(T>=647.096)return 22.064e6; // critical endpoint; phase model flags extrapolation
 const theta=1-T/647.096,a=[-7.85951783,1.84408259,-11.7866497,22.6807411,-15.9618719,1.80122502],b=[1,1.5,3,3.5,4,7.5];
 return 22.064e6*Math.exp(647.096/T*a.reduce((s,v,n)=>s+v*theta**b[n],0)); // IAPWS SR1-86(1992), Eq. 1
}
function insolation(flux,count,declination){
 if(!valid(flux)||flux<0||!Number.isInteger(count)||count<2||count>128||!valid(declination)||Math.abs(declination)>Math.PI/2)throw Error('Invalid latitude insolation');
 // Four-point Gauss integration in x=sin(latitude); exact equal-area cells.
 const nodes=[-.8611363115940526,-.3399810435848563,.3399810435848563,.8611363115940526],weights=[.3478548451374538,.6521451548625461,.6521451548625461,.3478548451374538];
 const values=Array.from({length:count},(_,n)=>{let q=0;for(let k=0;k<4;k++){
  const x=-1+(2*n+1+nodes[k])/count,cosLat=Math.sqrt(Math.max(0,1-x*x)),sunset=Math.acos(clamp(-x/Math.max(1e-20,cosLat)*Math.tan(declination),-1,1));
  q+=weights[k]*Math.max(0,flux/Math.PI*(sunset*x*Math.sin(declination)+cosLat*Math.cos(declination)*Math.sin(sunset)))/2;
 }return q;});
 const mean=values.reduce((s,v)=>s+v,0)/count,factor=mean>0?flux/(4*mean):0;
 return values.map(v=>v*factor); // conservative quadrature normalization: <Q>=S/4 for every season
}
function transport(temperatures,D=.6){
 if(!Array.isArray(temperatures)||temperatures.length<2||!temperatures.every(valid)||!valid(D)||D<0)throw Error('Invalid spherical heat transport');
 const n=temperatures.length,h=2/n,faces=Array(n+1).fill(0);
 for(let j=1;j<n;j++){const x=-1+j*h;faces[j]=D*(1-x*x)*(temperatures[j]-temperatures[j-1])/h;}
 return temperatures.map((_,j)=>(faces[j+1]-faces[j])/h);
}
function outgoingDelta(baseK,anomalyK,emissivity=1){
 // Factorized Stefan-Boltzmann difference retains sub-ULP perturbations.
 return emissivity*SIGMA*anomalyK*(4*baseK**3+6*baseK**2*anomalyK+4*baseK*anomalyK**2+anomalyK**3);
}
function thermalStep({surfaceK,deepK,baseK,dt,forcingWm2,surfaceCapacity=2e7,deepCapacity=4e8,exchange=1.2,emissivity=1,linearFeedback=null,latent=()=>0}){
 if(![surfaceK,deepK,baseK,dt,forcingWm2,surfaceCapacity,deepCapacity,exchange,emissivity].every(valid)||baseK<=0||dt<0||dt>86400||surfaceCapacity<=0||deepCapacity<=0||exchange<0||emissivity<=0||emissivity>1||linearFeedback!==null&&(!valid(linearFeedback)||linearFeedback<0))throw Error('Invalid energy-balance state');
 if(!dt)return{surfaceK,deepK,radiationWm2:0,latentJm2:0,residualJm2:0};
 const deepAt=x=>(deepCapacity*deepK+dt*exchange*x)/(deepCapacity+dt*exchange),
 olr=x=>linearFeedback===null?outgoingDelta(baseK,x,emissivity):linearFeedback*x,
 residual=x=>surfaceCapacity*(x-surfaceK)+deepCapacity*(deepAt(x)-deepK)+latent(x)-dt*(forcingWm2-olr(x));
 let lo=3-baseK,hi=Math.max(100,Math.abs(surfaceK)*2+10);while(residual(hi)<0&&hi<1e7)hi*=2;
 if(residual(lo)>0||residual(hi)<0)throw Error('Energy input outside thermal bracket');
 let x=clamp(surfaceK,lo,hi);
 for(let k=0;k<48;k++){
  const f=residual(x),eps=1e-4,lp=(latent(x+eps)-latent(x-eps))/(2*eps),
   derivative=surfaceCapacity+dt*exchange*deepCapacity/(deepCapacity+dt*exchange)+lp+dt*(linearFeedback===null?4*emissivity*SIGMA*(baseK+x)**3:linearFeedback),
   proposed=x-f/derivative;
  if(f>0)hi=x;else lo=x;
  if(Math.abs(f)<=1e-24+1e-12*Math.max(1e-24,Math.abs(dt*forcingWm2),Math.abs(latent(x)),surfaceCapacity*Math.abs(x)))break;
  const next=valid(proposed)&&proposed>=lo&&proposed<=hi?proposed:(lo+hi)/2;
  if(next===x)break;x=next;
 }
 const deep=deepAt(x),phase=latent(x),radiationWm2=forcingWm2-olr(x),error=residual(x);
 if(!valid(error)||Math.abs(error)>1e-5+1e-9*Math.max(1,Math.abs(dt*forcingWm2),Math.abs(phase)))throw Error('Thermal solver failed energy closure');
 return{surfaceK:x,deepK:deep,radiationWm2,latentJm2:phase,residualJm2:error};
}
const API=Object.freeze({VERSION,SIGMA,saturationPa,insolation,transport,outgoingDelta,thermalStep});root.StarfallClimateEnergy8J=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
