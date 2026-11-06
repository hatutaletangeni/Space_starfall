# STARFALL MOBILE — separate offline landscape edition

Open **PLAY-STARFALL-MOBILE.html** on a phone in a browser that permits local HTML and WebGL2. This is an independently playable, self-contained game file (no CDN, online code, or second game implementation); the original PLAY-STARFALL.html remains the desktop edition.

**Rotate the device to landscape.** The left pad controls forward/reverse and steering. Hold RUN while moving to sprint/boost, UP to jump/ascend. The X button boards/exits the original truck or interacts with the environment; BRIDGE enters/exits the original ship interior; CARGO handles original cargo. The right pad controls pitch, roll, descent, view, alignment, lighting and time. Use top buttons for MENU, ENGINEER, MAP, SAVE, and TOOLS. HIDE reduces controls for reading or screenshots.

Touch targets use pointer-based hold/release, do not select button letters, and include a portrait rotate reminder. Normal text entry/selection in forms remains available. All UI actions reuse original game events; original physics, ships, 2368-star galaxy, rover, original truck and saves are unchanged.

To rebuild after changing source files:

    python tools/build-standalone.py
    python tools/build-mobile-standalone.py
    python tests/standalone-parity.py
    python tests/mobile-standalone-parity.py

The mobile game has its own exact source parity and touch-browser CI workflow; never replace the original desktop standalone with this variant.

Limitations: mobile GPU/WebGL2 support varies, local-file browser storage can be restricted (use the SAVE / RESTORE export feature), and web applications cannot reliably force OS screen rotation if device orientation lock is enabled.
