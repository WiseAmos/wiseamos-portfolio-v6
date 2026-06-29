// =================================================================
// hero.js — WebGL faceted terrain, quiet background of hero
//
// Architecture: FBM noise is computed on the CPU ONCE at load.
// Vertices + normals are baked into BufferAttributes. Per-frame the
// shader only runs a tiny time/elevation update — no per-vertex noise.
//
// Mouse parallax + drag produce visible orbit (rotation around the
// mountain peak) so the silhouette changes as the visitor interacts.
// Scroll past the hero drives a 50° camera arc — the mountain rotates
// from a near-front view at scroll=0 to a 3/4 view at scroll=1.
//
// The terrain is a quiet background. NO HUD overlay, NO "drag to orbit"
// instructions, NO keyboard shortcut hints — those were anti-patterns
// (video-game tutorial feel). The visitor sees a mountain, sees text
// front-and-center, and can interact if they want.
// =================================================================

(function heroScene() {
  'use strict';
  const mount = document.getElementById('heroCanvas');
  if (!mount) return;

  // ---- Perf flags ------------------------------------------------
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
  } catch (err) {
    mount.innerHTML = '';
    return;
  }
  if (!renderer.getContext()) {
    mount.innerHTML = '';
    return;
  }

  // ---- CPU-side noise (3D simplex, MIT) -------------------------
  function snoise(x, y, z) {
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
  const SIZE = 12;
  const SEG  = isLowEnd ? 44 : 56;
  const geom = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geom.rotateX(-Math.PI / 2);

  const pos    = geom.attributes.position;
  const bakedH = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = fbm(x * 0.42, 0, z * 0.42) * 0.9;
    pos.setY(i, h);
    bakedH[i] = h;
  }
  geom.setAttribute('aBakedH', new THREE.BufferAttribute(bakedH, 1));
  geom.computeVertexNormals();

  const uniforms = {
    uTime:    { value: 0 },
    uMouse:   { value: new THREE.Vector2(0, 0) },
    uScroll:  { value: 0 },
    uClay:    { value: new THREE.Color(0xB6553B) },
    uInk:     { value: new THREE.Color(0x14110E) },
    uPaper:   { value: new THREE.Color(0xF4F1EA) },
    uMoss:    { value: new THREE.Color(0x4A5D3A) },
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
      float rip = 0.08 * sin(uTime * 0.35 + position.x * 0.5) * cos(uTime * 0.28 - position.z * 0.6);
      float slow = 0.025 * sin(uTime * 0.12 + position.x * 0.2 + position.z * 0.3);
      float micro = 0.008 * sin(uTime * 0.9 + position.x * 1.2 + position.z * 1.6);
      float h = aBakedH + rip + slow + micro;
      h += uScroll * 1.8;

      vec3 p = position;
      p.y += h - aBakedH;

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
    uniform vec3  uClay;
    uniform vec3  uInk;
    uniform vec3  uPaper;
    uniform vec3  uMoss;

    varying vec3  vPos;
    varying float vHeight;
    varying vec3  vNormal;

    void main() {
      vec3 faceN = normalize(cross(dFdx(vPos), dFdy(vPos)));

      float t = clamp((vHeight + 1.2) / 2.4, 0.0, 1.0);
      vec3 col = mix(uPaper, uInk, smoothstep(0.15, 0.65, t));
      col = mix(col, uClay, smoothstep(0.72, 1.0, t) * 0.9);

      vec3 sunDir = normalize(vec3(
        0.5 + 0.05 * sin(uTime * 0.04),
        1.0,
        0.4 + 0.04 * cos(uTime * 0.03)
      ));
      float ndl = max(dot(faceN, sunDir), 0.0);
      float band = floor(ndl * 5.0) / 5.0;
      col *= 0.50 + 0.60 * band;

      float rim = smoothstep(0.4, 1.0, faceN.y) * smoothstep(0.65, 0.95, t);
      col = mix(col, uMoss, rim * 0.4);

      float edge = smoothstep(0.0, 1.4, abs(vPos.x)) * smoothstep(0.0, 1.4, abs(vPos.z));
      col = mix(uPaper, col, 1.0 - edge * 0.85);

      float depth = smoothstep(-2.0, -0.6, vPos.z);
      col = mix(uPaper, col, depth);

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

  // ---- Camera paths (scroll-driven descent + camera orbit) ------
  const camStart  = { x: 0,    y: 3.8,  z: 11.0 };
  const camMid    = { x: 0.6,  y: 1.5,  z: 5.5  };
  const camEnd    = { x: 1.4,  y: 0.3,  z: 3.2  };
  const lookStart = { x: 3.2,  y: 0.5,  z: 0    };
  const lookEnd   = { x: 4.2,  y: 1.2,  z: 0    };
  function lerpV(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }

  // Scroll-driven orbit camera.
  function updateScroll() {
    const hero = document.getElementById('hero');
    if (!hero) { state.scroll = 0; return; }
    const r = hero.getBoundingClientRect();
    const travel = r.height;
    const scrolled = Math.max(0, -r.top);
    state.scroll = travel > 0 ? Math.max(0, Math.min(1, scrolled / travel)) : 0;
  }
  const state = { scroll: 0, time: 0, isVisible: false };

  // Pause rAF when off-screen
  const io = new IntersectionObserver(([e]) => {
    state.isVisible = e.isIntersecting;
  }, { threshold: 0 });
  io.observe(mount);

  // ---- Frame loop ----------------------------------------------
  const clock = new THREE.Clock();
  let raf = 0;

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!state.isVisible) return;

    const dt = Math.min(clock.getDelta(), 0.1);
    if (!reduced) state.time += dt;

    // Lerp pointer
    gx += (mx - gx) * 0.08;
    gy += (my - gy) * 0.08;

    // Mouse-orbit YAW (drag + parallax)
    const orbitY = gx * 0.30 + yawAdd;
    const orbitX = gy * 0.20 + pitchAdd;
    terrain.rotation.y = orbitY * 0.35;

    uniforms.uTime.value   = state.time;
    uniforms.uMouse.value.set(gx, gy);
    uniforms.uScroll.value = state.scroll;

    // Camera path — scroll-driven descent around fixed pivot (mountain peak)
    const t = state.scroll;
    const half = t < 0.5 ? t * 2 : 1;
    const base = t < 0.5 ? lerpV(camStart, camMid, half) : lerpV(camMid, camEnd, half);
    const pivot = lookStart;

    const SCROLL_YAW_MAX = 50 * Math.PI / 180;
    const scrollYaw = t * SCROLL_YAW_MAX;

    // Step 0 — offset from pivot
    let ox = base.x - pivot.x;
    let oy = base.y - pivot.y;
    let oz = base.z - pivot.z;

    // Step 1 — scroll-orbit around world Y
    const cS = Math.cos(scrollYaw);
    const sS = Math.sin(scrollYaw);
    let r1x = ox * cS - oz * sS;
    let r1z = ox * sS + oz * cS;
    let r1y = oy;

    // Step 2 — user yaw on top of scroll orbit
    const cy = Math.cos(orbitY);
    const sy = Math.sin(orbitY);
    let r2x = r1x * cy - r1z * sy;
    let r2z = r1x * sy + r1z * cy;
    let r2y = r1y;

    // Step 3 — user pitch (small vertical tilt)
    const px = Math.max(-0.45, Math.min(0.45, orbitX));
    const cx = Math.cos(px);
    const sx = Math.sin(px);
    const r3y = r2y * cx - r2z * sx;
    const r3z = r2y * sx + r2z * cx;

    camera.position.set(pivot.x + r2x, pivot.y + r3y, pivot.z + r3z);
    camera.lookAt(pivot.x, pivot.y, pivot.z);

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
    if (particles) {
      particles.geometry.dispose();
      particles.material.dispose();
    }
    renderer.dispose();
  });
})();