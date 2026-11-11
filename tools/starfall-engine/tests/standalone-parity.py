#!/usr/bin/env python3
"""Rebuild and confirm an editor standalone is reproducible."""
from pathlib import Path
import hashlib,subprocess,sys
root=Path(__file__).resolve().parents[1]
target=root/'PLAY-STARFALL-ENGINE.html'
before=hashlib.sha256(target.read_bytes()).hexdigest()
subprocess.run([sys.executable,str(root/'tools/build-standalone.py')],check=True)
after=hashlib.sha256(target.read_bytes()).hexdigest()
if before!=after: raise AssertionError('Standalone mismatch: '+before+' != '+after)
print('PASS editor standalone parity:',after)
