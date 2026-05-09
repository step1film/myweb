/* ============================================================
   FILMMAKER PORTFOLIO — JavaScript
   ============================================================ */

(function () {
  'use strict';

  /* ---- Film Grain ---- */
  function initGrain() {
    const canvas = document.getElementById('grain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function drawGrain() {
      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.createImageData(w, h);
      const buf = imgData.data;
      for (let i = 0; i < buf.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        buf[i] = buf[i+1] = buf[i+2] = v;
        buf[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function tick() {
      drawGrain();
      requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener('resize', resize);
  }

  /* ---- Film Countdown Loader ---- */
  function initLoader() {
    const loader   = document.getElementById('loader');
    const countEl  = document.getElementById('loaderCount');
    const progress = document.querySelector('.loader-progress');
    if (!loader) return;

    const total     = 314; // full circle circumference
    const steps     = 5;
    let   current   = steps;

    function setCount(n) {
      countEl.textContent = n;
      const offset = total - (total * ((steps - n + 1) / steps));
      progress.style.strokeDashoffset = Math.max(0, offset);
    }

    setCount(steps);

    const interval = setInterval(() => {
      current--;
      if (current <= 0) {
        clearInterval(interval);
        countEl.textContent = '';
        progress.style.strokeDashoffset = '0';
        setTimeout(dismissLoader, 300);
      } else {
        setCount(current);
      }
    }, 900);

    function dismissLoader() {
      loader.classList.add('done');
      document.body.classList.remove('loading');
      document.body.classList.add('intro');
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.body.classList.remove('intro');
          document.body.classList.add('loaded');
        }, 800);
      });
    }
  }

  /* ---- Navigation ---- */
  function initNav() {
    const nav    = document.getElementById('nav');
    const toggle = nav.querySelector('.nav-toggle');

    function onScroll() {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }

    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    });

    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Active nav highlight ---- */
  function initActiveNav() {
    const sectionIds = ['films','showreel','about','press','awards','next','contact'];
    const sections   = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    const links      = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let activeId = null;
      sections.forEach(sec => { if (sec.offsetTop <= mid) activeId = sec.id; });
      links.forEach(a => {
        const isActive = a.getAttribute('href') === `#${activeId}`;
        a.style.color = isActive ? 'var(--amber-light)' : '';
      });
    }, { passive: true });
  }

  /* ---- Scroll Reveal ---- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || 0, 10);
          setTimeout(() => entry.target.classList.add('visible'), delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    els.forEach((el, i) => {
      el.dataset.delay = (i % 4) * 90;
      observer.observe(el);
    });
  }

  /* ---- Film cards stagger ---- */
  function initFilmCards() {
    document.querySelectorAll('.film-card').forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.07}s`;
    });
  }

  /* ---- Stat counters ---- */
  function initCounters() {
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animateCounter(el) {
      const suffix   = el.nextElementSibling && el.nextElementSibling.classList.contains('stat-suffix')
                       ? el.nextElementSibling.textContent : '';
      const target   = parseFloat(el.textContent);
      const duration = 1400;
      let start = null;

      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(easeOut(p) * target);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number').forEach(el => obs.observe(el));
  }

  /* ---- Hero parallax ---- */
  function initParallax() {
    const reel = document.querySelector('.hero-reel');
    if (!reel) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY < window.innerHeight) {
        reel.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    }, { passive: true });
  }

  /* ---- Showreel play action ---- */
  function initShowreel() {
    const screen = document.getElementById('showreelScreen');
    if (!screen) return;

    const hudTime = screen.querySelector('.hud-item');
    let seconds = 0;
    let playing = false;
    let timerId = null;

    function formatTC(s) {
      const h  = String(Math.floor(s / 3600)).padStart(2, '0');
      const m  = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sc = String(s % 60).padStart(2, '0');
      return `${h}:${m}:${sc}:00`;
    }

    function startTimecode() {
      if (timerId) return;
      timerId = setInterval(() => {
        seconds++;
        if (hudTime) hudTime.textContent = formatTC(seconds);
      }, 1000);
    }

    screen.addEventListener('click', () => {
      playing = !playing;
      if (playing) {
        startTimecode();
        screen.querySelector('.play-btn').style.opacity = '0';
        /* Swap in your actual iframe embed here, e.g.:
           const iframe = document.createElement('iframe');
           iframe.src = 'https://player.vimeo.com/video/XXXXXXX?autoplay=1';
           iframe.allow = 'autoplay; fullscreen';
           iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;z-index:10;';
           screen.appendChild(iframe);
        */
      } else {
        clearInterval(timerId);
        timerId = null;
        screen.querySelector('.play-btn').style.opacity = '1';
      }
    });

    screen.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); screen.click(); }
    });
  }

  /* ---- Press track pause on focus ---- */
  function initPress() {
    const track = document.getElementById('pressTrack');
    if (!track) return;

    track.querySelectorAll('.press-card').forEach(card => {
      card.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
      card.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
    });
  }

  /* ---- HUD timecode flicker (idle) ---- */
  function initHudFlicker() {
    const items = document.querySelectorAll('.hud-item');
    setInterval(() => {
      items.forEach(item => {
        if (Math.random() < 0.1) {
          const orig = item.style.opacity;
          item.style.opacity = '0';
          setTimeout(() => { item.style.opacity = orig || ''; }, 80);
        }
      });
    }, 2000);
  }

  /* ---- Custom amber cursor ---- */
  function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = Object.assign(document.createElement('div'), {});
    dot.style.cssText = `
      position:fixed;width:8px;height:8px;background:rgba(200,146,42,0.8);
      border-radius:50%;pointer-events:none;z-index:9999;
      transform:translate(-50%,-50%);
      transition:width .3s,height .3s,opacity .3s;
      mix-blend-mode:screen;
    `;
    document.body.appendChild(dot);

    const ring = Object.assign(document.createElement('div'), {});
    ring.style.cssText = `
      position:fixed;width:36px;height:36px;
      border:1px solid rgba(200,146,42,0.35);border-radius:50%;
      pointer-events:none;z-index:9998;transform:translate(-50%,-50%);
      transition:width .5s cubic-bezier(.16,1,.3,1),height .5s cubic-bezier(.16,1,.3,1),
                 top .12s linear,left .12s linear;
    `;
    document.body.appendChild(ring);

    document.addEventListener('mousemove', e => {
      dot.style.left  = ring.style.left = e.clientX + 'px';
      dot.style.top   = ring.style.top  = e.clientY + 'px';
    });

    document.querySelectorAll('a,button,.film-card,.showreel-screen').forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.width = dot.style.height = '14px';
        ring.style.width = ring.style.height = '56px';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.width = dot.style.height = '8px';
        ring.style.width = ring.style.height = '36px';
      });
    });
  }

  /* ---- Page fade-in overlay ---- */
  function initPageFade() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:#0a0805;z-index:2000;
      opacity:1;pointer-events:none;
      transition:opacity .8s cubic-bezier(.16,1,.3,1);
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => setTimeout(() => { overlay.style.opacity = '0'; }, 50));
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initLoader();
    initNav();
    initActiveNav();
    initReveal();
    initFilmCards();
    initCounters();
    initParallax();
    initShowreel();
    initPress();
    initHudFlicker();
    initCursor();
    initPageFade();
  });

})();
