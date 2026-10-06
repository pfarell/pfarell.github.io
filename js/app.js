/* Global interactions: nav glider, scroll progress, sky parallax,
   reveal-on-scroll, draggable philosophy card stack, sticker physics. */
(function () {
  /* ---------- theme toggle ---------- */
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const dark = document.documentElement.classList.toggle("dark");
      try {
        localStorage.setItem("theme-preference", dark ? "dark" : "light");
      } catch (e) {}
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#111111" : "#f8f9f8");
    });
  }

  /* ---------- nav glider ---------- */
  const pill = document.querySelector(".nav-pill");
  if (pill) {
    const glider = pill.querySelector(".nav-glider");
    const items = Array.prototype.slice.call(pill.querySelectorAll(".nav-item"));
    const active = pill.querySelector(".nav-item.active") || items[0];

    function move(el) {
      if (!el || !glider) return;
      glider.style.width = el.offsetWidth + "px";
      glider.style.transform = "translateX(" + el.offsetLeft + "px)";
      glider.style.opacity = "1";
    }

    items.forEach(function (it) {
      it.addEventListener("mouseenter", function () { move(it); });
    });
    pill.addEventListener("mouseleave", function () { move(active); });
    window.addEventListener("resize", function () { move(active); });
    window.addEventListener("load", function () { move(active); });
    requestAnimationFrame(function () { move(active); });
  }

  /* ---------- scroll progress ---------- */
  const progress = document.getElementById("progress");
  const bar = document.getElementById("progress-bar");
  if (progress && bar) {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      progress.classList.toggle("visible", window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- sky parallax ---------- */
  const skyImg = document.getElementById("sky-img");
  if (skyImg && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "scroll",
      function () {
        const y = Math.min(window.scrollY * 0.22, 90);
        skyImg.style.transform = "translateY(" + y.toFixed(1) + "px)";
      },
      { passive: true }
    );
  }

  /* ---------- reveal on scroll ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- draggable philosophy card stack ---------- */
  const stack = document.querySelector(".card-stack");
  if (stack) {
    const cards = Array.prototype.slice.call(stack.querySelectorAll(".phil-card"));
    const n = cards.length;
    let index = 0;
    let drag = null;

    function place(animate) {
      cards.forEach(function (c, i) {
        const off = (i - index + n) % n;
        c.style.transition = animate
          ? "transform .5s cubic-bezier(.22,1,.36,1), opacity .4s ease"
          : "none";
        c.style.transform =
          "translate3d(" + off * 18 + "px," + off * 12 + "px,0) rotate(" + off * 5 + "deg)";
        c.style.zIndex = String(n - off);
        c.style.opacity = off > 2 ? "0" : "1";
        c.classList.toggle("is-under", off > 0);
      });
    }

    function fling(dir) {
      const top = cards[index];
      top.style.transition = "transform .42s cubic-bezier(.4,0,.7,.3), opacity .42s ease";
      top.style.transform =
        "translate3d(" + dir * 620 + "px, 40px, 0) rotate(" + dir * 22 + "deg)";
      top.style.opacity = "0";
      window.setTimeout(function () {
        index = (index + 1) % n;
        top.style.transition = "none";
        top.style.opacity = "1";
        place(false);
      }, 380);
    }

    stack.addEventListener("pointerdown", function (e) {
      const top = cards[index];
      if (!top.contains(e.target)) return;
      drag = { x: e.clientX, moved: false };
      top.style.transition = "none";
      stack.setPointerCapture(e.pointerId);
    });

    stack.addEventListener("pointermove", function (e) {
      if (!drag) return;
      const top = cards[index];
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      top.style.transform =
        "translate3d(" + dx + "px," + Math.abs(dx) * 0.08 + "px,0) rotate(" + dx * 0.045 + "deg)";
    });

    function endDrag(e) {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      drag = null;
      if (Math.abs(dx) > 80) {
        fling(dx > 0 ? 1 : -1);
      } else if (!drag || Math.abs(dx) <= 80) {
        if (dx === 0) fling(1);
        else place(true);
      }
    }

    stack.addEventListener("pointerup", endDrag);
    stack.addEventListener("pointercancel", function () { drag = null; place(true); });
    stack.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); fling(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); fling(-1); }
    });

    place(false);
  }

  /* ---------- sticker physics ---------- */
  const panel = document.querySelector(".stack-panel");
  if (panel) {
    const items = Array.prototype.slice.call(panel.querySelectorAll(".sticker"));
    const FR = [
      [0.02, 0.42, -6],
      [0.24, 0.5, 4],
      [0.06, 0.7, -4],
      [0.36, 0.14, -30],
      [0.47, 0.42, -5],
      [0.52, 0.62, 5],
      [0.62, 0.24, -12],
      [0.74, 0.45, 10],
      [0.83, 0.2, -12],
      [0.8, 0.62, 3]
    ];
    const S = items.map(function () {
      return { x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, w: 0, h: 0, dragging: false };
    });
    let drag = null;
    let laidOut = false;

    function positions() {
      const pw = panel.clientWidth;
      const ph = panel.clientHeight;
      items.forEach(function (el, i) {
        const f = FR[i % FR.length];
        S[i].x = Math.max(6, Math.min(f[0] * pw, pw - S[i].w - 6));
        S[i].y = Math.max(6, Math.min(f[1] * ph, ph - S[i].h - 6));
        S[i].a = f[2];
        S[i].vx = S[i].vy = S[i].va = 0;
      });
    }

    function apply() {
      items.forEach(function (el, i) {
        const s = S[i];
        el.style.transform =
          "translate3d(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px,0) rotate(" + s.a.toFixed(2) + "deg)";
      });
    }

    function physics() {
      const pw = panel.clientWidth;
      const ph = panel.clientHeight;
      items.forEach(function (el, i) {
        const s = S[i];
        if (s.dragging) return;
        s.x += s.vx;
        s.y += s.vy;
        s.a += s.va;
        s.vx *= 0.92;
        s.vy *= 0.92;
        s.va *= 0.9;
        if (s.x < 0) { s.x = 0; s.vx *= -0.4; }
        if (s.y < 0) { s.y = 0; s.vy *= -0.4; }
        if (s.x > pw - s.w) { s.x = pw - s.w; s.vx *= -0.4; }
        if (s.y > ph - s.h) { s.y = ph - s.h; s.vy *= -0.4; }
      });
      apply();
      requestAnimationFrame(physics);
    }

    function measure() {
      items.forEach(function (el, i) {
        const r = el.getBoundingClientRect();
        S[i].w = r.width;
        S[i].h = r.height;
      });
      if (!laidOut && items.length && S[0].w > 0) {
        laidOut = true;
        positions();
        apply();
      }
    }

    items.forEach(function (el, i) {
      el.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        const s = S[i];
        s.dragging = true;
        drag = { i: i, px: e.clientX, py: e.clientY, ox: s.x, oy: s.y, lx: e.clientX, ly: e.clientY };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener("pointermove", function (e) {
        if (!drag || drag.i !== i) return;
        const s = S[i];
        s.x = drag.ox + (e.clientX - drag.px);
        s.y = drag.oy + (e.clientY - drag.py);
        s.vx = (e.clientX - drag.lx) * 0.55;
        s.vy = (e.clientY - drag.ly) * 0.55;
        s.va = (e.clientX - drag.lx) * 0.25;
        drag.lx = e.clientX;
        drag.ly = e.clientY;
        apply();
      });
      function up() {
        if (drag && drag.i === i) {
          S[i].dragging = false;
          drag = null;
        }
      }
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });

    const reset = panel.querySelector(".stack-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        positions();
        apply();
      });
    }

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    requestAnimationFrame(measure);
    requestAnimationFrame(physics);
  }
  /* ---------- polaroid real <-> pixel switch ---------- */
  document.querySelectorAll(".polaroid[data-switch]").forEach(function (p) {
    function toggle() {
      var flipped = p.classList.toggle("flipped");
      p.setAttribute("aria-pressed", flipped ? "true" : "false");
    }
    p.addEventListener("click", toggle);
    p.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
})();
