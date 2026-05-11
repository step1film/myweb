(function () {
  'use strict';

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
      const d = img.data;
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

      // --- Noise burst (the "crack") ---
      const sr = ctx.sampleRate;
      const len = (sr * 0.18) | 0;
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 85) * 1.2;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      // High-pass: remove rumble, keep snap
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;

      // Bandpass boost around wood-slap frequency
      const bp = ctx.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = 2400;
      bp.Q.value = 1.2;
      bp.gain.value = 8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.4, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(hp);
      hp.connect(bp);
      bp.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);

      // --- Wood thump (the low-end "body") ---
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

    } catch (e) {
      // Audio context blocked (needs user gesture) — silently ignore
    }
  }

  /* --------------------------------------------------
     COUNTDOWN LOADER
  -------------------------------------------------- */
  function initLoader(onDone) {
    const loader  = document.getElementById('loader');
    const numEl   = document.getElementById('ldNum');
    const bar     = document.querySelector('.ld-progress');
    if (!loader) { onDone(); return; }

    const CIRC = 314; // 2π × r50
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
     CLAPPERBOARD
  -------------------------------------------------- */
  function initClapper(onDone) {
    const clapper = document.getElementById('clapper');
    const arm     = document.getElementById('clapperArm');
    if (!clapper || !arm) { onDone(); return; }

    // Reveal the clapperboard
    clapper.classList.add('visible');

    let triggered = false;

    function doClap() {
      if (triggered) return;
      triggered = true;

      // Snap arm shut
      arm.classList.add('snapping');

      // Play sound at the moment of closure
      setTimeout(playClap, 62);

      // After clap, slide the whole board up
      setTimeout(() => {
        clapper.classList.add('exit');
        setTimeout(() => {
          clapper.style.display = 'none';
          document.body.classList.remove('is-loading');
          onDone();
        }, 580);
      }, 400);
    }

    // Trigger on scroll (wheel/touch/keyboard)
    function onWheel(e) {
      if (e.deltaY > 0) doClap();
    }

    let touchStartY = 0;
    function onTouchStart(e) {
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      if (e.touches[0].clientY < touchStartY - 10) doClap();
    }

    function onKey(e) {
      if (['ArrowDown','PageDown','Space',' '].includes(e.key)) {
        e.preventDefault();
        doClap();
      }
    }

    clapper.addEventListener('wheel',      onWheel,      { passive: true });
    clapper.addEventListener('touchstart', onTouchStart, { passive: true });
    clapper.addEventListener('touchmove',  onTouchMove,  { passive: true });
    clapper.addEventListener('click',      doClap);
    window.addEventListener('keydown',     onKey);
  }

  /* --------------------------------------------------
     NAV
  -------------------------------------------------- */
  function initNav() {
    const nav    = document.getElementById('nav');
    const toggle = nav && nav.querySelector('.nav-toggle');

    if (!nav) return;

    addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', scrollY > 60);
    }, { passive: true });

    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        document.body.style.overflow = open ? 'hidden' : '';
      });
    }

    nav.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* Active nav link — driven by horizontal panel index */
  function initActiveNav() {
    // Panels update this; wired inside initHorizontalScroll via goTo()
    // This stub keeps the call order intact
  }

  /* --------------------------------------------------
     HORIZONTAL SCROLL PANELS
  -------------------------------------------------- */
  function initHorizontalScroll() {
    const wrapper = document.getElementById('h-wrapper');
    const track   = document.getElementById('h-track');
    const panels  = Array.from(document.querySelectorAll('.h-panel'));
    const dots    = Array.from(document.querySelectorAll('.h-dot'));
    const curEl   = document.getElementById('hCur');
    const labelEl = document.getElementById('hLabel');
    const prevBtn = document.getElementById('hPrev');
    const nextBtn = document.getElementById('hNext');

    if (!wrapper || !track || !panels.length) return;

    const TOTAL   = panels.length;
    const LABELS  = ['Films', 'About', 'Awards', 'Contact'];
    let current   = 0;
    let animating = false;

    function fmt(n) { return String(n + 1).padStart(2, '0'); }

    function goTo(index, source) {
      index = Math.max(0, Math.min(TOTAL - 1, index));
      if (index === current && source !== 'init') return;

      // Deactivate old panel
      panels[current].classList.remove('is-active');
      current = index;

      // Move track
      track.style.transform = `translateX(calc(-${current} * 100vw))`;

      // Activate new panel (content slides in)
      requestAnimationFrame(() => {
        panels[current].classList.add('is-active');
      });

      // Update nav dots
      dots.forEach((d, i) => d.classList.toggle('active', i === current));

      // Update counter + label
      if (curEl)   curEl.textContent   = fmt(current);
      if (labelEl) labelEl.textContent = LABELS[current] || '';

      // Update arrow states
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === TOTAL - 1;

      // Scroll the page so the h-wrapper is fully in view
      if (source === 'dot' || source === 'key' || source === 'arrow') {
        const wrapTop = wrapper.offsetTop;
        const target  = wrapTop + current * window.innerHeight;
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    }

    // ---- Scroll-driven panning ----
    function onScroll() {
      const rect    = wrapper.getBoundingClientRect();
      const scrolled = -rect.top;                  // px scrolled into the wrapper
      if (scrolled < 0) return;                    // above wrapper, ignore
      const vh      = window.innerHeight;
      const index   = Math.round(scrolled / vh);
      goTo(Math.min(index, TOTAL - 1));
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // ---- Dot navigation ----
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const i = parseInt(dot.dataset.i, 10);
        goTo(i, 'dot');
      });
    });

    // ---- Arrow buttons ----
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1, 'arrow'));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1, 'arrow'));

    // ---- Keyboard ----
    window.addEventListener('keydown', e => {
      // Only act when the sticky panel is in view
      const rect = wrapper.getBoundingClientRect();
      if (rect.top > 10 || rect.bottom < -10) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(current + 1, 'key'); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goTo(current - 1, 'key'); }
    });

    // ---- Touch swipe ----
    let tx = 0, ty = 0;
    const sticky = document.getElementById('h-sticky');
    if (sticky) {
      sticky.addEventListener('touchstart', e => {
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
      }, { passive: true });

      sticky.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe → change panel
          if (dx < 0) goTo(current + 1, 'key');
          else        goTo(current - 1, 'key');
        }
      }, { passive: true });
    }

    // ---- Nav link overrides ----
    // Clicking Films/About/Awards/Contact in the nav jumps to correct panel
    const panelMap = { films: 0, about: 1, awards: 2, contact: 3 };
    document.querySelectorAll('#nav .nav-links a').forEach(a => {
      const id = a.getAttribute('href').replace('#', '');
      if (id in panelMap) {
        a.addEventListener('click', e => {
          e.preventDefault();
          goTo(panelMap[id], 'dot');
        });
      }
    });

    // ---- Init ----
    goTo(0, 'init');
  }

  /* --------------------------------------------------
     CURSOR
  -------------------------------------------------- */
  function initCursor() {
    if (window.matchMedia('(hover:none)').matches) return;

    const dot  = document.createElement('div');
    const ring = document.createElement('div');

    dot.style.cssText  = 'position:fixed;width:6px;height:6px;background:#e2e2e2;border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:width .25s,height .25s,background .25s;';
    ring.style.cssText = 'position:fixed;width:32px;height:32px;border:1px solid rgba(226,226,226,0.25);border-radius:50%;pointer-events:none;z-index:9997;transform:translate(-50%,-50%);transition:width .45s cubic-bezier(.16,1,.3,1),height .45s cubic-bezier(.16,1,.3,1),top .1s linear,left .1s linear;';

    document.body.appendChild(dot);
    document.body.appendChild(ring);

    addEventListener('mousemove', e => {
      dot.style.left  = ring.style.left = e.clientX + 'px';
      dot.style.top   = ring.style.top  = e.clientY + 'px';
    });

    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.width = dot.style.height = '10px';
        ring.style.width = ring.style.height = '48px';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.width = dot.style.height = '6px';
        ring.style.width = ring.style.height = '32px';
      });
    });
  }

  /* --------------------------------------------------
     BOOT SEQUENCE
  -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initCursor();
    initNav();
    initActiveNav();
    initHorizontalScroll();

    // Countdown → clapperboard → site
    initLoader(() => {
      initClapper(() => {
        // site revealed; horizontal scroll already wired
      });
    });
  });

})();
