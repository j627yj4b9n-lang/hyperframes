/* « Après le silence » — shared deterministic drawing kit (canvas 2D).
   Every function draws from its arguments only: same t, same frame. */
(function () {
  const W = 1080;
  const H = 1920;
  const N = { W, H };

  N.hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  N.h2 = (a, b) => N.hash(a * 57.13 + b * 913.71);
  N.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  N.lerp = (a, b, k) => a + (b - a) * k;
  N.smooth = (e0, e1, x) => {
    const k = N.clamp((x - e0) / (e1 - e0));
    return k * k * (3 - 2 * k);
  };
  /* Smooth pseudo-noise for handheld drift. */
  N.wob = (t, s = 0) =>
    Math.sin(t * 1.31 + s) * 0.5 + Math.sin(t * 2.17 + s * 2.3) * 0.3 + Math.sin(t * 3.71 + s * 3.7) * 0.2;
  N.rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  N.mix = (c1, c2, k) => [0, 1, 2].map((i) => Math.round(N.lerp(c1[i], c2[i], k)));

  N.glow = (ctx, x, y, r, c, a) => {
    if (r <= 0 || a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, N.rgba(c, a));
    g.addColorStop(0.25, N.rgba(c, a * 0.45));
    g.addColorStop(1, N.rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  /* Falling rain streaks. */
  N.rain = (ctx, t, o) => {
    const { count = 260, len = 60, angle = 0.12, speed = 2600, alpha = 0.18, width = 1.2, seed = 1 } = o;
    const w = o.w || W;
    const h = o.h || H;
    const c = o.color || [190, 200, 215];
    ctx.save();
    ctx.lineCap = "round";
    const sa = Math.sin(angle);
    const ca = Math.cos(angle);
    for (let i = 0; i < count; i++) {
      const r1 = N.hash(i * 3.1 + seed);
      const r2 = N.hash(i * 7.7 + seed * 2);
      const r3 = N.hash(i * 1.9 + seed * 3);
      const sp = speed * (0.7 + 0.6 * r3);
      const L = len * (0.6 + 0.8 * r3);
      const span = h + L * 2;
      const y = ((r2 * span + t * sp) % span) - L;
      const x = r1 * (w + 300) - 150 + y * Math.tan(angle);
      ctx.strokeStyle = N.rgba(c, alpha * (0.4 + 0.6 * r1));
      ctx.lineWidth = width * (0.6 + r3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + L * sa, y + L * ca);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------- Scene 1: Haussmann boulevard at night ---------- */
  N.drawCity = (ctx, t) => {
    const camH = 10;
    const f = 1000;
    const vpx = 540 + N.wob(t * 0.4, 1) * 6;
    const vpy = 690 + N.wob(t * 0.3, 2) * 4;
    const camZ = t * 2.2;
    const P = (X, Y, Z) => {
      const z = Z - camZ;
      return [vpx + (f * X) / z, vpy + (f * (camH - Y)) / z, z];
    };
    const fogC = [46, 36, 30];
    const fogK = (z) => 1 - Math.exp(-z / 170);

    // sky: low clouds lit by sodium light pollution
    let g = ctx.createLinearGradient(0, 0, 0, vpy + 40);
    g.addColorStop(0, "#07090d");
    g.addColorStop(0.55, "#141519");
    g.addColorStop(1, "#3a2a20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, vpy + 40);
    for (let i = 0; i < 9; i++) {
      const cx = ((N.hash(i + 4) * 1400 + t * 6 * (1 + N.hash(i))) % 1500) - 200;
      const cy = vpy - 120 - N.hash(i + 9) * 380;
      ctx.save();
      ctx.globalAlpha = 0.18;
      N.glow(ctx, cx, cy, 260 + N.hash(i + 2) * 200, [70, 58, 52], 0.5);
      ctx.restore();
    }

    // ground
    g = ctx.createLinearGradient(0, vpy, 0, H);
    g.addColorStop(0, "#1c1714");
    g.addColorStop(0.08, "#0d0c0c");
    g.addColorStop(1, "#060607");
    ctx.fillStyle = g;
    ctx.fillRect(0, vpy, W, H - vpy);

    // sidewalks
    for (const s of [-1, 1]) {
      const a = P(s * 8, 0, camZ + 2.5);
      const b = P(s * 11, 0, camZ + 2.5);
      const c = P(s * 11, 0, 460);
      const d = P(s * 8, 0, 460);
      ctx.fillStyle = "#121112";
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.fill();
    }
    ctx.restore();
    // centre dashes, wet and faint
    for (let z0 = Math.floor(camZ / 12) * 12; z0 < 300; z0 += 12) {
      if (z0 - camZ < 3) continue;
      const a = P(-0.12, 0, z0);
      const b = P(0.12, 0, z0);
      const c = P(0.12, 0, z0 + 4);
      const d = P(-0.12, 0, z0 + 4);
      ctx.fillStyle = N.rgba([150, 140, 125], 0.22 * (1 - fogK(a[2])));
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.fill();
    }

    // end of the boulevard
    {
      const a = P(-11, 0, 440);
      const b = P(11, 24, 440);
      ctx.fillStyle = N.rgba(N.mix([24, 21, 19], fogC, 0.85), 1);
      ctx.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
    }

    // facades, far to near
    const blocks = [];
    for (const s of [-1, 1]) {
      let z = 4;
      let k = 0;
      while (z < 440) {
        const len = 16 + N.h2(k, s + 5) * 14;
        blocks.push({ s, z0: z, z1: z + len, k });
        z += len;
        k++;
      }
    }
    blocks.sort((a, b) => b.z0 - a.z0);
    const quad = (pts, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fill();
    };
    for (const bl of blocks) {
      const { s, k } = bl;
      const z0 = Math.max(bl.z0, camZ + 1.2);
      const z1 = bl.z1;
      if (z1 <= z0) continue;
      const X = s * 11;
      const floors = 5 + Math.floor(N.h2(k, s) * 2);
      const Hb = 4 + floors * 3.1;
      const fz = fogK((z0 + z1) / 2 - camZ);
      const tone = 18 + N.h2(k, s + 9) * 10;
      const base = N.mix([tone + 6, tone + 2, tone - 2], fogC, fz * 0.92);
      quad([P(X, 0, z0), P(X, 0, z1), P(X, Hb, z1), P(X, Hb, z0)], N.rgba(base, 1));
      // zinc mansard roof
      const roof = N.mix([16, 17, 20], fogC, fz * 0.9);
      quad([P(X, Hb, z0), P(X, Hb, z1), P(X - s * 2.2, Hb + 3.6, z1), P(X - s * 2.2, Hb + 3.6, z0)], N.rgba(roof, 1));
      // chimneys
      for (let c = 0; c < 2; c++) {
        const cz = N.lerp(bl.z0, bl.z1, 0.25 + c * 0.45);
        if (cz < z0) continue;
        quad(
          [P(X - s * 1.4, Hb + 3.2, cz), P(X - s * 1.4, Hb + 5.2, cz), P(X - s * 1.4, Hb + 5.2, cz + 1.2), P(X - s * 1.4, Hb + 3.2, cz + 1.2)],
          N.rgba(N.mix([22, 18, 16], fogC, fz * 0.9), 1),
        );
      }
      // balconies (Haussmann 2nd + 5th floor lines)
      for (const fl of [2, 5]) {
        if (fl > floors) continue;
        const y = 4 + (fl - 1) * 3.1 - 0.15;
        const a = P(X, y, z0);
        const b = P(X, y, z1);
        ctx.strokeStyle = N.rgba(N.mix([8, 8, 9], fogC, fz * 0.8), 0.9);
        ctx.lineWidth = Math.max(1, 220 / a[2]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      // windows
      for (let fl = 0; fl <= floors; fl++) {
        const y0 = fl === 0 ? 0.4 : 4 + (fl - 1) * 3.1 + 0.6;
        const wh = fl === 0 ? 3 : 1.9;
        for (let wz = bl.z0 + 1.2; wz < bl.z1 - 1.6; wz += 2.8) {
          const z = wz;
          if (z < camZ + 1.4) continue;
          const zz = z - camZ;
          const r = N.h2(k * 31 + fl, wz * 1.7 + s * 99);
          let col;
          if (fl === 0) {
            col = N.mix([12, 12, 13], fogC, fogK(zz) * 0.85); // shutters
          } else if (r > 0.93) {
            const warm = N.h2(wz, fl) > 0.3;
            const flick = warm ? 1 : 0.75 + 0.25 * Math.sin(t * 9 + r * 40);
            col = warm ? [255, 178, 92] : [120, 150, 230];
            col = N.mix(col.map((v) => v * flick), fogC, fogK(zz) * 0.7);
          } else {
            col = N.mix([7, 8, 10], fogC, fogK(zz) * 0.85);
          }
          quad([P(X, y0, z), P(X, y0, z + 1.3), P(X, y0 + wh, z + 1.3), P(X, y0 + wh, z)], N.rgba(col, 1));
          if (fl > 0 && r > 0.93) {
            const c = P(X, y0 + wh / 2, z + 0.65);
            N.glow(ctx, c[0], c[1], 900 / c[2], col, 0.25);
          }
        }
      }
    }

    // pharmacy cross (left side) — flickering green
    {
      const c = P(-10.6, 3.6, 64);
      if (c[2] > 2) {
        const on = 0.75 + 0.25 * Math.sin(t * 13) * (N.hash(Math.floor(t * 8)) > 0.2 ? 1 : -1);
        const u = 900 / c[2];
        N.glow(ctx, c[0], c[1], u * 3.5, [40, 255, 120], 0.35 * on);
        ctx.fillStyle = N.rgba([90, 255, 160], 0.9 * on);
        ctx.fillRect(c[0] - u * 0.18, c[1] - u * 0.5, u * 0.36, u);
        ctx.fillRect(c[0] - u * 0.5, c[1] - u * 0.18, u, u * 0.36);
      }
    }

    // street lamps: pools, reflections, glows
    const lamps = [];
    for (const s of [-1, 1]) for (let z = 10 + (s > 0 ? 12 : 0); z < 420; z += 26) lamps.push({ s, z });
    lamps.sort((a, b) => b.z - a.z);
    for (const L of lamps) {
      const zz = L.z - camZ;
      if (zz < 2) continue;
      const X = L.s * 8.4;
      const head = P(X - L.s * 0.6, 6.4, L.z);
      const foot = P(X, 0, L.z);
      const fade = 1 - fogK(zz) * 0.75;
      const sod = [255, 168, 84];
      // pool of light on the asphalt
      const pool = P(X - L.s * 2.5, 0, L.z);
      ctx.save();
      ctx.translate(pool[0], pool[1]);
      ctx.scale(1, 0.28);
      N.glow(ctx, 0, 0, 5200 / zz, sod, 0.16 * fade);
      ctx.restore();
      // wet reflection streak
      const refl = P(X - L.s * 0.6, -6.4, L.z);
      const rw = Math.max(1.5, 380 / zz);
      const rg = ctx.createLinearGradient(0, foot[1], 0, refl[1]);
      rg.addColorStop(0, N.rgba(sod, 0.0));
      rg.addColorStop(0.2, N.rgba(sod, 0.22 * fade));
      rg.addColorStop(1, N.rgba(sod, 0));
      ctx.fillStyle = rg;
      for (let j = 0; j < 4; j++) {
        const jx = Math.sin(t * 3 + j * 1.7 + L.z) * rw * 0.6;
        ctx.fillRect(refl[0] - rw / 2 + jx, foot[1], rw * (0.5 + 0.2 * j), refl[1] - foot[1]);
      }
      // pole
      ctx.strokeStyle = N.rgba(N.mix([10, 10, 10], fogC, fogK(zz) * 0.8), 1);
      ctx.lineWidth = Math.max(1, 160 / zz);
      ctx.beginPath();
      ctx.moveTo(foot[0], foot[1]);
      ctx.lineTo(P(X, 6.4, L.z)[0], P(X, 6.4, L.z)[1]);
      ctx.lineTo(head[0], head[1]);
      ctx.stroke();
      N.glow(ctx, head[0], head[1], 2600 / zz, sod, 0.5 * fade);
      N.glow(ctx, head[0], head[1], 500 / zz, [255, 230, 190], 0.9 * fade);
    }

    // horizon haze
    g = ctx.createLinearGradient(0, vpy - 260, 0, vpy + 160);
    g.addColorStop(0, N.rgba(fogC, 0));
    g.addColorStop(0.6, N.rgba([70, 52, 40], 0.35));
    g.addColorStop(1, N.rgba(fogC, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, vpy - 260, W, 420);

    N.rain(ctx, t, { count: 320, len: 44, alpha: 0.12, speed: 2200, seed: 3, width: 1 });
    N.rain(ctx, t, { count: 70, len: 130, alpha: 0.1, speed: 3400, seed: 8, width: 2.2 });
  };

  /* ---------- The young man, seen from behind (head + shoulders) ---------- */
  N.drawMan = (ctx, x, y, u, o = {}) => {
    const look = o.look || 0; // 0 = head down at the phone, 1 = head raised
    const glowC = o.glowC || [120, 160, 255];
    const glowA = o.glowA == null ? 0.7 : o.glowA;
    ctx.save();
    ctx.translate(x, y);
    const headY = -1.55 * u + look * -0.25 * u;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-1.55 * u, 1.6 * u);
      ctx.bezierCurveTo(-1.5 * u, 0.3 * u, -1.2 * u, -0.25 * u, -0.45 * u, -0.45 * u);
      ctx.lineTo(-0.28 * u, -0.95 * u);
      ctx.lineTo(0.28 * u, -0.95 * u);
      ctx.lineTo(0.45 * u, -0.45 * u);
      ctx.bezierCurveTo(1.2 * u, -0.25 * u, 1.5 * u, 0.3 * u, 1.55 * u, 1.6 * u);
      ctx.closePath();
      ctx.fill();
      // head with irregular hair outline
      ctx.beginPath();
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const hair = Math.sin(a) < 0.2 ? 1 + 0.05 * N.hash(i * 3.3) : 1;
        const px = Math.cos(a) * 0.49 * u * hair * (Math.abs(Math.sin(a)) < 0.25 ? 1.06 : 1);
        const py = headY + Math.sin(a) * 0.63 * u * hair;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
    };
    // light spilling around the silhouette
    ctx.shadowColor = N.rgba(glowC, glowA);
    ctx.shadowBlur = 0.45 * u;
    ctx.shadowOffsetY = -0.12 * u;
    ctx.fillStyle = "#040507";
    body();
    ctx.shadowBlur = 0.12 * u;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = N.rgba(glowC, glowA * 0.7);
    body();
    ctx.shadowBlur = 0;
    // hoodie seam and ear edge catching light
    ctx.strokeStyle = N.rgba(glowC, glowA * 0.25);
    ctx.lineWidth = 0.03 * u;
    ctx.beginPath();
    ctx.moveTo(-0.5 * u, -0.42 * u);
    ctx.quadraticCurveTo(0, -0.1 * u, 0.5 * u, -0.42 * u);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- The apartment (wide, from behind the couch) ---------- */
  N.drawRoom = (ctx, t, o = {}) => {
    const lamp = o.lamp == null ? 1 : o.lamp; // floor lamp on/off
    const phone = o.phone == null ? 1 : o.phone; // phone glow in his hands
    const push = o.push || 0;
    const look = o.look || 0;
    const rise = o.rise || 0;
    ctx.save();
    const sc = 1 + push * 0.12;
    ctx.translate(540 + N.wob(t * 0.5, 4) * 5, 960 + N.wob(t * 0.45, 7) * 4);
    ctx.scale(sc, sc);
    ctx.translate(-540, -960);
    // walls
    ctx.fillStyle = N.rgba(N.mix([6, 7, 9], [30, 22, 16], lamp * 0.6), 1);
    ctx.fillRect(-100, -100, W + 200, H + 200);
    // window (right)
    const wx = 610;
    const wy = 300;
    const ww = 380;
    const wh = 860;
    const out = ctx.createLinearGradient(0, wy, 0, wy + wh);
    out.addColorStop(0, "#0b1018");
    out.addColorStop(0.7, "#1a1c22");
    out.addColorStop(1, "#2a2019");
    ctx.fillStyle = out;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    for (let i = 0; i < 26; i++) {
      const bx = wx + N.hash(i + 1) * ww;
      const by = wy + wh * (0.35 + N.hash(i + 30) * 0.65);
      const warm = N.hash(i + 60) > 0.35;
      N.glow(ctx, bx, by, 18 + N.hash(i + 5) * 40, warm ? [255, 170, 90] : [170, 190, 255], 0.35);
    }
    N.rain(ctx, t, { count: 60, len: 40, alpha: 0.1, speed: 1400, seed: 21, w: ww, h: wh + 200 });
    ctx.restore();
    // window mullions + sill
    ctx.fillStyle = "#050506";
    ctx.fillRect(wx + ww / 2 - 9, wy, 18, wh);
    ctx.fillRect(wx, wy + wh * 0.62, ww, 14);
    ctx.lineWidth = 22;
    ctx.strokeStyle = "#060607";
    ctx.strokeRect(wx, wy, ww, wh);
    // window light falling into the room
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#6f86b8";
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.lineTo(wx + ww + 120, H);
    ctx.lineTo(wx - 260, H);
    ctx.fill();
    ctx.restore();
    // curtains
    for (const [cx, cw] of [
      [wx - 90, 110],
      [wx + ww - 20, 120],
    ]) {
      const cg = ctx.createLinearGradient(cx, 0, cx + cw, 0);
      for (let k = 0; k <= 6; k++) cg.addColorStop(k / 6, k % 2 ? "#0d0d10" : "#060608");
      ctx.fillStyle = cg;
      ctx.fillRect(cx, wy - 80, cw, wh + 220);
    }
    // floor lamp (left)
    if (lamp > 0.001) {
      N.glow(ctx, 190, 760, 720, [255, 160, 80], 0.32 * lamp);
      N.glow(ctx, 190, 700, 160, [255, 205, 140], 0.7 * lamp);
    }
    ctx.fillStyle = N.rgba(N.mix([12, 10, 9], [255, 196, 130], lamp * 0.9), 1);
    ctx.beginPath();
    ctx.moveTo(130, 640);
    ctx.lineTo(250, 640);
    ctx.lineTo(282, 760);
    ctx.lineTo(98, 760);
    ctx.fill();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(190, 760);
    ctx.lineTo(190, 1500);
    ctx.stroke();
    // phone glow on the ceiling / in front of him
    const px = 520;
    const py = 1330 - rise * 520;
    N.glow(ctx, px, py - 60, 520, [110, 150, 255], 0.22 * phone);
    // the man
    N.drawMan(ctx, 520, 1290 - rise * 560, 150, { look, glowA: 0.18 + 0.4 * phone + 0.1 * lamp });
    // couch back
    const cg = ctx.createLinearGradient(0, 1400, 0, H);
    cg.addColorStop(0, N.rgba(N.mix([10, 10, 12], [40, 28, 20], lamp * 0.5), 1));
    cg.addColorStop(0.08, "#060607");
    cg.addColorStop(1, "#020203");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-60, 1460);
    ctx.quadraticCurveTo(80, 1385, 300, 1400);
    ctx.lineTo(760, 1400);
    ctx.quadraticCurveTo(1000, 1385, 1140, 1460);
    ctx.lineTo(1140, H + 60);
    ctx.lineTo(-60, H + 60);
    ctx.fill();
    ctx.strokeStyle = N.rgba([120, 140, 190], 0.06 + 0.08 * phone);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(300, 1401);
    ctx.lineTo(760, 1401);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- POV walking to the window ---------- */
  N.drawWindowApproach = (ctx, t, k, o = {}) => {
    // k: 0 far → 1 at the glass
    const sc = 1 + k * 1.15;
    const bob = Math.sin(t * 7.2) * 10 * (1 - k) * (o.walk == null ? 1 : o.walk);
    ctx.save();
    ctx.fillStyle = "#030304";
    ctx.fillRect(0, 0, W, H);
    ctx.translate(540 + N.wob(t, 3) * 8 + (o.shakeX || 0), 900 + bob + (o.shakeY || 0));
    ctx.scale(sc, sc);
    const ww = 420;
    const wh = 900;
    const g = ctx.createLinearGradient(0, -wh / 2, 0, wh / 2);
    g.addColorStop(0, "#0a0f17");
    g.addColorStop(1, "#1e1c1e");
    ctx.fillStyle = g;
    ctx.fillRect(-ww / 2, -wh / 2, ww, wh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-ww / 2, -wh / 2, ww, wh);
    ctx.clip();
    for (let i = 0; i < 24; i++) {
      const bx = -ww / 2 + N.hash(i + 101) * ww;
      const by = -wh / 2 + wh * (0.3 + N.hash(i + 130) * 0.7);
      N.glow(ctx, bx, by, 20 + N.hash(i + 7) * 46, N.hash(i + 9) > 0.4 ? [255, 160, 80] : [150, 180, 255], 0.3);
    }
    N.glow(ctx, -40, wh * 0.28, 260, [255, 150, 70], 0.18);
    ctx.restore();
    ctx.fillStyle = "#040405";
    ctx.fillRect(-9, -wh / 2, 18, wh);
    ctx.fillRect(-ww / 2, wh * 0.12, ww, 14);
    ctx.lineWidth = 24;
    ctx.strokeStyle = "#050506";
    ctx.strokeRect(-ww / 2, -wh / 2, ww, wh);
    for (const [cx, cw] of [
      [-ww / 2 - 120, 140],
      [ww / 2 - 20, 140],
    ]) {
      const cg = ctx.createLinearGradient(cx, 0, cx + cw, 0);
      for (let j = 0; j <= 6; j++) cg.addColorStop(j / 6, j % 2 ? "#0c0c0f" : "#050507");
      ctx.fillStyle = cg;
      ctx.fillRect(cx, -wh / 2 - 120, cw, wh + 300);
    }
    ctx.restore();
  };

  /* ---------- Characters in the street ---------- */
  // Creature: x,y = feet; u = px per metre; turn 0 (head tilted aside) → 1 (facing the window).
  N.layer = (() => {
    let c = null;
    return () => {
      if (!c) {
        c = document.createElement("canvas");
        c.width = W;
        c.height = H;
      }
      return c;
    };
  })();
  N.drawCreature = (ctx, x, y, u, o = {}) => {
    const turn = o.turn || 0;
    const rimC = o.rimC || [255, 160, 80];
    const rimA = o.rimA == null ? 0.5 : o.rimA;
    const vy = o.vy || 0.82; // vertical foreshortening from the high angle
    const M = (mx, my) => [x + mx * u, y - my * u * vy];
    const limb = (pts, w) => {
      ctx.lineWidth = w * u;
      ctx.beginPath();
      const a = M(...pts[0]);
      ctx.moveTo(a[0], a[1]);
      for (let i = 1; i < pts.length; i++) {
        const p = M(...pts[i]);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    };
    const shape = () => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // legs
      limb(
        [
          [-0.1, 0],
          [-0.11, 0.62],
          [-0.07, 1.14],
        ],
        0.075,
      );
      limb(
        [
          [0.1, 0],
          [0.09, 0.6],
          [0.06, 1.14],
        ],
        0.075,
      );
      // feet
      limb(
        [
          [-0.1, 0.01],
          [-0.2, -0.02],
        ],
        0.06,
      );
      limb(
        [
          [0.1, 0.01],
          [0.2, -0.01],
        ],
        0.06,
      );
      // torso: narrow waist, ribcage, hunched shoulders
      ctx.beginPath();
      const pts = [
        [-0.09, 1.12],
        [-0.075, 1.35],
        [-0.15, 1.62],
        [-0.22, 1.86],
        [-0.12, 1.93],
        [0.0, 1.95],
        [0.13, 1.93],
        [0.23, 1.85],
        [0.15, 1.62],
        [0.075, 1.35],
        [0.09, 1.12],
      ];
      pts.forEach((p, i) => {
        const q = M(...p);
        if (i === 0) ctx.moveTo(q[0], q[1]);
        else ctx.lineTo(q[0], q[1]);
      });
      ctx.closePath();
      ctx.fill();
      // neck
      const hx = N.lerp(0.09, 0.0, turn);
      limb(
        [
          [0, 1.92],
          [hx * 0.6, 2.04],
        ],
        0.05,
      );
      // arms hanging far below the knees
      limb(
        [
          [-0.21, 1.84],
          [-0.27, 1.3],
          [-0.26, 0.72],
          [-0.25, 0.44],
        ],
        0.045,
      );
      limb(
        [
          [0.22, 1.83],
          [0.28, 1.28],
          [0.27, 0.7],
          [0.26, 0.42],
        ],
        0.045,
      );
      // long fingers
      for (const s of [-1, 1]) {
        for (let f = 0; f < 4; f++) {
          const fx = s * (0.25 + (f - 1.5) * 0.012);
          limb(
            [
              [fx, 0.44],
              [fx + s * (f - 1.5) * 0.02, 0.27],
            ],
            0.014,
          );
        }
      }
      // head, tilted
      const hc = M(hx, 2.13 + 0.04 * turn);
      ctx.save();
      ctx.translate(hc[0], hc[1]);
      ctx.rotate(N.lerp(0.55, 0.28, turn));
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.095 * u, 0.135 * u * vy * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const off = N.layer();
    const octx = off.getContext("2d");
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, off.width, off.height);
    const outer = ctx;
    ctx = octx;
    ctx.fillStyle = "#040404";
    ctx.strokeStyle = "#040404";
    shape();
    ctx = outer;
    ctx.save();
    if (o.reflect !== false) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.translate(0, y * 1.6);
      ctx.scale(1, -0.6);
      ctx.filter = "blur(3px)";
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }
    ctx.shadowColor = N.rgba(rimC, rimA);
    ctx.shadowBlur = 0.09 * u;
    ctx.drawImage(off, 0, 0);
    ctx.shadowBlur = 0.02 * u;
    ctx.shadowColor = N.rgba(rimC, rimA * 0.9);
    ctx.drawImage(off, 0, 0);
    ctx.shadowBlur = 0;
    // the face never resolves — only a faint pale sheen once it looks up
    if (turn > 0.4) {
      const hc = M(0, 2.15);
      N.glow(ctx, hc[0], hc[1], 0.11 * u, [210, 200, 185], 0.16 * N.smooth(0.4, 1, turn));
    }
    ctx.restore();
  };

  // Woman running: x,y feet, u px/m, ph = stride phase (radians), lit 0..1
  N.drawWoman = (ctx, x, y, u, ph, lit = 0) => {
    const M = (mx, my) => [x + mx * u, y - my * u * 0.85];
    const limb = (a, b, c, w) => {
      ctx.lineWidth = w * u;
      ctx.beginPath();
      const p = M(...a);
      const q = M(...b);
      const r = M(...c);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
      ctx.lineTo(r[0], r[1]);
      ctx.stroke();
    };
    const s = Math.sin(ph);
    const col = N.mix([8, 8, 9], [120, 80, 50], lit * 0.6);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = N.rgba(col, 1);
    ctx.fillStyle = N.rgba(col, 1);
    ctx.shadowColor = N.rgba([255, 170, 90], 0.25 + lit * 0.4);
    ctx.shadowBlur = 0.1 * u;
    const lift = Math.abs(Math.cos(ph)) * 0.06;
    limb([0, 0.95 + lift], [0.18 * s, 0.5 + lift], [0.05 * s - 0.08, 0.05 + Math.max(0, s) * 0.2], 0.12);
    limb([0, 0.95 + lift], [-0.18 * s, 0.5 + lift], [-0.05 * s - 0.08, 0.05 + Math.max(0, -s) * 0.2], 0.12);
    // coat
    ctx.beginPath();
    const c = [
      [-0.2, 0.8 + lift],
      [-0.17, 1.42 + lift],
      [0.17, 1.42 + lift],
      [0.22, 0.8 + lift],
    ].map((p) => M(...p));
    ctx.moveTo(c[0][0], c[0][1]);
    c.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.fill();
    limb([-0.16, 1.38 + lift], [-0.22 - 0.15 * s, 1.1 + lift], [-0.12 - 0.25 * s, 0.95 + lift], 0.08);
    limb([0.16, 1.38 + lift], [0.22 + 0.15 * s, 1.1 + lift], [0.12 + 0.25 * s, 0.95 + lift], 0.08);
    const hd = M(0.02, 1.58 + lift);
    ctx.beginPath();
    ctx.arc(hd[0], hd[1], 0.11 * u, 0, Math.PI * 2);
    ctx.fill();
    // hair streaming
    ctx.beginPath();
    ctx.moveTo(hd[0] - 0.06 * u, hd[1] - 0.08 * u);
    ctx.quadraticCurveTo(hd[0] - 0.25 * u, hd[1] - 0.05 * u + s * 3, hd[0] - 0.3 * u, hd[1] + 0.12 * u);
    ctx.lineTo(hd[0] - 0.05 * u, hd[1] + 0.05 * u);
    ctx.fill();
    ctx.restore();
  };

  /* ---------- Scene 4: the street seen from the 4th floor ---------- */
  // Perspective: row y → px per metre. The lamp is off-frame right; its pool lights the road
  // behind the creature, so the creature reads as a silhouette against wet asphalt.
  N.streetU = (y) => N.lerp(40, 200, N.clamp((y - 420) / 1500));
  N.POOL = { x: 640, y: 1130 };
  N.drawStreet = (ctx, t, o = {}) => {
    const flick = o.flick == null ? 1 : o.flick;
    const sod = [255, 160, 74];
    const roadX = (y, m) => 540 + m * N.streetU(y);
    ctx.fillStyle = "#070708";
    ctx.fillRect(-200, -200, W + 400, H + 400);
    // facade across the street (top band), one lit window
    ctx.fillStyle = "#0c0b0c";
    ctx.fillRect(-200, -200, W + 400, 630);
    for (let i = 0; i < 40; i++) {
      const wx = (i % 10) * 112 + 20;
      const wy = 40 + Math.floor(i / 10) * 96;
      const on = i === 23;
      ctx.fillStyle = on ? "#4a3218" : "#060607";
      ctx.fillRect(wx, wy, 52, 64);
    }
    ctx.fillStyle = "#121012";
    ctx.fillRect(-200, 400, W + 400, 30);
    const poly = (pts, fill) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
    };
    // sidewalks
    for (const s of [-1, 1]) {
      poly(
        [
          [roadX(430, s * 6), 430],
          [roadX(430, s * 11), 430],
          [roadX(2000, s * 11), 2000],
          [roadX(2000, s * 6), 2000],
        ],
        "#0d0c0d",
      );
      ctx.strokeStyle = "rgba(160,140,120,0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(roadX(430, s * 6), 430);
      ctx.lineTo(roadX(2000, s * 6), 2000);
      ctx.stroke();
    }
    // asphalt grain
    for (let i = 0; i < 900; i++) {
      const y = 430 + N.hash(i + 3000) * 1500;
      const x = roadX(y, (N.hash(i + 4000) - 0.5) * 12);
      const u = N.streetU(y);
      ctx.fillStyle = `rgba(${N.hash(i) > 0.5 ? "60,55,50" : "0,0,0"},0.35)`;
      ctx.fillRect(x, y, 0.08 * u, 0.04 * u);
    }
    // pool of sodium light on the wet road
    ctx.save();
    ctx.translate(N.POOL.x, N.POOL.y);
    ctx.scale(1, 0.5);
    N.glow(ctx, 0, 0, 640, sod, 0.5 * flick);
    N.glow(ctx, 60, -40, 260, [255, 205, 140], 0.35 * flick);
    ctx.restore();
    // puddles mirroring the light
    ctx.save();
    ctx.filter = "blur(8px)";
    for (let i = 0; i < 9; i++) {
      const py = N.POOL.y - 160 + N.hash(i + 50) * 330;
      const px = N.POOL.x - 300 + N.hash(i + 60) * 600;
      const u = N.streetU(py);
      const d = Math.hypot((px - N.POOL.x) / 640, (py - N.POOL.y) / 320);
      ctx.fillStyle = N.rgba([255, 190, 120], 0.12 * flick * Math.max(0, 1 - d));
      ctx.beginPath();
      ctx.ellipse(px, py, (0.6 + N.hash(i) * 1.4) * u, (0.15 + N.hash(i + 9) * 0.3) * u, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // centre dashes
    for (let y = 450; y < 1950; ) {
      const u = N.streetU(y);
      const len = 2.2 * u * 0.82;
      const lit = Math.max(0.12, 1 - Math.hypot((540 - N.POOL.x) / 640, (y - N.POOL.y) / 320));
      poly(
        [
          [roadX(y, -0.08), y],
          [roadX(y, 0.08), y],
          [roadX(y + len, 0.08), y + len],
          [roadX(y + len, -0.08), y + len],
        ],
        N.rgba([210, 200, 180], 0.35 * lit),
      );
      y += len * 2.4;
    }
    // light spill from the off-frame lamp (right)
    N.glow(ctx, 1180, 980, 520, sod, 0.28 * flick);
    // far lamp up the street
    N.glow(ctx, roadX(520, -5.5), 470, 90, sod, 0.5);
    ctx.save();
    ctx.translate(roadX(540, -3.5), 540);
    ctx.scale(1, 0.4);
    N.glow(ctx, 0, 0, 170, sod, 0.25);
    ctx.restore();
    // parked cars along the left curb, catching a little light
    for (let i = 0; i < 4; i++) {
      const cy = 520 + i * 330;
      const u = N.streetU(cy);
      const cx = roadX(cy, -4.9);
      const L = 4.3 * u * 0.62;
      const Wd = 1.8 * u;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = "#050506";
      ctx.beginPath();
      ctx.roundRect(-Wd / 2, -L / 2, Wd, L, 0.4 * u);
      ctx.fill();
      ctx.fillStyle = "#0f1014";
      ctx.beginPath();
      ctx.roundRect(-Wd * 0.38, -L * 0.2, Wd * 0.76, L * 0.48, 0.25 * u);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,170,90,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Wd * 0.5, -L * 0.4);
      ctx.lineTo(Wd * 0.5, L * 0.4);
      ctx.stroke();
      ctx.restore();
    }
    return { roadX };
  };

  // Window frame + droplets in the foreground (scene 4)
  N.drawGlass = (ctx, t) => {
    // droplets
    for (let i = 0; i < 150; i++) {
      const x = N.hash(i + 700) * W;
      let y = N.hash(i + 900) * H;
      const r = 2 + N.hash(i + 1100) * 7;
      const runs = N.hash(i + 1300) > 0.9;
      if (runs) y = (y + t * (60 + N.hash(i) * 120)) % H;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,200,150,0.18)";
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      if (runs) {
        ctx.strokeStyle = "rgba(200,190,180,0.06)";
        ctx.lineWidth = r * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y - 140);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    // mullions and frame
    ctx.fillStyle = "#020203";
    ctx.fillRect(0, 0, W, 70);
    ctx.fillRect(0, 0, 60, H);
    ctx.fillRect(W - 60, 0, 60, H);
    ctx.fillRect(0, H - 90, W, 90);
    ctx.fillRect(118, 0, 26, H);
    ctx.fillRect(0, 300, W, 22);
    // curtain edge on the left
    const cg = ctx.createLinearGradient(0, 0, 150, 0);
    cg.addColorStop(0, "rgba(3,3,4,1)");
    cg.addColorStop(0.7, "rgba(6,6,8,0.95)");
    cg.addColorStop(1, "rgba(6,6,8,0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, 150, H);
  };

  /* ---------- Scene 6: the hallway ---------- */
  N.drawHall = (ctx, t, pan, o = {}) => {
    // pan 0 → 1: from the window side to the hallway door
    const reveal = o.reveal || 0;
    const light = o.light == null ? 1 : o.light;
    ctx.save();
    ctx.fillStyle = "#030304";
    ctx.fillRect(0, 0, W, H);
    const off = N.lerp(-760, 0, pan) + N.wob(t, 9) * 6;
    ctx.translate(off, N.wob(t * 0.8, 5) * 4);
    // window edge leaving frame on the right
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(1380, 300, 340, 860);
    // wall faintly lit by the phone (cool), falloff from bottom right
    N.glow(ctx, 760, 1500, 1100, [90, 120, 200], 0.16 * light);
    // doorway — total black
    const dx = 300;
    const dy = 420;
    const dw = 380;
    const dh = 1180;
    ctx.fillStyle = "#000";
    ctx.fillRect(dx, dy, dw, dh);
    // door frame catching a little light
    ctx.strokeStyle = N.rgba([70, 85, 120], 0.25 * light);
    ctx.lineWidth = 10;
    ctx.strokeRect(dx - 6, dy - 6, dw + 12, dh + 12);
    // a light switch
    ctx.fillStyle = N.rgba([80, 90, 120], 0.25 * light);
    ctx.fillRect(dx + dw + 60, 1000, 40, 64);
    // the standing figure in the dark — human height, perfectly still
    if (reveal > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dw, dh);
      ctx.clip();
      ctx.globalAlpha = reveal;
      const fx = dx + dw * 0.55;
      const fy = dy + dh - 40;
      const u = 560;
      ctx.fillStyle = "#07080b";
      ctx.shadowColor = N.rgba([90, 110, 170], 0.35);
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(fx - 0.24 * u, fy);
      ctx.lineTo(fx - 0.2 * u, fy - 0.95 * u);
      ctx.quadraticCurveTo(fx - 0.24 * u, fy - 1.42 * u, fx - 0.08 * u, fy - 1.48 * u);
      ctx.lineTo(fx + 0.08 * u, fy - 1.48 * u);
      ctx.quadraticCurveTo(fx + 0.24 * u, fy - 1.42 * u, fx + 0.2 * u, fy - 0.95 * u);
      ctx.lineTo(fx + 0.24 * u, fy);
      ctx.fill();
      ctx.save();
      ctx.translate(fx + 0.02 * u, fy - 1.62 * u);
      ctx.rotate(0.22);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.1 * u, 0.13 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- Film grain tiles (seeded, built once) ---------- */
  N.grain = (() => {
    let tiles = null;
    return (i) => {
      if (!tiles) {
        tiles = [];
        let s = 9137;
        const rnd = () => {
          s = (s * 1664525 + 1013904223) >>> 0;
          return s / 4294967296;
        };
        for (let k = 0; k < 8; k++) {
          const c = document.createElement("canvas");
          c.width = 360;
          c.height = 640;
          const x = c.getContext("2d");
          const img = x.createImageData(360, 640);
          for (let p = 0; p < img.data.length; p += 4) {
            const v = Math.floor(rnd() * 255);
            img.data[p] = v;
            img.data[p + 1] = v;
            img.data[p + 2] = v;
            img.data[p + 3] = 255;
          }
          x.putImageData(img, 0, 0);
          tiles.push(c);
        }
      }
      return tiles[((i % 8) + 8) % 8];
    };
  })();

  window.Noir = N;
})();
