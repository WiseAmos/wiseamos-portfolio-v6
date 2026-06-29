// =================================================================
// app.js — Portfolio v6 (Aggressive cut: 1.5vh target)
// Hero reveal, work grid with 6 projects, section reveal, nav,
// smooth anchors, footer back-to-top. Dropped: splash, marquee,
// process, stack, contact form.
// =================================================================

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  // Reduced motion shortcut
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------
  // 0. Splash screen (grain + scramble + counter + wipe-up dismiss)
  // ---------------------------------------------------------------
  (function splash() {
    const el = document.getElementById('splash');
    const mark = document.getElementById('splashMark');
    const counter = document.getElementById('splashCounter');
    if (!el) return;

    document.body.classList.add('is-splash');

    if (REDUCED) { el.remove(); document.body.classList.remove('is-splash'); return; }

    const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@%&*·';
    const SCRAMBLE_MS = 70;
    const SETTLE_MS   = 220;
    const HOLD_MS     = 360;
    const EXIT_MS     = 760;

    // Wrap mark text into <span class="char"> for scramble
    let original = '';
    let chars = [];
    if (mark) {
      original = mark.dataset.text || mark.textContent;
      mark.textContent = '';
      chars = original.split('').map(() => {
        const span = document.createElement('span');
        span.className = 'char is-scrambling';
        span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        mark.appendChild(span);
        return span;
      });
    }

    // Counter tick from 0 → 100
    let pct = 0;
    if (counter) {
      const tick = setInterval(() => {
        const step = Math.max(1, Math.floor((100 - pct) / 18));
        pct = Math.min(100, pct + step);
        counter.textContent = String(pct).padStart(3, '0');
        if (pct >= 100) clearInterval(tick);
      }, 60);
    }

    // Scramble + settle
    let scrambleCount = 0;
    let settleStarted = false;
    const scrambleLoop = setInterval(() => {
      scrambleCount++;
      chars.forEach((span) => {
        if (span.classList.contains('is-settled')) return;
        span.textContent = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      });
      if (!settleStarted && scrambleCount >= 6) {
        settleStarted = true;
        let settled = 0;
        const settleLoop = setInterval(() => {
          if (settled >= chars.length) { clearInterval(settleLoop); return; }
          chars[settled].textContent = original[settled];
          chars[settled].classList.remove('is-scrambling');
          chars[settled].classList.add('is-settled');
          settled++;
        }, SETTLE_MS);
      }
    }, SCRAMBLE_MS);

    const dismiss = () => {
      clearInterval(scrambleLoop);
      // Ensure all chars settled before exit
      chars.forEach((span, i) => {
        span.textContent = original[i];
        span.classList.remove('is-scrambling');
        span.classList.add('is-settled');
      });
      el.classList.add('is-out');
      document.body.classList.remove('is-splash');
      setTimeout(() => el.remove(), EXIT_MS + 80);
    };

    // Auto-dismiss after the full splash cycle
    const totalHold = 6 * SCRAMBLE_MS + chars.length * SETTLE_MS + HOLD_MS;
    const autoTimer = setTimeout(dismiss, totalHold);

    // User-initiated dismiss (click / key / scroll)
    const onUser = () => {
      clearTimeout(autoTimer);
      dismiss();
      window.removeEventListener('pointerdown', onUser);
      window.removeEventListener('keydown', onUser);
      window.removeEventListener('scroll', onUser);
    };
    window.addEventListener('pointerdown', onUser, { once: true, passive: true });
    window.addEventListener('keydown', onUser, { once: true });
    window.addEventListener('scroll', onUser, { once: true, passive: true });
  })();

  // ---------------------------------------------------------------
  // 1. Hero line-by-line reveal on load
  // ---------------------------------------------------------------
  (function heroReveal() {
    const title = document.querySelector('.hero__title');
    if (!title) return;
    if (REDUCED) {
      document.querySelectorAll('.hero__title .line > span').forEach(s => s.style.transform = 'translateY(0)');
      title.classList.add('is-in');
      return;
    }
    setTimeout(() => title.classList.add('is-in'), 60);
  })();

  // ---------------------------------------------------------------
  // 2. Nav scroll progress + is-scrolled class
  // ---------------------------------------------------------------
  (function nav() {
    const fill = document.querySelector('.nav__progress');
    const set = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      document.documentElement.style.setProperty('--scroll', `${pct}%`);
    };
    if (fill) {
      set();
      addEventListener('scroll', set, { passive: true });
      addEventListener('resize', set);
    }

    const navEl = document.querySelector('.nav');
    if (navEl) {
      addEventListener('scroll', () => {
        navEl.classList.toggle('is-scrolled', window.scrollY > 40);
      }, { passive: true });
    }
  })();

  // ---------------------------------------------------------------
  // 3. Section reveal on scroll
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
  // 4. SVG art generator for project cards
  // ---------------------------------------------------------------
  function artSVG(art) {
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
      default:
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
  // 5. Work grid (render + 3D tilt on hover) — 6 projects now
  // ---------------------------------------------------------------
  (function workGrid() {
    const grid = document.getElementById('workGrid');
    if (!grid || !window.PROJECTS) return;

    // 6 projects → big/medium alternating
    const sizes = ['lg', 'md', 'lg', 'md', 'md', 'lg'];
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
            ${artSVG(art)}
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
        let tx = 0, ty = 0;
        let ttx = 0, tty = 0;
        const onMove = (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ttx = (px - 0.5) * -8;
          tty = (py - 0.5) * 6;
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
  // 6. Smooth-scroll anchor handler
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
  // 7. Footer back-to-top
  // ---------------------------------------------------------------
  document.querySelectorAll('[data-top]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  // ---------------------------------------------------------------
  // 8. Initial ScrollTrigger refresh + fonts ready
  // ---------------------------------------------------------------
  setTimeout(() => ScrollTrigger.refresh(), 300);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

})();