// cast3d.js : more than one kind of person, in three dimensions.
//
// The companion to cast.js. The zach-d-films rig draws one body in four medieval
// outfits, because it was built for an armour short. This gives the same rig the
// vocabulary the 2D kit has: build, skin, outfit, hair, hairCol, beard, glasses.
//
// It does NOT modify human.js. It borrows the one exported primitive it needs,
// torsoShell, and builds the rest itself, so a pull on the pack keeps working.
import * as THREE from 'three';
import { torsoShell } from './human.js';

// ---------- the same names the 2D kit uses, so a character reads across both ----------
export const SKIN3 = {
  porcelain: 0xf5e0d0, fair: 0xeed6c0, light: 0xe3c3a3, tan: 0xcf9f78,
  olive: 0xb98a5e, brown: 0x926238, deep: 0x6d4524, dark: 0x4f3119,
};
export const HAIRCOL3 = {
  black: 0x1b1714, darkBrown: 0x2b1d18, brown: 0x4a3326, chestnut: 0x6b4423,
  auburn: 0x7a3b20, ginger: 0xb4571f, sand: 0xc9a473, blonde: 0xdcb45c,
  platinum: 0xe9dfc6, ash: 0x9a8f84, grey: 0xb3aea8, silver: 0xcfd4d7,
  white: 0xe9e6e0, red: 0xb02a1d, plum: 0x7b2d4e, pink: 0xd4588f,
  brightPink: 0xff5fa2, blue: 0x3a62a8, teal: 0x2f8f82, violet: 0x7a4bc4,
};
// Every width is a multiplier on the rig's own proportions, the same idea as the
// 2D BUILD table: shoulders, chest, waist, hip, limb thickness.
export const BUILD3 = {
  slim:     { sh: 0.92, chest: 0.90, waist: 0.88, hip: 0.92, limb: 0.90, h: 1.00 },
  athletic: { sh: 1.08, chest: 1.04, waist: 0.92, hip: 0.98, limb: 1.02, h: 1.01 },
  muscular: { sh: 1.22, chest: 1.16, waist: 1.00, hip: 1.04, limb: 1.18, h: 1.02 },
  broad:    { sh: 1.10, chest: 1.14, waist: 1.20, hip: 1.14, limb: 1.10, h: 1.00 },
  curvy:    { sh: 0.94, chest: 1.04, waist: 0.86, hip: 1.18, limb: 0.94, h: 0.98 },
  petite:   { sh: 0.86, chest: 0.88, waist: 0.84, hip: 0.94, limb: 0.86, h: 0.93 },
};
export const BUILD3_LIST = Object.keys(BUILD3);
export const OUTFIT3_LIST = ['tee', 'shirt', 'hoodie', 'knit', 'suit', 'dress'];
export const HAIR3_LIST = ['buzz', 'crop', 'quiff', 'bun', 'long', 'afro', 'none'];
export const BEARD3_LIST = ['none', 'stubble', 'short', 'full'];

// The same eight animals the 2D kit has, and for the same reason: an animal here
// is a different HEAD on the same body, so a bear can wear a hoodie and hold a
// phone with no new code. `ear` and `tail` pick the shapes; the rest are colours.
export const ANIMAL3 = {
  bear:      { fur: 0x8a6446, muz: 0xdcc3a3, earIn: 0xb2866a, nose: 0x2b2320, ear: 'round', tail: 'stub' },
  panda:     { fur: 0xf5f2eb, muz: 0xf5f2eb, earIn: 0x120f0f, earCol: 0x1d1918, nose: 0x1d1918, ear: 'round', patch: 0x1d1918, tail: 'stub' },
  lion:      { fur: 0xe3bc7c, muz: 0xf6ead2, earIn: 0xd8a9a0, nose: 0xbd6a64, ear: 'round', mane: 0xcf9c4e, whisk: 1, tail: 'tuft' },
  whiteLion: { fur: 0xf2efe6, muz: 0xfcf9f3, earIn: 0xd9bbb4, nose: 0xc08079, ear: 'round', mane: 0xe4ddcd, whisk: 1, tail: 'tuft' },
  tiger:     { fur: 0xe8a04a, muz: 0xf8eed8, earIn: 0x2a2320, nose: 0xc2706a, ear: 'round', whisk: 1, tail: 'long', stripes: 0x2a2320 },
  whiteTiger:{ fur: 0xf4f1ea, muz: 0xfcfaf5, earIn: 0x2a2320, nose: 0xd58f93, ear: 'round', whisk: 1, tail: 'long', stripes: 0x262021, eyeCol: 0x3f86c8 },
  dog:       { fur: 0xc2884e, muz: 0xebd8b8, earIn: 0x9a6c3e, nose: 0x2b2320, ear: 'flop', tongue: 1, tail: 'curl' },
  cat:       { fur: 0x746e69, muz: 0xefe9e2, earIn: 0xd8a9a0, nose: 0xd4878a, ear: 'point', whisk: 1, tail: 'long' },
};
export const ANIMAL3_LIST = Object.keys(ANIMAL3);

