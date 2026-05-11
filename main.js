(function () {
  'use strict';

  let clapFired        = false;
  let entranceDone     = false;

  /* --------------------------------------------------
     FILM GRAIN
  -------------------------------------------------- */
  function initGrain() {
    const c = document.getElementById('grain');
    if (!c) return;
    const ctx = c.getContext('2d');

    function resize() { c.width = innerWidth; c.height = innerHeight; }

    function tick() {
      const w = c.width, h = c.height;
      const img = ctx.createImageData(w, h);
      const d   = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i+1] = d[i+2] = v;
        d[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      requestAnimationFrame(tick);
    }

    resize();
    tick();
    addEventListener('resize', resize);
  }

  /* --------------------------------------------------
     SYNTHESISED CLAP SOUND
  -------------------------------------------------- */
  function playClap() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();

      const sr  = ctx.sampleRate;
      const len = (sr * 0.18) | 0;
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 85) * 1.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;

      const bp = ctx.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = 2400;
      bp.Q.value = 1.2;
      bp.gain.value = 8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.4, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(hp); hp.connect(bp); bp.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.045);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.9, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);

    } catch (e) { /* audio blocked */ }
  }

  /* --------------------------------------------------
     COUNTDOWN LOADER
  -------------------------------------------------- */
  function initLoader(onDone) {
    const loader = document.getElementById('loader');
    const numEl  = document.getElementById('ldNum');
    const bar    = document.querySelector('.ld-progress');
    if (!loader) { onDone(); return; }

    const CIRC = 314;
    const STEPS = 5;
    let n = STEPS;

    function set(num) {
      numEl.textContent = num > 0 ? num : '';
      const offset = CIRC - CIRC * ((STEPS - num + 1) / STEPS);
      bar.style.strokeDashoffset = String(Math.max(0, offset));
    }

    set(STEPS);

    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        bar.style.strokeDashoffset = '0';
        numEl.textContent = '';
        setTimeout(() => {
          loader.classList.add('out');
          setTimeout(onDone, 500);
        }, 250);
      } else {
        set(n);
      }
    }, 900);
  }

  /* --------------------------------------------------
     CLAPPERBOARD 3D ENTRANCE
     JS-driven perspective/rotation/scale animation,
     then hands off to the scroll driver.
  -------------------------------------------------- */
  function initClapperEntrance(clapper, onDone) {
    const DURATION = 1100; // ms

    clapper.style.opacity   = '0';
    clapper.style.transform = 'perspective(900px) rotateX(10deg) rotateY(-6deg) scale(0.91)';

    const start = performance.now();

    function frame(ts) {
      const t    = Math.min(1, (ts - start) / DURATION);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic

      clapper.style.opacity   = String(ease);
      clapper.style.transform =
        `perspective(900px) rotateX(${10 * (1 - ease)}deg) rotateY(${-6 * (1 - ease)}deg) scale(${0.91 + 0.09 * ease})`;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        clapper.style.transform = '';
        entranceDone = true;
        onDone();
      }
    }

    requestAnimationFrame(frame);
  }

  /* --------------------------------------------------
     SCROLL DRIVER
     One central scroll handler manages:
       - clapperboard arm angle + board slide
       - panel wipe clip-paths
       - nav dot / counter sync
  -------------------------------------------------- */
  function initScrollDriver() {
    const clapper  = document.getElementById('clapper');
    const arm      = document.getElementById('clapperArm');
    const hWrapper = document.getElementById('h-wrapper');
    const panels   = Array.from(document.querySelectorAll('.h-panel'));
    const dots     = Array.from(document.querySelectorAll('.h-dot'));
    const curEl    = document.getElementById('hCur');
    const labelEl  = document.getElementById('hLabel');
    const prevBtn  = document.getElementById('hPrev');
    const nextBtn  = document.getElementById('hNext');

    if (!clapper || !arm || !hWrapper || !panels.length) return;

    const LABELS  = ['Films', 'About', 'Awards', 'Contact'];
    const TOTAL   = panels.length;

    function fmt(n) { return String(n + 1).padStart(2, '0'); }

    let lastPanelIdx = -1;

    function onScroll() {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      /* ---- Clapperboard (zone: 0 → vh) ---- */
      const clapP = sy / vh;  // 0 = top, 1 = bottom of clapper zone

      if (clapP < 1) {
        clapper.style.display   = '';
        clapper.style.opacity   = '1';

        // Arm rotates from -16° (open) to 0° (shut) over first 25% of zone
        const armP     = Math.min(1, clapP / 0.25);
        const armAngle = -16 * (1 - armP);
        arm.style.transform = `rotate(${armAngle}deg)`;

        // Clap fires once when arm reaches shut position
        if (armP >= 1 && !clapFired) {
          clapFired = true;
          playClap();
        }
        if (armP < 0.85) clapFired = false; // reset on scroll-back

        // Board slides up: from 30% to 100% of zone
        const slideP = Math.max(0, Math.min(1, (clapP - 0.3) / 0.7));
        clapper.style.transform = `translateY(${-slideP * 100}vh)`;

      } else {
        // Past clapper zone — hide completely
        clapper.style.display = 'none';
      }

      /* ---- Wipe panels ---- */
      const wrapTop    = hWrapper.getBoundingClientRect().top;
      const scrolledIn = -wrapTop;  // px scrolled into h-wrapper

      panels.forEach((panel, i) => {
        if (i === 0) return;  // films is always the base layer
        // Each subsequent panel wipes in over one viewport of scroll
        const progress = Math.max(0, Math.min(1, (scrolledIn - (i - 1) * vh) / vh));
        panel.style.clipPath = `inset(0 0 0 ${(1 - progress) * 100}%)`;
      });

      /* ---- Nav sync ---- */
      const panelIdx = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / vh)));
      if (panelIdx !== lastPanelIdx) {
        lastPanelIdx = panelIdx;
        dots.forEach((d, i) => d.classList.toggle('active', i === panelIdx));
        if (curEl)   curEl.textContent   = fmt(panelIdx);
        if (labelEl) labelEl.textContent = LABELS[panelIdx] || '';
      }

      // Arrow button states
      if (prevBtn) prevBtn.disabled = panelIdx <= 0 && scrolledIn <= 0;
      if (nextBtn) nextBtn.disabled = panelIdx >= TOTAL - 1 && scrolledIn >= (TOTAL - 1) * vh;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // sync on init

    /* ---- Helper: scroll to a panel index ---- */
    function goToPanel(idx) {
      idx = Math.max(0, Math.min(TOTAL - 1, idx));
      const target = hWrapper.offsetTop + idx * window.innerHeight;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }

    /* ---- Dot navigation ---- */
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const i = parseInt(dot.dataset.i, 10);
        goToPanel(i);
      });
    });

    /* ---- Arrow buttons ---- */
    if (prevBtn) prevBtn.addEventListener('click', () => {
      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      const cur = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / window.innerHeight)));
      goToPanel(cur - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      const cur = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / window.innerHeight)));
      goToPanel(cur + 1);
    });

    /* ---- Keyboard ---- */
    window.addEventListener('keydown', e => {
      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      if (scrolledIn < -100 || scrolledIn > (TOTAL - 1) * window.innerHeight + 200) return;
      const cur = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / window.innerHeight)));
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPanel(cur + 1); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goToPanel(cur - 1); }
    });

    /* ---- Touch swipe on sticky area ---- */
    const sticky = document.getElementById('h-sticky');
    if (sticky) {
      let tx = 0, ty = 0;
      sticky.addEventListener('touchstart', e => {
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
      }, { passive: true });
      sticky.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          const scrolledIn = -hWrapper.getBoundingClientRect().top;
          const cur = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / window.innerHeight)));
          goToPanel(dx < 0 ? cur + 1 : cur - 1);
        }
      }, { passive: true });
    }
  }

  /* --------------------------------------------------
     NAV
  -------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', scrollY > 60);
    }, { passive: true });
  }

  /* --------------------------------------------------
     FILM REEL CURSOR
     32mm reel SVG with hanging film strip.
     Disc rotates based on mouse velocity + idle drift.
  -------------------------------------------------- */
  function initCursor() {
    if (window.matchMedia('(hover:none)').matches) return;

    const el = document.createElement('div');
    el.id = 'film-cursor';

    el.innerHTML = `<svg viewBox="0 0 44 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Hanging film strip -->
      <rect x="19" y="35" width="6" height="37" fill="#1a1a1a" rx="0.5"/>
      <rect x="20" y="37" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="20" y="42" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="20" y="47" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="20" y="52" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="20" y="57" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="20" y="62" width="4" height="3"   fill="none" stroke="#444" stroke-width="0.4"/>
      <rect x="19"   y="38"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="19"   y="43"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="19"   y="48"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="19"   y="53"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="19"   y="58"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="24.1" y="38"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="24.1" y="43"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="24.1" y="48"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="24.1" y="53"  width="0.9" height="1.4" fill="#383838"/>
      <rect x="24.1" y="58"  width="0.9" height="1.4" fill="#383838"/>
      <!-- Rotating reel disc, center (22, 20) -->
      <g id="reel-disc">
        <circle cx="22" cy="20" r="18" fill="#111" stroke="#d8d8d8" stroke-width="0.7"/>
        <circle cx="22" cy="20" r="13.5" fill="none" stroke="#2a2a2a" stroke-width="3.2" stroke-dasharray="2.4 3.0"/>
        <!-- 3 spokes at 90°, 210°, 330° -->
        <line x1="22" y1="20" x2="22"   y2="3.5"  stroke="#c8c8c8" stroke-width="0.75"/>
        <line x1="22" y1="20" x2="7.3"  y2="28.3" stroke="#c8c8c8" stroke-width="0.75"/>
        <line x1="22" y1="20" x2="36.7" y2="28.3" stroke="#c8c8c8" stroke-width="0.75"/>
        <!-- Spoke end knobs -->
        <circle cx="22"   cy="4.8"  r="2.4" fill="#1a1a1a" stroke="#c8c8c8" stroke-width="0.65"/>
        <circle cx="8.5"  cy="28.9" r="2.4" fill="#1a1a1a" stroke="#c8c8c8" stroke-width="0.65"/>
        <circle cx="35.5" cy="28.9" r="2.4" fill="#1a1a1a" stroke="#c8c8c8" stroke-width="0.65"/>
        <!-- Hub -->
        <circle cx="22" cy="20" r="3.4" fill="#0c0c0c" stroke="#c8c8c8" stroke-width="0.65"/>
        <circle cx="22" cy="20" r="1.1" fill="#d8d8d8"/>
      </g>
    </svg>`;

    document.body.appendChild(el);

    const disc = el.querySelector('#reel-disc');
    let angle    = 0;
    let velocity = 0;
    let lastX    = 0;
    let lastY    = 0;

    window.addEventListener('mousemove', e => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      velocity = Math.sqrt(dx * dx + dy * dy) * 1.8;
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.left = e.clientX + 'px';
      el.style.top  = e.clientY + 'px';
      el.classList.add('visible');
    });

    function spin() {
      velocity *= 0.91;
      angle    += Math.max(0.25, velocity);
      if (angle >= 360) angle -= 360;
      disc.setAttribute('transform', `rotate(${angle}, 22, 20)`);
      requestAnimationFrame(spin);
    }
    spin();
  }

  /* --------------------------------------------------
     BOOT SEQUENCE
  -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initCursor();
    initNav();

    const clapper = document.getElementById('clapper');

    initLoader(() => {
      // Loader done → 3D entrance of clapperboard
      initClapperEntrance(clapper, () => {
        // Entrance done → unlock scroll and wire everything
        initScrollDriver();
        document.body.classList.remove('is-loading');
      });
    });
  });

})();
