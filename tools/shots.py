import sys
from playwright.sync_api import sync_playwright


def main():
    url = sys.argv[1]
    out = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1888
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
    full = len(sys.argv) > 5 and sys.argv[5] == "full"
    scroll = int(sys.argv[6]) if len(sys.argv) > 6 else 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.goto(url, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(2600)
        if full:
            total = pg.evaluate("() => document.documentElement.scrollHeight")
            y = 0
            while y < total:
                pg.evaluate(f"window.scrollTo(0,{y})")
                pg.wait_for_timeout(260)
                y += h
            pg.evaluate("window.scrollTo(0,0)")
            pg.wait_for_timeout(900)
        if scroll:
            pg.evaluate(f"window.scrollTo(0,{scroll})")
            pg.wait_for_timeout(1400)
        pg.screenshot(path=out, full_page=full)
        b.close()
    print("saved", out)


main()