const col = c => (typeof c === 'string' ? (HAIRCOL3[c] ?? SKIN3[c] ?? parseInt(c.replace('#', ''), 16)) : c);
const mat = (c, rough = 0.85, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: col(c), roughness: rough, ...extra });

function sph(r, m, pos = [0, 0, 0], scl = [1, 1, 1], seg = 28) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg / 2), m);
  o.position.set(...pos); o.scale.set(...scl); return o;
}
function cap(r, len, m, seg = 20) {
  const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), m);
  o.position.y = -len / 2; return o;
}
function disc(r, h, m, seg = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
}

function buildFace(M, o) {
  const head = new THREE.Group();
  const skin = M.skin;
  head.add(sph(0.135, skin, [0, 0, 0], [1, 1.12, 0.96], 36));          // skull
  head.add(sph(0.05, skin, [0, -0.068, 0.072], [1.3, 0.78, 0.95]));     // jaw and chin
  for (const s of [1, -1]) {                                            // eyes
    head.add(sph(0.023, M.eyeWhite, [s * 0.052, 0.012, 0.112], [1, 1, 0.7]));
    head.add(sph(0.011, M.iris, [s * 0.054, 0.012, 0.127], [1, 1, 0.6]));
    head.add(sph(0.011, M.brow, [s * 0.053, 0.046, 0.112], [1.7, 0.36, 0.5]));
  }
  head.add(sph(0.016, skin, [0, -0.012, 0.124], [0.75, 0.85, 0.75]));   // nose
  head.add(sph(0.028, M.mouth, [0, -0.062, 0.122], [1.35, 0.22, 0.35])); // mouth
  for (const s of [1, -1]) head.add(sph(0.026, skin, [s * 0.132, -0.005, 0.01], [0.5, 1, 0.9]));

  // hair
  // A full sphere round the head covers the eyes: at the eye plane its radius is still
  // wider than the eye is high. So the top is a CAP that stops above the brow, and the
  // back of the head gets its own piece.
  const hc = mat(o.hairCol ?? 'darkBrown', 0.9);
  const k = o.hair ?? 'crop';
  const BROW_Y = 0.046;                                   // keep every cap above this
  // thetaLength from the north pole, solved so the cap's rim lands at `stopY`
  const capTo = (R, cy, stopY) => Math.acos(Math.max(-1, Math.min(1, (stopY - cy) / R)));
  const hairCap = (R, cy, stopY, zoff = 0, sx = 1, sz = 1) => {
    const th = capTo(R, cy, stopY);
    const g = new THREE.SphereGeometry(R, 32, 20, 0, Math.PI * 2, 0, th);
    const m = new THREE.Mesh(g, hc);
    m.position.set(0, cy, zoff); m.scale.set(sx, 1, sz);
    head.add(m); return m;
  };
  const napeBack = (R, cy, zoff, sy = 1) => {
    const m = sph(R, hc, [0, cy, zoff], [1, sy, 1], 28);
    head.add(m); return m;
  };

  if (k === 'buzz') {
    hairCap(0.1385, 0.006, BROW_Y + 0.012, 0, 1, 0.99);
    napeBack(0.128, -0.004, -0.044, 0.98);
  } else if (k === 'crop') {
    hairCap(0.1405, 0.010, BROW_Y + 0.016, 0, 1, 0.99);
    napeBack(0.132, -0.012, -0.046, 1.0);
  } else if (k === 'quiff') {
    hairCap(0.1405, 0.012, BROW_Y + 0.022, 0, 1, 0.99);
    napeBack(0.131, -0.008, -0.046, 0.98);
    head.add(sph(0.058, hc, [0, 0.142, 0.03], [1.3, 1.0, 0.85]));
  } else if (k === 'bun') {
    hairCap(0.1412, 0.010, BROW_Y + 0.016, 0, 1, 0.99);
    napeBack(0.134, -0.012, -0.046, 1.02);
    head.add(sph(0.058, hc, [0, 0.116, -0.124]));
  } else if (k === 'long') {
    hairCap(0.1418, 0.010, BROW_Y + 0.014, 0, 1, 0.99);
    napeBack(0.137, -0.014, -0.046, 1.04);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.118, 0.3, 6, 24), hc);
    m.position.set(0, -0.19, -0.068); m.scale.set(1.05, 1, 0.6); head.add(m);
    for (const s of [1, -1]) {                            // a lock either side of the face
      const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.19, 5, 16), hc);
      l.position.set(s * 0.116, -0.085, 0.022); l.scale.set(1, 1, 0.78); head.add(l);
    }
  } else if (k === 'afro') {
    hairCap(0.176, 0.026, BROW_Y + 0.020, -0.012, 1.04, 1);
    napeBack(0.162, -0.006, -0.05, 1.0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const y = 0.052 + Math.sin(a) * 0.13;
      if (y < BROW_Y + 0.05 && Math.cos(a) * 0.17 > -0.02) continue;   // never in front of the face
      head.add(sph(0.058, hc, [Math.cos(a) * 0.17, y, -0.03]));
    }
  }
  // beard
  const bc = mat(o.beardCol ?? o.hairCol ?? 'darkBrown', 0.95);
  const b = o.beard ?? 'none';
  if (b !== 'none') {
    const big = b === 'full';
    const m = sph(big ? 0.126 : 0.118, bc, [0, big ? -0.052 : -0.044, 0.028],
                  [1.04, big ? 1.0 : 0.82, 1.0], 30);
    if (b === 'stubble') m.material = mat(o.beardCol ?? o.hairCol ?? 'darkBrown', 1,
      { transparent: true, opacity: 0.55 });
    head.add(m);
    head.add(sph(0.05, bc, [0, -0.03, 0.112], [1.1, 0.34, 0.6]));       // moustache
  }
  // glasses
  if (o.glasses && o.glasses !== 'none') {
    const fr = mat(o.glassesCol ?? 0x23202a, 0.4, { metalness: 0.3 });
    const dark = o.glasses === 'shades';
    const lens = new THREE.MeshPhysicalMaterial({
      color: dark ? 0x1b1820 : 0xbfd8ea, roughness: 0.1, transmission: dark ? 0 : 0.8,
      transparent: true, opacity: dark ? 0.92 : 0.35, clearcoat: 1 });
    for (const s of [1, -1]) {
      const r = o.glasses === 'round' ? 0.042 : 0.046;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 24), fr);
      ring.position.set(s * 0.053, 0.012, 0.126); head.add(ring);
      const gl = new THREE.Mesh(new THREE.CircleGeometry(r, 24), lens);
      gl.position.set(s * 0.053, 0.012, 0.125); head.add(gl);
      const arm = cap(0.005, 0.12, fr); arm.rotation.z = Math.PI / 2;
      arm.position.set(s * 0.108, 0.016, 0.07); arm.rotation.y = s * 0.5; head.add(arm);
    }
    const br = cap(0.005, 0.03, fr); br.rotation.z = Math.PI / 2;
    br.position.set(0, 0.016, 0.128); head.add(br);
  }
  return head;
}

