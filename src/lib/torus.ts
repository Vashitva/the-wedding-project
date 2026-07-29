/**
 * Shades rings as real tori on a 2D canvas.
 *
 * A ring drawn as a flat annulus with a gradient always reads as a gold ribbon,
 * because nothing about it varies with the surface. So this walks the actual
 * torus surface — position and normal at every point — lights each facet, and
 * paints them back to front.
 *
 * Two things do most of the work:
 *
 *  - **Per-facet normals.** The band is round, so the light rolls across it,
 *    and you see the inside of the far side through the hole. That is the whole
 *    difference between a ring and a circle.
 *  - **One shared depth sort.** Facets from every ring go into the same buffer
 *    and are painted in depth order, so two rings in different planes weave
 *    through each other correctly — no clipping tricks, just occlusion.
 *
 * Buffers are allocated once and reused: at sixty frames a second, building a
 * couple of thousand objects per frame is all garbage.
 */

export type TorusPose = {
  /** Screen centre. */
  cx: number;
  cy: number;
  /** Major radius — centre of the ring to centre of the band, in px. */
  R: number;
  /** Tube radius — half the band's thickness, in px. */
  a: number;
  /** 0 = edge-on, 1 = face-on. Foreshortening, i.e. cos of the tip angle. */
  tilt: number;
  /** Rotation about the vertical axis, radians. Gives two rings distinct planes. */
  yaw: number;
  /** Rotation in the picture plane, radians. */
  roll: number;
  /** Linear-space metal colour, 0…1. */
  albedo: [number, number, number];
};

/* Light rig: a warm key from the upper right, and an environment that is warm
 * above and cool below — which is what makes metal look like metal rather than
 * like plastic. */
const LIGHT: [number, number, number] = [0.42, -0.72, 0.55];
const SKY: [number, number, number] = [1.02, 0.98, 0.9];
const GROUND: [number, number, number] = [0.34, 0.33, 0.4];
const SHININESS = 48;

