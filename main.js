(function () {
  'use strict';

  let clapFired = false;

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
      hp.type = 'highpass'; hp.frequency.value = 900;
      const bp = ctx.createBiquadFilter();
      bp.type = 'peaking'; bp.frequency.value = 2400; bp.Q.value = 1.2; bp.gain.value = 8;
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
      osc.connect(oscGain); oscGain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07);
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
    const CIRC = 314, STEPS = 5;
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
        setTimeout(() => { loader.classList.add('out'); setTimeout(onDone, 500); }, 250);
      } else { set(n); }
    }, 900);
  }

  /* --------------------------------------------------
     SCROLL DRIVER
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

    const LABELS = ['Films', 'About', 'Awards', 'Contact'];
    const TOTAL  = panels.length;
    function fmt(n) { return String(n + 1).padStart(2, '0'); }
    let lastPanelIdx = -1;

    function onScroll() {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      /* Clapperboard zone: scrollY 0 → vh */
      const clapP = sy / vh;
      if (clapP < 1) {
        clapper.style.display = '';
        clapper.style.opacity = '1';
        const armP     = Math.min(1, clapP / 0.25);
        const armAngle = -16 * (1 - armP);
        arm.style.transform = `rotate(${armAngle}deg)`;
        if (armP >= 1 && !clapFired) { clapFired = true; playClap(); }
        if (armP < 0.85) clapFired = false;
        const slideP = Math.max(0, Math.min(1, (clapP - 0.3) / 0.7));
        clapper.style.transform = `translateY(${-slideP * 100}vh)`;
      } else {
        clapper.style.display = 'none';
      }

      /* Wipe panels */
      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      panels.forEach((panel, i) => {
        if (i === 0) return;
        const progress = Math.max(0, Math.min(1, (scrolledIn - (i-1)*vh) / vh));
        panel.style.clipPath = `inset(0 0 0 ${(1-progress)*100}%)`;
      });

      /* Nav sync */
      const panelIdx = Math.min(TOTAL-1, Math.max(0, Math.floor(scrolledIn / vh)));
      if (panelIdx !== lastPanelIdx) {
        lastPanelIdx = panelIdx;
        dots.forEach((d, i) => d.classList.toggle('active', i === panelIdx));
        if (curEl)   curEl.textContent   = fmt(panelIdx);
        if (labelEl) labelEl.textContent = LABELS[panelIdx] || '';
      }
      if (prevBtn) prevBtn.disabled = panelIdx <= 0 && scrolledIn <= 0;
      if (nextBtn) nextBtn.disabled = panelIdx >= TOTAL-1 && scrolledIn >= (TOTAL-1)*vh;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function goToPanel(idx) {
      idx = Math.max(0, Math.min(TOTAL-1, idx));
      window.scrollTo({ top: hWrapper.offsetTop + idx * window.innerHeight, behavior: 'smooth' });
    }

    dots.forEach(dot => dot.addEventListener('click', () => goToPanel(parseInt(dot.dataset.i, 10))));

    if (prevBtn) prevBtn.addEventListener('click', () => {
      const cur = Math.min(TOTAL-1, Math.max(0, Math.floor(-hWrapper.getBoundingClientRect().top / window.innerHeight)));
      goToPanel(cur - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const cur = Math.min(TOTAL-1, Math.max(0, Math.floor(-hWrapper.getBoundingClientRect().top / window.innerHeight)));
      goToPanel(cur + 1);
    });

    window.addEventListener('keydown', e => {
      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      if (scrolledIn < -100 || scrolledIn > (TOTAL-1)*window.innerHeight + 200) return;
      const cur = Math.min(TOTAL-1, Math.max(0, Math.floor(scrolledIn / window.innerHeight)));
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPanel(cur+1); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goToPanel(cur-1); }
    });

    const sticky = document.getElementById('h-sticky');
    if (sticky) {
      let tx = 0, ty = 0;
      sticky.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
      sticky.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - tx;
        const dy = e.changedTouches[0].clientY - ty;
        if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          const cur = Math.min(TOTAL-1, Math.max(0, Math.floor(-hWrapper.getBoundingClientRect().top / window.innerHeight)));
          goToPanel(dx < 0 ? cur+1 : cur-1);
        }
      }, { passive: true });
    }
  }

  /* --------------------------------------------------
     FILM REEL CURSOR — Q-shape reel, GPU-composited via translate3d
  -------------------------------------------------- */
  function initCursor() {
    if (window.matchMedia('(hover:none)').matches) return;
    const el = document.createElement('div');
    el.id = 'film-cursor';
    el.innerHTML = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill="#f0f0f0"/>
      <circle cx="22" cy="7.5"  r="7.2" fill="#0c0c0c"/>
      <circle cx="7.5"  cy="22" r="7.2" fill="#0c0c0c"/>
      <circle cx="36.5" cy="22" r="7.2" fill="#0c0c0c"/>
      <circle cx="22" cy="36.5" r="7.2" fill="#0c0c0c"/>
      <circle cx="22" cy="22" r="3.8" fill="#0c0c0c"/>
      <rect x="38" y="39" width="10" height="7" fill="#f0f0f0" rx="3.5"/>
    </svg>`;
    document.body.appendChild(el);
    window.addEventListener('mousemove', e => {
      el.style.transform = `translate3d(${e.clientX - 7}px,${e.clientY - 7}px,0)`;
      if (!el.classList.contains('visible')) el.classList.add('visible');
    }, { passive: true });
  }

  /* --------------------------------------------------
     BOOT SEQUENCE
  -------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initCursor();
    const clapper = document.getElementById('clapper');
    initLoader(() => {
      clapper.style.opacity = '1';
      clapper.classList.add('is-active');
      document.body.classList.remove('is-loading');
      initScrollDriver();
    });
  });

})();