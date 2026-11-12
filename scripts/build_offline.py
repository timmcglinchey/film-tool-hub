import os
import re
"""Make a single, double-clickable Film Tool Hub file from the site folder (no web address needed).
Google sign-in is switched off in this version, because Google only allows it on the real web address."""
import json, re, sys
R = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'Film Tool Hub (offline).html')
man = json.load(open(f'{R}/tools/tools.json'))
embed = {'tools/tools.json': open(f'{R}/tools/tools.json').read(), 'hub/kit.css': open(f'{R}/hub/kit.css').read(),
         'hub/config.json': json.dumps({'googleClientId': '', 'adminEmails': []})}
for t in man['tools']: embed[t['file']] = open(f"{R}/{t['file']}").read()
page = open(f'{R}/index.html').read()
css = open(f'{R}/hub/hub.css').read(); js = open(f'{R}/hub/hub.js').read()
safe = lambda s: re.sub(r'(?i)</(script)', r'\\x3C/\1', s).replace('<!--', '\\x3C!--').replace('<script', '\\x3Cscript')
page = page.replace('<link rel="stylesheet" href="hub/hub.css">', '<style>\n' + css + '\n</style>', 1)
data = '<script>window.__FTH_EMBED = ' + json.dumps(embed).replace('<', '\\u003c') + ';</script>\n'
assert '<script src="hub/hub.js"></script>' in page
page = page.replace('<script src="hub/hub.js"></script>', data + '<script>\n' + safe(js) + '\n</script>', 1)
page = page.replace('<title>', '<title>(Offline) ', 1)
open(OUT, 'w').write(page)
print('wrote', OUT, len(page))
