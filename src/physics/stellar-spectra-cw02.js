/* CW-02 — purely derived stellar spectrum and appearance; no celestial mutation.
 * Planck-law band fractions approximated by numerical integration over wavelength.
 * Stefan–Boltzmann bolometric flux F=L/(4*pi*r^2) from EXISTING StarfallPhysics.
 * Stellar compositions are CW01 seeded priors, never observations.
 */
(function(root){'use strict';
const H=6.62607015e-34,C=299792458,K=1.380649e-23,PI=Math.PI,SCHEMA=1;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bands=Object.freeze({ultraviolet:[100e-9,400e-9],visible:[380e-9,780e-9],infrared:[780e-9,100e-6]});
function planck(lambda,T){if(!(lambda>0&&T>0))return 0;const x=H*C/(lambda*K*T);if(x>700)return 0;return 2*H*C*C/(lambda**5*Math.expm1(x));}
function integrate(T,min,max,n=128){let s=0;const h=(max-min)/n;for(let i=0;i<=n;i++){const x=min+i*h;s+=(i===0||i===n?1:i%2?4:2)*planck(x,T);}return s*h/3;}
function xyzApprox(T){ // CIE-like analytic color matching functions, approximate, not spectrometer-grade.
 let X=0,Y=0,Z=0;for(let nm=380;nm<=780;nm+=5){const nmf=nm,lam=nm*1e-9,B=planck(lam,T);
 const g=(mu,lo,hi)=>Math.exp(-.5*((nmf-mu)/(nmf<mu?lo:hi))**2);
 X+=B*(1.056*g(599.8,37.9,31.0)+.362*g(442,16,26.7)-.065*g(501.1,20.4,26.2));
 Y+=B*(.821*g(568.8,46.9,40.5)+.286*g(530.9,16.3,31.1));
 Z+=B*(1.217*g(437,11.8,36)+.681*g(459,26,13.8));}
 const R=3.2406*X-1.5372*Y-.4986*Z,G=-.9689*X+1.8758*Y+.0415*Z,B=.0557*X-.204*Y+1.057*Z;
 const rgb=[Math.max(0,R),Math.max(0,G),Math.max(0,B)],m=Math.max(...rgb,1e-30);
 // Relative display tint, NOT a calibrated emitted-light measurement.
 return Object.freeze(rgb.map(v=>clamp(Math.pow(v/m,1/2.2),0,1)));
}
function profile(star,existingPhysics){if(!star?.id)throw Error('Missing star ID');
 const physics=existingPhysics||root.StarfallPhysics;
 if(!physics?.starProfile)throw Error('StarfallPhysics.starProfile unavailable');
 const p=physics.starProfile(star),T=p.effectiveTemperatureK;
 if(!(Number.isFinite(T)&&T>0&&Number.isFinite(p.luminosityW)&&p.luminosityW>0))throw Error('Invalid stellar physics');
 const composition=root.StarfallCompositionCW01?.starFor(star);
 const integrateTotal=integrate(T,100e-9,100e-6,256);
 const fractions=Object.freeze(Object.fromEntries(Object.entries(bands).map(([key,[lo,hi]])=>[key,clamp(integrate(T,lo,hi)/integrateTotal,0,1)])));
 return Object.freeze({schema:SCHEMA,starId:star.id,temperatureK:T,luminosityW:p.luminosityW,
  displayRGB:xyzApprox(T),radiationBandFractions:fractions,composition:composition||null,
  provenance:'Planck spectrum approximation from existing CW01/physics stellar profile',
  uncertainties:'Stellar temperature and effective radius are procedural approximations; no extinction or absorption lines modeled'});
}
function stellarFluxWm2(star,distanceM,physics){if(!(Number.isFinite(distanceM)&&distanceM>0))throw Error('Invalid stellar distance');const p=profile(star,physics);return p.luminosityW/(4*PI*distanceM**2);}
const API=Object.freeze({SCHEMA_VERSION:SCHEMA,planck,integrate,profile,stellarFluxWm2,displayColor:star=>profile(star).displayRGB});
root.StarfallStellarSpectraCW02=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
