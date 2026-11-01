from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1]
mock="""<script>
(()=>{const old=HTMLCanvasElement.prototype.getContext;
const methods={createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createVertexArray:()=>({}),createTexture:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:()=>({}),getShaderInfoLog:()=>'',getProgramInfoLog:()=>'',getParameter:()=>4096,getExtension:()=>null,getError:()=>0};
const gl=new Proxy({canvas:null},{get(target,key){if(key in methods)return methods[key];if(key==='drawingBufferWidth')return 1000;if(key==='drawingBufferHeight')return 700;if(typeof key==='string'&&key.toUpperCase()===key)return 1;return ()=>{};}});
HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl2'){gl.canvas=this;return gl;}return old.call(this,kind,...args);};})();
</script>"""
with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=b.new_page(viewport={'width':1366,'height':768});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(p/'PLAY-STARFALL.html').read_text().replace('<head>','<head>'+mock,1)
  page.set_content(html,wait_until='load',timeout=30000);page.wait_for_timeout(300)
  state=page.evaluate('({runtime:!!window.StarfallRuntime,obs:!!window.StarfallObservatory,science:!!window.StarfallPhysics,starCount:window.StarfallRuntime?.galaxy.systems.length})')
  print('state',state,'errors',errors[:10]);assert state['runtime'] and state['obs'];assert not errors
  page.locator('#obs-open').click();assert page.locator('#observatory').is_visible();assert page.locator('.science-row').count()>5
  assert page.locator('#obs-body option').count()>3
  page.locator('#obs-body').select_option(index=1)
  assert page.locator('.science-row').count()>12
  page.locator('#obs-body').select_option(index=0)
  page.locator('#obs-close').click();page.locator('#fc-toggle').click();page.locator('#fc-mode').select_option('Engineering');assert page.evaluate('window.StarfallRuntime.engineering')
  page.wait_for_timeout(300);print('fc rows',page.locator('.fc-row').count()); assert page.locator('.fc-row').count()>5
  page.locator('#fc-attitude').select_option('Prograde');assert page.evaluate('window.StarfallRuntime.attitude')=='Prograde'
  page.locator('#fc-attitude').select_option('Manual')
  page.locator('#fc-mode').select_option('Assisted');assert not page.evaluate('window.StarfallRuntime.engineering')
  page.locator('#chart-open').click();assert page.locator('#chart').is_visible()
  page.locator('#chart-search').fill('Sector 0001')
  assert page.locator('.star-system').count()>=1
  page.locator('#chart-close').click();assert not page.locator('#chart').is_visible()
  assert not errors,errors
  print('PASS: full standalone loads with mock WebGL, observatory, flight mode controls, zero uncaught JS exceptions')
  b.close()
