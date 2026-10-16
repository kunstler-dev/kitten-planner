// 3D kitten renderer (three.js): a toon-shaded cat built from primitives, rendered into a small
// transparent canvas that the controller in kitten.js moves around the window.
import * as THREE from '../../../node_modules/three/build/three.module.js';

const W = 180;
const H = 150;

const COLORS = {
  fur: 0xf6d3b1,
  stripe: 0xe3a674,
  white: 0xfff6ec,
  pink: 0xf2a7b8,
  eye: 0x3b3040,
  shine: 0xffffff,
};

function toonGradient() {
  const data = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const lerp = (a, b, k) => a + (b - a) * k;

function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

function buildCat() {
  const grad = toonGradient();
  const mat = (color) => new THREE.MeshToonMaterial({ color, gradientMap: grad });
  const M = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, mat(v)]));
  M.eye = new THREE.MeshBasicMaterial({ color: COLORS.eye });
  M.shine = new THREE.MeshBasicMaterial({ color: COLORS.shine });
  const sphere = (r, m, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);

  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  const body = sphere(1, M.fur, 32);
  body.scale.set(0.78, 0.5, 0.48);
  body.position.set(0, 0.78, 0);
  torso.add(body);

  const chest = sphere(0.3, M.white);
  chest.scale.set(0.55, 1, 1.15);
  chest.position.set(0.56, 0.74, 0);
  torso.add(chest);

  for (const x of [-0.38, -0.12, 0.14]) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 24, Math.PI), M.stripe);
    stripe.rotation.y = Math.PI / 2;
    const k = 1 - Math.abs(x) * 0.35;
    stripe.scale.set(k, k, 1);
    stripe.position.set(x, 0.78, 0);
    torso.add(stripe);
  }

  // Head
  const head = new THREE.Group();
  head.position.set(0.8, 1.2, 0);
  torso.add(head);
  const skull = sphere(0.48, M.fur, 32);
  skull.scale.set(0.95, 0.88, 1);
  head.add(skull);
  for (const z of [-1, 1]) {
    const cheek = sphere(0.2, M.fur);
    cheek.position.set(0.12, -0.15, z * 0.28);
    head.add(cheek);
  }
  const muzzle = sphere(0.17, M.white);
  muzzle.scale.set(0.8, 0.62, 1.15);
  muzzle.position.set(0.4, -0.13, 0);
  head.add(muzzle);
  const nose = sphere(0.055, M.pink, 12);
  nose.scale.set(0.8, 0.7, 1.2);
  nose.position.set(0.47, -0.04, 0);
  head.add(nose);
  for (const x of [-0.08, 0.06, 0.2]) {
    const s = sphere(0.05, M.stripe, 10);
    s.scale.set(0.6, 0.35, 2.2);
    s.position.set(x * 0.6, 0.41 - Math.abs(x) * 0.15, 0);
    s.rotation.y = Math.PI / 2;
    head.add(s);
  }

  const eyes = [];
  for (const z of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.36, 0.05, z * 0.2);
    eye.rotation.y = z * 0.45;
    const ball = sphere(0.085, M.eye, 16);
    ball.scale.set(0.55, 1.05, 0.9);
    eye.add(ball);
    const shine = sphere(0.026, M.shine, 8);
    shine.position.set(0.04, 0.035, 0.015);
    eye.add(shine);
    head.add(eye);
    eyes.push(eye);
    const blush = sphere(0.07, M.pink, 12);
    blush.scale.set(0.3, 0.55, 1);
    blush.position.set(0.31, -0.15, z * 0.33);
    blush.rotation.y = z * 0.7;
    head.add(blush);
  }

  const ears = [];
  for (const z of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(-0.03, 0.34, z * 0.24);
    ear.rotation.x = z * 0.32;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 16), M.fur);
    outer.position.y = 0.12;
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 12), M.pink);
    inner.position.set(0.07, 0.09, 0);
    ear.add(inner);
    head.add(ear);
    ears.push(ear);
  }

  const whiskerMat = new THREE.LineBasicMaterial({ color: 0xc9a08a });
  for (const z of [-1, 1]) {
    for (const dy of [0, -0.06]) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.42, -0.1 + dy, z * 0.12),
        new THREE.Vector3(0.5, -0.06 + dy * 2, z * 0.48),
      ]);
      head.add(new THREE.Line(g, whiskerMat));
    }
  }

  // Legs: pivot at the shoulder/hip so rotating the group swings the leg.
  const legs = [];
  for (const [x, z] of [
    [0.46, 1],
    [0.46, -1],
    [-0.46, 1],
    [-0.46, -1],
  ]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, z * 0.23);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 6, 12), M.fur);
    limb.position.y = -0.29;
    leg.add(limb);
    const paw = sphere(0.14, M.white, 14);
    paw.scale.set(1.25, 0.7, 1.05);
    paw.position.set(0.03, -0.55, 0);
    leg.add(paw);
    torso.add(leg);
    legs.push(leg);
  }

  // Tail: chain of nested segments so each joint adds to the curl.
  const tail = [];
  let parent = new THREE.Group();
  parent.position.set(-0.72, 0.92, 0);
  torso.add(parent);
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0 : 0.17;
    const r = 0.085 - i * 0.004;
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.12, 4, 10), i === 7 || i === 4 ? M.stripe : M.fur);
    mesh.position.y = 0.085;
    seg.add(mesh);
    parent.add(seg);
    tail.push(seg);
    parent = seg;
  }

  return { root, torso, head, eyes, ears, legs, tail };
}

