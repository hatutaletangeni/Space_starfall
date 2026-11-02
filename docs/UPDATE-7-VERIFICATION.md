# STARFALL Update 7 — Release verification

This repository's Update 7 **standalone HTML and 38 ordered JavaScript modules** are the tested implementation baseline.

## Previously observed
- 17 model/unit suites passed in the Update 7 source package.
- Focused simulated-browser flow: truck reboarding fix, rocket design and launch, satellite deployment, rover transfer and command execution.
- Existing EVA sky-look, controls, archaeology, rover science and outpost interactions passed individually under mocked WebGL2.
- Packaged standalone/source parity passed.
- A combined older browser test sweep stalled; individual passes do not justify claiming a clean combined pass.

## Not verified
- Real hardware/WebGL2 rendering, FPS and mobile performance.
- Long gameplay sessions and full saved-game reload in a fresh browser session.
- Full-body rocket physics and a high-fidelity traction/suspension model.

## Reproduce
```sh
node tests/launch7.test.cjs
python tests/standalone-parity.py
python tools/build-standalone.py
```

The original versioned Update 7 archive (including all historical tests, documentation, reference imagery and rollback ZIPs) is available from the ChatGPT project delivery; it is **not** committed to Git to avoid tracking nested large binary backups.
