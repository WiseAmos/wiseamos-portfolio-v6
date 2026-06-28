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
  // 1. Custom cursor (desktop, dot only, auto-hides after idle)
  // ---------------------------------------------------------------
  (function cursor() {
    const dot = document.querySelector('.cursor');
    if (!dot) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let mx = -100, my = -100;
    let gx = mx, gy = my;
    let idleTimer = null;
    const IDLE_MS = 700;

    const activate = () => {
      document.body.classList.add('cursor-active');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        document.body.classList.remove('cursor-active');
      }, IDLE_MS);
    };

    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      activate();
    }, { passive: true });

    // Hide on touch / mouse leave the window
    addEventListener('pointerleave', () => {
      document.body.classList.remove('cursor-active');
      clearTimeout(idleTimer);
    }, { passive: true });
    addEventListener('blur', () => {
      document.body.classList.remove('cursor-active');
      clearTimeout(idleTimer);
    });

    function loop() {
      gx += (mx - gx) * 0.28;
      gy += (my - gy) * 0.28;
      dot.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    // Hover state for interactive elements
    const interactives = 'a, button, [data-cursor="hover"], input, textarea';
    document.body.addEventListener('pointerover', (e) => {
      if (e.target.closest(interactives)) dot.classList.add('is-hover');
    });
    document.body.addEventListener('pointerout', (e) => {
      if (e.target.closest(interactives)) dot.classList.remove('is-hover');
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
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(n => io.observe(n));
  })();

  // ---------------------------------------------------------------
  // 7b. SVG art generator for project cards
  // ---------------------------------------------------------------
  function artSVG(art, p) {
    switch (art.kind) {
      case 'face-lock':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#1B1A17"/>
          <g fill="none" stroke="#B6553B" stroke-width="1">
            <rect x="120" y="60" width="160" height="160" rx="6"/>
            <rect x="135" y="75" width="130" height="130" rx="4"/>
            <rect x="150" y="90" width="100" height="100" rx="3"/>
            <line x1="120" y1="140" x2="280" y2="140"/>
            <line x1="200" y1="60" x2="200" y2="220"/>
          </g>
          <circle cx="200" cy="140" r="14" fill="none" stroke="#B6553B" stroke-width="1.5"/>
          <path d="M200 90 L210 130 L250 140 L210 150 L200 190 L190 150 L150 140 L190 130 Z" fill="#F4F1EA" opacity="0.85"/>
          <text x="20" y="30" fill="#F4F1EA" font-family="ui-monospace,monospace" font-size="11" letter-spacing="2" opacity="0.6">PRESENCE.LOCK</text>
          <text x="20" y="265" fill="#F4F1EA" font-family="ui-monospace,monospace" font-size="10" letter-spacing="2" opacity="0.4">SCAN • DETECT • LOCK</text>
        </svg>`;
      case 'marketing':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#F4F1EA"/>
          <g fill="#1B1A17" opacity="0.08">
            ${Array.from({length: 12}, (_, i) => `<line x1="0" y1="${i*24+12}" x2="400" y2="${i*24+12}" stroke="#1B1A17" stroke-width="0.5"/>`).join('')}
          </g>
          <text x="40" y="120" fill="#1B1A17" font-family="Georgia,serif" font-size="64" font-style="italic" font-weight="300">fl.</text>
          <rect x="40" y="150" width="60" height="3" fill="#B6553B"/>
          <text x="40" y="180" fill="#1B1A17" font-family="ui-monospace,monospace" font-size="11" letter-spacing="2" opacity="0.5">A QUIET WEBSITE FOR A LOUD CLI</text>
        </svg>`;
      case 'shield':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#1B1A17"/>
          <g fill="none" stroke="#F4F1EA" stroke-width="1" opacity="0.15">
            <circle cx="200" cy="140" r="100"/>
            <circle cx="200" cy="140" r="70"/>
            <circle cx="200" cy="140" r="40"/>
          </g>
          <path d="M200 60 L240 100 L240 180 Q200 220 160 180 L160 100 Z" fill="#B6553B"/>
          <path d="M180 140 L195 155 L225 125" fill="none" stroke="#F4F1EA" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="20" y="265" fill="#F4F1EA" font-family="ui-monospace,monospace" font-size="10" letter-spacing="2" opacity="0.4">SCAM SCORE 0—100</text>
        </svg>`;
      case 'btc':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#0E0D0B"/>
          ${Array.from({length: 30}, (_, i) => `<rect x="${10 + i*12}" y="${280 - (40 + Math.abs(Math.sin(i*0.7))*140)}" width="8" height="${40 + Math.abs(Math.sin(i*0.7))*140}" fill="#B6553B" opacity="${0.3 + Math.abs(Math.cos(i*0.5))*0.7}"/>`).join('')}
          <path d="M120 80 L280 80 L280 100 L160 100 L160 130 L260 130 L260 150 L160 150 L160 200 L120 200 Z" fill="#F4F1EA" opacity="0.9"/>
          <text x="320" y="270" fill="#F4F1EA" font-family="ui-monospace,monospace" font-size="10" letter-spacing="2" opacity="0.4" text-anchor="end">COINBASE INTX</text>
        </svg>`;
      case 'drone':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#0E0D0B"/>
          <g stroke="#B6553B" stroke-width="1" fill="none" opacity="0.5">
            <line x1="0" y1="200" x2="400" y2="200"/>
            <line x1="0" y1="220" x2="400" y2="220"/>
            <line x1="0" y1="240" x2="400" y2="240"/>
          </g>
          <g transform="translate(200,140)">
            <line x1="-60" y1="0" x2="60" y2="0" stroke="#F4F1EA" stroke-width="2"/>
            <line x1="0" y1="-30" x2="0" y2="30" stroke="#F4F1EA" stroke-width="2"/>
            <circle cx="-60" cy="0" r="22" fill="none" stroke="#F4F1EA" stroke-width="1.5"/>
            <circle cx="60" cy="0" r="22" fill="none" stroke="#F4F1EA" stroke-width="1.5"/>
            <circle cx="0" cy="-30" r="22" fill="none" stroke="#F4F1EA" stroke-width="1.5"/>
            <circle cx="0" cy="30" r="22" fill="none" stroke="#F4F1EA" stroke-width="1.5"/>
            <rect x="-15" y="-15" width="30" height="30" fill="#B6553B"/>
          </g>
          <text x="20" y="30" fill="#F4F1EA" font-family="ui-monospace,monospace" font-size="11" letter-spacing="2" opacity="0.6">ROS • PX4</text>
        </svg>`;
      case 'debate':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#1B1A17"/>
          <g font-family="ui-monospace,monospace" font-size="11" fill="#F4F1EA" opacity="0.7">
            <rect x="40" y="50" width="120" height="50" fill="none" stroke="#F4F1EA" opacity="0.3"/>
            <text x="55" y="75">AGENT A</text>
            <text x="55" y="92" opacity="0.5">pro...</text>
            <rect x="240" y="50" width="120" height="50" fill="none" stroke="#B6553B"/>
            <text x="255" y="75" fill="#B6553B">AGENT B</text>
            <text x="255" y="92" fill="#B6553B" opacity="0.7">con...</text>
            <line x1="160" y1="75" x2="240" y2="75" stroke="#B6553B" stroke-width="1.5"/>
            <polygon points="232,71 240,75 232,79" fill="#B6553B"/>
            <line x1="240" y1="125" x2="160" y2="125" stroke="#F4F1EA" opacity="0.5" stroke-width="1"/>
            <polygon points="168,121 160,125 168,129" fill="#F4F1EA" opacity="0.5"/>
            <rect x="100" y="170" width="200" height="60" fill="none" stroke="#F4F1EA" opacity="0.2"/>
            <text x="115" y="195" opacity="0.5">REFINING POSITION...</text>
            <text x="115" y="215" opacity="0.3">→ EVIDENCE FOUND: 3</text>
          </g>
        </svg>`;
      case 'arena':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#F4F1EA"/>
          <text x="40" y="160" fill="#1B1A17" font-family="Georgia,serif" font-size="120" font-weight="300">{ }</text>
          <g fill="#B6553B">
            <polygon points="220,80 240,80 230,100"/>
            <polygon points="280,140 300,140 290,160"/>
            <polygon points="240,200 260,200 250,220"/>
          </g>
          <text x="40" y="265" fill="#1B1A17" font-family="ui-monospace,monospace" font-size="10" letter-spacing="2" opacity="0.4">CODE • DUEL • RANK</text>
        </svg>`;
      case 'linkedin':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#0E0D0B"/>
          <text x="200" y="160" fill="#F4F1EA" font-family="Georgia,serif" font-size="160" font-weight="300" text-anchor="middle">in</text>
          <circle cx="200" cy="170" r="120" fill="none" stroke="#B6553B" stroke-width="1" opacity="0.5"/>
          <path d="M170 145 Q200 120 230 145 L230 165 Q200 145 170 165 Z" fill="#B6553B"/>
        </svg>`;
      case 'postal':
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#F4F1EA"/>
          <g stroke="#1B1A17" stroke-width="0.5" fill="none" opacity="0.4">
            ${Array.from({length: 8}, (_, i) => `<line x1="${i*50}" y1="0" x2="${i*50}" y2="280"/>`).join('')}
            ${Array.from({length: 6}, (_, i) => `<line x1="0" y1="${i*50}" x2="400" y2="${i*50}"/>`).join('')}
          </g>
          <g fill="#B6553B">
            <circle cx="80" cy="80" r="14" opacity="0.9"/>
            <circle cx="160" cy="130" r="10" opacity="0.7"/>
            <circle cx="250" cy="90" r="12" opacity="0.85"/>
            <circle cx="320" cy="170" r="8" opacity="0.6"/>
            <circle cx="120" cy="200" r="11" opacity="0.8"/>
            <circle cx="280" cy="220" r="9" opacity="0.7"/>
          </g>
          <text x="20" y="265" fill="#1B1A17" font-family="ui-monospace,monospace" font-size="10" letter-spacing="2" opacity="0.4">SINGAPORE POSTAL · 80 SECTORS</text>
        </svg>`;
      default: // grid
        return `<svg viewBox="0 0 400 280" class="art-svg" aria-hidden="true">
          <rect width="400" height="280" fill="#1B1A17"/>
          <g stroke="#F4F1EA" stroke-width="0.5" opacity="0.15">
            ${Array.from({length: 16}, (_, i) => `<line x1="${i*25}" y1="0" x2="${i*25}" y2="280"/>`).join('')}
            ${Array.from({length: 12}, (_, i) => `<line x1="0" y1="${i*25}" x2="400" y2="${i*25}"/>`).join('')}
          </g>
        </svg>`;
    }
  }

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
        : `<span class="wip">WIP</span>`;
      const live = p.liveDemo
        ? `<span class="work-card__live">LIVE ↗</span>`
        : '';
      const art = p.art || { kind: 'grid' };
      return `
        <a class="work-card" data-size="${sizes[i] || 'sm'}" data-tilt
           href="${p.liveDemo || `https://github.com/WiseAmos/${p.repo}`}" target="_blank" rel="noopener"
           style="--lang-color: ${p.langColor || '#14110E'};">
          <div class="work-card__art" data-art="${art.kind}">
            ${live}
            <span class="work-card__lang" style="background: ${p.langColor || '#14110E'};">${p.lang || 'XX'}</span>
            ${artSVG(art, p)}
          </div>
          <div class="work-card__body">
            <div class="work-card__index">
              <span>${idx} / ${String(window.PROJECTS.length).padStart(2, '0')}</span>
              <span class="work-card__tag">${p.tag || ''}</span>
            </div>
            <h3 class="work-card__title">${p.title}</h3>
            <p class="work-card__desc">${p.desc}</p>
            <div class="work-card__meta">
              ${stars}
              <span class="arrow" aria-hidden="true">↗</span>
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

    // Tell CSS the step count so viewport height = stepCount × 100vh exactly
    const viewport = document.getElementById('processViewport');
    if (viewport) viewport.style.setProperty('--step-count', stepCount);

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
      // Section total height includes head + viewport (stepCount × 100vh).
      // Scrollable distance = section.height - vh = head + (stepCount - 1) × 100vh
      const totalScroll = rect.height - vh;
      if (totalScroll <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / totalScroll));

      // Move the rail: 0 → -((stepCount - 1) * 100vw) over full progress
      const maxX = (stepCount - 1) * 100;
      const xPct = -progress * maxX;
      rail.style.transform = `translate3d(${xPct}vw, 0, 0)`;

      // Active step: step N centered when progress = (N-1) / (stepCount-1)
      // So activeIdx = round(progress * (stepCount-1))
      const activeIdx = Math.min(stepCount - 1, Math.round(progress * (stepCount - 1)));
      setActive(activeIdx);

      // Per-word highlight within the active step
      const activeStep = steps[activeIdx];
      if (activeStep) {
        const localT = (progress * (stepCount - 1)) - (activeIdx - 0.5); // 0..1 across this step
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

  // ---------------------------------------------------------------
  // 14. Footer back-to-top
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-top]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  // ---------------------------------------------------------------
  // 15. Subtle nav-bar opacity on scroll
  // ---------------------------------------------------------------
  const navEl = document.querySelector('.nav');
  if (navEl) {
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      navEl.classList.toggle('is-scrolled', y > 40);
      lastY = y;
    }, { passive: true });
  }

})();