/** A person. Same option names as castFig in the 2D kit. */

// An animal head, built to the same measurements as buildFace so every hat, pair
// of glasses and piece of jewellery still lands where it should.
function buildAnimalHead(M, o) {
  const A = ANIMAL3[o.animal] ?? ANIMAL3.bear;
  const head = new THREE.Group();
  const furM = mat(o.furCol ?? A.fur, 0.95);
  const muzM = mat(o.muzCol ?? A.muz, 0.9);
  const darkM = mat(A.nose, 0.7);

  head.add(sph(0.146, furM, [0, 0, 0], [1, 1.0, 0.98], 36));             // skull
  const muz = sph(0.074, muzM, [0, -0.046, 0.1], [1.12, 0.82, 1.0], 28); // muzzle
  head.add(muz);
  head.add(sph(0.026, darkM, [0, -0.024, 0.166], [1.25, 0.8, 0.7]));     // nose
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.008, 0.01), darkM);
  mouth.position.set(0, -0.082, 0.146); head.add(mouth);
  if (A.tongue) head.add(sph(0.026, mat(0xd4737f, 0.85), [0, -0.1, 0.135], [1, 0.45, 0.9]));

  // the panda's eye patches go on BEFORE the eyes, or they bury them
  if (A.patch) for (const s of [1, -1])
    head.add(sph(0.044, mat(A.patch, 0.95), [s * 0.062, 0.022, 0.108], [1.0, 1.25, 0.45]));

  for (const s of [1, -1]) {
    head.add(sph(0.024, M.eyeWhite, [s * 0.058, 0.026, 0.115], [1, 1, 0.7]));
    head.add(sph(0.012, mat(A.eyeCol ?? 0x2e241c, 0.2), [s * 0.06, 0.026, 0.13], [1, 1, 0.6]));
  }

  // ears
  const earM = A.earCol ? mat(A.earCol, 0.95) : furM;
  const inM = mat(A.earIn, 0.95);
  for (const s of [1, -1]) {
    if (A.ear === 'point') {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.1, 16), earM);
      c.position.set(s * 0.098, 0.15, -0.004); c.rotation.z = -s * 0.22; head.add(c);
      const ci = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.06, 14), inM);
      ci.position.set(s * 0.1, 0.145, 0.016); ci.rotation.z = -s * 0.22; head.add(ci);
    } else if (A.ear === 'flop') {
      const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.1, 5, 16), earM);
      e.position.set(s * 0.132, 0.03, -0.006); e.scale.set(1, 1, 0.5);
      e.rotation.z = s * 0.22; head.add(e);
    } else {
      const e = sph(0.05, earM, [s * 0.118, 0.112, -0.008], [1, 1, 0.42], 22); head.add(e);
      head.add(sph(0.03, inM, [s * 0.122, 0.112, 0.018], [1, 1, 0.3], 18));
    }
  }

  if (A.mane) {                                    // a ring behind the face, never over it
    const mn = mat(o.maneCol ?? A.mane, 0.98);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      head.add(sph(0.062, mn, [Math.cos(a) * 0.168, Math.sin(a) * 0.168, -0.045], [1, 1, 0.65], 16));
    }
  }
  if (A.stripes) {
    const st = mat(A.stripes, 0.95);
    for (let i = 0; i < 4; i++) for (const s of [1, -1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.052, 0.012), st);
      b.position.set(s * (0.04 + i * 0.034), 0.1 - i * 0.012, -0.108 + i * 0.03);
      b.rotation.z = s * 0.3; head.add(b);
    }
  }
  if (A.whisk) {
    const w = mat(0xf3ece2, 0.6);
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.13, 5), w);
      c.position.set(s * 0.082, -0.046 + i * 0.016, 0.116);
      c.rotation.set(0, 0, s * (Math.PI / 2 - 0.2 + i * 0.16)); head.add(c);
    }
  }
  return head;
}

