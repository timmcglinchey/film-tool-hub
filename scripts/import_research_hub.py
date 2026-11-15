"""Bring a new version of the Specialist Research Hub into Film Tool Hub (My Research).

    python3 scripts/import_research_hub.py "Specialist_Research_Hub.html"            (writes tools/research.html)
    python3 scripts/import_research_hub.py "Specialist_Research_Hub.html" out.html   (writes somewhere else)

The content and behaviour stay exactly as Tim wrote them. The script only:
  - gives it the hub's fonts and neutral colours (each role keeps its own accent colour),
  - hides its own light/dark button inside the hub (the hub's button does that),
  - rewrites the welcome page's "Keeping your work safe" for the hub (private, saved to the person's Drive),
  - makes exports taken inside the hub clean standalone files (no hub scripts or styles in them),
  - makes the submission file use the hub's look.
If a newer version changes one of the lines it edits, it stops with an error naming that line, so nothing
half-converted is written. Then the matching line below needs updating."""
import os, sys
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tools', 'research.html')
h = open(src, encoding='utf-8').read()
n = 0
def rep(a, b, count=1):
    global h, n
    c = h.count(a)
    assert c == count, (a[:80], c)
    h = h.replace(a, b); n += 1

FONTS = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=JetBrains+Mono:wght@400;500;600&display=swap'
OLDF = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600&display=swap'
rep(OLDF, FONTS, 2)   # the page, and the submission file it builds
rep("<style>\n*,*::before", '<style id="rh-css">\n*,*::before')
# fonts used in rules (the page and the submission file)
h = h.replace("'Bebas Neue',sans-serif", 'var(--disp)').replace("'Inter',system-ui,sans-serif", 'var(--disp)').replace("'Inter',sans-serif", 'var(--disp)')
assert 'Bebas' not in h and "'Inter'" not in h

LOOK = '''
/* Film Tool Hub look: the hub's fonts and neutrals; each role keeps its own accent colour */
:root{--navy:#0b0c0e;--mid:#101216;--card:#15181d;--bd:#2a3039;--slate:#9aa0aa;--sl2:#c3c7cd;--white:#f0ece5;--l0:#2a3039;
  --disp:"Archivo",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:dark}
[data-theme=light]{--navy:#f3f0ea;--mid:#fff;--card:#fff;--bd:#d9d3c8;--slate:#565c66;--sl2:#2c3038;--white:#16181c;--l0:#d9d3c8;color-scheme:light}
body{font-family:var(--disp);-webkit-font-smoothing:antialiased}
h1{font:800 clamp(36px,7vw,62px)/.95 var(--disp);font-variation-settings:"wdth" 70;text-transform:uppercase;letter-spacing:.005em}
h2,.sec h2{font:800 23px/1.1 var(--disp);font-variation-settings:"wdth" 70;text-transform:uppercase;letter-spacing:.01em}
.lv .n{font:800 26px/1 var(--disp);font-variation-settings:"wdth" 70}
.eb{font:500 10.5px/1.5 var(--mono);letter-spacing:.14em}
.chip,.tag,.mine,.sec h2 i,.wb code,#mt{font-family:var(--mono)}
button{font:600 12.5px/1 var(--disp);letter-spacing:0;text-transform:none;border-radius:9px;padding:9px 13px;color:var(--white);background:var(--card);border-color:var(--bd)}
button:hover{border-color:var(--amber);color:var(--white);background:var(--mid)}
.x{padding:3px 8px}
input,textarea,select{border-radius:9px}
.tile,.pri,.box,.q,.ev,.add,.lv{border-radius:14px}
.gb{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--navy) 88%,transparent);backdrop-filter:blur(12px) saturate(1.2);-webkit-backdrop-filter:blur(12px) saturate(1.2)}
html.inhub .thb{display:none}
@media(max-width:620px){.gb{position:static}}
::selection{background:color-mix(in srgb,var(--amber) 40%,transparent)}
::-webkit-scrollbar{width:11px;height:11px}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:6px;border:2px solid var(--navy)}::-webkit-scrollbar-track{background:transparent}
@media print{:root,[data-theme=light]{--navy:#fff;--mid:#fff;--card:#fff;--bd:#ccc;--slate:#444;--sl2:#222;--white:#000;--l0:#ccc}}
'''
rep("\n</style></head>", LOOK + "</style></head>")

