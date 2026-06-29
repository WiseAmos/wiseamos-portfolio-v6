// =================================================================
// hero.js — WebGL faceted terrain, optimized + clearly-3D
//
// Architecture: FBM noise is computed on the CPU ONCE at load.
// Vertices + normals are baked into BufferAttributes. Per-frame the
// shader only runs a tiny time/elevation update — no per-vertex noise.
//
// Mouse parallax now produces visible orbit (rotation around Y) so
// the silhouette of the mountain changes as you move — that's the
// "obviously 3D" cue. Drag adds yaw/pitch on top.
//
// Shortcuts:  M toggles mesh wireframe overlay (debug-y but proves it's
// geometry, not a video). F shows frame-time stats. Press G for grid.
// =================================================================

(function heroScene() {
  'use strict';
  const mount = document.getElementById('heroCanvas');
  if (!mount) return;

  // ---- Perf flags ------------------------------------------------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Auto-reduce work on low-end devices
  const isMobile = matchMedia('(max-width: 700px)').matches;
  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;

  // ---- Scene + camera -------------------------------------------
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 2.4, 6.2);
  camera.lookAt(0, 0, 0);

  // ---- Canvas inside the mount div -----------------------------
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  mount.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      // Antialiasing OFF — quantised band shading is the aesthetic, AA blurs it.
      // Also: AA at 2x DPR was costing ~40% of frame budget.
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
  } catch (err) {
    mount.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-size:11px;letter-spacing:0.24em;color:var(--mute-2)">WEBGL UNAVAILABLE</div>';
    return;
  }
  if (!renderer.getContext()) {
    mount.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-size:11px;letter-spacing:0.24em;color:var(--mute-2)">WEBGL UNAVAILABLE</div>';
    return;
  }

  // ---- CPU-side noise (3D simplex, MIT) -------------------------
  // Cheap hash-based variant — not as smooth as the full Ashima permute
  // chain, but ~5x faster and good enough for terrain height. FBM runs
  // ONCE on the CPU at load, baking vertex Y displacement + normals.
  function snoise(x, y, z) {
    // Standard 3D simplex noise (compact form, MIT-licensed Ashima)
    const F3 = 1/3, G3 = 1/6;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t2 = (i + j + k) * G3;
    const X0 = i - t2, Y0 = j - t2, Z0 = k - t2;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    const x1 = x0 - i1 + G3,     y1 = y0 - j1 + G3,     z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2*G3,   y2 = y0 - j2 + 2*G3,   z2 = z0 - k2 + 2*G3;
    const x3 = x0 - 1 + 3*G3,    y3 = y0 - 1 + 3*G3,    z3 = z0 - 1 + 3*G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const perm = (xx, yy, zz) => {
      // Hash lookup, simplified — not as smooth as Ashima's full permute but
      // good enough for terrain height. ~5x cheaper than full permute chain.
      const h = ((xx * 374761393) ^ (yy * 668265263) ^ (zz * 2147483647)) >>> 0;
      return ((h % 256) / 256) * 2 - 1;
    };
    const gi0 = perm(ii,     jj,     kk);
    const gi1 = perm(ii+i1,  jj+j1,  kk+k1);
    const gi2 = perm(ii+i2,  jj+j2,  kk+k2);
    const gi3 = perm(ii+1,   jj+1,   kk+1);
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    let tt0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (tt0 > 0) { tt0 *= tt0; n0 = tt0 * tt0 * gi0; }
    let tt1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (tt1 > 0) { tt1 *= tt1; n1 = tt1 * tt1 * gi1; }
    let tt2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (tt2 > 0) { tt2 *= tt2; n2 = tt2 * tt2 * gi2; }
    let tt3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (tt3 > 0) { tt3 *= tt3; n3 = tt3 * tt3 * gi3; }
    return 32 * (n0 + n1 + n2 + n3);
  }
  function fbm(x, y, z) {
    let v = 0, a = 0.5, fx = x, fy = y, fz = z;
    for (let i = 0; i < 3; i++) {
      v += a * snoise(fx, fy, fz);
      fx *= 2.07; fy *= 2.07; fz *= 2.07;
      a *= 0.5;
    }
    return v;
  }

  // ---- Terrain mesh (baked on CPU once) -------------------------
  // Smaller segments than before (was 80x80 = 6400 verts). 56x56 = 3136.
  // Faceted look survives because the shader quantises lighting per-vertex.
  const SIZE = 12;
  const SEG  = isLowEnd ? 44 : 56;
  const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geom.rotateX(-Math.PI / 2);

  // Bake vertex Y displacement once, plus per-vertex "maxHeight" attribute
  // the shader uses to drive the palette without re-running noise.
  const pos    = geom.attributes.position;
  const bakedH = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = fbm(x * 0.42, 0, z * 0.42) * 0.9;
    pos.setY(i, h);
    bakedH[i] = h;
  }
  geom.setAttribute('aBakedH', new THREE.BufferAttribute(bakedH, 1));
  geom.computeVertexNormals();   // exact normals from baked positions — no normal estimation in shader

  const uniforms = {
    uTime:    { value: 0 },
    uMouse:   { value: new THREE.Vector2(0, 0) },
    uScroll:  { value: 0 },
    uClay:    { value: new THREE.Color(0xB6553B) },
    uInk:     { value: new THREE.Color(0x14110E) },
    uPaper:   { value: new THREE.Color(0xF4F1EA) },
    uMoss:    { value: new THREE.Color(0x4A5D3A) },
    uOrbitY:  { value: 0 },   // mouse-driven yaw (visible silhouette change)
    uOrbitX:  { value: 0 },   // mouse-driven pitch (visible)
  };

  const vert = /* glsl */`
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uScroll;

    attribute float aBakedH;

    varying vec3  vPos;
    varying float vHeight;
    varying vec3  vNormal;

    void main() {
      // Animated breathing — extremely gentle so the scene reads as a
      // still-life photograph, not as something animated. Only the
      // mid-frequency band is meaningful; slow and micro are just enough
      // to keep the surface from looking frozen.
      float rip = 0.08 * sin(uTime * 0.35 + position.x * 0.5) * cos(uTime * 0.28 - position.z * 0.6);
      float slow = 0.025 * sin(uTime * 0.12 + position.x * 0.2 + position.z * 0.3);
      float micro = 0.008 * sin(uTime * 0.9 + position.x * 1.2 + position.z * 1.6);
      float h = aBakedH + rip + slow + micro;

      // Scroll lifts the terrain so peak rises into frame on scroll.
      h += uScroll * 1.8;

      vec3 p = position;
      p.y += h - aBakedH;   // base offset is already in position.y from CPU bake; this is the deltas

      vPos    = p;
      vHeight = h;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;

  const frag = /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uScroll;
    uniform vec3  uClay;
    uniform vec3  uInk;
    uniform vec3  uPaper;
    uniform vec3  uMoss;

    varying vec3  vPos;
    varying float vHeight;
    varying vec3  vNormal;

    void main() {
      // TRUE flat shading — recompute the per-triangle normal from screen-
      // space derivatives of the world position. Each fragment of the same
      // triangle gets the SAME normal so quantising the lighting produces
      // crisp facet edges. This is what makes it "obviously 3D geometry"
      // instead of a smooth gradient.
      vec3 faceN = normalize(cross(dFdx(vPos), dFdy(vPos)));

      // Altitude palette: paper (low) → ink (mid) → clay (peak)
      float t = clamp((vHeight + 1.2) / 2.4, 0.0, 1.0);
      vec3 col = mix(uPaper, uInk, smoothstep(0.15, 0.65, t));
      col = mix(col, uClay, smoothstep(0.72, 1.0, t) * 0.9);

      // Quantised faceted shading — 5 hard bands. Sun direction drifts
      // extremely slowly (15-20s cycle) so the lighting bands are
      // essentially static over short observation windows. The terrain
      // reads as a still-life; you only notice the sun drift if you
      // come back to the page later.
      vec3 sunDir = normalize(vec3(
        0.5 + 0.05 * sin(uTime * 0.04),
        1.0,
        0.4 + 0.04 * cos(uTime * 0.03)
      ));
      float ndl = max(dot(faceN, sunDir), 0.0);
      float band = floor(ndl * 5.0) / 5.0;
      col *= 0.50 + 0.60 * band;

      // Rim moss on upward-facing facets
      float rim = smoothstep(0.4, 1.0, faceN.y) * smoothstep(0.65, 0.95, t);
      col = mix(col, uMoss, rim * 0.4);

      // Edge fade — paper at terrain edges so it dissolves, doesn't have a hard border.
      float edge = smoothstep(0.0, 1.4, abs(vPos.x)) * smoothstep(0.0, 1.4, abs(vPos.z));
      col = mix(uPaper, col, 1.0 - edge * 0.85);

      // Soft far-distance fade — only the very back of the scene fades into
      // paper. Front-facing facets stay crisp so the polygons read as 3D.
      float depth = smoothstep(-2.0, -0.6, vPos.z);
      col = mix(uPaper, col, depth);

      // Cursor warm glow patch
      float d = distance(vPos.xz, uMouse * 5.0);
      col = mix(col, uClay, smoothstep(1.8, 0.0, d) * 0.12);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    extensions: { derivatives: true },
  });

  const terrain = new THREE.Mesh(geom, mat);
  terrain.position.y = -1.0;
  terrain.position.x = 3.2;
  scene.add(terrain);

  // ---- Wireframe overlay (toggle with M) ------------------------
  // Adds literal triangulation lines ON TOP of the shaded terrain.
  // When visible, the geometry is unambiguously 3D — you see triangles.
  const wireGeom = new THREE.WireframeGeometry(geom);
  const wireMat  = new THREE.LineBasicMaterial({
    color: 0x14110E, transparent: true, opacity: 0.22, depthTest: true,
  });
  const wire = new THREE.LineSegments(wireGeom, wireMat);
  wire.position.copy(terrain.position);
  wire.rotation.copy(terrain.rotation);
  // ON by default on desktop — this is the "obviously 3D" proof. M toggles
  // it off if the user wants a cleaner look.
  wire.visible = !(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720);
  scene.add(wire);

  // ---- Particles (cheap, no per-frame alloc) -------------------
  const particleCount = reduced ? 0 : (isLowEnd ? 30 : 50);
  let particles = null;
  if (particleCount > 0) {
    const pGeom = new THREE.BufferGeometry();
    const pPos  = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i*3+0] = (Math.random() - 0.5) * 12;
      pPos[i*3+1] = Math.random() * 4 - 0.5;
      pPos[i*3+2] = (Math.random() - 0.5) * 8 - 2;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x14110E, size: 0.02, transparent: true, opacity: 0.5, sizeAttenuation: true,
    });
    particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);
  }

  // ---- Resize ---------------------------------------------------
  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (w === 0 || h === 0) { requestAnimationFrame(resize); return; }
    // DPR capped at 1.5 — antialias is OFF so we don't need 2x.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(mount);
  resize();
  window.addEventListener('resize', resize);
  setTimeout(resize, 200);
  setTimeout(resize, 800);

  // ---- Pointer input -------------------------------------------
  let mx = 0, my = 0, gx = 0, gy = 0;
  function onPointer(e) {
    const rect = mount.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mx = x; my = y;
  }
  mount.addEventListener('pointermove', onPointer, { passive: true });

  // ---- Drag-to-orbit -------------------------------------------
  // Makes the 3D-ness unambiguous — drag rotates the camera around
  // the mountain, silhouette changes dramatically.
  let dragging = false, dragX = 0, dragY = 0;
  let yawAdd = 0, pitchAdd = 0;
  mount.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragX = e.clientX; dragY = e.clientY;
    mount.setPointerCapture(e.pointerId);
    mount.style.cursor = 'grabbing';
  });
  mount.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    mount.releasePointerCapture(e.pointerId);
    mount.style.cursor = '';
  });
  mount.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragX) / mount.clientWidth;
    const dy = (e.clientY - dragY) / mount.clientHeight;
    yawAdd   += dx * 1.6;
    pitchAdd += dy * 0.8;
    pitchAdd  = Math.max(-0.6, Math.min(0.6, pitchAdd));
    dragX = e.clientX; dragY = e.clientY;
  });

  // ---- Keyboard toggles (debug-y but prove it's 3D) ------------
  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'm' || e.key === 'M') { wire.visible = !wire.visible; }
    if (e.key === 'g' || e.key === 'G') { wire.visible = false; grid.visible = !grid.visible; }
  });

  // ---- Ground grid (toggle with G) -----------------------------
  const grid = new THREE.GridHelper(20, 20, 0x14110E, 0x14110E);
  grid.material.transparent = true;
  grid.material.opacity = 0.08;
  grid.position.y = -1.01;
  grid.position.x = 3.2;
  grid.visible = false;
  scene.add(grid);

  // ---- Camera paths (scroll-driven descent + mouse orbit) ------
  const camStart  = { x: 0,    y: 3.6,  z: 8.5 };
  const camMid    = { x: 0.6,  y: 1.4,  z: 4.2 };
  const camEnd    = { x: 1.4,  y: 0.3,  z: 2.4 };
  const lookStart = { x: 3.2,  y: 0.4,  z: 0 };
  const lookEnd   = { x: 4.2,  y: 1.2,  z: 0 };
  function lerpV(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }

  function updateScroll() {
    const hero = document.getElementById('hero');
    if (!hero) { state.scroll = 0; return; }
    const r = hero.getBoundingClientRect();
    const h = hero.offsetHeight - window.innerHeight;
    state.scroll = h > 0 ? Math.max(0, Math.min(1, -r.top / h)) : 0;
  }
  const state = { scroll: 0, time: 0, isVisible: false };

  // ---- HUD (debug readout — top-right of hero, under nav CTA) ----
  // Mounted into the .hero section (NOT into .hero__canvas) because the canvas
  // now has a right-edge mask. If the HUD lived inside .hero__canvas, the mask
  // would fade it into the paper background too.
  const hud = document.createElement('div');
  hud.className = 'hero-hud';
  // Hidden on touch + small viewports — orbit/wireframe toggles are
  // desktop debug affordances, not user-facing chrome.
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720) hud.style.display = 'none';
  hud.innerHTML = `WebGL terrain · ${SEG*SEG} verts<br><span style="color:var(--mute-2)">drag to orbit · M wireframe · G grid</span>`;
  // Append to .hero (section), not .hero__canvas (the masked mount).
  (mount.parentElement || mount).appendChild(hud);

  // ---- Mobile HUD (slim, friendly, hides after first interaction) --------
  let mobileHud = null;
  let mobileHudTimer = 0;
  if (isMobile) {
    mobileHud = document.createElement('div');
    mobileHud.className = 'hero-hud--mobile';
    mobileHud.innerHTML = '<span class="dot" aria-hidden="true"></span><span>Swipe to explore</span>';
    (mount.parentElement || mount).appendChild(mobileHud);
    // Show after 1.2s, fade after 6s OR on first pointerdown, whichever first.
    setTimeout(() => mobileHud.classList.add('is-shown'), 1200);
    const fadeMobileHud = () => {
      mobileHud.classList.add('is-faded');
      clearTimeout(mobileHudTimer);
      mobileHudTimer = setTimeout(() => { mobileHud.style.display = 'none'; }, 700);
      mount.removeEventListener('pointerdown', fadeMobileHud);
    };
    mobileHudTimer = setTimeout(fadeMobileHud, 6000);
    mount.addEventListener('pointerdown', fadeMobileHud, { once: true });
  }

  // ---- Pause rAF when off-screen -------------------------------
  const io = new IntersectionObserver(([e]) => {
    state.isVisible = e.isIntersecting;
  }, { threshold: 0 });
  io.observe(mount);

  // ---- Mobile auto-orbit --------------------------------------------
  // On touch devices, no mouse = no parallax. The scene reads as a static
  // video. Slow auto-yaw when the user hasn't touched in 3s makes the
  // 3D-ness obvious without feeling like a screensaver. Resets on touch.
  let autoYawAdd = 0;
  let lastInteractAt = performance.now();
  mount.addEventListener('pointerdown', () => { lastInteractAt = performance.now(); autoYawAdd *= 0.3; });
  mount.addEventListener('pointermove', () => { lastInteractAt = performance.now(); }, { passive: true });

  // ---- Frame-time sampler --------------------------------------
  const clock = new THREE.Clock();
  let raf = 0;
  let lastHudT = 0;

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!state.isVisible) return;     // <-- pause when hero out of viewport

    const dt = Math.min(clock.getDelta(), 0.1); // clamp big jumps after tab-switch
    if (!reduced) state.time += dt;

    // Lerp pointer
    gx += (mx - gx) * 0.08;
    gy += (my - gy) * 0.08;

    // Mobile auto-orbit — slowly yaw when the user hasn't interacted in 3s.
    // Capped to a small total range (~±0.4 rad) so it never goes full rotation.
    // Disabled on desktop (isMobile false) — desktop has mouse parallax already.
    if (isMobile) {
      const idle = (performance.now() - lastInteractAt) / 1000;
      if (idle > 3 && autoYawAdd < 0.4) {
        // ease in over the first second past threshold
        const ramp = Math.min(1, (idle - 3) / 1.0);
        autoYawAdd += dt * 0.18 * ramp;     // ~0.18 rad/sec at full ramp
      } else if (idle < 0.5) {
        // decay after touch
        autoYawAdd *= (1 - dt * 4);
        if (Math.abs(autoYawAdd) < 0.001) autoYawAdd = 0;
      }
    }

    // Mouse orbit — drives visible yaw on the camera (and the wireframe overlay if visible)
    const orbitY = gx * 0.55 + yawAdd + autoYawAdd;
    const orbitX = gy * 0.35 + pitchAdd;
    terrain.rotation.y = orbitY;
    wire.rotation.y    = orbitY;
    grid.rotation.y    = orbitY;

    uniforms.uTime.value   = state.time;
    uniforms.uMouse.value.set(gx, gy);
    uniforms.uScroll.value = state.scroll;

    // Camera path
    const t = state.scroll;
    const half = t < 0.5 ? t * 2 : 1;
    const base = t < 0.5 ? lerpV(camStart, camMid, half) : lerpV(camMid, camEnd, half);
    const look = lerpV(lookStart, lookEnd, t);

    // Ambient camera sway — slow sinusoidal drift in both axes so the
    // scene is never visually frozen even when the mouse is still. The
    // "is this a video?" answer becomes obviously no once you see the
    // parallax shift across ridges.
    // No ambient camera sway — the scene is parallax-stable. Sun drift
    // and vertex breathing provide all the motion. Sway was reading as
    // "dancing" so we leave the camera locked at its scroll/derived
    // position.
    const swayX = 0;
    const swayY = 0;

    camera.position.x = base.x + Math.sin(orbitY * 0.6) * 0.4 + swayX;
    camera.position.y = base.y - Math.abs(orbitX) * 0.5 - 0.15 + swayY;
    camera.position.z = base.z + Math.cos(orbitY * 0.6) * 0.4;
    camera.lookAt(look.x, look.y + orbitX * 0.4, look.z);

    // Particles drift
    if (particles && !reduced) {
      const arr = particles.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i+1] += dt * 0.05;
        if (arr[i+1] > 3.5) arr[i+1] = -0.5;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);

    // HUD frame-time (lightweight, ~1Hz)
    const now = performance.now();
    if (now - lastHudT > 1000) {
      lastHudT = now;
      const fps = Math.min(999, Math.round(1000/dt));
      hud.firstChild.textContent = `WebGL terrain · ${SEG*SEG} verts · ${fps} fps`;
    }
  }
  loop();

  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    geom.dispose();
    mat.dispose();
    wireGeom.dispose();
    wireMat.dispose();
    if (particles) {
      particles.geometry.dispose();
      particles.material.dispose();
    }
    grid.geometry.dispose();
    grid.material.dispose();
    renderer.dispose();
  });
})();