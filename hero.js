// =================================================================
// hero.js — WebGL faceted terrain with mouse-weight displacement
// Lineage 2 (Three.js + custom shader), but kept tight: ~7KB
// =================================================================

(function heroScene() {
  'use strict';
  const mount = document.getElementById('heroCanvas');
  if (!mount) return;

  // ---- Scene + camera ------------------------------------------
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 2.4, 6.2);
  camera.lookAt(0, 0, 0);

  // ---- Create canvas inside the mount div ----------------------
  // (mount is a div so we have to make our own canvas and append it)
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  mount.appendChild(canvas);

  // ---- WebGL detection (silent degrade to no-webgl class) -------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  if (!renderer.getContext()) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  // ---- State ---------------------------------------------------
  const state = {
    mouse:        { x: 0, y: 0, tx: 0, ty: 0 }, // raw + smoothed
    scroll:       0,                            // 0..1 across hero
    time:         0,
    reduced:      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isVisible:    true,
  };

  // ---- Lighting (warm two-point, matches paper palette) ---------
  const ambient = new THREE.AmbientLight(0xF4F1EA, 0.45);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xFFE3D0, 1.4);
  key.position.set(4, 6, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xB6553B, 0.55);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const fill = new THREE.HemisphereLight(0xF4F1EA, 0x14110E, 0.25);
  scene.add(fill);

  // ---- Faceted terrain (the signature moment) -------------------
  // A plane subdivided heavily, vertex-displaced by FBM noise in a
  // custom GLSL shader, computed flat-shaded so the facets read.
  const SIZE = 12;
  const SEG  = 80;
  const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geom.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector2(0, 0) },
    uScroll:     { value: 0 },
    uClay:       { value: new THREE.Color(0xB6553B) },
    uInk:        { value: new THREE.Color(0x14110E) },
    uPaper:      { value: new THREE.Color(0xF4F1EA) },
    uMoss:       { value: new THREE.Color(0x4A5D3A) },
  };

  const vert = /* glsl */`
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uScroll;

    varying vec3  vPos;
    varying float vHeight;
    varying vec3  vNormal;

    // Simplex noise (Ashima / Ian McEwan, MIT)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // FBM (3 octaves) — gives the terrain its character
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; i++) {
        v += a * snoise(p);
        p *= 2.07;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 p = position;
      vec3 q = p * 0.42 + vec3(0.0, uTime * 0.045, 0.0);

      // Base FBM-driven height
      float h = fbm(q) * 0.9;

      // Secondary slow swell for organic motion
      h += 0.18 * sin(p.x * 0.6 + uTime * 0.3) * cos(p.z * 0.5 - uTime * 0.25);

      // Mouse-weight: bump height under cursor position
      float d = distance(p.xz, uMouse * 5.0);
      h += smoothstep(2.4, 0.0, d) * 0.55;

      // Scroll lifts the terrain (subtle, ties hero to page motion)
      h += uScroll * 0.6;

      p.y += h;

      // Compute flat normal from neighbour FBM samples for crisp facets
      float eps = 0.08;
      float hL = fbm((position + vec3(-eps, 0, 0)) * 0.42 + vec3(0, uTime*0.045, 0)) * 0.9;
      float hR = fbm((position + vec3( eps, 0, 0)) * 0.42 + vec3(0, uTime*0.045, 0)) * 0.9;
      float hD = fbm((position + vec3(0, 0, -eps)) * 0.42 + vec3(0, uTime*0.045, 0)) * 0.9;
      float hU = fbm((position + vec3(0, 0,  eps)) * 0.42 + vec3(0, uTime*0.045, 0)) * 0.9;
      vec3 n = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

      vPos    = p;
      vHeight = h;
      vNormal = n;

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
      // Base altitude palette: paper low → ink mid → clay peak
      float t = clamp((vHeight + 1.2) / 2.4, 0.0, 1.0);
      vec3 col = mix(uPaper, uInk, smoothstep(0.15, 0.65, t));
      col = mix(col, uClay, smoothstep(0.72, 1.0, t) * 0.9);

      // Faceted shading: dot product with a fixed sun direction
      vec3 sunDir = normalize(vec3(0.5, 1.0, 0.4));
      float ndl = max(dot(normalize(vNormal), sunDir), 0.0);
      // Quantise ndl into 4 bands → flat-faceted look
      float band = floor(ndl * 4.0) / 4.0;
      col *= 0.55 + 0.55 * band;

      // Rim accent (warm) on upward-facing ridges
      float rim = smoothstep(0.4, 1.0, vNormal.y) * smoothstep(0.65, 0.95, t);
      col = mix(col, uMoss, rim * 0.35);

      // Edge vignette: fade to paper at terrain edges
      float edge = smoothstep(0.0, 1.4, abs(vPos.x)) * smoothstep(0.0, 1.4, abs(vPos.z));
      col = mix(uPaper, col, 1.0 - edge * 0.85);

      // Mouse-driven warm glow patch
      float d = distance(vPos.xz, uMouse * 5.0);
      col = mix(col, uClay, smoothstep(1.8, 0.0, d) * 0.12);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // Faceted look is achieved inside the fragment shader by quantising
  // the normal·sun dot product into bands — no need to set flatShading
  // (that's a MeshStandardMaterial prop, not a ShaderMaterial one).
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
  });

  const terrain = new THREE.Mesh(geom, mat);
  terrain.position.y = -0.6;
  scene.add(terrain);

  // Subtle floating particles (paper flecks) for depth
  const particleCount = state.reduced ? 0 : 60;
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
  const particles = new THREE.Points(pGeom, pMat);
  scene.add(particles);

  // ---- Resize --------------------------------------------------
  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (w === 0 || h === 0) {
      // Try again on next frame — parent may not have laid out yet
      requestAnimationFrame(resize);
      return;
    }
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  // ResizeObserver catches layout changes that window resize misses
  const ro = new ResizeObserver(() => resize());
  ro.observe(mount);
  resize();
  window.addEventListener('resize', resize);
  // Belt-and-braces: re-resize after a beat in case fonts/layout shift
  setTimeout(resize, 200);
  setTimeout(resize, 800);

  // ---- Pointer input (lerped) ----------------------------------
  let mx = 0, my = 0, gx = 0, gy = 0;
  function onPointer(e) {
    const rect = mount.getBoundingClientRect();
    // Normalised -1..1, y flipped
    const x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mx = x; my = y;
  }
  mount.addEventListener('pointermove', onPointer, { passive: true });

  // ---- Scroll progress (only over hero) ------------------------
  function updateScroll() {
    const hero = document.getElementById('hero');
    if (!hero) { state.scroll = 0; return; }
    const r = hero.getBoundingClientRect();
    const h = hero.offsetHeight - window.innerHeight;
    const t = h > 0 ? Math.max(0, Math.min(1, -r.top / h)) : 0;
    state.scroll = t;
  }

  // ---- Pause when off-screen (perf) ----------------------------
  const io = new IntersectionObserver(([e]) => {
    state.isVisible = e.isIntersecting;
  }, { threshold: 0 });
  io.observe(mount);

  // ---- Loop ----------------------------------------------------
  const clock = new THREE.Clock();
  let raf;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!state.isVisible) return;
    const dt = clock.getDelta();
    state.time += dt;

    // Lerp pointer
    gx += (mx - gx) * 0.06;
    gy += (my - gy) * 0.06;
    uniforms.uMouse.value.set(gx, gy);
    uniforms.uTime.value  = state.time;
    uniforms.uScroll.value = state.scroll;

    // Camera drift, mouse-driven parallax
    camera.position.x = gx * 0.6;
    camera.position.y = 2.4 - gy * 0.4 + state.scroll * 0.5;
    camera.position.z = 6.2 - Math.abs(gx) * 0.3;
    camera.lookAt(gx * 0.4, -0.4 + state.scroll * 0.8, 0);

    // Particles drift
    if (!state.reduced) {
      const arr = pGeom.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i+1] += dt * 0.05;
        if (arr[i+1] > 3.5) arr[i+1] = -0.5;
      }
      pGeom.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  loop();

  // Scroll listener (cheap, just updates state.scroll)
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // Clean up if hero leaves DOM
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    geom.dispose();
    mat.dispose();
    pGeom.dispose();
    pMat.dispose();
    renderer.dispose();
  });
})();
