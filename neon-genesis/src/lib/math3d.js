// Minimal 3D math + camera for the software renderer.
// Column-major mat4 stored as Float64Array(16), points are [x,y,z].

export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export function mat4Identity() {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mat4Multiply(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[0 * 4 + r] * b[c * 4 + 0] +
        a[1 * 4 + r] * b[c * 4 + 1] +
        a[2 * 4 + r] * b[c * 4 + 2] +
        a[3 * 4 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function mat4Perspective(fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const m = new Float64Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[11] = -1;
  m[10] = (far + near) / (near - far);
  m[14] = (2 * far * near) / (near - far);
  return m;
}

export function mat4LookAt(eye, target, up = [0, 1, 0]) {
  const zAxis = norm(sub(eye, target));            // camera looks down -z
  let xAxis = cross(up, zAxis);
  if (len(xAxis) < 1e-6) xAxis = cross([0, 0, 1], zAxis);
  xAxis = norm(xAxis);
  const yAxis = cross(zAxis, xAxis);
  const m = new Float64Array(16);
  m[0] = xAxis[0]; m[1] = yAxis[0]; m[2] = zAxis[0]; m[3] = 0;
  m[4] = xAxis[1]; m[5] = yAxis[1]; m[6] = zAxis[1]; m[7] = 0;
  m[8] = xAxis[2]; m[9] = yAxis[2]; m[10] = zAxis[2]; m[11] = 0;
  m[12] = -dot(xAxis, eye);
  m[13] = -dot(yAxis, eye);
  m[14] = -dot(zAxis, eye);
  m[15] = 1;
  return m;
}

/** Camera: position, look-at, fov, roll. Builds view/projection once per frame. */
export class Camera {
  constructor() {
    this.eye = [0, 0, 10];
    this.target = [0, 0, 0];
    this.fov = 42;
    this.roll = 0;
    this.near = 0.5;
    this.far = 12000;
    this.view = null;
    this.proj = null;
    this.W = 1920;
    this.H = 1080;
  }

  set(eye, target, { fov = 42, roll = 0, near = 0.5, far = 12000 } = {}) {
    this.eye = eye;
    this.target = target;
    this.fov = fov;
    this.roll = roll;
    this.near = near;
    this.far = far;
  }

  update(W, H) {
    this.W = W; this.H = H;
    // roll: rotate up vector around the view axis
    const fwd = norm(sub(this.target, this.eye));
    let up = [0, 1, 0];
    if (this.roll) {
      const right = norm(cross(fwd, up));
      const realUp = cross(right, fwd);
      const c = Math.cos(this.roll), s = Math.sin(this.roll);
      up = norm(add(mul(right, s), mul(realUp, c)));
    }
    this.view = mat4LookAt(this.eye, this.target, up);
    this.proj = mat4Perspective(this.fov, W / H, this.near, this.far);
  }

  /** world → camera space (z negative in front) */
  toView(p) {
    const m = this.view;
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
  }

  /** view space → screen; returns null when behind the near plane */
  viewToScreen(v) {
    const d = -v[2];
    if (d < this.near) return null;
    const f = 1 / Math.tan((this.fov * Math.PI) / 360);
    const x = (v[0] * f) / (d * (this.W / this.H));
    const y = (v[1] * f) / d;
    return [this.W * 0.5 + x * this.W * 0.5, this.H * 0.5 - y * this.H * 0.5, d];
  }

  project(p) {
    const v = this.toView(p);
    const s = this.viewToScreen(v);
    return s ? { x: s[0], y: s[1], d: s[2], v } : null;
  }

  /** Project a segment, clipping against the near plane in view space. */
  segment(a, b) {
    let va = this.toView(a);
    let vb = this.toView(b);
    const near = this.near + 0.05;
    if (-va[2] < near && -vb[2] < near) return null;
    if (-va[2] < near) {
      const t = (-near - va[2]) / (vb[2] - va[2]);
      va = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t, -near];
    } else if (-vb[2] < near) {
      const t = (-near - vb[2]) / (va[2] - vb[2]);
      vb = [vb[0] + (va[0] - vb[0]) * t, vb[1] + (va[1] - vb[1]) * t, -near];
    }
    const sa = this.viewToScreen(va);
    const sb = this.viewToScreen(vb);
    if (!sa || !sb) return null;
    return { x1: sa[0], y1: sa[1], x2: sb[0], y2: sb[1], d1: sa[2], d2: sb[2] };
  }

  /** Polygon clip against the near plane (camera space), returns screen points. */
  poly(points) {
    const near = this.near + 0.05;
    const vs = points.map(p => this.toView(p));
    const out = [];
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i];
      const b = vs[(i + 1) % vs.length];
      const aIn = -a[2] >= near;
      const bIn = -b[2] >= near;
      if (aIn) out.push(a);
      if (aIn !== bIn) {
        const t = (-near - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -near]);
      }
    }
    if (out.length < 3) return null;
    const scr = out.map(v => this.viewToScreen(v));
    if (scr.some(s => !s)) return null;
    return scr.map(s => ({ x: s[0], y: s[1], d: s[2] }));
  }
}

/** Distance from a point to the camera, used for fog + sorting. */
export function camDist(cam, p) {
  const v = cam.toView(p);
  return -v[2];
}