# the light/dark button: inside the hub, the hub's own button does this
rep('<button onclick="theme()">Light / dark</button>', '<button class="thb" onclick="theme()">Light / dark</button>')

# knows when it runs inside Film Tool Hub
rep("let S={name:'',th:''", "const INHUB=!!window.__fthCat;\nlet S={name:'',th:''")
rep("function init(){useRole(S.role);document.documentElement.dataset.theme=S.th;",
    "function init(){useRole(S.role);if(INHUB)document.documentElement.classList.add('inhub');else document.documentElement.dataset.theme=S.th;")

# the submission file takes this page's own styles (inside the hub, the first <style> is the hub's)
rep("const css=document.querySelector('style').textContent", "const css=document.getElementById('rh-css').textContent")
rep("'<!DOCTYPE html><html lang=\"en\" data-theme=\"'+S.th+'\"", "'<!DOCTYPE html><html lang=\"en\" data-theme=\"'+(INHUB?(document.documentElement.dataset.theme=='light'?'light':''):S.th)+'\"")

# exports made inside the hub are clean standalone files: no hub scripts, styles or theme marks
rep("function clean(){const c=document.documentElement.cloneNode(true),a=c.querySelector('#app');",
    "function clean(){const c=document.documentElement.cloneNode(true),a=c.querySelector('#app');c.querySelectorAll('script[data-fth],style[data-fth],style[data-fth-kit],datalist#fth-people').forEach(x=>x.remove());{const hd=c.querySelector('head'),m=hd&&hd.querySelector('meta[charset]');while(m&&hd.firstChild&&hd.firstChild!==m)hd.removeChild(hd.firstChild)}c.classList.remove('inhub','fth-dark','fth-light','fth-invert');if(!c.classList.length)c.removeAttribute('class');c.removeAttribute('style');if(INHUB)c.removeAttribute('data-theme');")

# inside the hub, saving works differently: say so on the welcome page
START = '<h2>Keeping your work safe</h2><div class="box"><b>This hub is a file, not a website.</b>'
i = h.index(START); j = h.index('<h2>Submitting your work</h2>', i)
orig = h[i:j]
HUB = '''<h2>Keeping your work safe</h2><div class="box"><b>Your research is private to you.</b> It stays the same whichever project you have open, it is never part of a project file, and nobody you share a project with can see it.</div>
<div class="pri" style="margin-top:12px">
${step(1,'It saves as you go','Your work is saved in this browser automatically. When you are signed in to Film Tool Hub with Google, it is also kept in a private file in the Film Tool Hub folder of your own Google Drive, so it follows you to any computer you sign in on. When you work on two computers, the most recent work is the one kept.')}
${step(2,'Add your name','Type your name into the box at the top of the page before you export, so your files are named after you.')}
${step(3,'Exports are still worth having','<b>Export hub (HTML)</b> downloads a complete copy of the hub with all your work inside, for every role, that opens in any browser. <b>Save progress</b> downloads a small file holding only your work, and <b>Load progress</b> puts it back. Keep a dated copy now and then, for example <code>research-hub-'+esc(nm)+'_'+stamp+'.html</code>: it is the same rule you would apply to footage.')}
${step(4,'Be careful with two buttons','<b>Reset all</b> deletes all of your research, here and, the next time it saves, in your Google Drive too. <b>Load progress</b> replaces your current work with the file you choose. Export first if you are not sure.')}
</div>
'''
assert '`' not in orig and '`' not in HUB
h = h[:i] + '${INHUB?`' + HUB + '`:`' + orig + '`}' + h[j:]
assert '${step(1,' in orig
# version note
rep('<meta name="hub-version" content="1.31.0">', '<meta name="hub-version" content="1.31.0"><meta name="film-tool-hub" content="research: personal, same in every project">')
open(out, 'w', encoding='utf-8').write(h)
print('ok', n, 'replacements;', len(h), 'bytes')
