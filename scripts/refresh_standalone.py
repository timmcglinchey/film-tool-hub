import os
"""Refresh every tool's standalone block (shared look + its category colour) and its fallback category label."""
import json, re, sys
R = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(f'{R}/tools/tools.json')); cats = {c['id']: c for c in man['categories']}
kit = open(f'{R}/hub/kit.css').read()
def accent(hexv):
    n = int(hexv.lstrip('#'), 16); r, g, b = n >> 16 & 255, n >> 8 & 255, n & 255
    ink = '#' + ''.join('%02x' % round(v * 0.58) for v in (r, g, b)); rgba = lambda a: f'rgba({r},{g},{b},{a})'
    return (f':root{{--fth-cat:{hexv};--fth-accent:{hexv};--fth-accent-ink:{hexv};--fth-accent-soft:{rgba(.14)};--fth-accent-line:{rgba(.45)};--fth-on-accent:#14110b}}'
            f':root[data-theme="light"]{{--fth-accent:{ink};--fth-accent-ink:{ink};--fth-accent-soft:{rgba(.16)};--fth-accent-line:{rgba(.6)};--fth-on-accent:#ffffff}}')
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=JetBrains+Mono:wght@400;500;600&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
for t in man['tools']:
    f = f"{R}/{t['file']}"; h = open(f).read(); c = cats[t['category']]
    label = f"{c['num']} · {c['name']}"
    block = f'''<!--fth-standalone-->
<!-- Film Tool Hub: this block is only used when this file is opened on its own (for example while working on it).
     Inside the hub it is removed and the hub supplies the same look from hub/kit.css. Keep it, but don't edit it here. -->
{FONTS}
<style>
{kit}
{accent(c['color'])}
</style>
<script>(function(){{var d=document.documentElement;if(d.getAttribute('data-theme'))return;var t=null;try{{t=localStorage.getItem('filmtoolhub-theme')}}catch(e){{}}d.setAttribute('data-theme',t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}})();</script>
<!--/fth-standalone-->
'''
    n0 = h.count('<!--fth-standalone-->')
    h = re.sub(r'<!--fth-standalone-->[\s\S]*?<!--/fth-standalone-->\n?', lambda m: block, h, count=1)
    h, n1 = re.subn(r'(data-fth-cat>)[^<]*(<)', lambda m: m.group(1) + label.replace('&', '&amp;') + m.group(2), h)
    h, n2 = re.subn(r"(window\.__fthCat \? __fthCat\.num \+ ' · ' \+ __fthCat\.name : ')[^']*(')", lambda m: m.group(1) + label + m.group(2), h)
    open(f, 'w').write(h)
    print(t['id'].ljust(14), label.ljust(36), 'block' if n0 else 'NO BLOCK', 'labels:', n1 + n2)
