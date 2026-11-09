// LES ABSENTS — Épisode 1 — 3D stage, realistic characters and shots.
// Everything drawn is a pure function of timeline time t (seconds).
import * as THREE from "three";
import { RoomEnvironment } from "./lib/RoomEnvironment.js";
import { FBXLoader } from "./lib/loaders/FBXLoader.js";

const W = 1080;
const H = 1920;
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: false,
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020306);
scene.fog = new THREE.FogExp2(0x03050a, 0.16);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.12;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 60);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, k) => a + (b - a) * k;
const ramp = (t, a, b) => smooth((t - a) / (b - a));
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
// smooth deterministic noise in [-1, 1]
function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed * 101) * 2 - 1;
  const b = hash(i + 1 + seed * 101) * 2 - 1;
  return lerp(a, b, f * f * (3 - 2 * f));
}
const geoCache = new Map();
function sphereGeo(w = 48, h = 36, ...rest) {
  const k = [w, h, ...rest].join(",");
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(1, w, h, ...rest));
  return geoCache.get(k);
}
function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, ...o });
}
function mesh(
  geo,
  material,
  { pos = [0, 0, 0], scl = [1, 1, 1], rot = [0, 0, 0], shadow = true, parent } = {},
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.scale.set(...scl);
  m.rotation.set(...rot);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const ball = (material, pos, scl, parent, rot) =>
  mesh(sphereGeo(), material, { pos, scl, parent, rot });
const box = (material, pos, size, parent, rot) =>
  mesh(new THREE.BoxGeometry(1, 1, 1), material, { pos, scl: size, parent, rot });

// ---------- realistic characters (Microsoft Rocketbox, MIT) ----------
const MORPH = {
  blinkL: "AK_09_EyeBlinkLeft",
  blinkR: "AK_10_EyeBlinkRight",
  wideL: "AK_21_EyeWideLeft",
  wideR: "AK_22_EyeWideRight",
  squintL: "AK_19_EyeSquintLeft",
  squintR: "AK_20_EyeSquintRight",
  browIn: "AK_03_BrowInnerUp",
  browDL: "AK_01_BrowDownLeft",
  browDR: "AK_02_BrowDownRight",
  browOL: "AK_04_BrowOuterUpLeft",
  browOR: "AK_05_BrowOuterUpRight",
  lookDownL: "AK_11_EyeLookDownLeft",
  lookDownR: "AK_12_EyeLookDownRight",
  lookInL: "AK_13_EyeLookInLeft",
  lookInR: "AK_14_EyeLookInRight",
  lookOutL: "AK_15_EyeLookOutLeft",
  lookOutR: "AK_16_EyeLookOutRight",
  lookUpL: "AK_17_EyeLookUpLeft",
  lookUpR: "AK_18_EyeLookUpRight",
  jaw: "AK_25_JawOpen",
  frownL: "AK_30_MouthFrownLeft",
  frownR: "AK_31_MouthFrownRight",
  smileL: "AK_44_MouthSmileLeft",
  smileR: "AK_45_MouthSmileRight",
  stretchL: "AK_46_MouthStretchLeft",
  stretchR: "AK_47_MouthStretchRight",
  pressL: "AK_36_MouthPressLeft",
  pressR: "AK_37_MouthPressRight",
  lowerDL: "AK_34_MouthLowerDownLeft",
  lowerDR: "AK_35_MouthLowerDownRight",
  upperUL: "AK_48_MouthUpperUpLeft",
  upperUR: "AK_49_MouthUpperUpRight",
  shrugLower: "AK_42_MouthShrugLower",
  rollLower: "AK_40_MouthRollLower",
  sadL: "SR_32_Mouth_Sad_Left",
  sadR: "SR_33_Mouth_Sad_Right",
  cheekRaise: "AU_06_CheekRaiser",
  noseWrinkle: "AU_09_NoseWrinkler",
  lidDroop: "AU_41_LidDroop",
  v_sil: "AA_VI_00_Sil",
  v_pp: "AA_VI_01_PP",
  v_ff: "AA_VI_02_FF",
  v_th: "AA_VI_03_TH",
  v_dd: "AA_VI_04_DD",
  v_kk: "AA_VI_05_KK",
  v_ch: "AA_VI_06_CH",
  v_ss: "AA_VI_07_SS",
  v_nn: "AA_VI_08_nn",
  v_rr: "AA_VI_09_RR",
  v_aa: "AA_VI_10_aa",
  v_e: "AA_VI_11_E",
  v_i: "AA_VI_12_I",
  v_o: "AA_VI_13_O",
  v_u: "AA_VI_14_U",
};
const VIS_KEYS = [
  "v_pp",
  "v_ff",
  "v_th",
  "v_dd",
  "v_kk",
  "v_ch",
  "v_ss",
  "v_nn",
  "v_rr",
  "v_aa",
  "v_e",
  "v_i",
  "v_o",
  "v_u",
];

const CHAR_DEFS = {
  noe: { dir: "assets/characters/noe", tint: { body: "noeHoodie" } },
  lina: { dir: "assets/characters/lina" },
  mere: { dir: "assets/characters/mere" },
  pere: { dir: "assets/characters/pere" },
};
const TL = new THREE.TextureLoader();
function loadTex(url, srgb) {
  return new Promise((res, rej) =>
    TL.load(
      url,
      (t) => {
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        res(t);
      },
      undefined,
      rej,
    ),
  );
}
// Noé's red track jacket becomes a charcoal hoodie (keeps the white stripes and skin)
function noeHoodie(m) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       { vec3 c = diffuseColor.rgb; float red = smoothstep(0.015, 0.06, c.r - max(c.g, c.b) * 1.25);
         float l = dot(c, vec3(0.3, 0.45, 0.25)); diffuseColor.rgb = mix(c, vec3(l * 0.55 + 0.008, l * 0.58 + 0.009, l * 0.65 + 0.011), red); }`,
    );
  };
}
async function loadCharacter(key) {
  const def = CHAR_DEFS[key];
  const mgr = new THREE.LoadingManager();
  mgr.setURLModifier((u) => (/\.tga$/i.test(u) ? "data:image/gif;base64,R0lGODlhAQABAAAAACw=" : u));
  mgr.addHandler(/\.tga$/i, new THREE.TextureLoader(mgr));
  const model = await new FBXLoader(mgr).loadAsync(`${def.dir}/model.fbx`);
  model.scale.setScalar(0.01);
  const [headC, headN, bodyC, bodyN, opC] = await Promise.all([
    loadTex(`${def.dir}/head_color.jpg`, true),
    loadTex(`${def.dir}/head_normal.jpg`),
    loadTex(`${def.dir}/body_color.jpg`, true),
    loadTex(`${def.dir}/body_normal.jpg`),
    loadTex(`${def.dir}/opacity_color.png`, true).catch(() => null),
  ]);
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: headC,
    normalMap: headN,
    roughness: 0.52,
    sheen: 0.25,
    sheenColor: new THREE.Color(0xffb59a),
    sheenRoughness: 0.7,
    clearcoat: 0.05,
  });
  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyC, normalMap: bodyN, roughness: 0.82 });
  if (def.tint && def.tint.body === "noeHoodie") noeHoodie(bodyMat);
  const opMat = opC
    ? new THREE.MeshStandardMaterial({
        map: opC,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
        roughness: 0.6,
      })
    : null;
  let faceMesh = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const conv = (m) =>
      /opacity/.test(m.name) ? opMat || bodyMat : /head/.test(m.name) ? skinMat : bodyMat;
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    if (o.morphTargetDictionary && !faceMesh) faceMesh = o;
  });
  const morph = {};
  if (faceMesh) {
    for (const [name, idx] of Object.entries(faceMesh.morphTargetDictionary))
      morph[name.split(".").pop()] = idx;
  }
  const bones = {};
  model.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
  });
  const pick = (re) => Object.values(bones).find((b) => re.test(b.name));
  const B = {
    pelvis: pick(/Pelvis$/),
    spine: pick(/Spine1?$/),
    spine2: pick(/Spine2$/) || pick(/Spine1$/),
    neck: pick(/Neck$/),
    head: pick(/Head$/),
    lUp: pick(/L_UpperArm$/),
    lFore: pick(/L_Forearm$/),
    lHand: pick(/L_Hand$/),
    rUp: pick(/R_UpperArm$/),
    rFore: pick(/R_Forearm$/),
    rHand: pick(/R_Hand$/),
    lThigh: pick(/L_Thigh$/),
    rThigh: pick(/R_Thigh$/),
  };
  const rest = new Map();
  for (const b of Object.values(bones)) rest.set(b, b.quaternion.clone());
  const root = new THREE.Group();
  root.add(model);
  scene.add(root);
  return { key, root, model, face: faceMesh, morph, B, rest, boneNames: Object.keys(bones) };
}

const _q = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _qr = new THREE.Quaternion();
const _v = new THREE.Vector3();
// rotate a bone about an axis given in the character's own frame (x = its left, y = up, z = forward)
function rotBone(ch, bone, axis, angle) {
  if (!bone || !angle) return;
  ch.root.getWorldQuaternion(_qr);
  _v.set(...axis)
    .applyQuaternion(_qr)
    .normalize();
  _q.setFromAxisAngle(_v, angle);
  bone.parent.getWorldQuaternion(_qp);
  // local' = parentInv * q * parent * local
  const inv = _qp.clone().invert();
  bone.quaternion.premultiply(inv.multiply(_q).multiply(_qp));
  bone.updateMatrixWorld(true);
}
function setMorph(ch, key, v) {
  const idx = ch.morph[MORPH[key]];
  if (idx !== undefined) ch.face.morphTargetInfluences[idx] = clamp(v, 0, 1);
}

// French text → viseme track (letter position follows speech time)
function visemeOf(ch) {
  if ("aàâ".includes(ch)) return "v_aa";
  if ("eéèêë".includes(ch)) return "v_e";
  if ("iîïy".includes(ch)) return "v_i";
  if ("oôœ".includes(ch)) return "v_o";
  if ("uùû".includes(ch)) return "v_u";
  if ("pbm".includes(ch)) return "v_pp";
  if ("fv".includes(ch)) return "v_ff";
  if ("szcçjx".includes(ch)) return "v_ss";
  if ("tdl".includes(ch)) return "v_dd";
  if ("n".includes(ch)) return "v_nn";
  if ("r".includes(ch)) return "v_rr";
  if ("kgq".includes(ch)) return "v_kk";
  if ("h".includes(ch)) return "v_ch";
  return null;
}

const DEFAULT_STATE = {
  blink: 0,
  wide: 0,
  squint: 0,
  browIn: 0,
  browDown: 0,
  browOut: 0,
  smile: 0,
  frown: 0,
  sad: 0,
  fear: 0,
  press: 0,
  jawExtra: 0,
  gazeX: 0,
  gazeY: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  lean: 0,
  twist: 0,
  armL: [1.3, 0.12, 0.25],
  armR: [1.3, 0.12, 0.25], // [down, forward, bend]
  speech: null,
  t: 0,
  breathe: 1,
  tremble: 0,
};
function pose(ch, st) {
  const s = { ...DEFAULT_STATE, ...st };
  // reset skeleton
  for (const [b, q] of ch.rest) b.quaternion.copy(q);
  ch.root.updateMatrixWorld(true);
  const t = s.t;
  const br = Math.sin(t * 1.6 + ch.key.length) * 0.012 * s.breathe;
  const tr = s.tremble * noise1(t * 14, ch.key.length) * 0.02;
  rotBone(ch, ch.B.spine, [1, 0, 0], s.lean + br);
  rotBone(ch, ch.B.spine2, [0, 1, 0], s.twist);
  const yaw = s.yaw + noise1(t * 0.5, 3) * 0.02;
  const pitch = s.pitch + noise1(t * 0.43, 7) * 0.015 + tr;
  rotBone(ch, ch.B.neck, [0, 1, 0], yaw * 0.4);
  rotBone(ch, ch.B.neck, [1, 0, 0], pitch * 0.4);
  rotBone(ch, ch.B.head, [0, 1, 0], yaw * 0.6);
  rotBone(ch, ch.B.head, [1, 0, 0], pitch * 0.6);
  rotBone(ch, ch.B.head, [0, 0, 1], s.roll);
  // arms: down (about z), forward (about x), then forearm bend
  const [ld, lf, lb] = s.armL;
  const [rd, rf, rb] = s.armR;
  rotBone(ch, ch.B.lUp, [0, 0, 1], -ld);
  rotBone(ch, ch.B.lUp, [1, 0, 0], -lf);
  rotBone(ch, ch.B.rUp, [0, 0, 1], rd);
  rotBone(ch, ch.B.rUp, [1, 0, 0], -rf);
  rotBone(ch, ch.B.lFore, [1, 0, 0], -lb);
  rotBone(ch, ch.B.rFore, [1, 0, 0], -rb);
  if (s.armLExtra) rotBone(ch, ch.B.lUp, ...s.armLExtra);
  if (s.armRExtra) rotBone(ch, ch.B.rUp, ...s.armRExtra);

  // face
  if (!ch.face) return;
  ch.face.morphTargetInfluences.fill(0);
  setMorph(ch, "blinkL", s.blink);
  setMorph(ch, "blinkR", s.blink);
  setMorph(ch, "wideL", s.wide + s.fear * 0.6);
  setMorph(ch, "wideR", s.wide + s.fear * 0.6);
  setMorph(ch, "squintL", s.squint);
  setMorph(ch, "squintR", s.squint);
  setMorph(ch, "browIn", s.browIn + s.fear * 0.7 + s.sad * 0.6);
  setMorph(ch, "browDL", s.browDown);
  setMorph(ch, "browDR", s.browDown);
  setMorph(ch, "browOL", s.browOut + s.fear * 0.3);
  setMorph(ch, "browOR", s.browOut + s.fear * 0.3);
  setMorph(ch, "smileL", s.smile);
  setMorph(ch, "smileR", s.smile * 0.85);
  setMorph(ch, "frownL", s.frown + s.sad * 0.5);
  setMorph(ch, "frownR", s.frown + s.sad * 0.5);
  setMorph(ch, "sadL", s.sad * 0.7);
  setMorph(ch, "sadR", s.sad * 0.7);
  setMorph(ch, "stretchL", s.fear * 0.35);
  setMorph(ch, "stretchR", s.fear * 0.35);
  setMorph(ch, "pressL", s.press);
  setMorph(ch, "pressR", s.press);
  // gaze: +x = towards the character's own left, +y = up
  const gx = s.gazeX + noise1(t * 1.3, 11) * 0.04;
  const gy = s.gazeY;
  setMorph(ch, "lookOutL", gx);
  setMorph(ch, "lookInR", gx);
  setMorph(ch, "lookInL", -gx);
  setMorph(ch, "lookOutR", -gx);
  setMorph(ch, "lookUpL", gy);
  setMorph(ch, "lookUpR", gy);
  setMorph(ch, "lookDownL", -gy);
  setMorph(ch, "lookDownR", -gy);
  // speech
  let jaw = s.jawExtra;
  if (s.speech) {
    const { env, ln, lt } = s.speech;
    const text = ln.text.toLowerCase();
    const pos = clamp(lt / ln.dur) * (text.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    const weights = {};
    for (const [k, w] of [
      [i, 1 - f],
      [i + 1, f],
    ]) {
      const v = visemeOf(text[k] || " ");
      if (v) weights[v] = (weights[v] || 0) + w;
    }
    for (const k of VIS_KEYS) if (weights[k]) setMorph(ch, k, weights[k] * clamp(env * 1.25));
    jaw += env * 0.38;
  }
  setMorph(ch, "jaw", jaw);
}
function blinkAt(t, seed) {
  const period = 3.1 + seed * 0.7;
  const ph = (t + seed * 1.37) % period;
  const d = 0.17;
  return ph < d ? Math.sin((ph / d) * Math.PI) : 0;
}

// lip-sync data from scripts/build_audio.py
const LINES = window.HF_LINES || [];
function speech(who, t) {
  for (const ln of LINES) {
    if (ln.who !== who) continue;
    const lt = t - ln.start;
    if (lt < 0 || lt > ln.dur) continue;
    const fr = lt * 30;
    const i = Math.floor(fr);
    const env = lerp(ln.env[i] || 0, ln.env[i + 1] || 0, fr - i);
    return { env: clamp(Math.pow(env, 0.85)), ln, lt };
  }
  return null;
}

const CH = {};
const CAST = [];
function place(c, x, y, z, ry = 0, rx = 0) {
  c.root.visible = true;
  c.root.position.set(x, y, z);
  c.root.rotation.set(rx, ry, 0);
  c.root.updateMatrixWorld(true);
}
// world point of the face (between the eyes), after posing
const _f = new THREE.Vector3();
function faceOf(c, out = new THREE.Vector3()) {
  c.B.head.getWorldPosition(out);
  c.root.getWorldQuaternion(_qr);
  _f.set(0, 0.075, 0.07).applyQuaternion(_qr);
  return out.add(_f);
}

// phone prop (in Noé's hand / on nightstand)
function makePhone() {
  const g = new THREE.Group();
  box(mat(0x111214, { roughness: 0.3, metalness: 0.6 }), [0, 0, 0], [0.072, 0.152, 0.008], g);
  const scr = new THREE.MeshBasicMaterial({ color: 0x9fd3ff });
  const s = mesh(new THREE.PlaneGeometry(0.066, 0.144), scr, {
    pos: [0, 0, 0.0042],
    parent: g,
    shadow: false,
  });
  return { g, scr, s };
}
const PHONE = makePhone();
scene.add(PHONE.g);

// mug with Léthé logo (closed eye over a wave)
function logoTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#e9e2d6";
  x.fillRect(0, 0, 512, 256);
  x.strokeStyle = "#2f4b5c";
  x.lineWidth = 9;
  x.beginPath();
  x.arc(256, 70, 70, 0.25 * Math.PI, 0.75 * Math.PI);
  x.stroke();
  for (let i = -2; i <= 2; i++) {
    x.beginPath();
    x.moveTo(256 + i * 26, 128);
    x.lineTo(256 + i * 30, 146);
    x.stroke();
  }
  x.beginPath();
  for (let i = 0; i <= 60; i++) {
    const px = 186 + i * (140 / 60);
    const py = 186 + Math.sin(i / 6) * 9;
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const MUG = new THREE.Group();
{
  const body = mesh(
    new THREE.CylinderGeometry(0.042, 0.038, 0.1, 40, 1, true),
    new THREE.MeshStandardMaterial({ map: logoTexture(), roughness: 0.35, side: THREE.DoubleSide }),
    { parent: MUG },
  );
  body.rotation.y = -Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.039, 30), mat(0x3a2418, { roughness: 0.2 }), {
    pos: [0, 0.035, 0],
    rot: [-Math.PI / 2, 0, 0],
    parent: MUG,
  });
  mesh(new THREE.TorusGeometry(0.025, 0.007, 10, 24), mat(0xe9e2d6, { roughness: 0.35 }), {
    pos: [0.045, 0, 0],
    parent: MUG,
  });
}
scene.add(MUG);

// ---------- sets ----------
const SETS = {};
function room({ x0, w = 5, d = 5, h = 2.7, wall, floor, ceil = 0x1a1d22 }) {
  const g = new THREE.Group();
  g.position.x = x0;
  const wm = mat(wall, { roughness: 0.92 });
  mesh(new THREE.PlaneGeometry(w, d), mat(floor, { roughness: 0.7 }), {
    rot: [-Math.PI / 2, 0, 0],
    parent: g,
    shadow: false,
  });
  mesh(new THREE.PlaneGeometry(w, h), wm, { pos: [0, h / 2, -d / 2], parent: g, shadow: false });
  mesh(new THREE.PlaneGeometry(d, h), wm, {
    pos: [-w / 2, h / 2, 0],
    rot: [0, Math.PI / 2, 0],
    parent: g,
    shadow: false,
  });
  mesh(new THREE.PlaneGeometry(d, h), wm, {
    pos: [w / 2, h / 2, 0],
    rot: [0, -Math.PI / 2, 0],
    parent: g,
    shadow: false,
  });
  mesh(new THREE.PlaneGeometry(w, h), wm, {
    pos: [0, h / 2, d / 2],
    rot: [0, Math.PI, 0],
    parent: g,
    shadow: false,
  });
  mesh(new THREE.PlaneGeometry(w, d), mat(ceil), {
    pos: [0, h, 0],
    rot: [Math.PI / 2, 0, 0],
    parent: g,
    shadow: false,
  });
  scene.add(g);
  return g;
}
const glow = (color, intensity = 1) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
function windowOn(g, pos, size, rotY = 0, color = 0x7fa6d6) {
  const w = new THREE.Group();
  w.position.set(...pos);
  w.rotation.y = rotY;
  g.add(w);
  mesh(new THREE.PlaneGeometry(size[0], size[1]), glow(color, 1.0), { parent: w, shadow: false });
  const fr = mat(0xd8d4cc, { roughness: 0.6 });
  box(fr, [0, 0, 0.02], [0.04, size[1], 0.04], w);
  box(fr, [0, 0, 0.02], [size[0], 0.04, 0.04], w);
  box(fr, [0, size[1] / 2, 0.02], [size[0] + 0.1, 0.06, 0.06], w);
  box(fr, [0, -size[1] / 2, 0.04], [size[0] + 0.16, 0.06, 0.12], w);
  return w;
}

// BEDROOM (Noé) — x = 0
{
  const g = room({ x0: 0, wall: 0x141c24, floor: 0x241a14 });
  const wood = mat(0x4a3628, { roughness: 0.6 });
  box(wood, [0, 0.18, 0], [1.3, 0.36, 2.2], g); // bed frame
  box(wood, [0, 0.55, -1.1], [1.36, 1.1, 0.08], g); // headboard
  box(mat(0xe6e2da), [0, 0.42, 0], [1.24, 0.14, 2.08], g); // mattress
  box(mat(0x8095aa, { roughness: 0.95 }), [0, 0.66, 0.45], [1.3, 0.4, 1.3], g); // duvet
  ball(mat(0xf2efe8, { roughness: 0.95 }), [0, 0.56, -0.82], [0.4, 0.09, 0.2], g); // pillow
  box(wood, [-0.95, 0.27, -0.85], [0.45, 0.54, 0.4], g); // nightstand
  const lamp = ball(glow(0xffb36b, 0.5), [-1.05, 0.72, -0.95], [0.09, 0.12, 0.09], g);
  lamp.castShadow = false;
  windowOn(g, [1.5, 1.5, -2.49], [1.1, 1.3], 0, 0x1c2c48);
  // posters
  box(mat(0x5b6f8a), [-2.49, 1.6, 0.3], [0.01, 0.7, 0.5], g);
  box(mat(0x9a4a3c), [-2.49, 1.5, -0.6], [0.01, 0.5, 0.36], g);
  SETS.bed = g;
}
// EMPTY ROOM (Lina's, erased) — x = 20
{
  const g = room({ x0: 20, wall: 0x4a5462, floor: 0x4a3e34, d: 4.4, w: 4.2 });
  // lighter rectangles where posters/furniture stood (clue)
  const ghost = mat(0x6c7684, { roughness: 0.95 });
  box(ghost, [-2.09, 1.55, -0.6], [0.005, 0.8, 0.56], g);
  box(ghost, [-2.09, 1.45, 0.4], [0.005, 0.56, 0.42], g);
  box(ghost, [-0.6, 1.5, -2.19], [0.9, 0.6, 0.005], g);
  box(mat(0x56483c, { roughness: 0.9 }), [-1.1, 0.002, -1.2], [1.0, 0.004, 1.9], g); // floor where the bed stood
  for (const p of [
    [-2.08, 1.95, -0.6],
    [-2.08, 1.73, 0.4],
  ])
    ball(mat(0x777777, { metalness: 0.9, roughness: 0.3 }), p, [0.012, 0.012, 0.012], g);
  windowOn(g, [0.9, 1.5, -2.19], [1.0, 1.3], 0, 0x5a7496);
  // doorway on front wall (z=+2.2) toward a warm hallway
  box(glow(0xd08850, 0.35), [0.2, 1.05, 2.19], [0.9, 2.1, 0.01], g);
  box(mat(0xe8e4dc), [-0.27, 1.05, 2.16], [0.06, 2.12, 0.06], g);
  box(mat(0xe8e4dc), [0.67, 1.05, 2.16], [0.06, 2.12, 0.06], g);
  box(mat(0xe8e4dc), [0.2, 2.12, 2.16], [1.0, 0.06, 0.06], g);
  SETS.empty = g;
}
// KITCHEN — x = 40
{
  const g = room({ x0: 40, wall: 0x2e2824, floor: 0x241c16, w: 6, d: 6 });
  box(mat(0xd9d2c5, { roughness: 0.35 }), [0, 0.92, -0.6], [1.9, 0.06, 0.8], g); // counter top
  box(mat(0x2f3b40, { roughness: 0.7 }), [0, 0.45, -0.6], [1.84, 0.9, 0.74], g); // island
  box(mat(0x384a52, { roughness: 0.6 }), [0, 0.45, -2.7], [4.5, 0.9, 0.6], g); // back cabinets
  box(mat(0x384a52, { roughness: 0.6 }), [0, 1.85, -2.82], [4.5, 0.75, 0.35], g);
  box(mat(0xd9d2c5, { roughness: 0.35 }), [0, 0.92, -2.7], [4.6, 0.05, 0.64], g);
  for (const x of [-0.5, 0.5]) {
    ball(glow(0xffc27a, 0.9), [x, 2.35, -0.6], [0.11, 0.11, 0.11], g).castShadow = false;
    mesh(
      new THREE.ConeGeometry(0.17, 0.18, 32, 1, true),
      mat(0x1c1c1c, { side: THREE.DoubleSide }),
      { pos: [x, 2.45, -0.6], parent: g, shadow: false },
    );
    box(mat(0x111111), [x, 2.62, -0.6], [0.01, 0.2, 0.01], g);
  }
  windowOn(g, [1.6, 1.55, -2.99], [1.2, 1.0], 0, 0x2a3c58);
  // stair banister on the left
  for (let i = 0; i < 7; i++)
    box(mat(0x2e2219), [-2.4, 0.15 + i * 0.32, 1.2 - i * 0.32], [0.9, 0.06, 0.34], g);
  box(mat(0xd8d2c8), [-1.95, 1.4, 0.2], [0.04, 0.04, 2.8], g, [0.75, 0, 0]);
  // doorway right (father enters)
  box(glow(0x6a7a8c, 0.3), [2.99, 1.05, 0.6], [0.01, 2.1, 0.9], g);
  SETS.kitchen = g;
}
// LINA'S ROOM (in the video) — x = 60
const FAIRY = [];
{
  const g = room({ x0: 60, wall: 0x2a1f33, floor: 0x221a1e, w: 4, d: 4 });
  // fairy lights along the back wall (blink irregular = morse clue)
  for (let i = 0; i < 22; i++) {
    const u = i / 21;
    const b = ball(
      glow(0xffc46e, 1.6),
      [-1.6 + u * 3.2, 1.95 - Math.sin(u * Math.PI) * 0.28 + (i % 2) * 0.02, -1.97],
      [0.022, 0.022, 0.022],
      g,
    );
    b.castShadow = false;
    FAIRY.push(b);
  }
  // posters & photos
  box(mat(0x2e6f8a), [-1.0, 1.4, -1.98], [0.5, 0.7, 0.01], g);
  box(mat(0xd3a24a), [0.95, 1.35, -1.98], [0.42, 0.56, 0.01], g);
  box(mat(0xeee4d2), [0.25, 1.15, -1.98], [0.18, 0.13, 0.01], g);
  box(mat(0xeee4d2), [0.45, 1.25, -1.98], [0.14, 0.18, 0.01], g);
  box(mat(0x6b4250, { roughness: 0.95 }), [0, 0.3, -1.3], [1.6, 0.4, 1.3], g); // bed
  ball(mat(0xe7d9e2, { roughness: 1 }), [-0.45, 0.62, -1.75], [0.32, 0.18, 0.14], g);
  ball(mat(0xc49a6c, { roughness: 1 }), [0.55, 0.62, -1.7], [0.13, 0.15, 0.12], g); // plush
  ball(mat(0xc49a6c, { roughness: 1 }), [0.55, 0.8, -1.7], [0.1, 0.1, 0.1], g);
  SETS.lina = g;
}
// FRONT DOOR HALL — x = 80
let DOOR;
{
  const g = room({ x0: 80, wall: 0x2c323a, floor: 0x1e1e20, w: 3, d: 4 });
  DOOR = new THREE.Group();
  DOOR.position.set(0, 0, -1.94);
  g.add(DOOR);
  box(mat(0x5e4130, { roughness: 0.5 }), [0, 1.05, 0], [0.95, 2.1, 0.07], DOOR);
  for (const y of [0.55, 1.45])
    box(mat(0x47321f, { roughness: 0.5 }), [0, y, 0.04], [0.7, 0.6, 0.02], DOOR);
  ball(
    mat(0xc9a75a, { metalness: 1, roughness: 0.25 }),
    [0.36, 1.02, 0.07],
    [0.035, 0.035, 0.035],
    DOOR,
  );
  box(glow(0x9fb8d9, 0.7), [0, 1.75, 0.04], [0.3, 0.18, 0.01], DOOR); // frosted glass
  box(mat(0x20242a), [0, 1.05, -1.985], [1.15, 2.25, 0.03], g);
  // light leaking under the door, with two pairs of feet blocking it
  const strip = new THREE.Group();
  strip.position.set(0, 0.006, -1.9);
  g.add(strip);
  box(glow(0xffd29a, 1.5), [0, 0, 0], [0.95, 0.008, 0.02], strip).castShadow = false;
  for (const x of [-0.24, -0.1, 0.12, 0.26])
    box(mat(0x050505), [x, 0.001, 0.0], [0.07, 0.01, 0.025], strip).castShadow = false;
  box(mat(0x2b2b2b, { roughness: 1 }), [0, 0.005, -1.4], [0.9, 0.01, 0.55], g); // doormat
  SETS.door = g;
}

// ---------- lights ----------

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x5a6e8c, 0x140e0a, 0.12);
scene.add(hemi);
const key = new THREE.SpotLight(0xffffff, 0, 9, 0.42, 0.75, 1.3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0003;
key.shadow.normalBias = 0.02;
key.shadow.radius = 5;
scene.add(key, key.target);
const fill = new THREE.PointLight(0xffffff, 0, 5, 1.6);
scene.add(fill);
const rim = new THREE.SpotLight(0xffffff, 0, 9, 0.5, 0.8, 1.2);
scene.add(rim, rim.target);
const prac = new THREE.PointLight(0xffb070, 0, 6, 1.7);
scene.add(prac);
const phoneL = new THREE.PointLight(0x8ec8ff, 0, 1.8, 1.8);
scene.add(phoneL);
function light(l, color, intensity, pos, target) {
  l.color.set(color);
  l.intensity = intensity;
  l.position.set(...pos);
  if (target && l.target) l.target.position.set(...target);
}
// key/rim/fill placed relative to a face: [side, up, forward] in the character's frame
const _a = new THREE.Vector3();
function lightOn(l, c, color, intensity, rel, aimRel = [0, 0, 0]) {
  const F = faceOf(c);
  c.root.getWorldQuaternion(_qr);
  _a.set(...rel)
    .applyQuaternion(_qr)
    .add(F);
  l.color.set(color);
  l.intensity = intensity;
  l.position.copy(_a);
  if (l.target) {
    _a.set(...aimRel)
      .applyQuaternion(_qr)
      .add(F);
    l.target.position.copy(_a);
  }
}

// ---------- camera ----------
function camAt(p, tg, fov = 30, up = [0, 1, 0]) {
  camera.up.set(...up);
  camera.position.set(...p);
  camera.lookAt(...tg);
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
function camPath(p0, p1, tg0, tg1, u, fov) {
  const k = smooth(u);
  camAt(
    p0.map((v, i) => lerp(v, p1[i], k)),
    tg0.map((v, i) => lerp(v, tg1[i], k)),
    fov,
  );
}
// camera placed relative to a face: d = distance, yaw = orbit (rad, + = towards the character's left), h = height offset
const _cf = new THREE.Vector3();
const _cu = new THREE.Vector3();
function camFace(c, { d = 1.2, yaw = 0, h = 0, look = 0, fov = 22, shake = 0, t = 0, side = 0 }) {
  const F = faceOf(c);
  c.root.getWorldQuaternion(_qr);
  _cf.set(Math.sin(yaw), 0, Math.cos(yaw)).applyQuaternion(_qr);
  _cu.set(0, 1, 0).applyQuaternion(_qr);
  const sx = shake ? noise1(t * 1.7, 21) * shake : 0;
  const sy = shake ? noise1(t * 1.3, 33) * shake : 0;
  const p = F.clone()
    .addScaledVector(_cf, d)
    .addScaledVector(_cu, h + sy);
  const side3 = new THREE.Vector3().crossVectors(_cu, _cf).normalize();
  p.addScaledVector(side3, side + sx);
  const tg = F.clone()
    .addScaledVector(_cu, look)
    .addScaledVector(side3, sx * 0.5);
  camera.up.copy(_cu);
  camera.position.copy(p);
  camera.lookAt(tg);
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

function show(name) {
  for (const k in SETS) SETS[k].visible = k === name;
}
function holdPhone(c, side = "R", { color = 0x9fd3ff, screen = 1, lit = 2.2 } = {}) {
  const F = faceOf(c);
  c.root.getWorldQuaternion(_qr);
  _a.set(0.03, -0.36, 0.3).applyQuaternion(_qr);
  PHONE.g.visible = true;
  PHONE.g.position.copy(F).add(_a);
  PHONE.g.lookAt(F);
  PHONE.scr.color.set(color).multiplyScalar(screen);
  phoneL.color.set(color);
  phoneL.intensity = lit * screen;
  phoneL.position.copy(PHONE.g.position).lerp(F, 0.3);
}

// ---------- shots ----------
const NOE = () => CH.noe;
const LINA = () => CH.lina;
const MERE = () => CH.mere;
const PERE = () => CH.pere;
const DOWN = [1.38, 0.06, 0.08];
const SHOTS = [
  // S1 — 03:17, Noé asleep, the phone buzzing on the nightstand (0 – 4.0); the lock screen is HTML on top
  [
    0,
    4.0,
    (t, u) => {
      show("bed");
      place(NOE(), 0, 0.74, 0.86, 0, -Math.PI / 2);
      pose(NOE(), { t, blink: 1, yaw: 0.35, armL: DOWN, armR: DOWN, breathe: 2 });
      PHONE.g.visible = true;
      PHONE.g.position.set(-0.92, 0.545, -0.8);
      PHONE.g.rotation.set(-Math.PI / 2, 0, 0.3);
      PHONE.g.position.x += t < 3.2 && Math.sin(t * 7) > -0.2 ? Math.sin(t * 90) * 0.004 : 0;
      PHONE.scr.color.set(0xbfe3ff);
      camPath(
        [-0.55, 1.5, 0.15],
        [-0.75, 1.1, -0.35],
        [-0.6, 0.6, -0.8],
        [-0.7, 0.58, -0.82],
        u,
        36,
      );
      light(key, 0x2a4070, 1.6, [1.4, 2.4, -2.0], [0, 0.6, -0.8]);
      light(rim, 0x2a3e66, 3, [1.5, 2, -2.3], [0, 0.5, 0]);
      light(phoneL, 0x9fd3ff, 3.5, [-0.92, 0.7, -0.72]);
    },
  ],
  // S2a — eyes snap open (4.0 – 6.6). Camera straight above the face.
  [
    4.0,
    6.6,
    (t, u) => {
      show("bed");
      place(NOE(), 0, 0.74, 0.86, 0, -Math.PI / 2);
      const wake = ramp(t, 4.3, 4.42);
      const lift = ramp(t, 5.2, 6.4);
      pose(NOE(), {
        t,
        blink: 1 - wake + blinkAt(t, 1) * ramp(t, 5.6, 5.7),
        fear: wake * 0.85,
        wide: wake * 0.3,
        gazeX: lerp(0, -0.5, ramp(t, 4.9, 5.3)),
        gazeY: 0.15,
        yaw: lerp(0.35, -0.1, ramp(t, 4.5, 5.6)),
        pitch: -lift * 0.5,
        armL: DOWN,
        armR: DOWN,
        jawExtra: wake * 0.12 * (1 - lift),
        breathe: 3,
      });
      camFace(NOE(), { d: lerp(0.95, 0.75, u), fov: 24, look: 0.0, h: -0.02 });
      lightOn(key, NOE(), 0x7f9cd0, 2.6, [0.6, 0.3, 1.0]);
      lightOn(rim, NOE(), 0x3a5a90, 5, [-0.6, 0.7, -0.4]);
      light(phoneL, 0x9fd3ff, 3, [-0.92, 0.7, -0.72]);
      PHONE.g.visible = true;
      PHONE.g.position.set(-0.92, 0.545, -0.8);
      PHONE.g.rotation.set(-Math.PI / 2, 0, 0.3);
    },
  ],
  // S2b — sitting on the bed, 37 missed calls (6.6 – 8.4)
  [
    6.6,
    8.4,
    (t, u) => {
      show("bed");
      place(NOE(), 0.05, -0.32, -0.45, 0);
      pose(NOE(), {
        t,
        fear: 0.6,
        browIn: 0.4,
        gazeY: -0.55,
        pitch: 0.38,
        lean: 0.12,
        armL: DOWN,
        armR: DOWN,
        blink: blinkAt(t, 2),
        breathe: 3,
      });
      holdPhone(NOE(), "R", { color: 0xbfe3ff, lit: 0.55 });
      camFace(NOE(), { d: lerp(1.25, 1.05, u), fov: 24, h: -0.05, look: -0.04 });
      lightOn(key, NOE(), 0x7f9cc8, 3, [-0.6, 0.5, 0.8]);
      lightOn(rim, NOE(), 0x2f4f86, 6, [0.7, 0.6, -0.8]);
    },
  ],
  // S2c — the empty room: "Lina ?" (8.4 – 11.0)
  [
    8.4,
    11.0,
    (t, u) => {
      show("empty");
      const walk = ramp(t, 8.45, 9.3);
      place(NOE(), 20.2, 0, lerp(2.05, 1.5, walk), Math.PI);
      const sp = speech("noe", t);
      pose(NOE(), {
        t,
        fear: 0.7,
        browIn: 0.5,
        speech: sp,
        gazeX: lerp(0, 0.45, ramp(t, 9.9, 10.5)),
        yaw: lerp(0, 0.35, ramp(t, 9.9, 10.6)),
        armL: DOWN,
        armR: DOWN,
        blink: blinkAt(t, 3),
      });
      camPath([19.55, 1.45, -1.3], [19.65, 1.5, -0.8], [20.2, 1.4, 1.6], [20.2, 1.6, 1.5], u, 34);
      lightOn(key, NOE(), 0x8aa6cc, 7, [-0.9, 0.5, 1.3]);
      lightOn(rim, NOE(), 0xc07840, 7, [0.2, 0.5, -1.0]);
      light(prac, 0x5a7496, 1.2, [20.9, 1.6, -1.8]);
    },
  ],
  // S2d — kitchen, over Noé's shoulder: "Maman ! Elle est où, Lina ?" (11.0 – 13.5)
  [
    11.0,
    13.5,
    (t, u) => {
      show("kitchen");
      place(MERE(), 40.05, 0, -1.25, 0);
      place(NOE(), 40.3, 0, 0.8, Math.PI + 0.1);
      pose(MERE(), {
        t,
        gazeX: -0.1,
        gazeY: 0.05,
        blink: blinkAt(t, 4),
        smile: 0.08,
        armL: DOWN,
        armR: DOWN,
      });
      MUG.visible = true;
      MUG.position.set(MERE().root.position.x + 0.12, 1.0, -0.82);
      pose(NOE(), { t, fear: 0.8, speech: speech("noe", t), pitch: -0.05, armL: DOWN, armR: DOWN });
      camPath(
        [40.62, 1.78, 1.85],
        [40.56, 1.74, 1.65],
        [40.05, 1.6, -1.2],
        [40.05, 1.62, -1.2],
        u,
        28,
      );
      lightOn(key, MERE(), 0xffc890, 6, [0.6, 0.6, 0.9]);
      lightOn(rim, MERE(), 0x4a6a9a, 5, [-0.8, 0.6, -0.8]);
      light(prac, 0xffb070, 2.2, [40, 1.85, -0.6]);
      lightOn(fill, NOE(), 0x405a80, 1.2, [0.3, 0.3, -0.6]);
    },
  ],
  // S2e — the mother, calm, too calm: "De qui tu parles ?" (13.5 – 15.7)
  [
    13.5,
    15.7,
    (t, u) => {
      show("kitchen");
      place(MERE(), 40.05, 0, -1.25, 0);
      pose(MERE(), {
        t,
        speech: speech("mere", t),
        smile: 0.22,
        browIn: 0.15,
        roll: 0.06,
        yaw: 0.04,
        blink: blinkAt(t, 5) * (t < 15 ? 1 : 0),
        gazeY: 0.02,
        armL: DOWN,
        armR: DOWN,
      });
      MUG.visible = true;
      MUG.position.set(MERE().root.position.x + 0.12, 1.0, -0.82);
      camFace(MERE(), { d: lerp(1.15, 1.0, u), fov: 22, h: 0.0, look: -0.03, yaw: -0.08 });
      lightOn(key, MERE(), 0xffc890, 7, [0.7, 0.45, 1.0]);
      lightOn(fill, MERE(), 0x405a80, 0.8, [-0.8, 0.0, 0.6]);
      lightOn(rim, MERE(), 0x4a6a9a, 6, [-0.7, 0.6, -0.9]);
      light(prac, 0xffb070, 1.5, [40, 1.85, -0.6]);
    },
  ],
  // S3a — Noé holds out his phone: the photo (15.7 – 19.6)
  [
    15.7,
    19.6,
    (t, u) => {
      show("kitchen");
      place(NOE(), 40.2, 0, 0.65, Math.PI);
      pose(NOE(), {
        t,
        fear: 0.75,
        browIn: 0.5,
        speech: speech("noe", t),
        pitch: 0.02,
        armR: DOWN,
        armL: DOWN,
        blink: blinkAt(t, 6),
      });
      camFace(NOE(), { d: lerp(1.2, 1.05, u), fov: 22, h: 0.02, look: -0.03, yaw: 0.12 });
      lightOn(key, NOE(), 0xffc890, 5, [-0.6, 0.5, 1.0]);
      lightOn(rim, NOE(), 0x4a6a9a, 6, [0.7, 0.6, -0.9]);
      light(prac, 0xffb070, 1.5, [40, 1.85, -0.6]);
    },
  ],
  // S3b — Noé alone in the frame, lost (19.6 – 22.1)
  [
    19.6,
    22.1,
    (t, u) => {
      show("kitchen");
      place(NOE(), 40.2, 0, 0.65, Math.PI);
      const dart = noise1(t * 2.4, 5) * 0.55 * ramp(t, 19.7, 20.0);
      pose(NOE(), {
        t,
        fear: 0.9,
        browIn: 0.6,
        speech: speech("noe", t),
        gazeX: dart,
        gazeY: -0.05,
        yaw: dart * 0.15,
        armR: DOWN,
        armL: DOWN,
        blink: blinkAt(t, 7),
        breathe: 3,
      });
      camFace(NOE(), { d: lerp(0.85, 0.75, u), fov: 22, look: -0.01 });
      lightOn(key, NOE(), 0xffc890, 5, [-0.6, 0.45, 1.0]);
      lightOn(rim, NOE(), 0x4a6a9a, 6, [0.7, 0.6, -0.9]);
    },
  ],
  // S3c — the father, rubbing his eyes: "Noé… Tu es fils unique." (22.1 – 25.2)
  [
    22.1,
    25.2,
    (t, u) => {
      show("kitchen");
      const enter = ramp(t, 22.1, 22.8);
      place(PERE(), lerp(40.95, 40.45, enter), 0, -0.95, -0.35);
      place(MERE(), 39.97, 0, -1.2, 0.3);

      pose(PERE(), {
        t,
        speech: speech("pere", t),
        browIn: 0.55,
        sad: 0.25,
        squint: 0.2,
        blink: blinkAt(t, 8),
        roll: -0.05,
        armR: DOWN,
        armL: DOWN,
      });
      pose(MERE(), {
        t,
        smile: 0.1,
        gazeX: 0.25,
        yaw: 0.25,
        blink: blinkAt(t, 9),
        armL: DOWN,
        armR: DOWN,
      });
      MUG.visible = true;
      MUG.position.set(MERE().root.position.x + 0.12, 1.0, -0.82);
      camPath(
        [40.2, 1.68, 1.05],
        [40.22, 1.68, 0.85],
        [40.25, 1.6, -1.05],
        [40.27, 1.62, -1.05],
        u,
        30,
      );
      lightOn(key, PERE(), 0xffc890, 6, [0.4, 0.6, 1.0]);
      lightOn(fill, MERE(), 0xffc890, 1.6, [0.3, 0.3, 0.9]);
      lightOn(rim, PERE(), 0x4a6a9a, 6, [-0.6, 0.6, -0.9]);
      light(prac, 0xffb070, 2.2, [40, 1.85, -0.6]);
    },
  ],
  // S3d — silence; Noé backs away (25.2 – 27.6)
  [
    25.2,
    27.6,
    (t, u) => {
      show("kitchen");
      const back = ramp(t, 25.3, 27.4);
      place(NOE(), 40.2, 0, 0.65 + back * 0.35, Math.PI);
      pose(NOE(), {
        t,
        fear: 0.95,
        sad: 0.3,
        browIn: 0.6,
        gazeY: -0.15 * back,
        pitch: 0.08 * back,
        armL: DOWN,
        armR: DOWN,
        blink: blinkAt(t, 10),
        breathe: 4,
        tremble: 0.6,
      });
      camFace(NOE(), { d: lerp(0.7, 1.1, u), fov: 22, look: -0.01 });
      lightOn(key, NOE(), 0xffc890, 4.2, [-0.6, 0.45, 1.0]);
      lightOn(rim, NOE(), 0x4a6a9a, 6, [0.7, 0.6, -0.9]);
    },
  ],
  // S3e — the phone buzzes: "REGARDE LA VIDÉO." (27.6 – 30.0)
  [
    27.6,
    30.0,
    (t, u) => {
      show("kitchen");
      place(NOE(), 40.2, 0, 1.0, Math.PI);
      pose(NOE(), {
        t,
        fear: 0.7,
        browIn: 0.5,
        gazeY: -0.55,
        pitch: 0.35,
        lean: 0.08,
        armL: DOWN,
        armR: DOWN,
        blink: blinkAt(t, 11),
      });
      holdPhone(NOE(), "R", { color: 0xbfe3ff, lit: 0.6, screen: 0.5 + 0.5 * ramp(t, 27.7, 27.9) });
      camFace(NOE(), { d: lerp(0.9, 0.75, u), fov: 24, h: -0.08, look: -0.04 });
      lightOn(key, NOE(), 0xffc890, 1.6, [-0.7, 0.6, 0.8]);
      lightOn(rim, NOE(), 0x4a6a9a, 6, [0.7, 0.6, -0.9]);
    },
  ],
  // S4 — Lina's video, framed by the phone (30.0 – 44.0)
  [
    30.0,
    44.0,
    (t) => {
      show("lina");
      place(LINA(), 60.0, 0.0, -1.2, 0);
      const look = ramp(t, 39.3, 39.75) * (1 - ramp(t, 40.4, 40.85));
      pose(LINA(), {
        t,
        speech: speech("lina", t),
        sad: 0.85,
        browIn: 0.6,
        fear: 0.25 + look * 0.6,
        squint: 0.15,
        gazeX: lerp(0, 0.85, look),
        yaw: lerp(0, 0.9, look),
        pitch: -0.02,
        tremble: 1,
        blink: blinkAt(t, 12) * (1 - look),
        armL: DOWN,
        armR: DOWN,
        breathe: 3,
      });
      camFace(LINA(), { d: 0.62, fov: 30, h: 0.01, look: -0.03, shake: 0.01, t });
      lightOn(key, LINA(), 0xb8d0ff, 4.2, [0.05, -0.05, 0.6]);
      lightOn(rim, LINA(), 0xffa850, 8, [0.6, 0.6, -0.9]);
      lightOn(fill, LINA(), 0xffa850, 0.6, [-0.7, 0.3, 0.2]);
      light(prac, 0xffa850, 1.6, [60, 1.9, -1.8]);
      const MORSE = "1110111000101110001011101000111011101000100000000";
      const k = Math.floor(t * 4) % MORSE.length;
      const on = MORSE[k] === "1" ? 1 : 0.2;
      FAIRY.forEach((b) => b.material.color.setRGB(1.6 * on, 1.1 * on, 0.55 * on));
    },
  ],
  // S4b — the front door: three knocks (44.0 – 46.4)
  [
    44.0,
    46.4,
    (t, u) => {
      show("door");
      let shake = 0;
      for (const k of [44.25, 44.85, 45.45])
        if (t >= k && t < k + 0.22)
          shake = Math.sin(((t - k) / 0.22) * Math.PI * 4) * (1 - (t - k) / 0.22);
      DOOR.position.z = -1.94 + shake * 0.014;
      DOOR.rotation.z = shake * 0.004;
      camPath(
        [80.25, 0.45, 1.85],
        [80.18, 0.55, 1.25],
        [80.0, 1.0, -1.9],
        [80.0, 1.05, -1.9],
        u,
        40,
      );
      light(key, 0x4a6088, 5, [80.7, 2.4, 0.6], [80, 1.0, -1.9]);
      light(rim, 0xffc98a, 2.5, [80, 0.05, -2.2], [80, 0.0, -1.0]);
      light(prac, 0xffb070, 2.2 + shake * 3, [80, 0.06, -1.75]);
    },
  ],
  // S5a — Noé, frozen; his mother is standing right behind him (46.4 – 48.6)
  [
    46.4,
    48.6,
    (t, u) => {
      show("kitchen");
      place(NOE(), 40.2, 0, 1.0, Math.PI);
      place(MERE(), 40.32, 0, 1.55, Math.PI);
      const turn = ramp(t, 47.2, 48.4);
      pose(NOE(), {
        t,
        fear: 1,
        wide: 0.3,
        gazeX: lerp(0, -0.8, turn),
        yaw: lerp(0, -0.85, turn),
        armL: DOWN,
        armR: DOWN,
        blink: 0,
        breathe: 4,
        tremble: 0.5,
      });
      pose(MERE(), {
        t,
        smile: 0.12,
        browIn: 0.35,
        gazeX: 0.05,
        gazeY: -0.05,
        roll: -0.08,
        pitch: 0.06,
        armL: DOWN,
        armR: DOWN,
        blink: 0,
      });
      camFace(NOE(), { d: lerp(1.1, 0.95, u), fov: 24, side: -0.06, look: 0.0 });
      lightOn(key, NOE(), 0xffc890, 3.6, [-0.6, 0.45, 1.0]);
      lightOn(rim, NOE(), 0x4a6a9a, 5, [0.7, 0.6, -0.9]);
      lightOn(fill, MERE(), 0x8aa0c8, 2.2 * ramp(t, 46.6, 47.6), [0.3, 0.2, 0.7]);
    },
  ],
  // S5b — the mother whispers (48.6 – 52.3)
  [
    48.6,
    52.3,
    (t, u) => {
      show("kitchen");
      place(MERE(), 40.32, 0, 1.55, Math.PI);
      pose(MERE(), {
        t,
        speech: speech("mere", t),
        smile: 0.18,
        browIn: 0.45,
        sad: 0.2,
        roll: -0.1,
        pitch: 0.1,
        gazeY: -0.05,
        blink: blinkAt(t, 14) * 0.8,
        armL: DOWN,
        armR: DOWN,
      });
      camFace(MERE(), { d: lerp(0.95, 0.72, u), fov: 22, look: -0.02, yaw: 0.1 });
      lightOn(key, MERE(), 0xffbe80, 4.5, [-0.9, 0.2, 0.7]);
      lightOn(rim, MERE(), 0x4a6a9a, 7, [0.7, 0.6, -0.9]);
    },
  ],
  // S5c — extreme close-up on Noé; the phone lights up (52.3 – 54.0)
  [
    52.3,
    54.0,
    (t, u) => {
      show("kitchen");
      place(NOE(), 40.2, 0, 1.0, 0);
      const ph = ramp(t, 52.65, 52.75);
      pose(NOE(), {
        t,
        fear: 1,
        wide: 0.4,
        gazeY: lerp(0, -0.55, ramp(t, 52.8, 53.1)),
        pitch: lerp(0, 0.18, ramp(t, 52.8, 53.2)),
        armL: DOWN,
        armR: DOWN,
        blink: 0,
        tremble: 0.6,
      });
      camFace(NOE(), { d: lerp(0.85, 0.72, u), fov: 22, look: -0.02 });
      lightOn(key, NOE(), 0xffbe80, 2.6, [0.8, 0.4, 0.8]);
      lightOn(fill, NOE(), 0x9fd3ff, 0.7 * ph, [0.0, -0.45, 0.6]);
      lightOn(rim, NOE(), 0x4a6a9a, 5, [-0.7, 0.6, -0.9]);
    },
  ],
  // S6 — black, then the door in the dark under the vote (54.0 – 60.0)
  [
    54.0,
    60.01,
    (t, u) => {
      show("door");
      DOOR.position.z = -1.94;
      camPath([80.0, 1.1, 1.9], [80.0, 1.05, 1.5], [80.0, 1.05, -1.9], [80.0, 1.0, -1.9], u, 40);
      light(key, 0x4a6088, 2.5, [80.7, 2.4, 0.6], [80, 1.0, -1.9]);
      light(rim, 0xffc98a, 1.6, [80, 0.05, -2.2], [80, 0.0, -1.0]);
      light(prac, 0xffb070, 1.6, [80, 0.06, -1.75]);
    },
  ],
];

function resetFrame() {
  for (const c of CAST) c.root.visible = false;
  PHONE.g.visible = false;
  MUG.visible = false;
  for (const l of [key, fill, rim, prac, phoneL]) l.intensity = 0;
  camera.up.set(0, 1, 0);
}

let ready = false;
export function renderAt(t) {
  if (!ready) return;
  resetFrame();
  let shot = SHOTS[0];
  for (const s of SHOTS) if (t >= s[0]) shot = s;
  const u = clamp((t - shot[0]) / (shot[1] - shot[0]));
  shot[2](t, u);
  renderer.render(scene, camera);
}

// the photo on Noé's phone: "both" (the memory) and "alone" (the rewritten one)
function snapshotPhotos() {
  const out = {};
  const pw = 580;
  const ph = 773;
  renderer.setSize(pw, ph, false);
  scene.fog.density = 0.02;
  for (const both of [true, false]) {
    resetFrame();
    show("lina");
    place(NOE(), 59.86, 0, -1.0, 0.2);
    pose(NOE(), { t: 0, smile: 0.9, gazeX: 0.05, roll: 0.12, yaw: 0.1, armL: DOWN, armR: DOWN });
    if (both) {
      place(LINA(), 60.18, 0.05, -1.0, -0.22);
      pose(LINA(), {
        t: 0,
        smile: 1,
        cheek: 0.5,
        gazeX: -0.05,
        roll: -0.16,
        yaw: -0.1,
        armL: DOWN,
        armR: DOWN,
      });
    }
    camera.aspect = pw / ph;
    camAt([60.02, 1.62, 0.15], [60.02, 1.56, -1.0], 30);
    light(key, 0xffe0c0, 9, [60.3, 1.9, 0.2], [60.0, 1.55, -1.0]);
    light(fill, 0xc8dcff, 2.5, [59.4, 1.5, -0.2]);
    light(rim, 0xffb36b, 8, [60.6, 2.1, -1.9], [60.0, 1.55, -1.0]);
    light(prac, 0xffb36b, 2.5, [60, 1.9, -1.8]);
    FAIRY.forEach((b) => b.material.color.setRGB(1.6, 1.15, 0.65));
    renderer.render(scene, camera);
    out[both ? "both" : "alone"] = canvas.toDataURL("image/jpeg", 0.9);
  }
  scene.fog.density = 0.16;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  return out;
}

async function build() {
  const keys = ["noe", "lina", "mere", "pere"];
  const loaded = await Promise.all(keys.map(loadCharacter));
  keys.forEach((k, i) => {
    CH[k] = loaded[i];
    CAST.push(loaded[i]);
  });
  window.__absentsDebug = { bones: CH.noe.boneNames, morphs: Object.keys(CH.noe.morph).length };
  window.__absents = { THREE, scene, camera, CH, renderer, renderAt: (t) => renderAt(t), faceOf };
  for (const s of SHOTS) {
    resetFrame();
    s[2](s[0] + 0.01, 0);
    await renderer.compileAsync(scene, camera);
  }
  const photos = snapshotPhotos();
  const a = document.getElementById("photo-both");
  const b = document.getElementById("photo-alone");
  if (a) a.src = photos.both;
  if (b) b.src = photos.alone;
  await Promise.all(
    [a, b].filter(Boolean).map((img) => (img.decode ? img.decode().catch(() => {}) : null)),
  );
  ready = true;
  renderAt(window.__hfLastT || 0);
}

window.addEventListener("hf-seek", (e) => {
  window.__hfLastT = e.detail.time;
  renderAt(e.detail.time);
});
window.__absentsBuild(build());
