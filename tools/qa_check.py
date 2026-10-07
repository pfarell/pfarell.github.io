"""Responsive + interaction gate for the portfolio.

Checks per page and viewport: horizontal overflow, console/page errors,
actionable-element touch sizes, and saves evidence screenshots.
Also exercises the philosophy drag and the sticker drag.
"""

import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots", "qa")
BASE = "http://127.0.0.1:4173/"
PAGES = ["index.html", "projects/", "about/"]
VIEWPORTS = [(375, 812), (768, 1024), (1280, 900), (1888, 1000)]

os.makedirs(OUT, exist_ok=True)
report = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    for page_name in PAGES:
        for w, h in VIEWPORTS:
            pg = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            errors = []
            pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
            pg.on(
                "console",
                lambda m: errors.append("console." + m.type + ": " + m.text)
                if m.type == "error"
                else None,
            )
            pg.goto(BASE + page_name, wait_until="networkidle")
            pg.wait_for_timeout(2300)

            metrics = pg.evaluate(
                """() => {
                    const d = document.documentElement;
                    const vw = window.innerWidth;
                    const small = [];
                    for (const el of document.querySelectorAll('a, button, [role="button"]')) {
                        const r = el.getBoundingClientRect();
                        if (r.width === 0 && r.height === 0) continue;
                        const style = getComputedStyle(el);
                        if (style.visibility === 'hidden' || style.display === 'none') continue;
                        if (r.width < 44 || r.height < 44) {
                            small.push({
                                tag: el.tagName.toLowerCase(),
                                cls: (el.className || '').toString().slice(0, 60),
                                label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
                                w: Math.round(r.width), h: Math.round(r.height)
                            });
                        }
                    }
                    const text = document.body.innerText || '';
                    const mojibake = ['â€', 'Â', 'Ã', 'ðŸ'].filter(p => text.includes(p));
                    return {
                        scrollWidth: d.scrollWidth,
                        innerWidth: vw,
                        overflow: d.scrollWidth - vw,
                        small: small,
                        mojibake: mojibake
                    };
                }"""
            )
            report.append(
                {
                    "page": page_name,
                    "viewport": f"{w}x{h}",
                    "overflow_px": metrics["overflow"],
                    "small_targets": metrics["small"],
                    "mojibake": metrics["mojibake"],
                    "errors": errors,
                }
            )
            pg.screenshot(path=os.path.join(OUT, f"{page_name.replace('.html', '').strip('/').replace('/', '-') or 'index'}-{w}.png"))
            pg.close()

    # theme toggle + assistant + reveal checks on desktop
    pg = browser.new_page(viewport={"width": 1888, "height": 1000})
    errors2 = []
    pg.on("pageerror", lambda e: errors2.append("pageerror: " + str(e)))
    pg.on(
        "console",
        lambda m: errors2.append("console." + m.type + ": " + m.text) if m.type == "error" else None,
    )
    pg.goto(BASE + "index.html", wait_until="networkidle")
    pg.wait_for_timeout(2200)

    is_dark = pg.evaluate("() => document.documentElement.classList.contains('dark')")
    pg.click("#theme-toggle")
    pg.wait_for_timeout(500)
    dark_after = pg.evaluate("() => document.documentElement.classList.contains('dark')")
    stored = pg.evaluate("() => localStorage.getItem('theme-preference')")
    report.append(
        {
            "page": "index.html",
            "test": "dark mode toggle",
            "initial_dark": is_dark,
            "dark_after_click": dark_after,
            "stored": stored,
            "pass": dark_after != is_dark and stored == ("dark" if dark_after else "light"),
        }
    )

    mask = pg.evaluate(
        "() => getComputedStyle(document.querySelector('.portrait-real')).maskImage || getComputedStyle(document.querySelector('.portrait-real')).webkitMaskImage"
    )
    report.append(
        {
            "page": "index.html",
            "test": "spotlight reveal mask present",
            "mask_snippet": (mask or "")[:60],
            "pass": "radial-gradient" in (mask or ""),
        }
    )
    card_box = pg.locator("#portrait-card").bounding_box()
    pg.mouse.move(card_box["x"] + card_box["width"] * 0.3, card_box["y"] + card_box["height"] * 0.35)
    pg.wait_for_timeout(900)
    mid_radius = pg.evaluate(
        "() => document.querySelector('.portrait-real').style.getPropertyValue('--mr')"
    )
    pg.mouse.move(card_box["x"] + card_box["width"] / 2, card_box["y"] + card_box["height"] / 2)
    pg.wait_for_timeout(1400)
    full_radius = pg.evaluate(
        "() => document.querySelector('.portrait-real').style.getPropertyValue('--mr')"
    )
    report.append(
        {
            "page": "index.html",
            "test": "spotlight stays local (shoulder-scale, never full-bleed)",
            "mid": mid_radius,
            "full": full_radius,
            "card_width": round(card_box["width"]),
            "pass": 50 < float(mid_radius.replace("px", "") or 0)
            and 50 < float(full_radius.replace("px", "") or 0) < card_box["width"] * 0.5,
        }
    )

    pg.click("#assistant-fab")
    pg.wait_for_timeout(600)
    open_state = pg.evaluate(
        "() => document.querySelector('.assistant').classList.contains('open') && !document.querySelector('.assistant-panel').hasAttribute('inert')"
    )
    header_text = pg.evaluate("() => document.querySelector('.assistant-id').textContent")
    kb_size = pg.evaluate("() => parseInt(document.querySelector('.assistant').getAttribute('data-kb'), 10)")
    foot = pg.evaluate("() => !!document.querySelector('.assistant-foot')")
    report.append(
        {
            "page": "index.html",
            "test": "Wanderly branding, KB size, footer removed",
            "header": header_text,
            "kb_entries": kb_size,
            "footer_element": foot,
            "pass": "Wanderly" in header_text and kb_size >= 700 and foot is False,
        }
    )
    pg.fill(".assistant-input", "what is openvoice")
    pg.press(".assistant-input", "Enter")
    pg.wait_for_timeout(4200)
    msgs = pg.evaluate(
        "() => Array.from(document.querySelectorAll('.assistant-log .msg')).map(m => m.textContent)"
    )
    answer_ok = any("faster-whisper" in m or "dictation" in m.lower() for m in msgs) and len(msgs) >= 2
    report.append(
        {
            "page": "index.html",
            "test": "assistant answers question",
            "open": open_state,
            "messages": len(msgs),
            "answer_hit": answer_ok,
            "pass": open_state and answer_ok,
        }
    )
    pg.screenshot(path=os.path.join(OUT, "assistant-open.png"))
    pg.click(".assistant-close")
    pg.wait_for_timeout(400)
    closed = pg.evaluate("() => !document.querySelector('.assistant').classList.contains('open')")
    report.append({"page": "index.html", "test": "assistant closes", "pass": closed})
    report.append({"page": "index.html", "test": "errors during interactions", "errors": errors2, "pass": len(errors2) == 0})

    stack = pg.locator(".card-stack")
    stack.scroll_into_view_if_needed()
    pg.wait_for_timeout(700)
    before = pg.evaluate("() => document.querySelector('.card-stack .phil-card').style.transform")
    box = stack.bounding_box()
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    pg.mouse.move(cx, cy)
    pg.mouse.down()
    pg.mouse.move(cx + 260, cy + 20, steps=14)
    pg.mouse.up()
    pg.wait_for_timeout(900)
    after = pg.evaluate("() => document.querySelector('.card-stack .phil-card').style.transform")
    report.append(
        {
            "page": "index.html",
            "test": "philosophy drag cycles card",
            "before": before,
            "after": after,
            "pass": before != after,
        }
    )

    pg.goto(BASE + "projects.html", wait_until="networkidle")
    pg.wait_for_timeout(1200)
    stub_url = pg.url
    report.append(
        {
            "page": "projects.html (stub)",
            "test": "old .html link redirects to /projects/",
            "final_url": stub_url,
            "pass": stub_url.rstrip("/").endswith("/projects"),
        }
    )

    pg.goto(BASE + "about.html", wait_until="networkidle")
    pg.wait_for_timeout(2000)
    strip = pg.evaluate(
        "() => { var s = document.querySelector('.polaroid-strip'); return { cw: s.clientWidth, vw: window.innerWidth }; }"
    )
    polaroids = pg.evaluate("() => document.querySelectorAll('.polaroid').length")
    report.append(
        {
            "page": "about.html",
            "test": "polaroid strip is full-bleed (cards never clipped by a narrow container)",
            "strip_clientWidth": strip["cw"],
            "viewport": strip["vw"],
            "polaroids": polaroids,
            "pass": abs(strip["cw"] - strip["vw"]) <= 1 and polaroids >= 8,
        }
    )
    sticker = pg.locator(".sticker").first
    sticker.scroll_into_view_if_needed()
    pg.wait_for_timeout(700)
    s_before = pg.evaluate("() => document.querySelector('.sticker').style.transform")
    box = sticker.bounding_box()
    pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    pg.mouse.down()
    pg.mouse.move(box["x"] + box["width"] / 2 + 120, box["y"] + box["height"] / 2 - 60, steps=12)
    pg.mouse.up()
    pg.wait_for_timeout(700)
    s_after = pg.evaluate("() => document.querySelector('.sticker').style.transform")
    report.append(
        {
            "page": "about.html",
            "test": "sticker drag moves",
            "before": s_before,
            "after": s_after,
            "pass": s_before != s_after,
        }
    )

    # edge audit at phone width: body{overflow-x:hidden} can hide clipped content,
    # so scrollWidth==innerWidth is not enough — measure element edges directly.
    edge_js = """() => {
        const vw = window.innerWidth;
        const bad = [];
        const skips = ['.connect-band', '.polaroid-strip', '.assistant-chips', '.assistant-log', '.portrait-card', '.sky'];
        for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
            let skip = false;
            for (const s of skips) if (el.closest(s)) { skip = true; break; }
            if (skip) continue;
            if (r.right > vw + 0.5 || r.left < -0.5) bad.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40));
        }
        return bad;
    }"""
    for path in ["index.html", "about/", "projects/"]:
        pg.goto(BASE + path, wait_until="networkidle")
        pg.set_viewport_size({"width": 390, "height": 844})
        pg.wait_for_timeout(1200)
        clipped = pg.evaluate(edge_js)
        report.append(
            {
                "page": path,
                "viewport": 390,
                "test": "no content clipped at phone width (edge audit)",
                "clipped": clipped[:6],
                "pass": len(clipped) == 0,
            }
        )
        # minimum gutter: catches shorthand padding rules silently zeroing
        # the .container side padding (regression seen 2026-10-06)
        gutter = pg.evaluate(
            "() => { const c = document.querySelector('.container'); return c ? parseFloat(getComputedStyle(c).paddingLeft) : null; }"
        )
        report.append(
            {
                "page": path,
                "viewport": 390,
                "test": "container side gutter >= 16px at phone width",
                "padding_left": gutter,
                "pass": gutter is not None and gutter >= 16,
            }
        )
    browser.close()

print(json.dumps(report, indent=1))