export function makeFigure3D(opts = {}) {
  const o = opts;
  const B = BUILD3[o.build] ?? BUILD3.athletic;
  const skinM = mat(o.skin ?? 'light', 0.55);
  const M = {
    skin: skinM,
    eyeWhite: new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.12, clearcoat: 1 }),
    iris: new THREE.MeshPhysicalMaterial({ color: o.eyeCol ?? 0x4a3322, roughness: 0.18, clearcoat: 1 }),
    brow: mat(o.hairCol ?? 'darkBrown', 0.9),
    mouth: mat(0x6b3a2a, 0.8),
  };
  M.mouth = mat(0x6b3a2a, 0.8);

  const cols = o.cols ?? ['#4a7fd0', '#eef1f5'];
  const clothM = mat(cols[0], 0.92);
  const trimM = mat(cols[1] ?? cols[0], 0.9);

  const root = new THREE.Group();
  const pelvis = new THREE.Group(); pelvis.position.y = 0.95 * B.h; root.add(pelvis);
  const spine = new THREE.Group(); pelvis.add(spine);
  const chest = new THREE.Group(); chest.position.y = 0.2; spine.add(chest);
  const j = { root, pelvis, spine, chest };

  const suit = o.outfit === 'suit', dress = o.outfit === 'dress';
  const hoodie = o.outfit === 'hoodie', knit = o.outfit === 'knit';

  // torso, two lathes, widened per build
  const lowG = torsoShell(-0.18, 0.2, () => 0.012 * (B.waist - 1) * 6);
  const low = new THREE.Mesh(lowG, clothM); low.scale.set(B.waist, 1, B.waist * 0.96); spine.add(low);
  const upG = torsoShell(0.18, 0.58, () => 0.012 * (B.chest - 1) * 6); upG.translate(0, -0.2, 0);
  const up = new THREE.Mesh(upG, clothM); up.scale.set(B.chest, 1, B.chest * 0.94); chest.add(up);
  if (suit) {                                        // lapels and a shirt strip
    const sg = torsoShell(0.2, 0.56, () => 0.004); sg.translate(0, -0.2, 0);
    const sm = new THREE.Mesh(sg, mat(0xf2efe8, 0.85)); sm.scale.set(0.42, 1, 1.02); chest.add(sm);
    for (const s of [1, -1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.2, 0.012), mat(cols[0], 0.8));
      l.position.set(s * 0.075, 0.16, 0.098 * B.chest); l.rotation.z = s * 0.3; chest.add(l);
    }
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.24, 0.014), trimM);
    tie.position.set(0, 0.1, 0.1 * B.chest); chest.add(tie);
  }
  if (hoodie) {                                      // a hood behind the neck
    const h = sph(0.125, clothM, [0, 0.42, -0.085], [1.25, 0.72, 1]); chest.add(h);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.03), mat(cols[0], 0.95));
    p.position.set(0, -0.08, 0.105 * B.chest); chest.add(p);
  }
  if (knit) for (let i = 0; i < 7; i++) {             // ribs
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.3, 0.008), trimM);
    r.position.set(-0.09 + i * 0.03, 0.16, 0.1 * B.chest); chest.add(r);
  }
  if (dress) {                                        // a skirt below the hips
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * B.hip, 0.24 * B.hip, 0.42, 28, 1, true), clothM);
    sk.material.side = THREE.DoubleSide; sk.position.y = -0.3; pelvis.add(sk);
    const band = disc(0.135 * B.waist, 0.035, trimM); band.position.y = -0.1; pelvis.add(band);
  }

  // neck and head
  const neck = new THREE.Group(); neck.position.y = 0.36; chest.add(neck);
  const nk = disc(0.05, 0.12, skinM); nk.position.y = 0.04; neck.add(nk);
  const head = o.animal ? buildAnimalHead(M, o) : buildFace(M, o);
  head.position.y = 0.165; neck.add(head);
  j.neck = neck; j.head = head;

  const limbM = (suit || knit || hoodie || o.outfit === 'shirt') ? clothM : skinM;
  for (const s of [1, -1]) {
    const k = s > 0 ? 'l' : 'r';
    const sh = new THREE.Group(); sh.position.set(s * 0.205 * B.sh, 0.26, -0.005); chest.add(sh);
    sh.add(sph(0.062 * B.limb, limbM, [0, -0.01, 0]));
    sh.add(cap(0.052 * B.limb, 0.24, limbM));
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    el.add(sph(0.046 * B.limb, limbM)); el.add(cap(0.043 * B.limb, 0.21, limbM));
    const wr = new THREE.Group(); wr.position.y = -0.27; el.add(wr);
    wr.add(sph(0.05, skinM, [0, -0.03, 0], [1, 1.1, 0.85]));
    j[k + 'Sh'] = sh; j[k + 'El'] = el; j[k + 'Wr'] = wr;

    const legM = dress ? skinM : clothM;
    const hip = new THREE.Group(); hip.position.set(s * 0.095 * B.hip, -0.06, 0); pelvis.add(hip);
    hip.add(cap(0.078 * B.limb, 0.34, legM));
    const kn = new THREE.Group(); kn.position.y = -0.44; hip.add(kn);
    kn.add(sph(0.06 * B.limb, legM)); kn.add(cap(0.056 * B.limb, 0.36, legM));
    const an = new THREE.Group(); an.position.y = -0.45; kn.add(an);
    an.add(disc(0.042, 0.11, skinM));
    an.add(sph(0.05, mat(0x2b2630, 0.6), [0, -0.035, 0.05], [1, 0.62, 2.3]));
    j[k + 'Hip'] = hip; j[k + 'Kn'] = kn; j[k + 'An'] = an;
  }
  root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

  // ---- the parts that make a character out of a body ----
  // Named for what they are, a stole and pearls and a halo, not for a character
  // type, because the same parts are a film star or a villain depending only on
  // what the script has them doing.
  if (o.wings) {
    const wm = new THREE.MeshPhysicalMaterial({
      color: col(o.wingCol ?? 0xfdfbf4), roughness: 0.75,
      transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    // The first pass stacked these upward and they read as a white hoop over the
    // head. A wing sweeps OUT and back from the shoulder blade, so the pieces run
    // along local x and the group is turned, not the spheres.
    for (const s of [1, -1]) {
      const w = new THREE.Group(); w.position.set(s * 0.1, 0.3, -0.1); chest.add(w);
      w.rotation.set(0, s * 0.62, s * 0.38);
      [[0.17, 0.02, 0.15], [0.33, 0.07, 0.125], [0.46, 0.11, 0.09]].forEach(([x, y, r]) => {
        w.add(sph(r, wm, [s * x, y, 0], [1.45, 1.0, 0.1], 20));
      });
    }
  }
  if (o.halo) {
    const hm = new THREE.MeshStandardMaterial({
      color: col(o.haloCol ?? 0xffd766), emissive: col(o.haloCol ?? 0xffd766),
      emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.4 });
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 32), hm);
    h.rotation.x = Math.PI / 2; h.position.y = 0.37; head.add(h);
  }
  if (o.necklace) {
    const nm = o.necklace === 'pearls'
      ? new THREE.MeshPhysicalMaterial({ color: col(o.necklaceCol ?? 0xf6efe2), roughness: 0.12, clearcoat: 1 })
      : new THREE.MeshStandardMaterial({ color: col(o.necklaceCol ?? 0xe8c15a), roughness: 0.25, metalness: 1 });
    const n = o.necklace === 'pearls' ? 18 : 24;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.18 + (i / (n - 1)) * Math.PI * 0.64;
      const bead = sph(o.necklace === 'pearls' ? 0.014 : 0.008, nm,
        [Math.cos(a) * 0.088, 0.3 - Math.sin(a) * 0.03 - 0.02, 0.056 + Math.sin(a) * 0.016], [1, 1, 1], 12);
      chest.add(bead);
    }
    if (o.necklace === 'pendant')
      chest.add(sph(0.026, nm, [0, 0.232, 0.08], [1, 1.3, 0.5], 16));
  }
  if (o.earrings) {
    const em = new THREE.MeshStandardMaterial({ color: col(o.earringCol ?? 0xe8c15a), roughness: 0.22, metalness: 1 });
    for (const s of [1, -1]) {
      if (o.earrings === 'hoop') {
        const h = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.004, 8, 20), em);
        h.position.set(s * 0.134, -0.044, 0.012); h.rotation.y = Math.PI / 2; head.add(h);
      } else if (o.earrings === 'drop') {
        head.add(sph(0.007, em, [s * 0.134, -0.024, 0.012], [1, 1, 1], 10));
        head.add(sph(0.014, em, [s * 0.134, -0.056, 0.012], [1, 1.5, 1], 12));
      } else {
        head.add(sph(0.011, em, [s * 0.134, -0.03, 0.014], [1, 1, 1], 10));
      }
    }
  }
  if (o.fur) {                                      // a stole over the shoulders
    const fm = mat(o.furStoleCol ?? 0xece5d6, 1);
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.08 + (i / 21) * Math.PI * 0.84;
      chest.add(sph(0.046, fm, [Math.cos(a) * 0.17, 0.3 - Math.sin(a) * 0.012, -0.02 + Math.sin(a) * 0.09],
        [1, 0.92, 1], 14));
    }
  }
  if (o.watch && j.lWr) {
    const bm = mat(0x2b2630, 0.6), fm = new THREE.MeshStandardMaterial({
      color: col(o.watchCol ?? 0xe8c15a), roughness: 0.2, metalness: 1 });
    const band = disc(0.044, 0.026, bm); band.rotation.x = Math.PI / 2; band.position.y = 0.01; j.lWr.add(band);
    const face = disc(0.03, 0.012, fm); face.rotation.set(Math.PI / 2, 0, 0); face.position.set(0.03, 0.01, 0);
    face.rotation.z = Math.PI / 2; j.lWr.add(face);
  }

  // Same shape makeHuman returns, so a shot can drive either rig the same way.
  const fig = {
    root, j,
    setPose(p = {}) {
      for (const k of ['pelvis', 'spine', 'chest', 'neck', 'head',
                       'lSh', 'lEl', 'lWr', 'rSh', 'rEl', 'rWr',
                       'lHip', 'lKn', 'lAn', 'rHip', 'rKn', 'rAn']) {
        const v = p[k] || [0, 0, 0];
        if (j[k]) j[k].rotation.set(v[0], v[1], v[2], 'YXZ');
      }
      j.pelvis.position.y = 0.95 * B.h + (p.drop || 0);
    },
  };
  fig.setPose({});
  return fig;
}

