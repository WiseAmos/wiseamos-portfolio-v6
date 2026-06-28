// =================================================================
// app.js — Portfolio v6
// Splash, cursor, marquee, GSAP scroll choreography, work grid,
// pinned process with per-word highlight, stack list, contact form
// =================================================================

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // ---------------------------------------------------------------
  // Reduced motion shortcut
  // ---------------------------------------------------------------
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------
  // 1. Custom cursor (desktop)
  // ---------------------------------------------------------------
  (function cursor() {
    const dot  = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor__ring');
    if (!dot || !ring) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let mx = innerWidth/2, my = innerHeight/2;
    let gx = mx, gy = my, rx = mx, ry = my;

    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!document.body.classList.contains('has-moved')) {
        document.body.classList.add('has-moved');
      }
    }, { passive: true, once: false });

    function loop() {
      gx += (mx - gx) * 0.22;
      gy += (my - gy) * 0.22;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      dot.style.transform  = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    // Hover state for interactive elements
    const interactives = 'a, button, [data-cursor="hover"]';
    document.body.addEventListener('pointerover', (e) => {
      if (e.target.closest(interactives)) {
        dot.classList.add('is-hover');
        ring.classList.add('is-hover');
      }
    });
    document.body.addEventListener('pointerout', (e) => {
      if (e.target.closest(interactives)) {
        dot.classList.remove('is-hover');
        ring.classList.remove('is-hover');
      }
    });
  })();

  // ---------------------------------------------------------------
  // 2. Splash dismiss
  // ---------------------------------------------------------------
  (function splash() {
    const el = document.getElementById('splash');
    if (!el) return;
    if (REDUCED) { el.remove(); return; }

    const dismiss = () => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 700);
    };
    const timer = setTimeout(dismiss, 2400);
    const onEvent = () => { clearTimeout(timer); dismiss(); window.removeEventListener('pointerdown', onEvent); window.removeEventListener('keydown', onEvent); window.removeEventListener('scroll', onEvent); };
    window.addEventListener('pointerdown', onEvent, { once: true, passive: true });
    window.addEventListener('keydown', onEvent, { once: true });
    window.addEventListener('scroll', onEvent, { once: true, passive: true });
  })();

  // ---------------------------------------------------------------
  // 3. Nav scroll progress
  // ---------------------------------------------------------------
  (function navProgress() {
    const fill = document.querySelector('.nav__progress');
    if (!fill) return;
    const set = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      document.documentElement.style.setProperty('--scroll', `${pct}%`);
    };
    set();
    addEventListener('scroll', set, { passive: true });
    addEventListener('resize', set);
  })();

  // ---------------------------------------------------------------
  // 4. Hero line-by-line reveal on load
  // (CSS handles the transition; we just add .is-in after splash)
  // ---------------------------------------------------------------
  (function heroReveal() {
    const title = document.querySelector('.hero__title');
    if (!title) return;
    if (REDUCED) {
      document.querySelectorAll('.hero__title .line > span').forEach(s => s.style.transform = 'translateY(0)');
      title.classList.add('is-in');
      return;
    }
    // Add the class after the splash begins to dismiss
    setTimeout(() => title.classList.add('is-in'), 500);
  })();

  // ---------------------------------------------------------------
  // 5. Marquee (scroll-tied, no autoplay — user-driven)
  // ---------------------------------------------------------------
  (function marquee() {
    const track = document.getElementById('marqueeTrack');
    if (!track) return;
    let x = 0;
    let targetX = 0;
    let lastScrollY = window.scrollY;

    function onScroll() {
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      // Speed: drift right when scrolling down, left when up
      targetX -= dy * 0.4;
    }
    addEventListener('scroll', onScroll, { passive: true });

    function loop() {
      x += (targetX - x) * 0.08;
      // Wrap to keep the value bounded
      const w = track.scrollWidth / 2;
      if (w > 0) {
        if (x < -w) x += w;
        if (x > 0)  x -= w;
      }
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      requestAnimationFrame(loop);
    }
    loop();
  })();

  // ---------------------------------------------------------------
  // 6. Section reveal on scroll
  // ---------------------------------------------------------------
  (function sectionReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (REDUCED) {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  })();

  // ---------------------------------------------------------------
  // 7. Counters (hero stats)
  // ---------------------------------------------------------------
  (function counters() {
    const nums = document.querySelectorAll('[data-count]');
    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const obj = { n: 0 };
      gsap.to(obj, {
        n: target,
        duration: 1.8,
        ease: 'power2.out',
        delay: 0.7,
        onUpdate: () => { el.textContent = Math.round(obj.n).toLocaleString(); },
        onComplete: () => { el.textContent = target.toLocaleString(); },
      });
    };
    if (REDUCED) {
      nums.forEach(el => { el.textContent = parseInt(el.dataset.count, 10).toLocaleString(); });
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { animate(e.target); io.disconnect(); }
    }, { threshold: 0.5 });
    nums.forEach(n => io.observe(n));
  })();

  // ---------------------------------------------------------------
  // 8. Work grid (render + 3D tilt on hover)
  // ---------------------------------------------------------------
  (function workGrid() {
    const grid = document.getElementById('workGrid');
    if (!grid || !window.PROJECTS) return;

    // Sizing logic: 9 projects → big/medium/small mix
    const sizes = ['lg', 'md', 'sm', 'sm', 'lg', 'md', 'sm', 'sm', 'md'];
    const html = window.PROJECTS.map((p, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const stars = p.stars != null
        ? `<span class="stars">★ ${p.stars}</span>`
        : `<span>WIP</span>`;
      const live = p.liveDemo
        ? `<span class="work-card__live">LIVE</span>`
        : '';
      const g = p.glyph || { mark: p.title.charAt(0), pattern: 'grid' };
      const pat = `pattern--${g.pattern || 'grid'}`;
      return `
        <a class="work-card" data-size="${sizes[i] || 'sm'}" data-tilt
           href="https://github.com/WiseAmos/${p.repo}" target="_blank" rel="noopener"
           style="--lang-color: ${p.langColor || '#14110E'};">
          <div class="work-card__glyph">
            <div class="pattern ${pat}"></div>
            <span class="work-card__lang" style="background: ${p.langColor || '#14110E'};">${p.lang || 'XX'}</span>
            ${live}
            <span class="mark">${g.mark}</span>
          </div>
          <div class="work-card__body">
            <div class="work-card__index">
              <span>${idx} / ${String(window.PROJECTS.length).padStart(2, '0')}</span>
              <span>${p.tag || ''}</span>
            </div>
            <h3 class="work-card__title">${p.title}</h3>
            <p class="work-card__desc">${p.desc}</p>
            <div class="work-card__meta">
              ${stars}
              <span class="arrow" aria-hidden="true"></span>
            </div>
          </div>
        </a>
      `;
    }).join('');
    grid.innerHTML = html;

    // 3D tilt on hover (mouse-tracked rotateX/rotateY)
    if (!REDUCED && !window.matchMedia('(hover: none)').matches) {
      const cards = grid.querySelectorAll('[data-tilt]');
      cards.forEach(card => {
        let raf = null;
        let tx = 0, ty = 0;     // current
        let ttx = 0, tty = 0;   // target
        const onMove = (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top)  / r.height;
          ttx = (px - 0.5) * -8;  // rotateY
          tty = (py - 0.5) *  6;  // rotateX
        };
        const tick = () => {
          tx += (ttx - tx) * 0.12;
          ty += (tty - ty) * 0.12;
          card.style.transform = `perspective(900px) rotateX(${ty}deg) rotateY(${tx}deg) translateZ(0)`;
          if (Math.abs(ttx - tx) > 0.01 || Math.abs(tty - ty) > 0.01) {
            raf = requestAnimationFrame(tick);
          } else {
            raf = null;
          }
        };
        card.addEventListener('pointermove', (e) => {
          onMove(e);
          if (!raf) raf = requestAnimationFrame(tick);
        });
        card.addEventListener('pointerleave', () => {
          ttx = 0; tty = 0;
          if (!raf) raf = requestAnimationFrame(tick);
        });
      });
    }
  })();

  // ---------------------------------------------------------------
  // 9. Process (horizontal pinned scroll + per-word highlight)
  // ---------------------------------------------------------------
  (function process() {
    const rail   = document.getElementById('processRail');
    const steps  = document.querySelectorAll('.process__step');
    if (!rail || !steps.length) return;

    // Wrap each word in <span class="word"> for the per-word highlight
    steps.forEach(step => {
      const p = step.querySelector('.process__step-text');
      if (!p || p.dataset.wordsWrapped) return;
      p.dataset.wordsWrapped = '1';
      p.innerHTML = p.textContent.split(/(\s+)/).map(token => {
        if (/^\s+$/.test(token)) return token;
        return `<span class="word">${token}</span>`;
      }).join('');
    });

    const stepCount = steps.length;

    const setActive = (idx) => {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    };

    // JS scroll handler — single source of truth for rail + active step + word highlight
    let ticking = false;
    function update() {
      ticking = false;
      const section = document.getElementById('process');
      const vh = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const totalScroll = rect.height - vh;
      if (totalScroll <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / totalScroll));

      // Move the rail: 0 → -((stepCount - 1) * 100vw)
      const maxX = (stepCount - 1) * 100;
      const xPct = -progress * maxX;
      rail.style.transform = `translate3d(${xPct}vw, 0, 0)`;

      // Active step (centre of viewport)
      const activeIdx = Math.min(stepCount - 1, Math.floor(progress * stepCount + 0.0001));
      setActive(activeIdx);

      // Per-word highlight within the active step
      const activeStep = steps[activeIdx];
      if (activeStep) {
        const localT = (progress * stepCount) - activeIdx; // 0..1 across this step
        const words = activeStep.querySelectorAll('.word');
        const lit = Math.floor(localT * words.length);
        words.forEach((w, i) => {
          const wantLit = i < lit;
          if (wantLit && !w.dataset.lit) {
            w.classList.add('is-lit');
            w.dataset.lit = '1';
          } else if (!wantLit && w.dataset.lit) {
            w.classList.remove('is-lit');
            delete w.dataset.lit;
          }
        });
      }
    }
    addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => update());
        ticking = true;
      }
    }, { passive: true });

    // Set initial state once layout is stable
    requestAnimationFrame(() => {
      update();
      ScrollTrigger.refresh();
    });
  })();

  // ---------------------------------------------------------------
  // 10. Stack list (data → DOM)
  // ---------------------------------------------------------------
  (function stack() {
    const grid = document.getElementById('stackGrid');
    if (!grid) return;
    const STACK = [
      { cat: 'Languages', items: [
        { name: 'Python',    lvl: 5 },
        { name: 'TypeScript', lvl: 5 },
        { name: 'JavaScript', lvl: 5 },
        { name: 'Rust',      lvl: 3 },
        { name: 'C++',       lvl: 3 },
        { name: 'SQL',       lvl: 4 },
        { name: 'Solidity',  lvl: 3 },
      ]},
      { cat: 'Frameworks & runtimes', items: [
        { name: 'React / Next',  lvl: 5 },
        { name: 'Node.js',       lvl: 5 },
        { name: 'Three.js',      lvl: 4 },
        { name: 'FastAPI',       lvl: 4 },
        { name: 'GSAP',          lvl: 4 },
        { name: 'Tailwind',      lvl: 4 },
        { name: 'Express',       lvl: 4 },
      ]},
      { cat: 'Infra & data', items: [
        { name: 'AWS (S3, EC2, Lambda)', lvl: 4 },
        { name: 'Vercel + Cloudflare',   lvl: 5 },
        { name: 'Postgres / SQLite',     lvl: 4 },
        { name: 'Redis / Kafka',         lvl: 3 },
        { name: 'Docker',                lvl: 4 },
        { name: 'GitHub Actions',        lvl: 4 },
      ]},
      { cat: 'Domains', items: [
        { name: 'High-frequency trading', lvl: 5 },
        { name: 'Computer vision (OpenCV)', lvl: 5 },
        { name: 'Autonomous systems',     lvl: 4 },
        { name: 'LLM agents',             lvl: 4 },
        { name: 'Real-time inference',    lvl: 4 },
        { name: 'WebGL / shaders',        lvl: 3 },
      ]},
    ];
    const html = STACK.map(col => `
      <div class="stack__col">
        <div class="stack__cat">${col.cat}</div>
        <div class="stack__items">
          ${col.items.map((it, i) => {
            const bars = Array.from({length: 5}, (_, k) =>
              `<span class="bar ${k < it.lvl ? 'is-on' : ''}"></span>`).join('');
            const num = String(i + 1).padStart(2, '0');
            return `
              <div class="stack__item">
                <span class="dot">${num}</span>
                <span class="name">${it.name}</span>
                <span class="lvl">${bars}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
    grid.innerHTML = html;
  })();

  // ---------------------------------------------------------------
  // 11. Contact form (mailto: fallback, no backend)
  // ---------------------------------------------------------------
  (function contactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get('name') || '';
      const email = data.get('email') || '';
      const msg = data.get('message') || '';
      const subject = encodeURIComponent(`[portfolio] ${name} — get in touch`);
      const body = encodeURIComponent(`From: ${name} <${email}>\n\n${msg}\n\n— sent from wiseamos-portfolio v6`);
      const a = document.createElement('a');
      a.href = `mailto:hi@amos.engineer?subject=${subject}&body=${body}`;
      a.click();
    });
  })();

  // ---------------------------------------------------------------
  // 12. Smooth-scroll anchor handler
  // ---------------------------------------------------------------
  (function smoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  })();

  // ---------------------------------------------------------------
  // 13. Trigger initial reveal
  // ---------------------------------------------------------------
  setTimeout(() => ScrollTrigger.refresh(), 300);

  // Listen for fonts loaded → re-measure
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

})();
