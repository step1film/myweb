(function () {
  'use strict';

  /* ---- Grain ---- */
  function initGrain() {
    const c = document.getElementById('grain');
    if (!c) return;
    const ctx = c.getContext('2d');
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    const draw = () => {
      const d = ctx.createImageData(c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d.data[i] = d.data[i+1] = d.data[i+2] = v;
        d.data[i+3] = 255;
      }
      ctx.putImageData(d, 0, 0);
      requestAnimationFrame(draw);
    };
    resize();
    draw();
    addEventListener('resize', resize);
  }

  /* ---- Loader ---- */
  function initLoader() {
    const loader  = document.getElementById('loader');
    const countEl = document.getElementById('loaderCount');
    const bar     = document.querySelector('.loader-progress');
    if (!loader) return;

    const TOTAL = 314;
    const STEPS = 5;
    let n = STEPS;

    function set(num) {
      countEl.textContent = num;
      bar.style.strokeDashoffset = String(TOTAL - TOTAL * ((STEPS - num + 1) / STEPS));
    }

    set(STEPS);

    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        bar.style.strokeDashoffset = '0';
        countEl.textContent = '';
        setTimeout(dismiss, 280);
      } else {
        set(n);
      }
    }, 880);

    function dismiss() {
      loader.classList.add('done');
      document.body.classList.remove('loading');
    }
  }

  /* ---- Nav ---- */
  function initNav() {
    const nav    = document.getElementById('nav');
    const toggle = nav.querySelector('.nav-toggle');

    addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 50), { passive: true });

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      document.body.style.overflow = open ? 'hidden' : '';
      const spans = toggle.querySelectorAll('span');
      if (open) {
        spans[0].style.transform = 'translateY(7px) rotate(45deg)';
        spans[1].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.transform = '';
      }
    });

    nav.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        document.body.style.overflow = '';
        nav.querySelectorAll('span').forEach(s => s.style.transform = '');
      });
    });
  }

  /* ---- Active nav on scroll ---- */
  function initActiveNav() {
    const ids   = ['films','showreel','about','press','awards','next','contact'];
    const secs  = ids.map(id => document.getElementById(id)).filter(Boolean);
    const links = document.querySelectorAll('.nav-links a');

    addEventListener('scroll', () => {
      const mid = scrollY + innerHeight / 2;
      let active = null;
      secs.forEach(s => { if (s.offsetTop <= mid) active = s.id; });
      links.forEach(a => {
        const on = a.getAttribute('href') === `#${active}`;
        a.classList.toggle('active', on);
      });
    }, { passive: true });
  }

  /* ---- Scroll reveal ---- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(
            () => entry.target.classList.add('visible'),
            parseInt(entry.target.dataset.delay || 0)
          );
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    els.forEach((el, i) => { el.dataset.delay = (i % 5) * 80; obs.observe(el); });
  }

  /* ---- Stat counters ---- */
  function initCounters() {
    if (!('IntersectionObserver' in window)) return;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el  = entry.target;
        const end = parseFloat(el.textContent);
        let start = null;
        const step = ts => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1300, 1);
          el.textContent = Math.round(ease(p) * end);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.stat-n').forEach(el => obs.observe(el));
  }

  /* ---- Showreel ---- */
  function initShowreel() {
    const screen = document.getElementById('reelScreen');
    const tcEl   = document.getElementById('reelTC');
    if (!screen) return;
    let secs = 0, timer = null, playing = false;

    const fmt = s => {
      const h = String(Math.floor(s / 3600)).padStart(2,'0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2,'0');
      const sc = String(s % 60).padStart(2,'0');
      return `${h}:${m}:${sc}:00`;
    };

    screen.addEventListener('click', () => {
      playing = !playing;
      const play = screen.querySelector('.reel-play');
      if (playing) {
        play.style.opacity = '0';
        timer = setInterval(() => { secs++; if(tcEl) tcEl.textContent = fmt(secs); }, 1000);
        /* Swap in embed here:
           const f = document.createElement('iframe');
           f.src = 'https://player.vimeo.com/video/ID?autoplay=1';
           f.allow = 'autoplay;fullscreen'; f.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;z-index:10;';
           screen.appendChild(f); */
      } else {
        play.style.opacity = '1';
        clearInterval(timer);
      }
    });
    screen.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();screen.click();} });
  }

  /* ---- Press ticker ---- */
  function initPress() {
    const track = document.getElementById('pressTrack');
    if (!track) return;
    track.querySelectorAll('.press-card').forEach(c => {
      c.addEventListener('mouseenter', () => track.style.animationPlayState='paused');
      c.addEventListener('mouseleave', () => track.style.animationPlayState='running');
    });
  }

  /* ---- Cursor ---- */
  function initCursor() {
    if (window.matchMedia('(hover:none)').matches) return;

    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:5px;height:5px;background:#e81c1c;border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:width .25s,height .25s;mix-blend-mode:normal;';
    document.body.appendChild(dot);

    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;width:28px;height:28px;border:1px solid rgba(232,28,28,0.4);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:width .4s cubic-bezier(.16,1,.3,1),height .4s cubic-bezier(.16,1,.3,1),top .1s linear,left .1s linear;';
    document.body.appendChild(ring);

    addEventListener('mousemove', e => {
      dot.style.left = ring.style.left = e.clientX + 'px';
      dot.style.top  = ring.style.top  = e.clientY + 'px';
    });

    document.querySelectorAll('a,button,.reel-screen,.film-row').forEach(el => {
      el.addEventListener('mouseenter', () => { dot.style.width=dot.style.height='10px'; ring.style.width=ring.style.height='44px'; });
      el.addEventListener('mouseleave', () => { dot.style.width=dot.style.height='5px';  ring.style.width=ring.style.height='28px'; });
    });
  }

  /* ---- Page fade in ---- */
  function initFade() {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:#080808;z-index:8000;opacity:1;pointer-events:none;transition:opacity .7s cubic-bezier(.16,1,.3,1);';
    document.body.appendChild(o);
    requestAnimationFrame(() => setTimeout(() => o.style.opacity='0', 40));
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    initGrain();
    initLoader();
    initNav();
    initActiveNav();
    initReveal();
    initCounters();
    initShowreel();
    initPress();
    initCursor();
    initFade();
  });

})();