/** The relaxed stand the 2D kit's default pose corresponds to. */
export const STAND3 = {
  lSh: [0.05, 0, 0.16], rSh: [0.05, 0, -0.16], lEl: [-0.25, 0, 0], rEl: [-0.25, 0, 0],
  lHip: [0, 0, 0.07], rHip: [0, 0, -0.07], lAn: [0, 0, -0.07], rAn: [0, 0, 0.07],
};


// ---- four legs ----
// A separate function, not an option, for the same reason the 2D kit keeps
// petFig apart: a dog standing on two legs beside a person is a gag, not a pet.
export function makePet3D(opts = {}) {
  const o = opts;
  const A = ANIMAL3[o.kind] ?? ANIMAL3.dog;
  const furM = mat(o.furCol ?? A.fur, 0.95);
  const muzM = mat(o.muzCol ?? A.muz, 0.9);
  const darkM = mat(A.nose, 0.7);
  const k = o.s ?? 1;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.34; root.add(body);

  const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.24, 6, 20), furM);
  barrel.rotation.z = Math.PI / 2; barrel.scale.set(1, 1, 0.92); body.add(barrel);
  body.add(sph(0.1, furM, [-0.17, 0.01, 0], [1, 0.96, 0.94]));          // haunch
  body.add(sph(0.092, furM, [0.15, 0.03, 0], [1, 0.94, 0.94]));         // chest

  // head, forward and a little up
  const head = new THREE.Group(); head.position.set(0.3, 0.13, 0); body.add(head);
  head.add(sph(0.088, furM, [0, 0, 0], [1, 1, 0.96], 24));
  head.add(sph(0.05, muzM, [0.072, -0.028, 0], [1.1, 0.78, 0.9], 20));
  head.add(sph(0.018, darkM, [0.118, -0.018, 0], [0.9, 0.8, 1.1], 14));
  for (const s of [1, -1]) {
    head.add(sph(0.016, mat(0x2b2320, 0.2), [0.052, 0.022, s * 0.052], [0.8, 1, 1], 12));
    if (A.ear === 'point') {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.062, 14), furM);
      c.position.set(-0.012, 0.086, s * 0.052); c.rotation.x = -s * 0.2; head.add(c);
    } else {
      const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.056, 5, 14), furM);
      e.position.set(-0.004, 0.028, s * 0.074); e.scale.set(0.7, 1, 1);
      e.rotation.x = s * 0.3; head.add(e);
    }
  }
  if (A.tongue) head.add(sph(0.018, mat(0xd4737f, 0.85), [0.118, -0.052, 0], [1, 0.4, 0.8], 12));

  // Legs in two tones: the far pair darker, or the animal reads as a flat slab.
  const farM = mat(o.furCol ?? A.fur, 0.95); farM.color.multiplyScalar(0.8);
  for (const s of [1, -1]) for (const fx of [0.16, -0.14]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.2, 5, 14), s > 0 ? furM : farM);
    leg.position.set(fx, -0.17, s * 0.072); body.add(leg);
    const paw = sph(0.036, s > 0 ? furM : farM, [fx, -0.3, s * 0.072], [1, 0.7, 1.1], 14); body.add(paw);
  }
  // tail
  if (A.tail === 'stub') body.add(sph(0.042, furM, [-0.26, 0.04, 0], [1, 1, 1], 14));
  else if (A.tail === 'tuft') {
    const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.16, 5, 12), furM);
    tl.position.set(-0.28, 0.08, 0); tl.rotation.z = -0.7; body.add(tl);
    body.add(sph(0.044, mat(o.maneCol ?? A.mane ?? A.fur, 0.98), [-0.36, 0.16, 0], [1, 1, 1], 14));
  } else {
    const tl = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.2, 5, 12), furM);
    tl.position.set(-0.3, 0.1, 0); tl.rotation.z = A.tail === 'curl' ? -1.25 : -0.55; body.add(tl);
  }
  root.scale.setScalar(k);
  root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return { root, body, head };
}

