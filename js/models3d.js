/* =====================================================================
   The Last Hand — 3D character stage
   ---------------------------------------------------------------------
   A small software renderer: real geometry, real normals, three point
   lights, back-face culling, depth sorting, and an idle sway.

   It draws with canvas 2D rather than WebGL on purpose — the portraits
   are 58x72 on a phone, and a 2D context costs less to start, never fails
   to initialise, and keeps the whole thing in one dependency-free file.

   Every character is built from the same vocabulary (sphere head, cone
   hood, cylinder neck, box props) with per-character parameters, so the
   cast stays visually consistent.
   ===================================================================== */
(function (global) {
  'use strict';

  /* ---------------- vector helpers ---------------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
  function norm(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  /* ---------------- palette ---------------- */
  const C = {
    void:   [10, 10, 14],
    cloth:  [56, 53, 68],
    cloth2: [70, 66, 84],
    skin:   [226, 208, 182],
    bone:   [228, 218, 198],
    iron:   [124, 128, 136],
    gold:   [176, 141, 79],
    blood:  [142, 27, 24],
    amber:  [232, 176, 99],
    cold:   [124, 139, 149],
    wax:    [226, 215, 191],
    hair:   [18, 18, 26]
  };

  function shade(color, k) {
    return 'rgb(' + [
      Math.max(0, Math.min(255, Math.round(color[0] * k))),
      Math.max(0, Math.min(255, Math.round(color[1] * k))),
      Math.max(0, Math.min(255, Math.round(color[2] * k)))
    ].join(',') + ')';
  }

  /* ---------------- geometry ---------------- */

  function addFace(out, verts, color) {
    out.push({ v: verts, c: color });
  }

  /* a UV sphere, optionally squashed and cut to a hemisphere */
  function sphere(out, cx, cy, cz, rx, ry, rz, color, seg, rings, opts) {
    const o = opts || {};
    const from = o.from === undefined ? 0 : o.from;
    const to = o.to === undefined ? Math.PI : o.to;
    const S = seg || 10, R = rings || 8;
    for (let i = 0; i < R; i++) {
      const t0 = from + ((to - from) * i) / R;
      const t1 = from + ((to - from) * (i + 1)) / R;
      for (let j = 0; j < S; j++) {
        const p0 = (j / S) * Math.PI * 2;
        const p1 = ((j + 1) / S) * Math.PI * 2;
        const pt = (t, p) => [
          cx + rx * Math.sin(t) * Math.cos(p),
          cy + ry * Math.cos(t),
          cz + rz * Math.sin(t) * Math.sin(p)
        ];
        if (o.from !== undefined && Math.cos(t0) < 0 && Math.cos(t1) < 0) continue;
        addFace(out, [pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)], color);
      }
    }
  }

  /* a cone / tapering cylinder along Y */
  function cone(out, cx, cy, cz, r0, r1, h, color, seg) {
    const S = seg || 12;
    const top = cy - h / 2, bot = cy + h / 2;
    for (let j = 0; j < S; j++) {
      const a0 = (j / S) * Math.PI * 2;
      const a1 = ((j + 1) / S) * Math.PI * 2;
      const p = (r, a, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)];
      addFace(out, [p(r0, a0, top), p(r0, a1, top), p(r1, a1, bot), p(r1, a0, bot)], color);
    }
    // caps
    for (let j = 0; j < S; j++) {
      const a0 = (j / S) * Math.PI * 2;
      const a1 = ((j + 1) / S) * Math.PI * 2;
      if (r0 > 0.001) addFace(out, [[cx, top, cz],
        [cx + r0 * Math.cos(a1), top, cz + r0 * Math.sin(a1)],
        [cx + r0 * Math.cos(a0), top, cz + r0 * Math.sin(a0)]], color);
      if (r1 > 0.001) addFace(out, [[cx, bot, cz],
        [cx + r1 * Math.cos(a0), bot, cz + r1 * Math.sin(a0)],
        [cx + r1 * Math.cos(a1), bot, cz + r1 * Math.sin(a1)]], color);
    }
  }

  function box(out, cx, cy, cz, w, hgt, dep, color, rotY) {
    const hw = w / 2, hh = hgt / 2, hd = dep / 2;
    const r = rotY || 0, cs = Math.cos(r), sn = Math.sin(r);
    const P = (x, y, z) => [cx + x * cs - z * sn, cy + y, cz + x * sn + z * cs];
    const a = P(-hw, -hh, -hd), b = P(hw, -hh, -hd), c = P(hw, -hh, hd), d2 = P(-hw, -hh, hd);
    const e = P(-hw, hh, -hd), f = P(hw, hh, -hd), g = P(hw, hh, hd), h = P(-hw, hh, hd);
    addFace(out, [e, f, g, h], color);
    addFace(out, [a, d2, c, b], color);
    addFace(out, [d2, h, g, c], color);
    addFace(out, [b, f, e, a], color);
    addFace(out, [a, e, h, d2], color);
    addFace(out, [c, g, f, b], color);
  }

  /* a flat billboard-ish plane, for veils and bandages */
  function plane(out, cx, cy, cz, w, h, color, curve) {
    const k = curve || 0;
    const S = 4;
    for (let i = 0; i < S; i++) {
      const y0 = cy - h / 2 + (h * i) / S;
      const y1 = cy - h / 2 + (h * (i + 1)) / S;
      const z0 = cz + k * Math.sin((i / S) * Math.PI);
      const z1 = cz + k * Math.sin(((i + 1) / S) * Math.PI);
      addFace(out, [
        [cx - w / 2, y0, z0], [cx + w / 2, y0, z0],
        [cx + w / 2, y1, z1], [cx - w / 2, y1, z1]
      ], color);
    }
  }

  /* Eyes, brow, nose and mouth. Without these a head is an egg. */
  function features(out, o) {
    const opt = o || {};
    const y = opt.y === undefined ? 0.66 : opt.y;
    const z = opt.z === undefined ? -0.255 : opt.z;
    const k = opt.k || 1;
    const brow = opt.brow || [26, 22, 22];
    const lip = opt.lip || [92, 46, 44];

    // brow ridge
    box(out, 0, y + 0.075 * k, z + 0.045, 0.34 * k, 0.028, 0.05, brow, 0);
    // eye sockets
    sphere(out, -0.093 * k, y, z, 0.043 * k, 0.050 * k, 0.040 * k, [10, 10, 16], 7, 5);
    sphere(out,  0.093 * k, y, z, 0.043 * k, 0.050 * k, 0.040 * k, [10, 10, 16], 7, 5);
    if (opt.glow) {
      sphere(out, -0.093 * k, y, z - 0.02, 0.016, 0.018, 0.012, opt.glow, 5, 4);
      sphere(out,  0.093 * k, y, z - 0.02, 0.016, 0.018, 0.012, opt.glow, 5, 4);
    }
    // nose
    box(out, 0, y - 0.075 * k, z - 0.03, 0.055 * k, 0.11 * k, 0.07 * k, opt.nose || [200, 182, 158], 0);
    // mouth
    box(out, 0, y - 0.165 * k, z + 0.015, 0.145 * k, 0.026, 0.04, lip, 0);
  }

  /* ---------------- characters ---------------- */

  const SPECS = {
    widow: {
      skin: C.skin, cloth: C.cloth, head: 1.0, veil: true, hood: false,
      accent: C.bone, prop: 'card'
    },
    gravedigger: {
      skin: [168, 148, 124], cloth: [22, 22, 28], head: 1.04, hood: true,
      accent: C.cold, prop: 'shovel'
    },
    confessor: {
      skin: C.skin, cloth: C.cloth, head: 0.98, bandage: true, collar: true,
      accent: C.amber, prop: 'candle'
    },
    bride: {
      skin: [238, 233, 222], cloth: [40, 38, 44], head: 0.96, veil: true,
      accent: C.bone, prop: 'bouquet', crack: true
    },
    croupier: {
      skin: [40, 40, 50], cloth: [16, 16, 22], head: 0.94, hat: true,
      accent: C.blood, prop: 'cards'
    },
    mourner: {
      skin: [163, 148, 130], cloth: [18, 18, 26], head: 0.98, hood: true,
      accent: C.cold, prop: 'card'
    },
    veiled: {
      skin: C.bone, cloth: [14, 14, 20], head: 1.0, mask: true, filigree: true,
      accent: C.blood, prop: 'none'
    },
    charnel: {
      skin: [162, 146, 124], cloth: [30, 27, 22], head: 1.0, ironMask: true,
      accent: C.iron, prop: 'hook'
    },
    twins: {
      skin: [176, 154, 134], cloth: [24, 22, 30], head: 0.84, twin: true,
      accent: C.cold, prop: 'none'
    },
    candle: {
      skin: [185, 165, 140], cloth: [26, 24, 28], head: 0.92, gaunt: true,
      accent: C.amber, prop: 'mouthflame'
    },
    choir: {
      skin: [169, 154, 140], cloth: [20, 18, 26], head: 0.94, triple: true,
      accent: C.cold, prop: 'none'
    },
    surgeon: {
      skin: [168, 150, 128], cloth: [44, 36, 28], head: 1.0, goggles: true,
      surgicalMask: true, accent: C.gold, prop: 'saw'
    },
    head: {
      skin: C.bone, cloth: [12, 12, 18], head: 1.18, mask: true, tall: true,
      crown: true, accent: C.blood, prop: 'candles'
    }
  };

  function build(id) {
    const s = SPECS[id] || SPECS.widow;
    const faces = [];
    const scale = s.head || 1;

    /* shoulders / torso */
    cone(faces, 0, 1.30, 0, 0.30, 0.74, 0.72, s.cloth, 14);
    cone(faces, 0, 0.94, 0, 0.34, 0.38, 0.14, C.cloth2, 12);

    /* collar: a pale band that separates head from shoulders */
    cone(faces, 0, 0.885, 0, 0.23, 0.27, 0.07, [176, 164, 142], 12);

    /* neck */
    cone(faces, 0, 0.82, 0, 0.15, 0.18, 0.20, s.skin, 10);

    /* the head */
    if (s.twin) {
      sphere(faces, -0.24, 0.62, 0, 0.30, 0.34, 0.30, s.skin, 10, 8);
      sphere(faces, 0.24, 0.62, 0, 0.30, 0.34, 0.30, s.skin, 10, 8);
      cone(faces, -0.24, 0.42, 0, 0.30, 0.22, 0.10, s.cloth, 10);
      cone(faces, 0.24, 0.42, 0, 0.30, 0.22, 0.10, s.cloth, 10);
    } else if (s.triple) {
      sphere(faces, -0.30, 0.66, 0.10, 0.24, 0.28, 0.24, [40, 40, 50], 8, 7);
      sphere(faces, 0.30, 0.66, 0.10, 0.24, 0.28, 0.24, [40, 40, 50], 8, 7);
      sphere(faces, 0, 0.60, 0, 0.30, 0.35, 0.30, s.skin, 11, 9);
    } else {
      const ry = s.tall ? 0.44 : 0.37;
      sphere(faces, 0, 0.62, 0, 0.27 * scale, ry * scale, 0.28 * scale, s.skin, 12, 10);
    }

    /* hair / hood / veil / hat */
    if (s.hood) {
      sphere(faces, 0, 0.62, 0.02, 0.36 * scale, 0.42 * scale, 0.36 * scale,
        s.cloth, 10, 8, { from: 0, to: Math.PI * 0.62 });
      cone(faces, 0, 0.46, 0.02, 0.36 * scale, 0.48 * scale, 0.5, s.cloth, 10);
    }
    if (s.veil) {
      // a hood behind the head, plus a narrow lace band across the eyes
      sphere(faces, 0, 0.60, 0.06, 0.37 * scale, 0.44 * scale, 0.37 * scale,
        [30, 29, 38], 11, 9, { from: 0, to: Math.PI * 0.66 });
      cone(faces, 0, 0.36, 0.06, 0.38 * scale, 0.46 * scale, 0.42, [26, 25, 33], 11);
      plane(faces, 0, 0.66, -0.255, 0.44, 0.13, s.accent, 0.05);
    }
    if (s.hat) {
      cone(faces, 0, 0.20, 0, 0.46, 0.46, 0.05, C.void, 14);
      cone(faces, 0, -0.05, 0, 0.26, 0.24, 0.44, [12, 12, 18], 14);
      cone(faces, 0, 0.10, 0, 0.27, 0.27, 0.07, C.blood, 14);
    }
    if (s.mask) {
      // a smooth plate over the face
      sphere(faces, 0, 0.60, -0.10, 0.26 * scale, 0.34 * scale, 0.22 * scale,
        s.skin, 12, 9, { from: 0, to: Math.PI * 0.72 });
    }
    if (s.ironMask) {
      sphere(faces, 0.05, 0.62, -0.06, 0.26, 0.30, 0.24, C.iron, 10, 8,
        { from: 0, to: Math.PI * 0.6 });
    }
    if (s.bandage) {
      cone(faces, 0, 0.66, 0, 0.31 * scale, 0.31 * scale, 0.13, C.bone, 12);
    }
    if (s.goggles) {
      cone(faces, -0.12, 0.64, -0.24, 0.085, 0.085, 0.05, C.gold, 8);
      cone(faces, 0.12, 0.64, -0.24, 0.085, 0.085, 0.05, C.gold, 8);
      cone(faces, -0.12, 0.64, -0.27, 0.06, 0.06, 0.02, [30, 44, 44], 8);
      cone(faces, 0.12, 0.64, -0.27, 0.06, 0.06, 0.02, [30, 44, 44], 8);
    }
    if (s.surgicalMask) {
      plane(faces, 0, 0.50, -0.26, 0.40, 0.20, C.bone, 0.04);
    }
    if (s.crown) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        box(faces, Math.cos(a) * 0.24, 0.20, Math.sin(a) * 0.20,
          0.07, 0.34, 0.07, [22, 22, 30], a);
      }
    }

    /* faces — the difference between a character and an egg */
    if (s.twin) {
      features(faces, { y: 0.65, z: -0.215, k: 0.72, nose: s.skin });
      features(faces, { y: 0.65, z: -0.215, k: 0.72, nose: s.skin, x: 0.24 });
    } else if (s.triple || s.mask || s.ironMask || s.hat) {
      features(faces, {
        k: s.twin ? 0.8 : 1,
        y: s.mask ? 0.64 : 0.66,
        z: s.mask ? -0.265 : -0.24,
        glow: s.mask ? C.blood : (s.hat ? null : C.cold),
        brow: s.mask ? [120, 110, 100] : [22, 20, 20],
        lip: s.mask ? [120, 40, 38] : [80, 40, 38],
        nose: s.mask ? s.skin : [200, 182, 158]
      });
    } else {
      features(faces, { k: s.goggles ? 0.95 : 1, nose: s.skin });
    }

    /* props */
    if (s.prop === 'shovel') {
      box(faces, 0.52, 0.80, 0.06, 0.07, 1.30, 0.07, [58, 44, 31], 0.32);
      box(faces, 0.80, 1.34, 0.10, 0.20, 0.26, 0.05, C.iron, 0.32);
    } else if (s.prop === 'candle') {
      cone(faces, 0.46, 0.98, -0.10, 0.06, 0.06, 0.42, C.wax, 8);
      cone(faces, 0.46, 0.74, -0.10, 0.05, 0.00, 0.12, C.amber, 7);
    } else if (s.prop === 'mouthflame') {
      cone(faces, 0, 0.44, -0.26, 0.06, 0.00, 0.16, C.amber, 7);
    } else if (s.prop === 'saw') {
      box(faces, 0.52, 0.98, -0.14, 0.44, 0.05, 0.10, C.iron, -0.5);
    } else if (s.prop === 'hook') {
      box(faces, 0.60, 0.72, 0.06, 0.05, 0.90, 0.05, C.iron, 0);
      box(faces, 0.60, 1.18, 0.06, 0.22, 0.05, 0.05, C.iron, 0);
    } else if (s.prop === 'card') {
      box(faces, -0.34, 1.16, -0.16, 0.18, 0.26, 0.01, [238, 230, 212], -0.18);
    } else if (s.prop === 'cards') {
      box(faces, -0.30, 1.18, -0.18, 0.18, 0.26, 0.01, [238, 230, 212], 0.15);
      box(faces, 0.30, 1.18, -0.18, 0.18, 0.26, 0.01, [238, 230, 212], -0.15);
    } else if (s.prop === 'candles') {
      [[-0.52, 1.06], [-0.36, 1.00], [0.36, 1.00], [0.52, 1.06]].forEach(([x, y]) => {
        cone(faces, x, y, -0.05, 0.035, 0.035, 0.16, C.wax, 6);
        cone(faces, x, y - 0.12, -0.05, 0.03, 0.00, 0.08, C.amber, 5);
      });
    } else if (s.prop === 'bouquet') {
      cone(faces, -0.44, 1.02, -0.10, 0.03, 0.02, 0.42, [58, 53, 44], 6);
      sphere(faces, -0.44, 0.78, -0.10, 0.10, 0.08, 0.10, [42, 38, 32], 7, 5);
    }

    return faces;
  }

  /* ---------------- renderer ---------------- */

  /* Directions point from the surface toward the light. +y is down. */
  const LIGHTS = [
    { dir: norm([-0.48, -0.55, -0.68]), color: C.amber, power: 1.45 }, // key
    { dir: norm([0.86, -0.10, 0.32]),   color: C.amber, power: 0.85 }, // back rim
    { dir: norm([0.30, 0.55, -0.75]),   color: C.cold,  power: 0.30 }, // fill
    { dir: norm([0.0, 0.95, -0.30]),    color: C.amber, power: 0.22 }  // bounce
  ];

  const AMBIENT = 0.33;

  function render(ctx, faces, w, h, yaw, pitch, scale) {
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w / 2, h * 0.42, 2, w / 2, h * 0.5, w * 0.85);
    bg.addColorStop(0, 'rgba(34,31,40,1)');
    bg.addColorStop(0.55, 'rgba(15,14,19,1)');
    bg.addColorStop(1, 'rgba(6,6,10,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const unit = Math.min(w, h) * 0.52 * scale;
    const cx = w / 2, cyy = h * 0.60;

    /* rotate a direction the same way we rotate the model */
    const rot = (v) => {
      const x1 = v[0] * cyw - v[2] * syw;
      const z1 = v[0] * syw + v[2] * cyw;
      const y2 = v[1] * cp - z1 * sp;
      const z2 = v[1] * sp + z1 * cp;
      return [x1, y2, z2];
    };

    const view = faces.map((f) => {
      // model-space normal, so lighting is stable as the bust turns
      const n0 = norm(cross(sub(f.v[1], f.v[0]), sub(f.v[2], f.v[0])));
      const nrm = rot(n0);

      const pts = f.v.map((p) => {
        const x0 = p[0], y0 = p[1] - 0.72, z0 = p[2];
        const x1 = x0 * cyw - z0 * syw;
        const z1 = x0 * syw + z0 * cyw;
        const y2 = y0 * cp - z1 * sp;
        const z2 = y0 * sp + z1 * cp;
        const persp = 2.4 / (z2 + 2.4);
        return { x: cx + x1 * persp * unit, y: cyy + y2 * persp * unit, z: z2 };
      });

      return {
        pts: pts,
        c: f.c,
        n: nrm,
        z: pts.reduce((a, p) => a + p.z, 0) / pts.length
      };
    });

    view.sort((a, b) => b.z - a.z);

    for (const f of view) {
      const a = f.pts[0], b = f.pts[1], c = f.pts[2];
      const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (area <= 0) continue;   // back face

      // how much each light gives this facet
      let lit = 0, wr = 0, wg = 0, wb = 0;
      for (const L of LIGHTS) {
        const d = Math.max(0, dot(f.n, L.dir));
        if (d <= 0) continue;
        const w = d * L.power;
        lit += w;
        wr += L.color[0] * w; wg += L.color[1] * w; wb += L.color[2] * w;
      }

      const k = AMBIENT + lit * 0.86;
      const tint = lit > 0 ? [wr / lit, wg / lit, wb / lit] : [255, 255, 255];

      // blend the surface colour toward the light colour before shading
      const mixed = [
        f.c[0] * 0.72 + (f.c[0] * tint[0] / 255) * 0.28,
        f.c[1] * 0.72 + (f.c[1] * tint[1] / 255) * 0.28,
        f.c[2] * 0.72 + (f.c[2] * tint[2] / 255) * 0.28
      ];

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      ctx.fillStyle = shade(mixed, Math.min(1.7, k));
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.20)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    const vg = ctx.createRadialGradient(cx, h * 0.5, h * 0.22, cx, h * 0.5, h * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  /* ---------------- mounting ---------------- */

  const instances = new Map();
  let raf = null;
  let last = 0;

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 42) return;   // ~24fps is plenty for a breathing bust
    last = now;

    instances.forEach((inst, canvas) => {
      if (!canvas.isConnected) {
        instances.delete(canvas);
        return;
      }
      const t = now / 1000;
      const yaw = Math.sin(t * 0.35 + inst.seed) * 0.22 + inst.pointer * 0.35;
      const pitch = Math.sin(t * 0.27 + inst.seed * 2) * 0.05 - 0.04;
      const breath = 1 + Math.sin(t * 0.9 + inst.seed) * 0.006;
      // canvas.width is already in device pixels, so the model scale must
      // not be multiplied by dpr a second time.
      const w = canvas.width, h = canvas.height;
      render(inst.ctx, inst.faces, w, h, yaw, pitch, inst.scale * breath);
    });

    if (!instances.size && raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function mount(canvas, id) {
    const existing = instances.get(canvas);
    if (existing) instances.delete(canvas);

    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const w = Math.max(48, canvas.clientWidth || 58);
    const h = Math.max(60, canvas.clientHeight || 72);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const inst = {
      ctx: ctx,
      faces: build(id),
      seed: Math.random() * 6.28,
      pointer: 0,
      scale: Math.min(1.35, Math.max(0.8, h / 74))
    };
    instances.set(canvas, inst);

    // parallax: the bust turns a little toward the finger
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      inst.pointer = ((x / Math.max(1, r.width)) - 0.5) * 2;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: true });

    if (!raf) raf = requestAnimationFrame(tick);
    return inst;
  }

  function unmountAll() {
    instances.clear();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  global.Portraits3D = {
    mount: mount,
    unmountAll: unmountAll,
    characterIds: Object.keys(SPECS),
    _build: build,     // exported for tests
    _render: render,   // exported for tests
    _instanceCount: () => instances.size
  };
})(typeof window !== 'undefined' ? window : globalThis);
