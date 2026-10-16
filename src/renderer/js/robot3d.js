// "Auerilus" — a small friendly toon robot that lives in the AI tab and plays with the kitten.
import { THREE, createStage, toonMaterial, lerp, lerpAngle } from './three-stage.js';

const W = 104;
const H = 96;

function buildRobot() {
  const M = {
    shell: toonMaterial(0xe6e1f3),
    trim: toonMaterial(0x9583c4),
    pink: toonMaterial(0xf3a9bd),
    visor: toonMaterial(0x2a2440),
    eye: new THREE.MeshBasicMaterial({ color: 0x86f3e4 }),
    light: new THREE.MeshBasicMaterial({ color: 0xff8fb1 }),
  };
  const sphere = (r, m, seg = 24) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.28, 8, 20), M.shell);
  trunk.position.y = 0.92;
  trunk.scale.set(1, 1, 0.9);
  body.add(trunk);
  const belly = sphere(0.13, M.pink, 16);
  belly.scale.set(0.35, 1, 1);
  belly.position.set(0.32, 0.92, 0);
  body.add(belly);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 8, 28), M.trim);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.72;
  body.add(belt);

  const head = new THREE.Group();
  head.position.y = 1.66;
  body.add(head);
  const skull = sphere(0.46, M.shell, 32);
  skull.scale.set(1.08, 0.88, 1);
  head.add(skull);
  const visor = sphere(0.4, M.visor, 28);
  visor.scale.set(0.32, 0.6, 0.92);
  visor.position.x = 0.3;
  head.add(visor);
  const eyes = [];
  for (const z of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.08, 4, 10), M.eye);
    eye.position.set(0.43, 0.03, z * 0.15);
    head.add(eye);
    eyes.push(eye);
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), M.trim);
    ear.rotation.x = Math.PI / 2;
    ear.position.set(0, 0, z * 0.48);
    head.add(ear);
    const cheek = sphere(0.05, M.pink, 10);
    cheek.position.set(0.4, -0.15, z * 0.24);
    head.add(cheek);
  }
  const antenna = new THREE.Group();
  antenna.position.y = 0.38;
  head.add(antenna);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), M.trim);
  stick.position.y = 0.15;
  antenna.add(stick);
  const bulb = sphere(0.085, M.light, 14);
  bulb.position.y = 0.33;
  antenna.add(bulb);

  const arms = [];
  for (const z of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(0, 1.08, z * 0.43);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 4, 10), M.trim);
    limb.position.y = -0.2;
    arm.add(limb);
    const hand = sphere(0.1, M.shell, 12);
    hand.position.y = -0.4;
    arm.add(hand);
    body.add(arm);
    arms.push(arm);
  }
  const legs = [];
  for (const z of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(0, 0.52, z * 0.18);
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 4, 10), M.trim);
    limb.position.y = -0.2;
    leg.add(limb);
    const foot = sphere(0.14, M.shell, 14);
    foot.scale.set(1.35, 0.6, 1);
    foot.position.set(0.05, -0.43, 0);
    leg.add(foot);
    body.add(leg);
    legs.push(leg);
  }
  return { root, body, head, eyes, antenna, bulb, arms, legs, lightMat: M.light };
}

export function createRobot3D() {
  const stage = createStage(W, H);
  if (!stage) return null;
  const { renderer, scene, camera } = stage;
  camera.position.set(0, 1.9, 9);
  camera.lookAt(0, 1.05, 0);
  const p = new THREE.Vector3(0, 0, 0).project(camera);
  const feet = { x: ((p.x + 1) / 2) * W, y: ((1 - p.y) / 2) * H };
  const bot = buildRobot();
  scene.add(bot.root);

  const pose = { yaw: -0.5, swing: 0, crouch: 0, eyes: 1, armsUp: 0, sit: 0, spin: 0 };
  let stateName = 'idle';
  let facing = 1;
  let phase = 0;
  let time = 0;
  let spinLeft = 0;
  let nextBlink = 1.5;
  let blinkUntil = 0;

  function tick(dt) {
    time += dt;
    const k = 1 - Math.exp(-dt * 10);
    const target = { yaw: facing > 0 ? -0.5 : Math.PI + 0.5, swing: 0, crouch: 0, eyes: 1, armsUp: 0, sit: 0, spin: 0 };
    if (stateName === 'run') {
      phase += dt * 13;
      target.swing = 0.8;
    } else if (stateName === 'jump') target.armsUp = 1;
    else if (stateName === 'crouch') target.crouch = 1;
    else if (stateName === 'happy') {
      target.armsUp = 0.6 + Math.sin(time * 10) * 0.4;
      target.eyes = 0.45;
    } else if (stateName === 'sleep') {
      target.sit = 1;
      target.eyes = 0.12;
    }
    for (const key of Object.keys(pose))
      pose[key] =
        key === 'yaw' ? lerpAngle(pose.yaw, target.yaw, 1 - Math.exp(-dt * 7)) : lerp(pose[key], target[key], k);
    if (time > nextBlink) {
      blinkUntil = time + 0.1;
      nextBlink = time + 2 + Math.random() * 3;
    }
    if (spinLeft > 0) spinLeft = Math.max(0, spinLeft - dt * Math.PI * 3);

    const { root, body, head, eyes, antenna, arms, legs, lightMat } = bot;
    root.rotation.y = pose.yaw + spinLeft;
    const bob = stateName === 'run' ? Math.abs(Math.sin(phase)) * 0.08 : Math.sin(time * 2) * 0.015;
    body.position.y = bob - pose.crouch * 0.15 - pose.sit * 0.25;
    head.rotation.z = Math.sin(time * 1.3) * 0.05 - pose.sit * 0.15;
    antenna.rotation.z = Math.sin(time * (stateName === 'run' ? 14 : 3)) * 0.25;
    lightMat.color.setHex(
      stateName === 'sleep'
        ? Math.sin(time * 2) > 0
          ? 0x7a5d6a
          : 0x5a4a55
        : Math.sin(time * 6) > 0.6
          ? 0xffd1de
          : 0xff8fb1,
    );
    const blink = time < blinkUntil ? 0.15 : 1;
    for (const e of eyes) e.scale.y = Math.min(pose.eyes, blink);
    const swing = Math.sin(phase) * pose.swing;
    arms.forEach((arm, i) => {
      arm.rotation.z = (i ? swing : -swing) * 0.9;
      arm.rotation.x = (i ? -1 : 1) * pose.armsUp * 2.4;
    });
    legs.forEach((leg, i) => {
      leg.rotation.z = (i ? -swing : swing) + pose.sit * 1.3;
    });
    renderer.render(scene, camera);
  }

  return {
    el: stage.canvas,
    size: stage.size,
    feet,
    setState(s) {
      stateName = s;
    },
    setFacing(f) {
      facing = f;
    },
    spin() {
      spinLeft = Math.PI * 2;
    },
    tick,
    dispose() {
      renderer.dispose();
    },
  };
}