// ---- presets ----
// Plain options objects, so override anything. The same three the 2D kit has,
// plus the one the warnings reel kept rebuilding by hand.
export const CUPID3 = {
  build: 'petite', skin: 'fair', hair: 'quiff', hairCol: 'sand',
  outfit: 'tee', cols: ['#f7f1e4', '#f7f1e4'], wings: true, halo: true,
};
export const RICH_MAN3 = {
  build: 'broad', skin: 'tan', hair: 'crop', hairCol: 'grey', beard: 'short',
  outfit: 'suit', cols: ['#23202a', '#c9a227'], glasses: 'shades', watch: true,
  necklace: 'chain',
};
export const GLAM_WOMAN3 = {
  build: 'curvy', skin: 'light', hair: 'long', hairCol: 'black',
  outfit: 'dress', cols: ['#1d1a22', '#c9a227'], fur: true,
  necklace: 'pearls', earrings: 'drop', glasses: 'shades',
};
// Named for a character type, against the rule above, because it is the one the
// scripts keep asking for by name. It is GLAM_WOMAN3 with the gold turned up.
export const GOLD_DIGGER3 = {
  ...GLAM_WOMAN3, hairCol: 'platinum', cols: ['#b01a52', '#e8c15a'],
  necklace: 'pearls', earrings: 'drop', watch: true, glasses: 'shades',
  furStoleCol: '#f3ece0',
};
