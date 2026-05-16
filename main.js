/* =====================================================
   STEP1FILM — main.js
   Clean, modular, accessibility-first.
   ===================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------
     Capability + preference detection
  -------------------------------------------------- */
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isTouch =
    window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const isWideScreen = () =>
    window.matchMedia && window.matchMedia('(min-width: 901px)').matches;

  if (prefersReducedMotion) document.body.classList.add('reduced-motion');

  /* --------------------------------------------------
     FILM GRAIN — throttled, cached frames
     Old version: random RGB pixel fill at 60fps (~100% CPU on slow devices).
     New: pre-bake 8 noise tiles at small res, rotate at ~12fps,
     pause when document is hidden or reduced-motion is on.
  -------------------------------------------------- */
  function initGrain() {
    // Disabled per design decision — keep the function so the boot wiring
    // stays intact, but do no work.
    const c = document.getElementById('grain');
    if (c) c.style.display = 'none';
    return;
  }

  /* --------------------------------------------------
     SYNTHESISED CLAP SOUND
  -------------------------------------------------- */
  function playClap() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const sr = ctx.sampleRate;
      // Medium body — not too snappy, not too thuddy
      const len = (sr * 0.22) | 0;
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 65) * 1.1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      // Lowpass at 2 kHz — keeps mids/highs that read as "clap", but kills hiss
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2000; lp.Q.value = 0.5;
      // Peak in the mid-low — softens it into a wooden 'tok' rather than a slap
      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking'; peak.frequency.value = 480; peak.Q.value = 1.0; peak.gain.value = 6;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.1, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      noise.connect(lp); lp.connect(peak); peak.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);
      // Mid-low body — between snap and thump
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.07);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.85, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(oscGain); oscGain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.13);
    } catch (e) { /* audio blocked — silent */ }
  }

  /* --------------------------------------------------
     COUNTDOWN LOADER — now skippable + reduced-motion-aware
  -------------------------------------------------- */
  function initLoader(onDone) {
    const loader = document.getElementById('loader');
    const numEl = document.getElementById('ldNum');
    const bar = document.querySelector('.ld-progress');
    const skipBtn = document.getElementById('ldSkip');
    if (!loader) { onDone(); return; }

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      if (bar) bar.style.strokeDashoffset = '0';
      if (numEl) numEl.textContent = '';
      setTimeout(() => {
        loader.classList.add('out');
        setTimeout(onDone, 500);
      }, 250);
    }

    // Reduced motion: skip the cinematic boot entirely
    if (prefersReducedMotion) {
      loader.style.display = 'none';
      onDone();
      return;
    }

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
      if (n <= 0) { clearInterval(iv); finish(); }
      else set(n);
    }, 900);

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        clearInterval(iv);
        finish();
      });
    }

    // Escape key also skips
    window.addEventListener('keydown', function escListener(e) {
      if (done) { window.removeEventListener('keydown', escListener); return; }
      if (e.key === 'Escape' || e.key === 'Enter') {
        clearInterval(iv);
        finish();
        window.removeEventListener('keydown', escListener);
      }
    });
  }

  /* --------------------------------------------------
     HERO VIDEO — lazy load on click / scroll-in
  -------------------------------------------------- */
  function initHeroVideo() {
    const wrap = document.getElementById('heroVideoWrap');
    const playBtn = document.getElementById('heroPlay');
    if (!wrap || !playBtn) return;

    const cfg = window.STEP1FILM_VIDEO || {};
    const id = (cfg.id || '').trim();
    const provider = cfg.provider || 'youtube';

    if (!id) {
      // No ID configured — keep the poster, leave the button as a silent cue
      wrap.classList.add('no-video');
      playBtn.setAttribute('aria-disabled', 'true');
      playBtn.addEventListener('click', e => e.preventDefault());
      return;
    }

    let loaded = false;
    function loadVideo() {
      if (loaded) return;
      loaded = true;
      const iframe = document.createElement('iframe');
      let src = '';
      if (provider === 'vimeo') {
        src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?background=1&autoplay=1&muted=1&loop=1`;
      } else {
        // Built to match YouTube's official embed snippet for embed reliability.
        src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(id)}&controls=0&rel=0&showinfo=0&playsinline=1&modestbranding=1`;
      }
      iframe.setAttribute('src', src);
      iframe.setAttribute('title', 'Showreel');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('loading', 'lazy');
      wrap.insertBefore(iframe, wrap.firstChild);
      wrap.classList.add('playing');
    }

    // Autoload the iframe only once the hero is actually in view so the
    // user lands on a moving picture, not on a static black frame.
    const heroEl = document.getElementById('hero');
    if (heroEl && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting && e.intersectionRatio > 0.4)) {
          loadVideo();
          io.disconnect();
        }
      }, { threshold: [0, 0.4, 0.6] });
      io.observe(heroEl);
    } else {
      // No IO — eager load
      loadVideo();
    }

    playBtn.addEventListener('click', loadVideo);
  }

  /* --------------------------------------------------
     SCROLL DRIVER — desktop (horizontal wipe) only.
     On mobile we use a simpler IntersectionObserver-based nav sync.
  -------------------------------------------------- */
  function initScrollDriver() {
    const clapper = document.getElementById('clapper');
    const arm = document.getElementById('clapperArm');
    const hWrapper = document.getElementById('h-wrapper');
    const panels = Array.from(document.querySelectorAll('.h-panel'));
    const dots = Array.from(document.querySelectorAll('.h-dot'));
    const curEl = document.getElementById('hCur');
    const labelEl = document.getElementById('hLabel');
    const prevBtn = document.getElementById('hPrev');
    const nextBtn = document.getElementById('hNext');
    if (!clapper || !arm || !hWrapper || !panels.length) return;

    const LABELS = ['Films', 'About', 'Practice', 'Press', 'Contact'];
    const TOTAL = panels.length;
    const fmt = n => String(n + 1).padStart(2, '0');
    let lastPanelIdx = -1;
    let clapFired = false;
    let wideMode = isWideScreen();

    function setActive(panelIdx) {
      if (panelIdx === lastPanelIdx) return;
      lastPanelIdx = panelIdx;
      dots.forEach((d, i) => {
        const on = i === panelIdx;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
      if (curEl) curEl.textContent = fmt(panelIdx);
      if (labelEl) labelEl.textContent = LABELS[panelIdx] || '';
    }

    /* --- Desktop: clip-path wipe driven by scrollY --- */
    function onScrollDesktop() {
      const vh = window.innerHeight;
      const sy = window.scrollY;

      // Cinematic clapper sequence — 2 phases mapped to scrollY 0 → vh:
      //   0 → 0.75   CLOSE   (arm rotates + prop rotates to face-on + scales up)
      //   0.75 → 1.0  EXIT    (clapper fades out + slight scale-up)
      const clapP = sy / vh;
      const CLOSE_END = 0.75;
      const propEl = clapper.querySelector('.cl-prop');
      const stageEl = document.getElementById('stage-bg');

      const startScale = 0.42, endScale = 1.05;
      const startTiltY = -15, startTiltX = 7;

      if (clapP < 1) {
        clapper.style.display = '';
        if (stageEl) { stageEl.style.opacity = '1'; stageEl.style.display = ''; }

        if (clapP < CLOSE_END) {
          // CLOSE phase — drive arm + prop together
          const p = clapP / CLOSE_END;
          const armEase = p;                              // linear — arm starts closing immediately
          const propEase = 1 - Math.pow(1 - p, 3);        // easeOutCubic — smooth rotate-in

          arm.style.transform = `rotate(${-16 * (1 - armEase)}deg)`;

          const scale = startScale + (endScale - startScale) * propEase;
          const tiltY = startTiltY * (1 - propEase);
          const tiltX = startTiltX * (1 - propEase);
          if (propEl) {
            propEl.style.transform = `translate(-50%, -48%) scale(${scale}) rotateY(${tiltY}deg) rotateX(${tiltX}deg)`;
            propEl.classList.toggle('is-closing', clapP > 0.05);
            propEl.classList.remove('is-closed');
          }
          // Reset wipe clipPath when scrolling back into CLOSE
          clapper.style.clipPath = '';
          clapper.style.opacity = '1';
          clapper.style.transform = '';
          clapFired = false;
        } else {
          // EXIT phase — horizontal wipe (clip-path) reveals the hero behind
          arm.style.transform = 'rotate(0deg)';
          if (propEl) {
            propEl.style.transform = `translate(-50%, -48%) scale(${endScale}) rotateY(0deg) rotateX(0deg)`;
            propEl.classList.remove('is-closing');
            propEl.classList.add('is-closed');
          }
          if (!clapFired) {
            clapFired = true;
            if (!prefersReducedMotion) playClap();
          }
          const exitP = (clapP - CLOSE_END) / (1 - CLOSE_END);
          const easedExit = 1 - Math.pow(1 - exitP, 3); // easeOutCubic
          // Vertical wipe — clapper slides up out of frame, hero revealed below
          clapper.style.clipPath = `inset(0 0 ${easedExit * 100}% 0)`;
          clapper.style.opacity = '1';
          clapper.style.transform = '';
          if (stageEl) stageEl.style.opacity = String(Math.max(0, 1 - easedExit));
        }
      } else {
        clapper.style.display = 'none';
        clapper.style.clipPath = '';
        if (stageEl) stageEl.style.display = 'none';
      }

      const scrolledIn = -hWrapper.getBoundingClientRect().top;
      panels.forEach((panel, i) => {
        if (i === 0) return;
        const progress = Math.max(0, Math.min(1, (scrolledIn - (i - 1) * vh) / vh));
        panel.style.clipPath = `inset(0 0 0 ${(1 - progress) * 100}%)`;
      });

      const panelIdx = Math.min(TOTAL - 1, Math.max(0, Math.floor(scrolledIn / vh)));
      setActive(panelIdx);

      if (prevBtn) prevBtn.disabled = panelIdx <= 0 && scrolledIn <= 0;
      if (nextBtn) nextBtn.disabled = panelIdx >= TOTAL - 1 && scrolledIn >= (TOTAL - 1) * vh;
    }

    /* --- Mobile: keep clapper visible until scrolled past it; sync dots via IO --- */
    function setupMobileNav() {
      // Reset any inline clip-paths/transforms applied in desktop mode
      panels.forEach(p => { p.style.clipPath = ''; });
      clapper.style.transform = '';
      arm.style.transform = '';

      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const idx = parseInt(entry.target.dataset.panel, 10);
          if (!Number.isNaN(idx)) setActive(idx);
        });
      }, { threshold: [0.4, 0.6] });
      panels.forEach(p => io.observe(p));

      // Clapper visibility on mobile — same 2-phase choreography
      function onMobileScroll() {
        const sy = window.scrollY;
        const vh = window.innerHeight;
        const clapP = sy / vh;
        const CLOSE_END = 0.75;
        const propEl = clapper.querySelector('.cl-prop');
        const stageEl = document.getElementById('stage-bg');

        const startScale = 0.42, endScale = 1.05;
        const startTiltY = -15, startTiltX = 7;

        if (clapP < 1) {
          clapper.style.display = '';
          if (stageEl) { stageEl.style.opacity = '1'; stageEl.style.display = ''; }
          if (clapP < CLOSE_END) {
            const p = clapP / CLOSE_END;
            const armEase = p;
            const propEase = 1 - Math.pow(1 - p, 3);
            arm.style.transform = `rotate(${-16 * (1 - armEase)}deg)`;
            const scale = startScale + (endScale - startScale) * propEase;
            const tiltY = startTiltY * (1 - propEase);
            const tiltX = startTiltX * (1 - propEase);
            if (propEl) {
              propEl.style.transform = `translate(-50%, -48%) scale(${scale}) rotateY(${tiltY}deg) rotateX(${tiltX}deg)`;
              propEl.classList.toggle('is-closing', clapP > 0.05);
              propEl.classList.remove('is-closed');
            }
            clapper.style.clipPath = '';
            clapper.style.opacity = '1';
            clapFired = false;
          } else {
            arm.style.transform = 'rotate(0deg)';
            if (propEl) {
              propEl.style.transform = `translate(-50%, -48%) scale(${endScale}) rotateY(0deg) rotateX(0deg)`;
              propEl.classList.remove('is-closing');
              propEl.classList.add('is-closed');
            }
            if (!clapFired) {
              clapFired = true;
              if (!prefersReducedMotion) playClap();
            }
            const exitP = (clapP - CLOSE_END) / (1 - CLOSE_END);
            const easedExit = 1 - Math.pow(1 - exitP, 3);
            clapper.style.clipPath = `inset(0 0 ${easedExit * 100}% 0)`;
            clapper.style.opacity = '1';
            if (stageEl) stageEl.style.opacity = String(Math.max(0, 1 - easedExit));
          }
        } else {
          clapper.style.display = 'none';
          clapper.style.clipPath = '';
          if (stageEl) stageEl.style.display = 'none';
        }
      }
      window.addEventListener('scroll', onMobileScroll, { passive: true });
      onMobileScroll();
    }

    function goToPanel(idx) {
      idx = Math.max(0, Math.min(TOTAL - 1, idx));
      if (wideMode) {
        window.scrollTo({ top: hWrapper.offsetTop + idx * window.innerHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      } else {
        const target = panels[idx];
        if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    function currentIdx() {
      if (wideMode) {
        return Math.min(TOTAL - 1, Math.max(0, Math.floor(-hWrapper.getBoundingClientRect().top / window.innerHeight)));
      }
      // Mobile: find which panel is closest to viewport center
      const mid = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      panels.forEach((p, i) => {
        const r = p.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    /* --- Mount the right handler & wire controls --- */
    if (wideMode) {
      window.addEventListener('scroll', onScrollDesktop, { passive: true });
      onScrollDesktop();
    } else {
      setupMobileNav();
    }

    // Handle resize across breakpoints: simplest correct behaviour is to reload,
    // but that's harsh — instead, just toggle which observer set is active.
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        const nowWide = isWideScreen();
        if (nowWide !== wideMode) {
          // Reload to reset cleanly — rare action, acceptable cost.
          location.reload();
        }
      }, 250);
    });

    dots.forEach(dot => dot.addEventListener('click', () => goToPanel(parseInt(dot.dataset.i, 10))));

    if (prevBtn) prevBtn.addEventListener('click', () => goToPanel(currentIdx() - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPanel(currentIdx() + 1));

    window.addEventListener('keydown', e => {
      // Only intercept arrows when focus isn't inside a form-like field
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPanel(currentIdx() + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goToPanel(currentIdx() - 1); }
    });

    // Touch swipe — desktop sticky wipe doesn't get touchmove; mobile uses native scroll
    if (wideMode) {
      const sticky = document.getElementById('h-sticky');
      if (sticky) {
        let tx = 0, ty = 0;
        sticky.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        sticky.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].clientX - tx;
          const dy = e.changedTouches[0].clientY - ty;
          if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
          if (Math.abs(dx) > Math.abs(dy)) goToPanel(currentIdx() + (dx < 0 ? 1 : -1));
        }, { passive: true });
      }
    }
  }

  /* --------------------------------------------------
     FILM REEL CURSOR — desktop only, GPU-composited
  -------------------------------------------------- */
  function initCursor() {
    if (isTouch) return;
    const el = document.createElement('div');
    el.id = 'film-cursor';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    window.addEventListener('mousemove', e => {
      el.style.transform = `translate3d(${e.clientX - 10}px,${e.clientY - 10}px,0)`;
      if (!el.classList.contains('visible')) el.classList.add('visible');
    }, { passive: true });
  }

  /* --------------------------------------------------
     TWEAKS — accent color (red / amber / cool)
     Listens for the host editor's __activate_edit_mode message.
  -------------------------------------------------- */
  const ACCENTS = {
    red:   { value: '#e01c1c', label: 'Red' },
    amber: { value: '#d97718', label: 'Amber' },
    cool:  { value: '#5aa9d6', label: 'Cool' }
  };

  function initTweaks() {
    let current = localStorage.getItem('s1f.accent') || 'red';
    applyAccent(current);

    function applyAccent(name) {
      const a = ACCENTS[name] || ACCENTS.red;
      document.documentElement.style.setProperty('--accent', a.value);
      current = name;
      try { localStorage.setItem('s1f.accent', name); } catch (e) {}
      // Reflect in panel if mounted
      const swatches = document.querySelectorAll('.tw-swatch');
      swatches.forEach(s => {
        const pressed = s.dataset.accent === name;
        s.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      });
    }

    function buildPanel() {
      if (document.getElementById('tweaks')) return document.getElementById('tweaks');
      const panel = document.createElement('aside');
      panel.id = 'tweaks';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Tweaks');
      panel.innerHTML = `
        <div class="tw-head">
          <span>TWEAKS</span>
          <button class="tw-close" type="button" aria-label="Close tweaks">×</button>
        </div>
        <div>
          <label class="tw-label">Accent</label>
          <div class="tw-swatches" role="radiogroup" aria-label="Accent color">
            ${Object.entries(ACCENTS).map(([k, a]) => `
              <button class="tw-swatch" data-accent="${k}" type="button" role="radio" aria-label="${a.label}" aria-pressed="false">
                <span class="sw-dot" style="background:${a.value}"></span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      panel.querySelectorAll('.tw-swatch').forEach(btn => {
        btn.addEventListener('click', () => applyAccent(btn.dataset.accent));
      });
      panel.querySelector('.tw-close').addEventListener('click', () => {
        panel.classList.remove('is-open');
        try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
      });
      return panel;
    }

    window.addEventListener('message', e => {
      const data = e.data || {};
      if (data.type === '__activate_edit_mode') {
        const p = buildPanel();
        p.classList.add('is-open');
        // Re-sync pressed swatch
        applyAccent(current);
      } else if (data.type === '__deactivate_edit_mode') {
        const p = document.getElementById('tweaks');
        if (p) p.classList.remove('is-open');
      }
    });

    // Announce availability AFTER the listener is registered
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
  }

  /* --------------------------------------------------
     Clapperboard live values — ROLL count + DATE + DAY/NIGHT
  -------------------------------------------------- */
  function initClapperLive() {
    // ROLL — visit count, persisted in localStorage
    try {
      const rollEl = document.querySelector('[data-roll]');
      if (rollEl) {
        const visits = (parseInt(localStorage.getItem('s1f.visits') || '0', 10) || 0) + 1;
        localStorage.setItem('s1f.visits', String(visits));
        rollEl.textContent = String(Math.min(visits, 99)).padStart(2, '0');
      }
    } catch (e) { /* localStorage blocked */ }

    // DATE — current year
    const dateEl = document.querySelector('[data-date]');
    if (dateEl) dateEl.textContent = new Date().getFullYear();

    // SCENE — day of month (1–31), padded to 2 digits
    const sceneEl = document.querySelector('[data-scene]');
    if (sceneEl) {
      sceneEl.textContent = String(new Date().getDate()).padStart(2, '0');
    }

    // TAKE — month number (01–12), padded to 2 digits
    const takeEl = document.querySelector('[data-take]');
    if (takeEl) {
      takeEl.textContent = String(new Date().getMonth() + 1).padStart(2, '0');
    }

    // DAY / NIGHT — based on visitor's local hour
    const dnEl = document.querySelector('[data-day-night]');
    if (dnEl) {
      const h = new Date().getHours();
      dnEl.textContent = (h >= 6 && h < 18) ? 'DAY' : 'NIGHT';
    }
  }

  /* --------------------------------------------------
     BOOT SEQUENCE
  -------------------------------------------------- */
  function boot() {
    initGrain();
    initCursor();
    initTweaks();
    initHeroVideo();
    initClapperLive();

    const clapper = document.getElementById('clapper');

    initLoader(() => {
      if (clapper) {
        clapper.style.opacity = '1';
        clapper.classList.add('is-active');
      }
      document.body.classList.remove('is-loading');
      initScrollDriver();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
