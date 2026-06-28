# AMOS · engineer — v6

Personal portfolio, sixth iteration. Built 2026-06-28.

## Stack
- Static HTML/CSS/JS, no build step
- **Three.js** for the WebGL faceted-terrain hero (custom GLSL shader)
- **GSAP + ScrollTrigger** for scroll choreography
- **Lenis** for smooth scroll (lazy)
- Inter Tight, Fraunces, JetBrains Mono via Google Fonts
- Warm-paper + clay palette — no purple/teal gradient

## Sections
1. **Hero** — WebGL faceted terrain with mouse-weight displacement
2. **Marquee** — scroll-tied slow-drift ticker of capabilities
3. **Work** — 9 projects in an editorial asymmetric grid (bento)
4. **Process** — horizontal pinned scroll with per-word highlight (4 steps)
5. **About** — typographic monogram + body + principles grid
6. **Stack** — 4-column capability grid with 5-bar level indicators
7. **Contact** — channels + form (mailto fallback)

## Layout
```
.
├── index.html         370 lines
├── styles.css       1,049 lines  (design tokens, sections, motion)
├── app.js            461 lines  (scroll, marquee, cursor, grid, process)
├── hero.js           334 lines  (Three.js terrain + shader)
├── projects.js       121 lines  (9 projects data)
├── favicon.svg
└── vercel.json
```

## Run locally
```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

## Deploy
- Push to `WiseAmos/wiseamos-portfolio-v6` (public)
- Vercel auto-deploys from `main`

## Notes
- No npm install needed; Three.js + GSAP loaded via CDN
- `prefers-reduced-motion: reduce` respected throughout
- All hero interactions degrade to static on `no-webgl`