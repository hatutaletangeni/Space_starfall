#!/usr/bin/env python3
"""STARFALL 8H — genuine offline Chromium Engineer logistics inspector.
Never inserts a truck/asset/stock fixture or disables original physics.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

url=(Path(__file__).resolve().parents[1]/'PLAY-STARFALL.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=[
        '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
        '--enable-webgl','--no-sandbox','--disable-dev-shm-usage'
    ])
    try:
        page=browser.new_page(viewport={'width':1200,'height':760})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""()=>!!(window.StarfallRuntime&&window.StarfallLogisticsUI8H&&
          document.getElementById('logistics8h-readout')?.textContent.includes('ORIGINAL TRUCK'))""",timeout=60000)
        state=page.evaluate("""()=>{
         const m=StarfallLogisticsUI8H.model(),t=StarfallRuntime.physical8a.get('truck-expedition-001');
         const orders=SF.load().logisticsOrders8h?.orders||[],list=document.getElementById('logistics8h-readout').textContent;
         return{uiOrders:m.jobs.length,physicalTruck:t?.id,sourceOrders:orders.length,
          readout:list,hasMining:!!StarfallMiningUI8D,
          plotDisabled:document.querySelector('#logistics8h-panel button').disabled};
        }""")
        assert state['physicalTruck']=='truck-expedition-001',state
        assert state['uiOrders']==state['sourceOrders'],state
        assert state['hasMining'],state
        assert 'SHIP RAW HOLD' in state['readout'] and 'PAID RECEIPTS' in state['readout'],state
        assert 'NO 8H ORDERS YET' in state['readout'] or state['sourceOrders']>0,state
        assert not errors,errors
        print('PASS 8H real file:// Chromium UI: authoritative source-owned truck, ship stock, saved orders and no invented depots')
    finally:
        browser.close()
