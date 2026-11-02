/* Seventy — 3D stage: ceramic cup, steam, beans. Procedural (no model files), tuned for phones. */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

const stage = document.querySelector(".stage");
const canvas = document.getElementById("scene");
const params = new URLSearchParams(location.search);
const POSTER = params.has("poster");           // used once to render images/hero-static.webp
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 860px), (pointer: coarse)").matches;
const weak = (navigator.hardwareConcurrency || 8) <= 2 || (navigator.deviceMemory || 8) <= 2;

const goStatic = () => { stage.classList.add("static"); stage.classList.remove("ready"); };

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
  catch { return false; }
}

if (!webglOK() || (weak && !POSTER) || params.has("static")) goStatic();
else init();

function init() {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: POSTER });
  let dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 2);
  renderer.setPixelRatio(POSTER ? 1 : dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(camera);

  /* ---------- light ---------- */
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0xcdb9a0, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1de, 2.4);
  key.castShadow = !mobile;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1; key.shadow.camera.far = 20;
  key.shadow.radius = 8; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffb27a, 0);
  scene.add(rim);

  // morning cream → caramel → evening espresso
  const PRESETS = [
    { key: 0xfff1de, ki: 2.5, kp: [-4, 7, 5], sky: 0xfff6ea, gnd: 0xcdb9a0, hi: 0.95, env: 0.55, rim: 0.0, steam: 0.6, shadow: 0.2 },
    { key: 0xffb27a, ki: 2.7, kp: [-6, 4.5, 3], sky: 0xf6d3b0, gnd: 0x9c6a44, hi: 0.8, env: 0.5, rim: 0.6, steam: 0.4, shadow: 0.24 },
    { key: 0xff9450, ki: 1.7, kp: [-7, 2.2, -1], sky: 0x6a4634, gnd: 0x1c1410, hi: 0.55, env: 0.22, rim: 2.2, steam: 0.75, shadow: 0.0 },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  const mixHex = (a, b, t, out) => out.copy(cA.setHex(a)).lerp(cB.setHex(b), t);

  /* ---------- materials ---------- */
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xe4d6c2, roughness: 0.64, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.6, envMapIntensity: 0.45,
  });
  const beanMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0, envMapIntensity: 0.5 });

  /* ---------- cup + saucer (lathe) ---------- */
  const SEG = mobile ? 64 : 112;
  const cup = new THREE.Group();
  scene.add(cup);

  const saucerPts = [
    [0, 0.02], [0.55, 0.0], [0.62, 0.005], [0.66, 0.035], [1.0, 0.065], [1.32, 0.12], [1.47, 0.19], [1.5, 0.215],
    [1.485, 0.235], [1.44, 0.225], [1.3, 0.16], [0.98, 0.11], [0.62, 0.095], [0, 0.095],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerPts, SEG), ceramic);
  saucer.castShadow = saucer.receiveShadow = true;
  cup.add(saucer);

  // cup profile: rounded bowl on a small foot, thin rim
  const base = 0.095, H = 1.12, wall = 0.045;
  const outerR = (t) => 0.4 + 0.44 * Math.pow(Math.sin(Math.min(1, t * 1.08) * Math.PI / 2), 0.62);
  const prof = [new THREE.Vector2(0, base), new THREE.Vector2(0.34, base), new THREE.Vector2(0.37, base + 0.012), new THREE.Vector2(0.39, base + 0.04)];
  const N = 30;
  for (let i = 1; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(outerR(t), base + 0.04 + t * H)); }
  const top = base + 0.04 + H, rimR = outerR(1);
  prof.push(new THREE.Vector2(rimR - 0.01, top + 0.018), new THREE.Vector2(rimR - wall * 0.6, top + 0.02), new THREE.Vector2(rimR - wall, top));
  for (let i = N - 1; i >= 4; i--) { const t = i / N; prof.push(new THREE.Vector2(outerR(t) - wall, base + 0.09 + t * (H - 0.05))); }
  prof.push(new THREE.Vector2(0, base + 0.2));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, SEG), ceramic);
  body.castShadow = body.receiveShadow = true;
  cup.add(body);

  // handle
  const arc = Math.PI * 1.32;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.058, 20, 64, arc), ceramic);
  handle.rotation.z = -arc / 2;
  handle.scale.set(1, 1.18, 1.3);
  handle.position.set(rimR - 0.02, base + 0.04 + H * 0.58, 0);
  handle.castShadow = true;
  cup.add(handle);

  // coffee surface with crema and a latte-art heart, painted on canvas
  const fillT = 0.86, fillY = base + 0.09 + fillT * (H - 0.05);
  const coffeeR = outerR(fillT) - wall - 0.004;
  const tex = new THREE.CanvasTexture(paintCrema(mobile ? 512 : 1024));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(coffeeR, SEG),
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.38, clearcoat: 0.15, clearcoatRoughness: 0.4, envMapIntensity: 0.35 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.rotation.z = Math.PI / 2 + 0.35;
  coffee.position.y = fillY;
  cup.add(coffee);

  // ground: soft contact shadow (always) + real shadow catcher (desktop)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(paintBlob()), transparent: true, depthWrite: false, opacity: 0.55 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.001;
  cup.add(blob);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: 0x3a2214, opacity: 0.2 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true;
  cup.add(catcher);

  /* ---------- steam ---------- */
  const steamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.55 }, uSeed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uOpacity, uSeed;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
      void main(){
        vec2 uv = vUv;
        float t = uTime * .22 + uSeed * 7.;
        float sway = sin(uv.y * 3.4 - uTime * .55 + uSeed * 6.) * .13 * uv.y + (fbm(vec2(uv.y * 2. - t, uSeed)) - .5) * .35 * uv.y;
        float x = uv.x - .5 - sway;
        float width = .045 + uv.y * .2;
        float col = smoothstep(width, 0., abs(x));
        float wisps = fbm(vec2(uv.x * 3. + uSeed * 3., uv.y * 2.2 - t * 1.6));
        wisps = smoothstep(.42, .9, wisps) * (.6 + .4 * fbm(vec2(uv.x * 7. - uSeed, uv.y * 5. - t * 2.)));
        float fade = smoothstep(0., .18, uv.y) * (1. - smoothstep(.45, 1., uv.y));
        float a = col * wisps * fade * uOpacity;
        gl_FragColor = vec4(vec3(1.), a);
      }`,
  });
  const steam = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.6), steamMat.clone());
    m.material.uniforms.uSeed.value = i * 0.37 + 0.1;
    m.position.set((i - 1) * 0.16, top + 1.25, (i - 1) * 0.05);
    m.renderOrder = 10;
    cup.add(m); steam.push(m);
  }

  /* ---------- beans (instanced) ---------- */
  const beanGeo = makeBean(mobile ? 20 : 32);
  const COUNT = mobile ? 11 : 24;
  const beans = new THREE.InstancedMesh(beanGeo, beanMat, COUNT);
  beans.castShadow = !mobile;
  beans.frustumCulled = false;
  camera.add(beans);                                 // floating layout lives in camera space
  const tints = [0x3f2314, 0x4a2a17, 0x351d10, 0x55321b];
  const B = [];
  const rand = mulberry32(70);
  // resting beans scattered on the "table" around the saucer
  const restSpots = [[1.78, 0.55, 0.4], [2.0, -0.3, 2.1], [1.45, 1.2, 4.4], [-1.8, 0.85, 1.2], [-2.05, -0.15, 5.3], [0.35, 1.85, 3.3], [-0.9, 1.6, 0.9]];
  for (let i = 0; i < COUNT; i++) {
    const rs = restSpots[i];
    const zf = -7 - rand() * 10;                      // camera-space depth
    B.push({
      rest: rs ? new THREE.Vector3(rs[0], 0.075, rs[1]) : null,
      restRot: rs ? new THREE.Euler(-Math.PI / 2, 0, rs[2]) : null,
      fx: (rand() < 0.5 ? -1 : 1) * (0.42 + rand() * 0.6), fy: (rand() * 2 - 1), fz: zf,   // biased to the edges, away from text
      spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.7),
      rot: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
      bob: rand() * Math.PI * 2,
      s: (0.15 + rand() * 0.06) * (mobile && !rs ? 0.72 : 1),
      delay: rs ? rand() * 0.25 : 0.15 + rand() * 0.55,
    });
    beans.setColorAt(i, new THREE.Color(tints[i % tints.length]));
  }
  beans.instanceColor.needsUpdate = true;

  /* ---------- scroll choreography ---------- */
  //   theta: orbit, phi: elevation, dist: distance, lift: cup drop (moves the cup out of frame),
  //   shift: horizontal frame offset, spread: beans 0 rest → 1 floating, light: preset 0..2
  const KF = {
    hero:    { ly: 0.2, theta: 0.0, phi: 0.44, dist: 9.6, lift: 0, shift: 0, spread: 0, light: 0 },
    story:   { ly: 0.85, theta: 1.3, phi: 0.55, dist: 9.0, lift: -9, shift: 0, spread: 0.6, light: 0.35 },
    lots:    { ly: 0.85, theta: 2.0, phi: 0.62, dist: 9.0, lift: -9, shift: 0, spread: 1, light: 0.75 },
    formats: { ly: 0.85, theta: 2.6, phi: 0.55, dist: 9.0, lift: -9, shift: 0, spread: 0.9, light: 1.0 },
    school:  { ly: 0.75, theta: 3.3, phi: 0.3, dist: 8.4, lift: 0, shift: -0.62, spread: 0.55, light: 2.0 },
    event:   { ly: 0.85, theta: 3.9, phi: 0.5, dist: 9.0, lift: -9, shift: 0, spread: 0.8, light: 1.3 },
    places:  { ly: 0.85, theta: 4.6, phi: 0.55, dist: 9.0, lift: -9, shift: 0, spread: 0.75, light: 1.0 },
    bonus:   { ly: 0.85, theta: 5.3, phi: 0.5, dist: 9.0, lift: -9, shift: 0, spread: 0.7, light: 0.7 },
    closing: { ly: 1.75, theta: Math.PI * 2, phi: 0.3, dist: 9.5, lift: 0, shift: 0, spread: 0.12, light: 0.15 },
    footer:  { ly: 1.75, theta: Math.PI * 2 + 0.2, phi: 0.5, dist: 9.5, lift: 0, shift: 0, spread: 0.3, light: 0.25 },
  };
  if (mobile) Object.assign(KF.school, { lift: -9, shift: 0 });   // no room beside the text on phones
  const keys = Object.keys(KF.hero);
  let anchors = [];
  const measure = () => {
    anchors = [...document.querySelectorAll("[data-scene]")].map((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY;
      const center = el.dataset.scene === "hero" ? 0 : top + Math.min(r.height, innerHeight) / 2 - innerHeight / 2;
      return { at: Math.max(0, center), kf: KF[el.dataset.scene] };
    }).filter((a) => a.kf).sort((a, b) => a.at - b.at);
  };
  const ease = (t) => t * t * (3 - 2 * t);
  const target = {}, cur = { ...KF.hero };
  const sample = (y) => {
    if (!anchors.length) return Object.assign(target, KF.hero);
    let i = 0;
    while (i < anchors.length - 1 && y > anchors[i + 1].at) i++;
    const a = anchors[i], b = anchors[Math.min(i + 1, anchors.length - 1)];
    const t = b.at > a.at ? ease(Math.min(1, Math.max(0, (y - a.at) / (b.at - a.at)))) : 0;
    for (const k of keys) target[k] = a.kf[k] + (b.kf[k] - a.kf[k]) * t;
    return target;
  };

  /* ---------- input: mouse / device tilt ---------- */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tilt.tx = (e.clientX / innerWidth) * 2 - 1;
    tilt.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  let gyro = false;
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    gyro = true;
    tilt.tx = Math.max(-1, Math.min(1, e.gamma / 30));
    tilt.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 40));
  }, { passive: true });

  /* ---------- resize ---------- */
  let W = 1, Hh = 1, fit = 1;
  const resize = () => {
    W = POSTER ? 1200 : innerWidth; Hh = POSTER ? 1200 : innerHeight;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    fit = Math.max(1, 0.95 / camera.aspect);         // keep the cup inside narrow (portrait) screens
    camera.updateProjectionMatrix();
    measure();
  };
  addEventListener("resize", resize);
  addEventListener("load", measure);
  new ResizeObserver(measure).observe(document.body);
  resize();

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const pRest = new THREE.Vector3(), qRest = new THREE.Quaternion(), pFloat = new THREE.Vector3(), qFloat = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const lookAt = new THREE.Vector3();
  let spinT = 0, firstFrame = true;

  function frame(dt, time) {
    const y = POSTER ? 0 : (window.__lenis ? window.__lenis.scroll : scrollY);
    sample(y);
    const k = firstFrame || reduce ? 1 : 1 - Math.pow(0.0025, dt);   // frame-rate independent damping
    for (const key_ of keys) cur[key_] += (target[key_] - cur[key_]) * k;
    firstFrame = false;

    tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 3);
    const sway = mobile && !gyro && !reduce ? Math.sin(time * 0.6) * 0.35 : 0;

    // cup: slow turn + lean toward the pointer
    spinT += reduce ? 0 : dt * 0.16;
    cup.position.y = cur.lift;
    cup.rotation.y = -0.6 + spinT + (tilt.x + sway) * 0.45;
    cup.rotation.x = tilt.y * 0.08;
    cup.rotation.z = -(tilt.x + sway) * 0.05;

    // camera orbit
    const dist = cur.dist * fit;
    lookAt.set(0, cur.ly + cur.lift * 0.08, 0);
    camera.position.set(
      Math.sin(cur.theta) * Math.cos(cur.phi) * dist,
      lookAt.y + Math.sin(cur.phi) * dist,
      Math.cos(cur.theta) * Math.cos(cur.phi) * dist,
    );
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    camera.filmOffset = cur.shift * (camera.aspect > 1 ? 9 : 0);
    camera.updateProjectionMatrix();

    // light blend
    const L = cur.light, i0 = Math.min(1, Math.floor(L)), t = L - i0;
    const A = PRESETS[i0], Bp = PRESETS[i0 + 1];
    const lerp = (a, b) => a + (b - a) * t;
    mixHex(A.key, Bp.key, t, key.color); key.intensity = lerp(A.ki, Bp.ki);
    key.position.set(lerp(A.kp[0], Bp.kp[0]), lerp(A.kp[1], Bp.kp[1]), lerp(A.kp[2], Bp.kp[2])).applyAxisAngle(THREE.Object3D.DEFAULT_UP, cur.theta * 0.6);
    key.target.position.set(0, 0.6, 0);
    mixHex(A.sky, Bp.sky, t, hemi.color); mixHex(A.gnd, Bp.gnd, t, hemi.groundColor); hemi.intensity = lerp(A.hi, Bp.hi);
    rim.intensity = lerp(A.rim, Bp.rim);
    rim.position.set(Math.sin(cur.theta + Math.PI) * 6, 3, Math.cos(cur.theta + Math.PI) * 6);
    const envI = lerp(A.env, Bp.env);
    ceramic.envMapIntensity = envI; beanMat.envMapIntensity = envI * 1.1;
    catcher.material.opacity = lerp(A.shadow, Bp.shadow);
    blob.material.opacity = 0.55 * (1 - Math.max(0, L - 1));
    const visible = 1 - Math.min(1, Math.abs(cur.lift) / 4);
    for (const st of steam) {
      st.quaternion.copy(cup.quaternion).invert().multiply(camera.quaternion);
      st.material.uniforms.uTime.value = time;
      st.material.uniforms.uOpacity.value = lerp(A.steam, Bp.steam) * visible;
    }

    // beans: rest on the table → float around the viewer
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (let i = 0; i < COUNT; i++) {
      const b = B[i];
      const sp = Math.min(1, Math.max(0, (cur.spread - b.delay) / (1 - b.delay + 0.0001)));
      const e = sp * sp * (3 - 2 * sp);
      const depth = -b.fz;
      pFloat.set(b.fx * halfH * camera.aspect * depth * 1.05, b.fy * halfH * depth * 0.95 + Math.sin(time * 0.5 + b.bob) * 0.12, b.fz);
      eul.set(b.rot.x + time * b.spin.x, b.rot.y + time * b.spin.y, b.rot.z + time * b.spin.z);
      qFloat.setFromEuler(eul);
      let scale = b.s;
      if (b.rest) {
        pRest.copy(b.rest).add(cup.position); camera.worldToLocal(pRest);
        qRest.setFromEuler(b.restRot).premultiply(q.copy(camera.quaternion).invert());
        p.lerpVectors(pRest, pFloat, e);
        q.slerpQuaternions(qRest, qFloat, e);
        if (cur.lift < -0.5 && e < 0.5) scale *= Math.max(0, 1 + cur.lift / 4);
      } else {
        p.copy(pFloat); q.copy(qFloat); scale *= e;
      }
      s.setScalar(Math.max(scale, 0.0001));
      m4.compose(p, q, s);
      beans.setMatrixAt(i, m4);
    }
    beans.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  /* ---------- poster mode: one still frame for the static fallback ---------- */
  if (POSTER) {
    spinT = 0.35;
    frame(0.016, 2.6);
    window.__poster = canvas.toDataURL("image/png");
    return;
  }

  /* ---------- loop with a performance guard ---------- */
  let frames = 0, slowSum = 0, degraded = 0, running = true;
  const loop = () => {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    frame(dt, clock.elapsedTime);
    if (frames === 0) stage.classList.add("ready");
    frames++;
    if (frames > 20 && frames <= 140) slowSum += dt;
    if (frames === 140) {
      const fps = 120 / slowSum;
      if (fps < 40 && degraded === 0) {           // step 1: lighter rendering
        degraded = 1; renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; resize();
        frames = 20; slowSum = 0;
      } else if (fps < 24 && degraded === 1 && !params.has("keep3d")) {    // step 2: give up gracefully, keep the still
        running = false; goStatic();
        renderer.dispose();
      }
    }
  };
  loop();
  addEventListener("visibilitychange", () => { if (!document.hidden) clock.getDelta(); });
}

/* ================= helpers ================= */

function makeBean(seg) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    x *= 1.0; y *= 0.74; z *= 0.52;
    if (z > 0) {
      z *= 0.72;                                                    // flatter face
      const c = 0.06 * Math.sin(x * 2.6);                           // S-shaped crease
      const d = Math.abs(y - c);
      z -= 0.2 * Math.exp(-Math.pow(d / 0.075, 2)) * (1 - Math.pow(Math.abs(x), 6));
    }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function paintCrema(size) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d"), r = size / 2;
  let g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "#8a4a22"); g.addColorStop(0.5, "#6a3518"); g.addColorStop(0.84, "#4a2410"); g.addColorStop(0.94, "#8f5a30"); g.addColorStop(1, "#5a2e15");
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  // speckled crema
  for (let i = 0; i < size * 6; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r * 0.95;
    x.fillStyle = `rgba(${200 + Math.random() * 40},${140 + Math.random() * 30},${80 + Math.random() * 30},${Math.random() * 0.12})`;
    x.beginPath(); x.arc(r + Math.cos(a) * d, r + Math.sin(a) * d, Math.random() * size * 0.004 + 0.5, 0, 7); x.fill();
  }
  // latte-art heart, soft edged
  x.save();
  x.translate(r, r * 1.04); x.scale(size / 1000, size / 1000);
  x.filter = `blur(${Math.max(1, size / 420)}px)`;
  const heart = (s, col) => {
    x.fillStyle = col; x.beginPath();
    x.moveTo(0, 230 * s);
    x.bezierCurveTo(-60 * s, 170 * s, -300 * s, 40 * s, -270 * s, -120 * s);
    x.bezierCurveTo(-245 * s, -250 * s, -70 * s, -270 * s, 0, -150 * s);
    x.bezierCurveTo(70 * s, -270 * s, 245 * s, -250 * s, 270 * s, -120 * s);
    x.bezierCurveTo(300 * s, 40 * s, 60 * s, 170 * s, 0, 230 * s);
    x.fill();
  };
  heart(1.03, "#b07a4a");
  heart(0.96, "#f4ead9");
  heart(0.6, "#e9d6bc");
  heart(0.52, "#f6eee2");
  x.fillStyle = "#f4ead9"; x.fillRect(-6, 150, 12, 140);       // the pull-through line
  x.restore();
  return c;
}

function paintBlob() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(40,24,14,.75)"); g.addColorStop(0.32, "rgba(40,24,14,.45)"); g.addColorStop(0.62, "rgba(40,24,14,.12)"); g.addColorStop(1, "rgba(40,24,14,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