const norm = ([x, y, z]: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

const L = norm(LIGHT);
// Half-vector between the light and the view axis (0,0,1), for Blinn specular.
const H = norm([L[0], L[1], L[2] + 1]);

export function createTorusRenderer(segmentsU = 84, segmentsV = 12) {
  const perRing = segmentsU * segmentsV;
  // Grown on demand; two rings is the normal case.
  let capacity = perRing * 2;

  let xs = new Float32Array(capacity * 4);
  let ys = new Float32Array(capacity * 4);
  let depth = new Float32Array(capacity);
  let reds = new Uint8Array(capacity);
  let greens = new Uint8Array(capacity);
  let blues = new Uint8Array(capacity);
  let order = new Int32Array(capacity);
  let count = 0;

  const grow = (needed: number) => {
    if (needed <= capacity) return;
    capacity = needed;
    xs = new Float32Array(capacity * 4);
    ys = new Float32Array(capacity * 4);
    depth = new Float32Array(capacity);
    reds = new Uint8Array(capacity);
    greens = new Uint8Array(capacity);
    blues = new Uint8Array(capacity);
    order = new Int32Array(capacity);
  };

  // Trig for the two parameters is the same every frame; only the pose changes.
  const cosU = new Float32Array(segmentsU + 1);
  const sinU = new Float32Array(segmentsU + 1);
  for (let i = 0; i <= segmentsU; i++) {
    const t = (i / segmentsU) * Math.PI * 2;
    cosU[i] = Math.cos(t);
    sinU[i] = Math.sin(t);
  }
  const cosV = new Float32Array(segmentsV + 1);
  const sinV = new Float32Array(segmentsV + 1);
  for (let j = 0; j <= segmentsV; j++) {
    const t = (j / segmentsV) * Math.PI * 2;
    cosV[j] = Math.cos(t);
    sinV[j] = Math.sin(t);
  }

  return {
    reset() {
      count = 0;
    },

    /** Walks one torus and adds its visible facets to the shared buffer. */
    collect(pose: TorusPose) {
      grow(count + perRing);

      const tip = Math.acos(Math.max(-1, Math.min(1, pose.tilt)));
      const ct = Math.cos(tip);
      const st = Math.sin(tip);
      const cy_ = Math.cos(pose.yaw);
      const sy_ = Math.sin(pose.yaw);
      const cr = Math.cos(pose.roll);
      const sr = Math.sin(pose.roll);

      /** Object space → view space. Tip about X, then yaw about Y, then roll. */
      const transform = (x: number, y: number, z: number): [number, number, number] => {
        const y1 = y * ct - z * st;
        const z1 = y * st + z * ct;
        const x2 = x * cy_ + z1 * sy_;
        const z2 = -x * sy_ + z1 * cy_;
        return [x2 * cr - y1 * sr, x2 * sr + y1 * cr, z2];
      };

      for (let i = 0; i < segmentsU; i++) {
        for (let j = 0; j < segmentsV; j++) {
          // Facet corners, in (u, v) order around the ring and around the tube.
          const corners: [number, number][] = [
            [i, j],
            [i + 1, j],
            [i + 1, j + 1],
            [i, j + 1],
          ];

          let sumZ = 0;
          let ok = true;

          for (let k = 0; k < 4; k++) {
            const [ui, vj] = corners[k];
            const ring = pose.R + pose.a * cosV[vj];
            const [px, py, pz] = transform(
              ring * cosU[ui],
              ring * sinU[ui],
              pose.a * sinV[vj],
            );
            const idx = (count << 2) + k;
            xs[idx] = pose.cx + px;
            ys[idx] = pose.cy + py;
            sumZ += pz;
            if (!Number.isFinite(px) || !Number.isFinite(py)) ok = false;
          }
          if (!ok) continue;

          // Normal at the facet centre. For a torus it is simply the direction
          // from the tube's spine out to the surface.
          const uc = i + 0.5;
          const vc = j + 0.5;
          const cu = Math.cos((uc / segmentsU) * Math.PI * 2);
          const su = Math.sin((uc / segmentsU) * Math.PI * 2);
          const cv = Math.cos((vc / segmentsV) * Math.PI * 2);
          const sv = Math.sin((vc / segmentsV) * Math.PI * 2);
          const [nx, ny, nz] = transform(cv * cu, cv * su, sv);

          // Facing away from the camera: hidden behind the near side.
          if (nz <= 0.02) continue;

          const ndl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
          const ndh = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
          const spec = Math.pow(ndh, SHININESS) * 1.5;
          // Grazing angles brighten — the lip you see on any polished band.
          const rim = Math.pow(1 - nz, 3) * 0.5;
          // Hemisphere ambient: sky above, bounce below.
          const up = ny * -0.5 + 0.5;

          const amb0 = GROUND[0] + (SKY[0] - GROUND[0]) * up;
          const amb1 = GROUND[1] + (SKY[1] - GROUND[1]) * up;
          const amb2 = GROUND[2] + (SKY[2] - GROUND[2]) * up;

          const lit = 0.34 + ndl * 0.95;
          // Metals tint their specular, so the highlight carries the gold.
          const r = pose.albedo[0] * amb0 * lit + pose.albedo[0] * spec + rim;
          const g = pose.albedo[1] * amb1 * lit + pose.albedo[1] * spec + rim;
          const b = pose.albedo[2] * amb2 * lit + pose.albedo[2] * spec * 0.9 + rim;

          // Crude tone curve, so highlights roll off instead of clipping flat.
          reds[count] = Math.min(255, Math.round(255 * (r / (1 + r)) * 1.9));
          greens[count] = Math.min(255, Math.round(255 * (g / (1 + g)) * 1.9));
          blues[count] = Math.min(255, Math.round(255 * (b / (1 + b)) * 1.9));

          depth[count] = sumZ * 0.25;
          count += 1;
        }
      }
    },

    /** Paints everything collected so far, back to front, then clears. */
    flush(ctx: CanvasRenderingContext2D, alpha = 1) {
      for (let i = 0; i < count; i++) order[i] = i;
      const slice = order.subarray(0, count);
      // Ascending depth: the far side of every ring goes down first, so near
      // geometry — from either ring — paints over it.
      slice.sort((a, b) => depth[a] - depth[b]);

      ctx.globalAlpha = alpha;
      for (let n = 0; n < count; n++) {
        const q = slice[n];
        const o = q << 2;
        ctx.beginPath();
        ctx.moveTo(xs[o], ys[o]);
        ctx.lineTo(xs[o + 1], ys[o + 1]);
        ctx.lineTo(xs[o + 2], ys[o + 2]);
        ctx.lineTo(xs[o + 3], ys[o + 3]);
        ctx.closePath();
        ctx.fillStyle = `rgb(${reds[q]},${greens[q]},${blues[q]})`;
        ctx.fill();
        // Stroke the same path: adjacent facets otherwise leave hairline seams
        // where their antialiased edges fail to meet.
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      count = 0;
    },
  };
}

export type TorusRenderer = ReturnType<typeof createTorusRenderer>;
