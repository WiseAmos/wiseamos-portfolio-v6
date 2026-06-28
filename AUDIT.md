# v6 production audit — 2026-06-28

Verdict: **NOT production-grade.** Significant issues across every section.

## Universal issues (all sections)

1. **Custom cursor renders as a visible circle/ring at viewport center in any non-interactive state.** It reads as a broken UI element / loading indicator. The `body.has-moved` gate works on real users but the visual artifact is present in all screenshots and on first-paint when mouse hasn't moved. Fix: cursor must be `opacity: 0` by default, AND the ring/dot must be `pointer-events: none` AND small enough not to dominate the frame.
2. **The "0 combined stars" stat in the hero is misleading** — 72 repos, 0 stars reads as "this person is unproven." Should be rephrased or hidden.
3. **`SG·01` stat clipped on the right edge** — the right column overflows.
4. **The `02 / 09` project counter** in the bottom strip of cards is present but small and unimportant — adds visual noise.

## Section-by-section

### Hero (5/10)
- Title reveals nicely, terrain renders.
- **Terrain reads as generic paper-mountain wallpaper, not a signature WebGL gesture.** Looks like a 2010 desktop background. No clearly intentional composition.
- **Title overlaps dark terrain peaks in the center** ("things that" line collides with the brown peak). The scrim only covers bottom 50%, so the middle of the hero still has full terrain brightness.
- **Right-side stats column is visually orphaned** — floats in the corner with no relationship to the title or terrain.
- **Cursor ring stuck at viewport center** reads as a feature.

### Marquee (8/10)
- Works as intended, no critical issues.

### Work (4/10)
- **Cards are sharp squares with `border-radius: 0px` and `padding: 0px`.** Text touches card edges.
- **Pattern backgrounds (rings, grid) are decorative noise** — don't carry meaning.
- **Project descriptions are missing or truncated.** Each card needs: title, one-line description, role/tech, link.
- **No visual content variety** — every card is the same composition (glyph + pattern + label + 02/09 counter).
- **No images.** Awwwards portfolios show actual screenshots of work. Even a single screenshot per project would transform this.

### Process (5/10)
- Title is gorgeous.
- **At top of section, you see title + 600px of empty black pinned space.** First step is off-screen. Feels broken on first scroll-into.
- The pinned-scroll-tied per-word highlight is hard to discover.
- The horizontal step layout works in concept but the dark palette makes it feel like a different site.

### About (7/10)
- Monogram + corner labels is Awwwards-tier.
- Body copy works.
- **Cursor circle stuck on monogram** — looks like the monogram is interactive when it's not.

### Stack (6/10)
- Typography is great.
- **Cursor circle stuck on Python row** — looks like Python is selected/loading.
- The level bars work but are very small.

### Contact (7/10)
- Title is stunning.
- Form is clean.
- **Cursor circle stuck on email row** — looks like email is interactive.

### Footer
- **No footer exists.** The contact section ends abruptly with no signature, copyright, social links, or back-to-top button. This is a production-table-stakes miss.

## Production-grade fixes needed

Priority order:
1. **Fix the custom cursor** to never be visible without a recent mouse move, AND make it small/dot-only.
2. **Add a real footer** with name, year, social, back-to-top.
3. **Fix hero readability**: stronger scrim OR shift terrain lower OR reduce terrain opacity under text.
4. **Fix right-side stat overflow** and rephrase "0 stars" stat.
5. **Replace the work cards** with: thumbnail image, title, description, tech tags, link. Drop the glyph/pattern system — it's noise.
6. **Make process first-step visible at top** — pin section should start with step 01 already in view.
7. **Verify on a real phone** — mobile currently is untested beyond layout snapshots.
8. **Cursor dot stuck center** — gate visibility on recent `pointermove`, not just first one.
9. **Add favicon** in browser tab.
10. **Add Open Graph image** for link unfurls.

## Verdict
Aesthetic vision is there. Implementation is sketchy. Need at least 3 rounds of fixing to ship production-grade.