#!/usr/bin/env python3
"""LW07 standalone browser smoke: asteroid body restore, mining gates and impact surfaces."""
from pathlib import Path
import asyncio
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=[
            "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle",
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader"
        ])
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        await page.goto((ROOT / "PLAY-STARFALL.html").as_uri(), wait_until="load")
        await page.wait_for_function(
            "() => window.StarfallRuntime && window.StarfallRuntime.galaxy && "
            "window.StarfallDebrisLW05 && window.StarfallAsteroidImpactsLW07 && "
            "window.StarfallAsteroidMiningLW07", timeout=20000
        )
        await page.wait_for_timeout(1200)
        result = await page.evaluate("""() => {
          const rt=window.StarfallRuntime,g=rt.galaxy,D=window.StarfallDebrisLW05;
          const system=g.systems.find(s=>(s.belts||[]).some(b=>b.rocks&&b.rocks.length));
          if(!system)throw new Error('No generated belt in seed 742');
          const belt=system.belts.find(b=>b.rocks&&b.rocks.length);
          const index=belt.rocks.findIndex((r,i)=>D.beltRock(system,belt,r,i,g.time).landable);
          if(index<0)throw new Error('No deterministic major asteroid generated');
          const rock=D.beltRock(system,belt,belt.rocks[index],index,g.time);
          const body=D.bodyFromRock(rock),restored=D.resolveBody(g,body.id,g.time);
          if(!body||!body.landable||body.kind!=='asteroid'||restored.id!==body.id)
            throw new Error('Major asteroid did not restore as a landable stable body');
          const mining=rt.asteroidMiningContextLW07();
          if(mining.available)throw new Error('Mining must remain gated until landed EVA');
          const Materials=window.StarfallMaterials8A,Mining8D=window.StarfallMining8D;
          const mats=window.StarfallAsteroidMiningLW07.prepareContainers(
            Mining8D.prepareContainers(Materials.create()));
          const pouch=mats.used(window.StarfallAsteroidMiningLW07.POUCH);
          const impactModel=window.StarfallAsteroidImpactsLW07.create();
          impactModel.attachSystem(system,g.seed);
          const planet=system.bodies.find(x=>x.kind==='planet'&&x.landable);
          const noBelt=g.systems.find(x=>!(x.belts||[]).length);
          const noBeltPlanet=noBelt&&noBelt.bodies.find(x=>x.kind==='planet'&&x.type!=='Shattered');
          const noBeltCraters=noBeltPlanet?window.StarfallAsteroidImpactsLW07.staticCraters(noBeltPlanet,noBelt,g.seed).length:0;
          const sites=window.StarfallResources8C.neighbors(body,[.8,.3,.5],g.seed,4);
          const weatherStyles=[...document.querySelectorAll('style')].map(x=>x.textContent).filter(x=>x.includes('.weather-')).join('\\n');
          return {
            asteroidId:body.id,asteroidRadius:body.radius,gravity:body.gravity,
            restoreStable:restored.id===body.id,resourceSites:sites.length,
            pouchCapacity:pouch.massKg===0,landedMiningGate:mining.available===false,
            beltCraterCount:planet?.impactCraters?.length||0,noBeltCraters,
            miningControls:!!document.getElementById('multitool9g-mine')&&!!document.getElementById('multitool9g-transfer'),
            noFlatLineWeather:!weatherStyles.includes('repeating-linear-gradient')
          };
        }""")
        assert result["restoreStable"] and result["asteroidRadius"] >= 58
        assert result["resourceSites"] > 0
        assert result["pouchCapacity"] and result["landedMiningGate"]
        assert result["beltCraterCount"] > 0 and result["noBeltCraters"] == 0
        assert result["miningControls"] and result["noFlatLineWeather"]
        assert not errors, "Browser JavaScript errors: " + repr(errors)
        print("PASS LW07 standalone browser smoke:", result)
        await browser.close()

asyncio.run(main())
