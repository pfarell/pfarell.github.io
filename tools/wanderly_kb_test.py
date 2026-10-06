"""Wanderly v4 regression suite.

Structural: js/wanderly-kb.js must parse as JSON after the assignment prefix,
with no duplicate ask patterns, every entry non-empty.
Behavioural: a battery of queries through the real page (local server on
127.0.0.1:4173) must land on the right answers — including a negative control
that proves the checker can fail.

Run:  python tools/wanderly_kb_test.py
Exit code 0 only when all checks pass.
"""

import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_FILE = os.path.join(ROOT, "js", "wanderly-kb.js")
BASE = "http://127.0.0.1:4173/index.html"

CASES = [
    # small talk
    ("how are you", ["running smoothly", "all answers and no bugs"]),
    ("thanks a lot", ["my pleasure", "anytime"]),
    ("tell me another joke", ["dark mode", "light attracts bugs"]),
    ("flip a coin", ["heads", "tails"]),
    ("i am tired", ["rest is productive", "checkpoints"]),
    ("good morning", ["good evening", "good morning", "good afternoon"]),
    # general knowledge
    ("what is gravity", ["attraction between"]),
    ("what is a black hole", ["event horizon"]),
    ("what is quantum mechanics", ["physics of very small"]),
    ("what is climate change", ["fossil fuels"]),
    ("what is the speed of light", ["299,792,458"]),
    ("what is a qubit", ["superposition"]),
    ("what is machine learning", ["patterns from data", "learning patterns"]),
    ("what is an api", ["defined contract"]),
    ("what is a neural network", ["inspired by the brain", "layers"]),
    ("what is entropy", ["measure of how spread out"]),
    ("how to study effectively", ["actively, not passively", "recall"]),
    ("what is compound interest", ["interest earning interest", "interest earning interest"]),
    ("what is the sun", ["star at the center"]),
    # farell extras
    ("what is his email", ["raditfarell77"]),
    ("who is winnrras", ["co-author", "rasendriya"]),
    ("what are the polaroids", ["flip", "polaroid"]),
    ("does he like cars", ["porsche"]),
    ("who created you", ["farell"]),
    ("are you chatgpt", ["not chatgpt"]),
    # calculator + existing regression
    ("what is 12 * 7", ["= 84"]),
    ("what is 100 / 4", ["= 25"]),
    ("what is openvoice", ["dictation"]),
    ("what is his latest edution", ["purdue"]),
    ("what model are you", ["no model"]),
]


def structural_checks():
    problems = []
    raw = open(KB_FILE, encoding="utf-8").read()
    start = raw.index("[")
    end = raw.rindex("]") + 1
    entries = json.loads(raw[start:end])
    if len(entries) < 650:
        problems.append("extra entries below 650: %d" % len(entries))
    seen = {}
    total_asks = 0
    for i, e in enumerate(entries):
        if not e.get("asks"):
            problems.append("entry %d has no asks" % i)
        if not e.get("keys"):
            problems.append("entry %d has no keys" % i)
        if not e.get("a"):
            problems.append("entry %d has no answer" % i)
        for a in e.get("asks", []):
            total_asks += 1
            if a in seen:
                problems.append("duplicate ask %r (%d and %d)" % (a, seen[a], i))
            seen[a] = i
    print("structural: %d entries, %d ask patterns, %d problems" % (len(entries), total_asks, len(problems)))
    for p in problems[:20]:
        print("  " + p)
    return len(problems) == 0


def behavioural_checks():
    results = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 420, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE, wait_until="networkidle")
        pg.wait_for_timeout(1800)
        kb = int(pg.evaluate("() => document.querySelector('.assistant').getAttribute('data-kb')"))
        asks = int(pg.evaluate("() => document.querySelector('.assistant').getAttribute('data-asks')"))
        results.append(("data-kb >= 700", kb >= 700, "kb=%d asks=%d" % (kb, asks)))
        pg.click("#assistant-fab")
        pg.wait_for_timeout(500)

        WAIT_ANSWER = """(prev) => {
            const m = document.querySelectorAll('.assistant-log .msg.bot');
            if (m.length <= prev) return false;
            const t = m[m.length - 1].textContent.trim();
            return t.length > 0 && !document.querySelector('.assistant-send').disabled;
        }"""

        def ask_and_read(q):
            # never submit while a previous answer is still streaming
            try:
                pg.wait_for_function("() => !document.querySelector('.assistant-send').disabled", timeout=5000)
            except Exception:
                pass
            pg.wait_for_timeout(150)
            prev = pg.evaluate("() => document.querySelectorAll('.assistant-log .msg.bot').length")
            pg.fill(".assistant-input", q)
            pg.press(".assistant-input", "Enter")
            try:
                pg.wait_for_function(WAIT_ANSWER, arg=prev, timeout=30000)
            except Exception:
                pass
            return pg.evaluate(
                "() => { var m = document.querySelectorAll('.assistant-log .msg.bot'); return m.length ? m[m.length-1].textContent : ''; }"
            )

        for q, expects in CASES:
            last = ask_and_read(q)
            ok = any(x.lower() in last.lower() for x in expects)
            results.append((q, ok, last[:100].replace("\n", " ")))

        # negative control: run the SAME check against an impossible expectation
        # using a real answer — it must report failure.
        sample = ask_and_read("what is gravity")
        nc_ok = not any(x.lower() in sample.lower() for x in ["this phrase exists nowhere at all"])
        results.append(("negative control (checker can fail)", nc_ok, "impossible expectation reported as fail"))
        results.append(("no console errors", len(errors) == 0, "; ".join(errors[:3])))

        # every page must load the extended KB (catches ../ script-path bugs)
        for path in ["projects/", "about/"]:
            pg.goto("http://127.0.0.1:4173/" + path, wait_until="networkidle")
            pg.wait_for_timeout(900)
            page_kb = int(pg.evaluate("() => parseInt(document.querySelector('.assistant').getAttribute('data-kb'), 10)"))
            results.append(("kb loads on /" + path, page_kb == kb, "kb=%d" % page_kb))
        b.close()

    passed = 0
    for name, ok, detail in results:
        passed += 1 if ok else 0
        print(("PASS " if ok else "FAIL ") + str(name) + "  ->  " + detail)
    print("behavioural: %d/%d" % (passed, len(results)))
    return passed == len(results)


if __name__ == "__main__":
    ok_struct = structural_checks()
    ok_behav = behavioural_checks()
    print("RESULT:", "ALL PASS" if ok_struct and ok_behav else "FAILURES PRESENT")
    sys.exit(0 if ok_struct and ok_behav else 1)
