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
heading = f'## r{source} → r{target}'
start = text.find(heading)
if start < 0:
    print(f'No official migration section: r{source} → r{target}')
    raise SystemExit(2)

match = re.search(r'\n## ', text[start + len(heading):])
end = start + len(heading) + (match.start() if match else len(text))
print(text[start:end].rstrip())