export function createKitten3D() {
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 50);
  camera.position.set(0, 1.7, 9);
  camera.lookAt(0, 0.95, 0);
  scene.add(new THREE.HemisphereLight(0xfff8f2, 0xd8c8e8, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(2, 5, 6);
  scene.add(sun);

  const cat = buildCat();
  scene.add(cat.root);

  // Where the feet (world origin) land on the canvas, so the controller can anchor the cat.
  const p = new THREE.Vector3(0, 0, 0).project(camera);
  const feet = { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };

  const pose = {
    yaw: -0.55,
    crouch: 0,
    lie: 0,
    legSwing: 0,
    pitch: 0,
    eyes: 1,
    headTilt: 0,
    headYaw: 0,
    tailSpeed: 1.6,
    tailAmp: 0.25,
    tailLift: 0.75,
    stretch: 0,
  };
  let stateName = 'idle';
  let facing = 1;
  let speed = 0;
  let phase = 0;
  let time = 0;
  let nextBlink = 2;
  let blinkUntil = 0;
  let look = { x: 0, y: 0 };

  function tick(dt) {
    time += dt;
    const k = 1 - Math.exp(-dt * 10);
    const target = {
      yaw: facing > 0 ? -0.55 : Math.PI + 0.55,
      crouch: 0,
      lie: 0,
      legSwing: 0,
      pitch: 0,
      eyes: 1,
      headTilt: 0,
      headYaw: 0,
      tailSpeed: 1.6,
      tailAmp: 0.25,
      tailLift: 0.75,
      stretch: 0,
    };
    switch (stateName) {
      case 'run':
        phase += dt * (8 + speed * 1.6);
        target.legSwing = 0.75;
        target.tailSpeed = 6;
        target.tailAmp = 0.12;
        target.tailLift = 1.25;
        target.pitch = -0.05;
        break;
      case 'sleep':
        target.lie = 1;
        target.eyes = 0.1;
        target.headTilt = -0.28;
        target.tailSpeed = 0.5;
        target.tailAmp = 0.08;
        target.tailLift = 1.9;
        break;
      case 'crouch':
        target.crouch = 1;
        target.pitch = 0.12;
        target.eyes = 1.1;
        break;
      case 'jump':
        target.stretch = 1;
        target.pitch = -0.25;
        target.tailLift = 1.5;
        break;
      case 'happy':
        target.eyes = 0.25;
        target.headTilt = 0.18;
        target.tailSpeed = 4;
        target.tailAmp = 0.4;
        break;
      default:
        target.headYaw = Math.max(-0.5, Math.min(0.5, look.x * 0.5));
        target.headTilt = Math.max(-0.25, Math.min(0.25, -look.y * 0.25));
    }
    for (const key of Object.keys(pose)) {
      pose[key] =
        key === 'yaw' ? lerpAngle(pose.yaw, target.yaw, 1 - Math.exp(-dt * 7)) : lerp(pose[key], target[key], k);
    }

    // Blink
    if (time > nextBlink) {
      blinkUntil = time + 0.12;
      nextBlink = time + 2.5 + Math.random() * 3;
    }
    const blink = time < blinkUntil ? 0.1 : 1;

    const { root, torso, head, eyes, legs, tail } = cat;
    root.rotation.y = pose.yaw;
    const bob = stateName === 'run' ? Math.abs(Math.sin(phase)) * 0.07 : 0;
    const breathe = Math.sin(time * (stateName === 'sleep' ? 1.6 : 2.6)) * 0.012;
    torso.position.y = bob - pose.crouch * 0.18 - pose.lie * 0.36;
    torso.rotation.z = pose.pitch;
    torso.scale.set(1 + pose.stretch * 0.08, 1 + breathe - pose.crouch * 0.05, 1);
    head.rotation.z = pose.headTilt + (stateName === 'run' ? Math.sin(phase * 2) * 0.03 : 0);
    head.rotation.y = pose.headYaw;
    head.position.y = 1.2 - pose.lie * 0.12;
    for (const e of eyes) e.scale.y = Math.min(pose.eyes, blink);

    const swing = Math.sin(phase) * pose.legSwing;
    legs.forEach((leg, i) => {
      const diagonal = i === 0 || i === 3 ? 1 : -1;
      const front = i < 2;
      let rot = swing * diagonal;
      rot += pose.lie * (front ? 1.35 : -1.35);
      rot += pose.stretch * (front ? 0.9 : -0.9);
      rot += pose.crouch * (front ? -0.25 : 0.35);
      leg.rotation.z = rot;
    });

    tail.forEach((seg, i) => {
      const sway = Math.sin(time * pose.tailSpeed - i * 0.55) * pose.tailAmp;
      if (i === 0) {
        seg.rotation.z = pose.tailLift;
        seg.rotation.x = sway;
      } else {
        seg.rotation.z = -0.12 - pose.lie * 0.12;
        seg.rotation.x = sway * 0.6;
      }
    });

    renderer.render(scene, camera);
  }

  return {
    el: canvas,
    size: { w: W, h: H },
    feet,
    setState(s) {
      stateName = s;
    },
    setFacing(f) {
      facing = f;
    },
    setSpeed(v) {
      speed = v;
    },
    setLook(x, y) {
      look = { x, y };
    },
    tick,
    dispose() {
      renderer.dispose();
    },
  };
}
