#!/usr/bin/env python3
"""9B genuine WebGL2 smoke: render fixture of the original game scene and
observe transparent skin, wing animation and internally lit organs.
The fixture overrides only scene presentation; population tests cover life.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'PLAY-STARFALL.html'
ARTIFACT = ROOT / 'artifacts' / 'ecology9b'
ARTIFACT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--enable-webgl', '--no-sandbox', '--disable-dev-shm-usage'])
    try:
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda req: requests.append(req.url) if req.url.startswith(('http://', 'https://')) else None)
        page.goto(TARGET.as_uri(), wait_until='domcontentloaded', timeout=90000)
        page.wait_for_function(
            '!!(window.StarfallRuntime && window.StarfallEcologyUI && window.StarfallLivingBiosphere)',
            timeout=40000)
        setup = page.evaluate("""() => {
          const canvas=document.getElementById('universe'),gl=canvas.getContext('webgl2');
          if(!gl||!window.Starfall3D)throw Error('WebGL2 game did not boot');
          const stats={transparent:0,winged:0,organs:0,draws:0};
          const original=gl.drawElements.bind(gl);
          gl.drawElements=function(...args){
            if(window.__observe9b){
              const pg=this.getParameter(this.CURRENT_PROGRAM);
              if(pg){
                const opacity=this.getUniformLocation(pg,'uEcologyAlpha');
                if(opacity){
                  const alpha=this.getUniform(pg,opacity);
                  if(alpha>.05&&alpha<.85)stats.transparent++;
                  const wing=this.getUniformLocation(pg,'uEcologyWingPhase');
                  if(wing&&this.getUniform(pg,wing)>0)stats.winged++;
                  const ship=this.getUniformLocation(pg,'uShip');
                  if(ship&&this.getUniform(pg,ship)>2&&alpha>.9)stats.organs++;
                }
              }
              stats.draws++;
            }
            return original(...args);
          };
          window.__ecology9bStats=stats;
          // Test-only actors enter the exact live game ecology render adapter.
          // No simulation, storage, material or original player state is altered.
          window.StarfallEcologyUI.scene=function(){
            const c=window.StarfallRuntime.assetPickView().camera;
            if(!Array.isArray(c?.eye)||!Array.isArray(c?.forward))return [];
            const V=window.Starfall3D.V;
            const right=V.norm(V.cross(c.forward,c.up||[0,1,0]));
            const center=V.add(c.eye,V.mul(c.forward,32));
            const actor=(kind,x,id)=>({
              id,kind,alive:true,behavior:'visual-fixture',scale:1.25,
              up:c.up||[0,1,0],forward:c.forward,
              position:V.add(center,V.mul(right,x)),
              heartPhase:performance.now()*.006+1.3,
              digestion:.85,wingPhase:kind==='flier'?.75+Math.sin(performance.now()*.009)*.65:0
            });
            return [actor('flier',-8,'9b-test-flyer'),actor('grazer',8,'9b-test-grazer'),
                    actor('spores',0,'9b-test-spores')];
          };
          window.__observe9b=true;
          return {glVersion:gl.getParameter(gl.VERSION),canvas:[canvas.width,canvas.height]};
        }""")
        page.wait_for_timeout(4000)
        stats = page.evaluate('window.__ecology9bStats')
        page.screenshot(path=str(ARTIFACT / 'translucent-flyers-real-webgl.png'))
        (ARTIFACT / 'webgl-draw-observations.json').write_text(
            json.dumps({'setup': setup, 'draws': stats, 'errors': errors, 'externalRequests': requests}, indent=2),
            encoding='utf-8')
        assert stats['transparent'] > 0, f'No transparent living-skin draw: {stats}'
        assert stats['winged'] > 0, f'No wing-animated flier draw: {stats}'
        assert stats['organs'] >= 2, f'Heart/stomach meshes not drawn: {stats}'
        assert not requests, f'Offline standalone requested network: {requests[:5]}'
        assert not errors, f'Browser JavaScript errors: {errors[:5]}'
        print('PASS 9B: real offline SwiftShader/WebGL2 draws transparent fauna, animated flyer wings and opaque internal organs')
        print(stats)
    finally:
        browser.close()
