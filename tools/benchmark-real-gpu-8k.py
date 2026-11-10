#!/usr/bin/env python3
"""STARFALL 8K OPTIONAL REAL HARDWARE acceptance: foreground Chrome/Edge GPU.
No emulated WebGL, no CI pass claims, and no automatic issue closure.

Run locally on a real Windows/Linux desktop with a visible browser:
  py -m pip install playwright
  py tools/benchmark-real-gpu-8k.py --browser msedge --seconds 90
Optional:
  python tools/benchmark-real-gpu-8k.py --browser chrome --seconds 120 --min-fps 30
The game should be visibly active, not minimized or covered by another tab.
Start actual flight/exploration while this script samples animation pacing.
"""
from __future__ import annotations
import argparse
import json
import math
import platform
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "desktop": ROOT / "PLAY-STARFALL.html",
    "mobile": ROOT / "PLAY-STARFALL-MOBILE.html",
}
SOFTWARE_PATTERNS = (
    "swiftshader", "llvmpipe", "softpipe", "software raster",
    "mesa offscreen", "microsoft basic render", "gdi generic",
)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", choices=("chrome", "msedge"), default="msedge")
    parser.add_argument("--edition", choices=tuple(FILES), default="desktop")
    parser.add_argument("--seconds", type=int, default=90)
    parser.add_argument("--min-fps", type=float, default=30)
    parser.add_argument("--max-p95-ms", type=float, default=50)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "reports" / "8k-gpu-local")
    args = parser.parse_args()
    if not (10 <= args.seconds <= 1800 and math.isfinite(args.min_fps) and args.min_fps > 0
            and math.isfinite(args.max_p95_ms) and args.max_p95_ms > 0):
        parser.error("Provide 10–1800 seconds and finite positive performance thresholds.")
    standalone = FILES[args.edition]
    if not standalone.is_file():
        parser.error(f"Missing {standalone}; build from source first.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    print("IMPORTANT: Headful local GPU acceptance ONLY; CI software renderer is not acceptable.")
    print("Keep game visible and actively fly/explore during the measurement.")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel=args.browser, headless=False,
            args=["--enable-webgl", "--enable-accelerated-2d-canvas",
                  "--disable-background-timer-throttling",
                  "--disable-renderer-backgrounding"],
        )
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.goto(standalone.resolve().as_uri(),
                      wait_until="domcontentloaded", timeout=120000)
            page.wait_for_function("typeof StarfallRuntime !== 'undefined' && !!StarfallRuntime.galaxy",
                                   timeout=120000)
            page.bring_to_front()
            gpu = page.evaluate("""() => {
                const canvases=[...document.querySelectorAll('canvas')];
                let renderer=null, vendor=null, version=null, webgl2=false;
                for (const c of canvases) {
                    let gl=null;
                    try { gl=c.getContext('webgl2'); } catch (_e) {}
                    if (!gl) continue;
                    webgl2=true;
                    const ext=gl.getExtension('WEBGL_debug_renderer_info');
                    renderer=ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
                    vendor=ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null;
                    version=gl.getParameter(gl.VERSION);
                    break;
                }
                return {webgl2,renderer,vendor,version,canvasCount:canvases.length};
            }""")
            renderer = (gpu.get("renderer") or "").lower()
            hardware_confirmed = bool(gpu.get("webgl2") and renderer
                                      and not any(s in renderer for s in SOFTWARE_PATTERNS))
            if not hardware_confirmed:
                print("WARNING: Hardware GPU not verified. Renderer:", gpu.get("renderer"))
                print("Performance numbers will be recorded but CANNOT pass the hardware gate.")
            page.set_default_timeout(args.seconds * 1000 + 120000)
            measurements = page.evaluate("""(seconds) => new Promise(resolve => {
                const frames=[];
                let first=null,previous=null;
                function tick(time) {
                    if(first===null) first=time;
                    if(previous!==null) frames.push(time-previous);
                    previous=time;
                    if(time-first<seconds*1000){
                        requestAnimationFrame(tick);
                    } else {
                        frames.sort((a,b)=>a-b);
                        const q=p=>frames.length ? frames[Math.min(frames.length-1,
                            Math.ceil(frames.length*p)-1)] : null;
                        const elapsed=(time-first)/1000;
                        resolve({
                            secondsObserved:elapsed,frameCount:frames.length,
                            fps:elapsed>0?frames.length/elapsed:0,
                            frameP50Ms:q(.50),frameP95Ms:q(.95),frameP99Ms:q(.99),
                            framesOver50Ms:frames.filter(x=>x>50).length,
                            visibility:document.visibilityState,
                            memoryHeapBytes:performance.memory?.usedJSHeapSize??null
                        });
                    }
                }
                requestAnimationFrame(tick);
            })""", args.seconds)
            stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            screenshot = args.output_dir / f"starfall-{args.edition}-{stamp}.png"
            page.screenshot(path=str(screenshot), full_page=False)
            passed = (
                hardware_confirmed
                and measurements["visibility"] == "visible"
                and measurements["secondsObserved"] >= args.seconds
                and measurements["fps"] >= args.min_fps
                and measurements["frameP95Ms"] is not None
                and measurements["frameP95Ms"] <= args.max_p95_ms
            )
            report = {
                "kind": "STARFALL_8K_LOCAL_REAL_GPU",
                "utc": datetime.now(timezone.utc).isoformat(),
                "edition": args.edition,
                "browserChannel": args.browser,
                "browserVersion": browser.version,
                "platform": platform.platform(),
                "renderer": gpu,
                "gpuConfirmedHardware": hardware_confirmed,
                "thresholds": {"minFps": args.min_fps, "maxFrameP95Ms": args.max_p95_ms},
                "measurement": measurements,
                "result": "PASS_HARDWARE_FRAMETIME" if passed else "NOT_ACCEPTED",
                "limitations": (
                    "Measures foreground browser animation-frame pacing on a real local "
                    "machine, not end-to-end simulated two-world gameplay; a passing "
                    "report also requires human visual/camera/control and legacy-save QA."
                ),
                "screenshot": str(screenshot),
            }
            path = args.output_dir / f"starfall-{args.edition}-{stamp}.json"
            path.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(report, indent=2))
            print("Local report:", path)
            return 0 if passed else 2
        finally:
            browser.close()

if __name__ == "__main__":
    raise SystemExit(main())
