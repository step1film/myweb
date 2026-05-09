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
    let animId;

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
        buf[i]     = v;
        buf[i + 1] = v;
        buf[i + 2] = v;
        buf[i + 3] = 255;
      }

      ctx.putImageData(imgData, 0, 0);
    }

    function tick() {
      drawGrain();
      animId = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener('resize', resize);
  }

  /* ---- Letterbox intro ---- */
  function initIntro() {
    document.body.classList.add('intro');
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.body.classList.remove('intro');
        document.body.classList.add('loaded');
      }, 800);
    });
  }

  /* ---- Navigation scroll state ---- */
  function initNav() {
    const nav = document.getElementById('nav');
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

  /* ---- Scroll reveal ---- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay || 0;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
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
    const cards = document.querySelectorAll('.film-card');
    cards.forEach((card, i) => {
      card.style.transitionDelay = `${i * 0.07}s`;
    });
  }

  /* ---- Award items stagger ---- */
  function initAwardItems() {
    const items = document.querySelectorAll('.award-item');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 0.08}s`;
    });
  }

  /* ---- Smooth parallax on hero background ---- */
  function initParallax() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const reel = hero.querySelector('.hero-reel');

    function onScroll() {
      const scrollY = window.scrollY;
      if (scrollY > window.innerHeight) return;
      const factor = scrollY * 0.3;
      if (reel) reel.style.transform = `translateY(${factor}px)`;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Animated stat counters ---- */
  function initCounters() {
    const stats = document.querySelectorAll('.stat-number');

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animateCounter(el) {
      const raw   = el.textContent.trim();
      const num   = parseFloat(raw);
      const suffix = raw.replace(/[\d.]/g, '');
      const duration = 1400;
      let start = null;

      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const current = Math.round(easeOut(p) * num);
        el.textContent = current + suffix;
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

    stats.forEach(el => obs.observe(el));
  }

  /* ---- Custom cursor dot ---- */
  function initCursor() {
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = document.createElement('div');
    dot.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: rgba(200,146,42,0.8);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: width 0.3s, height 0.3s, opacity 0.3s, background 0.3s;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(dot);

    const ring = document.createElement('div');
    ring.style.cssText = `
      position: fixed;
      width: 36px;
      height: 36px;
      border: 1px solid rgba(200,146,42,0.35);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: width 0.5s cubic-bezier(0.16,1,0.3,1),
                  height 0.5s cubic-bezier(0.16,1,0.3,1),
                  top 0.12s linear, left 0.12s linear;
    `;
    document.body.appendChild(ring);

    let mx = -100, my = -100;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
      ring.style.left = mx + 'px';
      ring.style.top  = my + 'px';
    });

    document.querySelectorAll('a, button, .film-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.width   = '14px';
        dot.style.height  = '14px';
        ring.style.width  = '56px';
        ring.style.height = '56px';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.width   = '8px';
        dot.style.height  = '8px';
        ring.style.width  = '36px';
        ring.style.height = '36px';
      });
    });
  }

  /* ---- Cinematic page transition (internal links) ---- */
  function initPageFade() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: #0a0805;
      z-index: 2000;
      opacity: 1;
      pointer-events: none;
      transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1);
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      setTimeout(() => { overlay.style.opacity = '0'; }, 50);
    });
  }

  /* ---- Active nav link highlight on scroll ---- */
  function initActiveNav() {
    const sections = ['films','about','awards','contact'].map(id => document.getElementById(id));
    const links = document.querySelectorAll('.nav-links a');

    function getActive() {
      const mid = window.scrollY + window.innerHeight / 2;
      let active = null;
      sections.forEach(sec => {
        if (sec && sec.offsetTop <= mid) active = sec.id;
      });
      return active;
    }

    window.addEventListener('scroll', () => {
      const id = getActive();
      links.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${id}` ? 'var(--amber-light)' : '';
      });
    }, { passive: true });
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initIntro();
    initNav();
    initReveal();
    initFilmCards();
    initAwardItems();
    initParallax();
    initCounters();
    initCursor();
    initPageFade();
    initActiveNav();
  });

})();
