"""
Builds every launcher / splash asset from the MediBloom mark.

The mark is the same flower-and-capsule drawn by the `Logo` component in
app/src/components/Icon.tsx, so the icon on the home screen and the logo inside
the app cannot drift apart. Re-run this after changing either.

    python scripts/generate-icons.py

Needs headless Chrome (to rasterise the SVG) and Pillow (to compose).
"""

import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "assets")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

CREAM = "#FDF8F6"
ROSE = "#E85D8A"
ROSE_LIGHT = "#F4A6C1"
VIOLET = "#8B5FBF"
VIOLET_LIGHT = "#C9B6E4"
GOLD = "#D4A574"

# rotation, fill, opacity — mirrors the petals array in Icon.tsx
PETALS = [
    (0, ROSE, 0.90),
    (60, ROSE_LIGHT, 0.85),
    (120, VIOLET, 0.90),
    (180, VIOLET_LIGHT, 0.85),
    (240, GOLD, 0.85),
    (300, ROSE, 0.80),
]


def flower_svg(mono=False):
    """The mark on a 40x40 viewBox, centred on (20, 20)."""
    petals = []
    for rot, fill, opacity in PETALS:
        petals.append(
            f'<ellipse cx="0" cy="-10" rx="5.5" ry="10" '
            f'fill="{"#000000" if mono else fill}" '
            f'opacity="{1 if mono else opacity}" '
            f'transform="rotate({rot})"/>'
        )

    if mono:
        # A single flat silhouette; Android recolours it for themed icons.
        centre = '<circle cx="0" cy="0" r="6.5" fill="#000000"/>'
    else:
        centre = (
            '<circle cx="0" cy="0" r="6.5" fill="#FFFFFF"/>'
            f'<rect x="-4" y="-1.4" width="8" height="2.8" rx="1.4" '
            f'fill="{VIOLET}" transform="rotate(45)"/>'
        )

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" '
        'width="100%" height="100%">'
        f'<g transform="translate(20,20)">{"".join(petals)}{centre}</g>'
        "</svg>"
    )


def page(size, scale, background, mono=False):
    """An HTML page holding the mark at `scale` of the canvas."""
    mark = int(size * scale)
    offset = (size - mark) // 2
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body {{ margin:0; padding:0; width:{size}px; height:{size}px; overflow:hidden; }}
  body {{ background:{background}; }}
  #m {{ position:absolute; left:{offset}px; top:{offset}px;
        width:{mark}px; height:{mark}px; }}
</style></head>
<body><div id="m">{flower_svg(mono)}</div></body></html>"""


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    found = shutil.which("chrome") or shutil.which("msedge")
    if found:
        return found
    sys.exit("Could not find Chrome or Edge to rasterise the icons.")


def render(chrome, html, size, out_path, transparent):
    """Screenshots one HTML page to a PNG of exactly size x size."""
    with tempfile.TemporaryDirectory() as tmp:
        html_path = os.path.join(tmp, "icon.html")
        shot_path = os.path.join(tmp, "shot.png")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(html)

        cmd = [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--screenshot={shot_path}",
            f"--window-size={size},{size}",
        ]
        if transparent:
            cmd.append("--default-background-color=00000000")
        cmd.append("file:///" + html_path.replace("\\", "/"))

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if not os.path.exists(shot_path):
            sys.exit(
                f"Chrome produced no screenshot for {out_path}\n"
                f"{result.stderr.decode(errors='replace')[:800]}"
            )

        img = Image.open(shot_path).convert("RGBA")
        if img.size != (size, size):
            img = img.resize((size, size), Image.LANCZOS)
        img.save(out_path)
        print(f"  {os.path.basename(out_path):32} {size}x{size}")


def gradient_background(size, out_path):
    """The adaptive-icon backplate: cream falling to a soft rose."""
    top = (253, 248, 246)
    bottom = (250, 228, 233)
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        row = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = row
    img.save(out_path)
    print(f"  {os.path.basename(out_path):32} {size}x{size}")


def main():
    chrome = find_chrome()
    print(f"Rasterising with: {chrome}")
    os.makedirs(ASSETS, exist_ok=True)

    # Play Store / iOS icon: full bleed on cream.
    render(chrome, page(1024, 0.68, CREAM), 1024,
           os.path.join(ASSETS, "icon.png"), transparent=False)

    # Android adaptive icon. The launcher masks and scales this, so the mark
    # has to sit inside the safe zone rather than filling the square.
    render(chrome, page(512, 0.54, "transparent"), 512,
           os.path.join(ASSETS, "android-icon-foreground.png"), transparent=True)

    gradient_background(512, os.path.join(ASSETS, "android-icon-background.png"))

    render(chrome, page(432, 0.54, "transparent", mono=True), 432,
           os.path.join(ASSETS, "android-icon-monochrome.png"), transparent=True)

    # Splash: transparent so it sits on the themed splash background.
    render(chrome, page(1024, 0.55, "transparent"), 1024,
           os.path.join(ASSETS, "splash-icon.png"), transparent=True)

    render(chrome, page(48, 0.78, CREAM), 48,
           os.path.join(ASSETS, "favicon.png"), transparent=False)

    print("Done.")


if __name__ == "__main__":
    main()
