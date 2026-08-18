#!/usr/bin/env python3
"""Print one official Three.js Migration Guide section."""
import re
import sys
import urllib.request

if len(sys.argv) != 3:
    raise SystemExit('Usage: migration-section.py <from_revision> <to_revision>')

source, target = sys.argv[1:]
url = 'https://raw.githubusercontent.com/wiki/mrdoob/three.js/Migration-Guide.md'
text = urllib.request.urlopen(url, timeout=20).read().decode()

heading = re.search(
    rf'^## r?{re.escape(source)} → r?{re.escape(target)}\s*$',
    text,
    re.MULTILINE,
)
if heading is None:
    print(f'No official migration section: {source} → {target}')
    raise SystemExit(2)

next_heading = re.search(r'^## ', text[heading.end():], re.MULTILINE)
end = heading.end() + (next_heading.start() if next_heading else len(text))
print(text[heading.start():end].rstrip())
