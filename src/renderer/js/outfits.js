// Seasonal outfits for the 3D animals: little hats built from primitives and attached to a head
// group (x = forward, y = up). dressUp(head, season, { top, scale }) swaps the current outfit.
import { THREE, toonMaterial } from './three-stage.js';

const OUTFIT_FOR = {
  autumn: 'beanie',
  halloween: 'witch',
  winter: 'beanieBlue',
  christmas: 'santa',
  spring: 'flowers',
  summer: 'sunhat',
  birthday: 'party',
};

const mesh = (geo, color) => new THREE.Mesh(geo, toonMaterial(color));

function beanie(color, rim, pom) {
  const g = new THREE.Group();
  const cap = mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), color);
  cap.scale.y = 0.85;
  g.add(cap);
  const band = mesh(new THREE.TorusGeometry(0.33, 0.06, 8, 24), rim);
  band.rotation.x = Math.PI / 2;
  g.add(band);
  const ball = mesh(new THREE.SphereGeometry(0.09, 12, 10), pom);
  ball.position.y = 0.3;
  g.add(ball);
  return g;
}

const BUILD = {
  beanie: () => beanie(0xc8642f, 0xe0a83f, 0xf4e6d6),
  beanieBlue: () => beanie(0x5f8bbd, 0xffffff, 0xffffff),
  witch() {
    const g = new THREE.Group();
    const brim = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 28), 0x3b2245);
    g.add(brim);
    const cone = mesh(new THREE.ConeGeometry(0.26, 0.7, 20), 0x3b2245);
    cone.position.set(-0.04, 0.36, 0);
    cone.rotation.z = 0.28;
    g.add(cone);
    const band = mesh(new THREE.CylinderGeometry(0.255, 0.27, 0.07, 20), 0xe8833a);
    band.position.y = 0.06;
    g.add(band);
    return g;
  },
  santa() {
    const g = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(0.3, 0.6, 20), 0xc94f4f);
    cone.position.set(-0.08, 0.3, 0);
    cone.rotation.z = 0.55;
    g.add(cone);
    const rim = mesh(new THREE.TorusGeometry(0.3, 0.075, 8, 24), 0xffffff);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const pom = mesh(new THREE.SphereGeometry(0.09, 12, 10), 0xffffff);
    pom.position.set(-0.36, 0.5, 0);
    g.add(pom);
    return g;
  },
  flowers() {
    const g = new THREE.Group();
    const colors = [0xf7a8c4, 0xfbd36b, 0xc9a7f0, 0xffffff, 0xf39bb4, 0xa8e0c0, 0xfbd36b];
    colors.forEach((c, i) => {
      const a = (i / colors.length) * Math.PI * 2;
      const f = mesh(new THREE.SphereGeometry(0.075, 10, 8), c);
      f.position.set(Math.cos(a) * 0.3, 0.02 + Math.sin(a * 3) * 0.02, Math.sin(a) * 0.3);
      g.add(f);
    });
    return g;
  },
  sunhat() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.03, 28), 0xf0d9a0));
    const crown = mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.2, 20), 0xf0d9a0);
    crown.position.y = 0.11;
    g.add(crown);
    const ribbon = mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.06, 20), 0xf29bb4);
    ribbon.position.y = 0.05;
    g.add(ribbon);
    return g;
  },
  party() {
    const g = new THREE.Group();
    const colors = [0xb58be6, 0xffcf66, 0xf29bb4];
    for (let i = 0; i < 3; i++) {
      const rBottom = 0.22 * (1 - i / 3);
      const rTop = 0.22 * (1 - (i + 1) / 3);
      const seg = mesh(new THREE.CylinderGeometry(rTop + 0.001, rBottom, 0.18, 18), colors[i]);
      seg.position.y = 0.09 + i * 0.18;
      g.add(seg);
    }
    const pom = mesh(new THREE.SphereGeometry(0.07, 12, 10), 0x7fd4c1);
    pom.position.y = 0.57;
    g.add(pom);
    g.rotation.z = 0.2;
    return g;
  },
};

/**
 * Puts the outfit of `season` (or none) on a head group.
 * @param {object} opts.top    y of the top of the head in head space
 * @param {number} opts.scale  size relative to the kitten's head
 * @param {number} opts.x      forward offset of the hat
 */
export function dressUp(head, season, { top = 0.38, scale = 1, x = -0.04 } = {}) {
  if (head.userData.outfit) {
    head.remove(head.userData.outfit);
    head.userData.outfit.traverse((o) => o.geometry?.dispose());
    head.userData.outfit = null;
  }
  const kind = OUTFIT_FOR[season];
  if (!kind) return;
  const outfit = BUILD[kind]();
  outfit.position.set(x, top, 0);
  outfit.scale.setScalar(scale);
  head.add(outfit);
  head.userData.outfit = outfit;
}
