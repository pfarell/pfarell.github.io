/* Portrait: pixel-art base + real-photo spotlight reveal + cursor tracking.
   Hovering starts a soft radial reveal centred on the cursor that smoothly
   expands until it has uncovered the entire photo; leaving contracts it
   back into the pixel art. Tilt/tracking is frame-rate independent. */
(function () {
  const card = document.getElementById("portrait-card");
  if (!card) return;

  const canvas = card.querySelector("canvas");
  const inner = card.querySelector(".portrait-inner");
  const real = card.querySelector(".portrait-real");
  const ctx = canvas.getContext("2d");
  const art = new Image();
  const SCRIPT_BASE = (document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/[^/]*$/, "")
    : "");
  art.src = SCRIPT_BASE + "../assets/img/portrait-pixel.png";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function draw() {
    if (!art.complete || !art.naturalWidth) return;
    const r = card.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(art, 0, 0, canvas.width, canvas.height);
  }

  art.addEventListener("load", draw);
  window.addEventListener("resize", draw);
  draw();

  let tx = 0, ty = 0;
  let tiltX = 0, tiltY = 0;
  let maskX = 0.5, maskY = 0.5, tMaskX = 0.5, tMaskY = 0.5;
  let radius = 0, tRadius = 0;
  let last = performance.now();

  function applyMask() {
    /* Map the cursor (card space) into the element's own coordinates:
       the photo sits in .portrait-inner which overscans the card by 7%. */
    const OV = 0.07;
    const mx = maskX * (1 + 2 * OV) - OV;
    const my = maskY * (1 + 2 * OV) - OV;
    real.style.setProperty("--mx", (mx * 100).toFixed(2) + "%");
    real.style.setProperty("--my", (my * 100).toFixed(2) + "%");
    real.style.setProperty("--mr", radius.toFixed(1) + "px");
  }

  function applyTilt() {
    inner.style.transform =
      "translate3d(" + (tiltX * 12).toFixed(2) + "px," + (tiltY * 10).toFixed(2) + "px,0) " +
      "rotateX(" + (-tiltY * 5).toFixed(2) + "deg) rotateY(" + (tiltX * 7).toFixed(2) + "deg)";
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      const r = card.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.5)));
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.5)));
      const over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      card.classList.toggle("is-hover", over);
      tMaskX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      tMaskY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      /* Localised reveal: the spotlight is deliberately small so only the
         part under the cursor (shoulder, face, …) unpixelates. */
      tRadius = over ? Math.min(r.width, r.height) * 0.30 : 0;
      if (reduced) {
        tiltX = tx; tiltY = ty;
        maskX = tMaskX; maskY = tMaskY; radius = tRadius;
        applyTilt();
        applyMask();
      }
    },
    { passive: true }
  );

  card.addEventListener("pointerleave", function () {
    card.classList.remove("is-hover");
    tRadius = 0;
    if (reduced) {
      radius = 0;
      applyMask();
    }
  });

  function tick(now) {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;
    const k = 1 - Math.pow(0.92, dt);
    tiltX += (tx - tiltX) * k;
    tiltY += (ty - tiltY) * k;
    maskX += (tMaskX - maskX) * Math.min(1, k * 1.5);
    maskY += (tMaskY - maskY) * Math.min(1, k * 1.5);
    radius += (tRadius - radius) * Math.min(1, k * 0.45);
    applyTilt();
    applyMask();
    requestAnimationFrame(tick);
  }

  applyMask();
  if (!reduced) requestAnimationFrame(tick);
})();
