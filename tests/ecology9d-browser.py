#!/usr/bin/env python3
"""9D actual STARFALL WebGL2 smoke (desktop + landscape mobile).
Renders Aurelius-inspired variants in the unchanged game's 3D renderer.
A fixture replaces only the ecology scene list, never the live GPU renderer.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'ecology9d'
OUT.mkdir(parents=True,exist_ok=True)

def check(browser,filename,viewport):
    page=browser.new_page(viewport=viewport)
    errors,network=[],[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
    page.goto((ROOT/filename).as_uri(),wait_until='domcontentloaded',timeout=95000)
    page.wait_for_function('!!(window.StarfallRuntime && window.StarfallEcologyUI && window.StarfallLocomotion9D && window.StarfallAerialFlight9C)',timeout=50000)
    initial=page.evaluate("""() => {
      const c=document.getElementById('universe'),gl=c.getContext('webgl2');
      if(!gl)throw Error('No WebGL2');
      const stats={transparent:0,winged:0,animated:0,pulsed:0,organs:0,draws:0};
      const original=gl.drawElements.bind(gl);
      gl.drawElements=function(...args){
        if(window.__ecology9dEnabled){
          const p=this.getParameter(this.CURRENT_PROGRAM);
          if(p){
            const alphaLocation=this.getUniformLocation(p,'uEcologyAlpha');
            if(alphaLocation){
              const alpha=this.getUniform(p,alphaLocation);
              const wing=this.getUniformLocation(p,'uEcologyWingPhase'),
                    gait=this.getUniformLocation(p,'uEcologyGait'),
                    pulse=this.getUniformLocation(p,'uEcologyPulse'),
                    ship=this.getUniformLocation(p,'uShip');
              if(alpha>.05&&alpha<.9)stats.transparent++;
              if(wing&&this.getUniform(p,wing)>0)stats.winged++;
              if(gait&&this.getUniform(p,gait)>0)stats.animated++;
              if(pulse&&this.getUniform(p,pulse)>0)stats.pulsed++;
              if(ship&&this.getUniform(p,ship)>2&&alpha>.9)stats.organs++;
            }
          }
          stats.draws++;
        }
        return original(...args);
      };
      const B=window.StarfallLocomotion9D,F=window.StarfallAerialFlight9C;
      const defs=[
        {id:'aurora-9d',role:'flier',kind:'aurora'},
        {id:'stalker-9d',role:'predator',kind:'stalker'},
        {id:'worm-9d',role:'detritivore',kind:'burrower'},
        {id:'jelly-9d',role:'filterer',kind:'jelly'},
        {id:'eel-9d',role:'aquatic_predator',kind:'eel'},
        {id:'herd-9d',role:'grazer',kind:'grazer'},
        {id:'crawler-9d',role:'grazer',kind:'crawler'},
        {id:'flier-9d',role:'flier',kind:'flier'},
        {id:'spores-9d',role:'producer',kind:'spores'}
      ];
      const t=performance.now()/1000;
      const agents=defs.map(d=>({...d,energy:.58,massKg:1,sizeM:1,
        state:d.role==='flier'?F.start(d.id,1,1,t):B.start(d,t)}));
      let travel=0;const initial=agents.map(a=>a.state.p.slice());
      window.StarfallEcologyUI.scene=function(){
        const camera=window.StarfallRuntime.assetPickView().camera;
        if(!Array.isArray(camera?.eye)||!Array.isArray(camera?.forward))return[];
        const V=window.Starfall3D.V,now=performance.now()/1000,
          right=V.norm(V.cross(camera.forward,camera.up||[0,1,0])),
          up=camera.up||[0,1,0],center=V.add(camera.eye,V.mul(camera.forward,51));
        const states=agents.map(a=>({id:a.id,role:a.role,p:a.role==='flier'?
          [a.state.p[0],a.state.p[2]]:a.state.p}));
        return agents.map((a,i)=>{
          if(a.role==='flier')a.state=F.advance(a.state,now,{pressurePa:101325,temperatureK:288,gravityMS2:9.81,massKg:1,sizeM:1});
          else a.state=B.advance(a.state,a,now,states,{plantKg:20,detritusKg:5,light:.6,player:[100,100],traversable:()=>true});
          const s=a.state;
          if(i===0)travel=Math.hypot(s.p[0]-initial[0][0],s.p[2]-initial[0][2]);
          const x=(i%5-2)*9+(s.p[0]-(initial[i][0]||0))*.3;
          const y=(Math.floor(i/5)-.5)*-8+(a.role==='flier'?s.p[1]-.1:0)*.22;
          const position=V.add(center,V.add(V.mul(right,x),V.mul(up,y)));
          return {id:a.id,kind:a.kind,alive:true,scale:a.kind==='aurora'?1.45:1.1,
            position,up,forward:camera.forward,behavior:s.behavior||s.flightMode,
            heartPhase:now*(i===0?9:6),digestion:.75,
            wingPhase:a.role==='flier'?Math.max(.0001,s.wingPhase):0,
            gaitPhase:a.role==='flier'?0:Math.max(.0001,s.gait),
            bodyPulse:Math.max(.0001,s.pulse||now*2)};
        });
      };
      window.__ecology9d={agents,stats,travel:()=>travel,gl:gl.getParameter(gl.VERSION)};
      window.__ecology9dEnabled=true;
      return {version:gl.getParameter(gl.VERSION),actors:agents.length,canvas:[c.width,c.height]};
    }""")
    page.wait_for_timeout(3300)
    stats=page.evaluate("() => ({stats:window.__ecology9d.stats,travel:window.__ecology9d.travel()})")
    page.screenshot(path=str(OUT/(filename.replace('.html','').lower()+'.png')))
    assert stats['stats']['transparent']>=8,stats
    assert stats['stats']['winged']>0,'membrane wings not animated'
    assert stats['stats']['animated']>0,'ground/water animals not animated'
    assert stats['stats']['pulsed']>0,'no breathing/jelly pulsing'
    assert stats['stats']['organs']>=8,'internal heart and digestive sac missing'
    assert stats['travel']>.05,'aerodynamic flyer did not travel'
    assert not errors,errors[:5]
    assert not network,network[:5]
    page.close()
    return {'edition':filename,'gl':initial,'observed':stats,'networkRequests':network,'browserExceptions':errors}

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        result=[
          check(browser,'PLAY-STARFALL.html',{'width':1280,'height':800}),
          check(browser,'PLAY-STARFALL-MOBILE.html',{'width':920,'height':480})
        ]
    finally:
        browser.close()
(OUT/'webgl-9d-observations.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
for v in result:print('PASS 9D:',v['edition'],v['observed'])
print('PASS 9D actual desktop/mobile WebGL2 bodies, membrane, organs, locomotion shaders')
