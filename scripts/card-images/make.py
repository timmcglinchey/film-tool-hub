"""Makes the picture on each home-page tool card (assets/cards/<id>.webp).

Each picture is a crop of a screenshot of the tool, recoloured in its stage's two colours.
The site shows it heavily blurred until the card is hovered ("rack focus"). The film grain and
the darkening behind the text are separate layers added by the site (hub.css, assets/cards/grain.png),
so they stay sharp; they are not baked into the picture.

  1. Take the screenshots:   node scripts/card-images/shoot.js     (needs Playwright; writes to scripts/card-images/shots/)
  2. Make the pictures:      python3 scripts/card-images/make.py    (needs Pillow and numpy)
     or just some of them:   python3 scripts/card-images/make.py camera-report dof

To change what a card shows, change its crop in CROPS below: (left, top, width) in the
1440 x 900 screenshot. The height follows from the picture's shape.
A new tool needs a line in CROPS; until it has a picture its card uses the old icon look.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.path.join(HERE, 'shots')
OUT = os.path.join(ROOT, 'assets', 'cards')

# (left, top, width) in the 1440 x 900 dark-mode screenshot
CROPS = {
    'script-dev':    (190, 40, 820),
    'coverage':      (300, 30, 1000),
    'moodboard':     (100, 200, 900),
    'palette':       (0, 330, 900),
    'breakdown':     (60, 110, 900),
    'script-lining': (200, 60, 920),
    'budget':        (0, 20, 1100),
    'casting':       (40, 270, 1000),
    'release':       (560, 60, 880),
    'recce':         (200, 100, 1000),
    'loc-agree':     (560, 60, 880),
    'shotlist':      (0, 0, 1000),
    'blocking':      (300, 120, 900),
    'lighting':      (250, 220, 760),
    'falsecolour':   (40, 100, 1100),
    'schedule':      (620, 90, 820),
    'risk':          (640, 120, 800),
    'callsheet':     (680, 40, 740),
    'script-log':    (650, 60, 760),
    'camera-report': (660, 60, 760),
    'pattern-lab':   (330, 200, 720),
    'ratio-lab':     (140, 80, 700),
    'exposure':      (200, 160, 860),
    'dof':           (100, 150, 900),
    'colour-temp':   (180, 60, 1080),
    'mic-placement': (140, 200, 1100),
    'spectrum':      (15, 150, 1020),
    # the wide "start here" cards: the task list, not the big title (the card shows the title)
    'storydev':      (160, 420, 1140),   # the three-strand timeline
    'preprod':       (300, 600, 1140),
    'production':    (300, 560, 1140),
    'postprod':      (300, 640, 1140),
}
WIDE = {'storydev', 'preprod', 'production', 'postprod'}
SIZE, WIDE_SIZE = (768, 480), (1600, 330)

# each stage's colour sweeps diagonally into a partner colour
PARTNER = {'develop': '#e8506a', 'prep': '#3d6bff', 'shoot': '#c03fa0', 'post': '#6a2cff', 'learn': '#3b2bd9'}


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255

def lum(a):
    return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722

def gradmap(l, col):
    """shadows -> inky tint of the colour, mids -> the colour, highlights -> a pale tint"""
    l = l[..., None]
    ink, pale = col * .10 + .02, col * .35 + .65
    lo = ink + (col - ink) * np.clip(l / .55, 0, 1)
    hi = col + (pale - col) * np.clip((l - .55) / .45, 0, 1)
    return np.where(l < .55, lo, hi)

def treat(img, accent, partner, size, seed, grain=0):
    W, H = size
    arr = np.asarray(img.resize(size, Image.LANCZOS), float) / 255
    l = lum(arr)
    a, b = np.percentile(l, 1), np.percentile(l, 99.5)
    l = np.clip((l - a) / max(b - a, 1e-3), 0, 1) ** .85
    l = .10 + l * .9
    y, x = np.mgrid[0:H, 0:W]
    t = np.deg2rad(-28)
    m = x * np.cos(t) - y * np.sin(t); m = ((m - m.min()) / (m.max() - m.min()))[..., None]
    out = gradmap(l, hexrgb(accent)) * (1 - m) + gradmap(l, hexrgb(partner)) * m
    # soft glow around the highlights
    hl = Image.fromarray((np.clip(out, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(10))
    out = 1 - (1 - out) * (1 - np.asarray(hl, float) / 255 * .22)
    # film grain, strongest in the mid-tones
    n = np.random.default_rng(seed).normal(0, 1, (H, W))
    g = Image.fromarray(((n * 40) + 128).clip(0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
    n = ((np.asarray(g, float) - 128) / 40)[..., None]
    lm = lum(out)[..., None]
    out = out + n * grain * (.35 + 1.3 * lm * (1 - lm))
    # gentle vignette
    v = ((x - W / 2) / (W * .75)) ** 2 + ((y - H / 2) / (H * .9)) ** 2
    out = out * (1 - np.clip(v, 0, 1)[..., None] * .35)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype('uint8'))


def main(only):
    manifest = json.load(open(os.path.join(ROOT, 'tools', 'tools.json'), encoding='utf-8'))
    cats = {c['id']: c for c in manifest['categories']}
    tools = {t['id']: t for t in manifest['tools']}
    os.makedirs(OUT, exist_ok=True)
    for n, (tid, (x0, y0, w)) in enumerate(CROPS.items()):
        if only and tid not in only: continue
        size = WIDE_SIZE if tid in WIDE else SIZE
        h = round(w * size[1] / size[0])
        src = Image.open(os.path.join(SHOTS, tid + '.png')).convert('RGB')
        if y0 + h > src.height: y0 = src.height - h
        cat = tools[tid]['category']
        img = treat(src.crop((x0, y0, x0 + w, y0 + h)), cats[cat]['color'], PARTNER[cat], size, seed=n + 7)
        img.save(os.path.join(OUT, tid + '.webp'), quality=72, method=6)
        print(tid, os.path.getsize(os.path.join(OUT, tid + '.webp')) // 1024, 'KB')
    # the grain laid over every card (tileable)
    g = np.random.default_rng(3).normal(128, 46, (256, 256)).clip(0, 255).astype('uint8')
    Image.fromarray(g).filter(ImageFilter.GaussianBlur(.55)).save(os.path.join(OUT, 'grain.png'), optimize=True)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
