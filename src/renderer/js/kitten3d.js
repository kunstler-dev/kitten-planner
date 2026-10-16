// 3D kitten renderer: a small toon-shaded tortoiseshell cat built from primitives, rendered into a
// transparent mini canvas that the controller in kitten.js moves around the window.
import { THREE, createStage, toonMaterial, paintPatches, lerp, lerpAngle } from './three-stage.js';

const W = 104;
const H = 86;

// Tortoiseshell: black-brown base with ginger and cream blotches; white muzzle, chest and paws.
const COAT = [
  { from: 0, color: 0x2b211f },
  { from: 0.47, color: 0xb8662a },
  { from: 0.62, color: 0xd98b3c },
  { from: 0.74, color: 0xeccb98 },
];
const COLORS = { white: 0xfff3e6, pink: 0xf0a3b4, iris: 0x9fcf5a, pupil: 0x16110f, shine: 0xffffff };

export function buildCat({ coat = COAT, iris = COLORS.iris, seed = 3.7 } = {}) {
  const fur = toonMaterial(0xffffff);
  const M = {
    white: toonMaterial(COLORS.white),
    pink: toonMaterial(COLORS.pink),
    iris: new THREE.MeshBasicMaterial({ color: iris }),
    pupil: new THREE.MeshBasicMaterial({ color: COLORS.pupil }),
    shine: new THREE.MeshBasicMaterial({ color: COLORS.shine }),
  };
  const furry = [];
  const sphere = (r, m, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
  const furSphere = (r, seg = 24) => {
    const mesh = sphere(r, fur, seg);
    furry.push(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  const body = furSphere(1, 32);
  body.scale.set(0.78, 0.5, 0.48);
  body.position.set(0, 0.78, 0);
  torso.add(body);

  const chest = sphere(0.3, M.white);
  chest.scale.set(0.55, 1, 1.15);
  chest.position.set(0.56, 0.74, 0);
  torso.add(chest);

  const head = new THREE.Group();
  head.position.set(0.8, 1.2, 0);
  torso.add(head);
  const skull = furSphere(0.5, 32);
  skull.scale.set(0.95, 0.88, 1);
  head.add(skull);
  for (const z of [-1, 1]) {
    const cheek = furSphere(0.2);
    cheek.position.set(0.12, -0.15, z * 0.29);
    head.add(cheek);
  }
  const muzzle = sphere(0.18, M.white);
  muzzle.scale.set(0.8, 0.62, 1.15);
  muzzle.position.set(0.41, -0.13, 0);
  head.add(muzzle);
  const nose = sphere(0.055, M.pink, 12);
  nose.scale.set(0.8, 0.7, 1.2);
  nose.position.set(0.48, -0.04, 0);
  head.add(nose);

  // Big green eyes with dark pupils so they read on dark fur.
  const eyes = [];
  for (const z of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.37, 0.06, z * 0.2);
    eye.rotation.y = z * 0.45;
    const iris = sphere(0.1, M.iris, 16);
    iris.scale.set(0.5, 1.05, 0.95);
    eye.add(iris);
    const pupil = sphere(0.062, M.pupil, 12);
    pupil.scale.set(0.5, 1.05, 0.8);
    pupil.position.x = 0.02;
    eye.add(pupil);
    const shine = sphere(0.028, M.shine, 8);
    shine.position.set(0.05, 0.04, 0.015);
    eye.add(shine);
    head.add(eye);
    eyes.push(eye);
  }

  for (const z of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(-0.03, 0.35, z * 0.25);
    ear.rotation.x = z * 0.32;
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 16), fur);
    outer.position.y = 0.12;
    furry.push(outer);
    ear.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.23, 12), M.pink);
    inner.position.set(0.08, 0.09, 0);
    ear.add(inner);
    head.add(ear);
  }

  const whiskerMat = new THREE.LineBasicMaterial({ color: 0xf2e6da });
  for (const z of [-1, 1]) {
    for (const dy of [0, -0.06]) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.43, -0.1 + dy, z * 0.12),
        new THREE.Vector3(0.52, -0.06 + dy * 2, z * 0.5),
      ]);
      head.add(new THREE.Line(g, whiskerMat));
    }
  }

  const legs = [];
  for (const [x, z] of [
    [0.46, 1],
    [0.46, -1],
    [-0.46, 1],
    [-0.46, -1],
  ]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, z * 0.23);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 6, 12), fur);
    limb.position.y = -0.29;
    furry.push(limb);
    leg.add(limb);
    const paw = sphere(0.14, M.white, 14);
    paw.scale.set(1.25, 0.7, 1.05);
    paw.position.set(0.03, -0.55, 0);
    leg.add(paw);
    torso.add(leg);
    legs.push(leg);
  }

  const tail = [];
  let parent = new THREE.Group();
  parent.position.set(-0.72, 0.92, 0);
  torso.add(parent);
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0 : 0.17;
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085 - i * 0.004, 0.12, 4, 10), fur);
    mesh.position.y = 0.085;
    furry.push(mesh);
    seg.add(mesh);
    parent.add(seg);
    tail.push(seg);
    parent = seg;
  }

  // Default pose, then bake the patch pattern in character space.
  tail[0].rotation.z = 0.75;
  root.updateMatrixWorld(true);
  for (const mesh of furry) paintPatches(mesh, coat, { freq: 2.1, seed });

  return { root, torso, head, eyes, legs, tail };
}

export function createKitten3D() {
  const stage = createStage(W, H);
  if (!stage) return null;
  const { renderer, scene, camera } = stage;
  const cat = buildCat();
  scene.add(cat.root);

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
  let frame = 0;

  function tick(dt) {
    time += dt;
    frame++;
    // Sleeping kitten doesn't need 60 fps.
    if (stateName === 'sleep' && frame % 3) return;
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
      leg.rotation.z =
        swing * diagonal +
        pose.lie * (front ? 1.35 : -1.35) +
        pose.stretch * (front ? 0.9 : -0.9) +
        pose.crouch * (front ? -0.25 : 0.35);
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
    el: stage.canvas,
    size: stage.size,
    feet: stage.feet,
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
