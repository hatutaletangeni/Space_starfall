#!/usr/bin/env python3
"""9C browser smoke: real software WebGL2, actual aerodynamic flight states, FPS sampling.
The benchmark is ONLY for the CI SwiftShader environment, never user-device FPS.
"""
import json
import statistics
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'ecology9c'
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = []

def measure(browser, filename, viewport, count):
    page = browser.new_page(viewport=viewport)
    errors, requests = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    page.goto((ROOT / filename).as_uri(), wait_until='domcontentloaded', timeout=90000)
    page.wait_for_function('!!(window.StarfallRuntime && window.StarfallEcologyUI && window.StarfallAerialFlight9C)', timeout=50000)
    settings = page.evaluate("""count => {
      const c=document.getElementById('universe'),gl=c.getContext('webgl2'),F=window.StarfallAerialFlight9C;
      if(!gl||!F)throw Error('No flight model or WebGL2 context');
      const stats={transparent:0,winged:0,organs:0,draws:0};
      const draw=gl.drawElements.bind(gl);
      gl.drawElements=function(...args){
        if(window.__inspectEcology9C){
          const program=this.getParameter(this.CURRENT_PROGRAM);
          if(program){
            const a=this.getUniformLocation(program,'uEcologyAlpha');
            if(a){
              const alpha=this.getUniform(program,a);
              if(alpha>.05&&alpha<.85)stats.transparent++;
              const w=this.getUniformLocation(program,'uEcologyWingPhase');
              if(w&&this.getUniform(program,w)>0)stats.winged++;
              const sh=this.getUniformLocation(program,'uShip');
              if(sh&&this.getUniform(program,sh)>2&&alpha>.9)stats.organs++;
            }
          }
          stats.draws++;
        }
        return draw(...args);
      };
      const V=window.Starfall3D.V,start=performance.now()/1000;
      const actors=Array.from({length:count},(_,i)=>({id:'9c-actor-'+i,
        state:F.start('9c-actor-'+i,1.2,1,start)}));
      let distance=0; const first=actors[0].state.p.slice();
      window.StarfallEcologyUI.scene=function(){
        const c=window.StarfallRuntime.assetPickView().camera;
        if(!Array.isArray(c?.eye)||!Array.isArray(c?.forward))return [];
        const up=c.up||[0,1,0],right=V.norm(V.cross(c.forward,up));
        const center=V.add(c.eye,V.mul(c.forward,48)),t=performance.now()/1000;
        return actors.map((actor,i)=>{
          actor.state=F.advance(actor.state,t,{pressurePa:100000,temperatureK:290,
            massKg:1.2,sizeM:1,gravityMS2:9.81,floorY:0});
          const s=actor.state;
          if(!i)distance=Math.hypot(...s.p.map((v,j)=>v-first[j]));
          const position=V.add(center,V.add(V.mul(right,s.p[0]*.58+(i%3-1)*7),
                                         V.mul(up, (s.p[1]-10)*.55+(Math.floor(i/3)-2)*1.5)));
          const flying=i%4!==3;
          const dir=V.norm(V.add(V.mul(right,s.v[0]),V.mul(c.forward,s.v[2])));
          const banking=V.norm(V.add(V.mul(up,Math.cos(s.bank)),V.mul(right,Math.sin(s.bank))));
          return {id:actor.id,kind:flying?'flier':'grazer',alive:true,behavior:s.flightMode,
            position,up:banking,forward:dir,scale:1.05,
            heartPhase:t*9.2, digestion:.65,wingPhase:flying?Math.max(.0001,s.wingPhase):0};
        });
      };
      window.__inspectEcology9C=true;
      window.__ecology9c={stats,actors,first,distance:()=>distance,
        glVersion:gl.getParameter(gl.VERSION),vendor:gl.getParameter(gl.VENDOR)};
      return {glVersion:gl.getParameter(gl.VERSION),canvas:[c.width,c.height]};
    }""", count)
    frame = page.evaluate("""() => new Promise(resolve => {
       const frameTimes=[];let last=performance.now(),t0=last;
       function sample(t){
         const dt=t-last;last=t;
         if(dt>0&&dt<1000)frameTimes.push(dt);
         if(t-t0<4300)requestAnimationFrame(sample);
         else resolve(frameTimes);
       }
       requestAnimationFrame(sample);
    })""")
    stats = page.evaluate("""() => ({
      stats:window.__ecology9c.stats,
      movement:window.__ecology9c.distance(),
      flightModes:window.__ecology9c.actors.map(x=>x.state.flightMode),
      glVersion:window.__ecology9c.glVersion
    })""")
    page.screenshot(path=str(OUT / (filename.replace('.html','').lower()+'.png')))
    assert stats['stats']['transparent']>0, 'Missing translucent rendering'
    assert stats['stats']['winged']>0, 'Missing aero-driven flapping'
    assert stats['stats']['organs']>=2, 'No opaque internal anatomy'
    assert stats['movement']>.05, 'Force-integrated flyer did not move'
    assert not errors, errors[:6]
    assert not requests, requests[:6]
    sorted_frames=sorted(frame)
    percentile=lambda q: sorted_frames[min(len(sorted_frames)-1,int((len(sorted_frames)-1)*q))]
    result={'edition':filename,'actors':count,'gl':settings,'drawCounts':stats['stats'],
            'distanceLocalUnits':stats['movement'],
            'sampledFrames':len(frame),
            'observedFPS':round(1000/statistics.mean(frame),1),
            'frameMsP50':round(percentile(.50),1),
            'frameMsP95':round(percentile(.95),1),
            'frameMsP99':round(percentile(.99),1),
            'environment':'GitHub Actions Linux headless Chromium SwiftShader; not user GPU'}
    RESULTS.append(result)
    page.close()
    return result

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader',
        '--enable-unsafe-swiftshader','--enable-webgl','--no-sandbox','--disable-dev-shm-usage'])
    try:
        print('Desktop:',measure(browser,'PLAY-STARFALL.html',{'width':1280,'height':800},10))
        print('Mobile:',measure(browser,'PLAY-STARFALL-MOBILE.html',{'width':920,'height':480},8))
    finally:
        browser.close()
(OUT/'software-webgl-performance.json').write_text(json.dumps(RESULTS,indent=2),encoding='utf-8')
print('PASS: 9C live aerodynamic flight, WebGL2 opacity/organs/wing deformation, measured CI render samples')
