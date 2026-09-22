import * as fs from 'fs';

// U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
const faces = ["U", "R", "F", "D", "L", "B"];
const faceOffsets = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

// Map 54 stickers to 3D coordinates (x, y, z)
// Center of cube is (0,0,0). Faces are at distance 1.5.
// x: right, y: down (let's use standard: x right, y up, z out/front)
// Actually, let's use:
// x: right (+R, -L)
// y: up (+U, -D)
// z: front (+F, -B)

type Vec3 = { x: number, y: number, z: number, u: number, v: number };
const stickers: { idx: number, pos: Vec3, normal: Vec3 }[] = [];

// For each face, define its normal and local u,v axes
// U: normal(0,1,0), top-left is (-1, 1, -1), u goes right(+1,0,0), v goes front(0,0,1)
// Wait, looking at U from top, Top is Back(-z), Bottom is Front(+z). Left is Left(-x), Right is Right(+x).
// So u: +x, v: +z
const faceDefs: Record<string, { n: [number,number,number], u: [number,number,number], v: [number,number,number], tl: [number,number,number] }> = {
  U: { n: [0,1,0], u: [1,0,0], v: [0,0,1], tl: [-1, 1, -1] },
  // R: normal(1,0,0). Looking at R: Top is U(+y), Bottom is D(-y), Left is F(+z), Right is B(-z).
  // Wait, if front is Green, right is Red. Left of Red is Green(Front). Right of Red is Blue(Back).
  // So u: -z, v: -y (Wait, top-left is F, U. So z=+1, y=+1).
  // Let's check: tl: [1, 1, 1]. u is towards back: [0, 0, -1]. v is towards down: [0, -1, 0].
  R: { n: [1,0,0], u: [0,0,-1], v: [0,-1,0], tl: [1, 1, 1] },
  // F: normal(0,0,1). Top is U, Left is L(-x), Right is R(+x).
  // tl: [-1, 1, 1]. u is right: [1, 0, 0]. v is down: [0, -1, 0].
  F: { n: [0,0,1], u: [1,0,0], v: [0,-1,0], tl: [-1, 1, 1] },
  // D: normal(0,-1,0). Looking from bottom: Top is F(+z), Bottom is B(-z), Left is L(-x), Right is R(+x).
  // tl: [-1, -1, 1]. u is right: [1, 0, 0]. v is back: [0, 0, -1].
  D: { n: [0,-1,0], u: [1,0,0], v: [0,0,-1], tl: [-1, -1, 1] },
  // L: normal(-1,0,0). Looking at L: Top is U, Left is B(-z), Right is F(+z).
  // tl: [-1, 1, -1]. u is front: [0, 0, 1]. v is down: [0, -1, 0].
  L: { n: [-1,0,0], u: [0,0,1], v: [0,-1,0], tl: [-1, 1, -1] },
  // B: normal(0,0,-1). Looking at B: Top is U, Left is R(+x), Right is L(-x).
  // tl: [1, 1, -1]. u is left: [-1, 0, 0]. v is down: [0, -1, 0].
  B: { n: [0,0,-1], u: [-1,0,0], v: [0,-1,0], tl: [1, 1, -1] },
};

for (const [face, def] of Object.entries(faceDefs)) {
  const baseIdx = faceOffsets[face as keyof typeof faceOffsets];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const pos = {
        x: def.tl[0] + col * def.u[0] + row * def.v[0],
        y: def.tl[1] + col * def.u[1] + row * def.v[1],
        z: def.tl[2] + col * def.u[2] + row * def.v[2],
        u: col, v: row
      };
      const normal = { x: def.n[0], y: def.n[1], z: def.n[2], u:0, v:0 };
      stickers[baseIdx + row * 3 + col] = { idx: baseIdx + row * 3 + col, pos, normal };
    }
  }
}

function findSticker(pos: Vec3, normal: Vec3): number {
  for (const s of stickers) {
    if (Math.abs(s.pos.x - pos.x) < 0.1 && Math.abs(s.pos.y - pos.y) < 0.1 && Math.abs(s.pos.z - pos.z) < 0.1 &&
        Math.abs(s.normal.x - normal.x) < 0.1 && Math.abs(s.normal.y - normal.y) < 0.1 && Math.abs(s.normal.z - normal.z) < 0.1) {
      return s.idx;
    }
  }
  throw new Error(`Sticker not found for pos ${JSON.stringify(pos)} norm ${JSON.stringify(normal)}`);
}

function rotateX(s: {pos: Vec3, normal: Vec3}): {pos: Vec3, normal: Vec3} {
  // CW around +x axis (R face)
  // y -> z, z -> -y
  return {
    pos: { x: s.pos.x, y: -s.pos.z, z: s.pos.y, u:0, v:0 },
    normal: { x: s.normal.x, y: -s.normal.z, z: s.normal.y, u:0, v:0 }
  };
}

function rotateY(s: {pos: Vec3, normal: Vec3}): {pos: Vec3, normal: Vec3} {
  // CW around +y axis (U face)
  // z -> x, x -> -z
  return {
    pos: { x: s.pos.z, y: s.pos.y, z: -s.pos.x, u:0, v:0 },
    normal: { x: s.normal.z, y: s.normal.y, z: -s.normal.x, u:0, v:0 }
  };
}

function rotateZ(s: {pos: Vec3, normal: Vec3}): {pos: Vec3, normal: Vec3} {
  // CW around +z axis (F face)
  // x -> y, y -> -x
  return {
    pos: { x: -s.pos.y, y: s.pos.x, z: s.pos.z, u:0, v:0 },
    normal: { x: -s.normal.y, y: s.normal.x, z: s.normal.z, u:0, v:0 }
  };
}

function generatePermutation(rotFn: Function) {
  const perm = new Array(54);
  for (let i = 0; i < 54; i++) {
    const s = stickers[i];
    const rotated = rotFn(s);
    const originIdx = findSticker(rotated.pos, rotated.normal);
    // This means to get the NEW value at index i, we look at originIdx in the old cube.
    perm[i] = originIdx;
  }
  return perm;
}

const px = generatePermutation(rotateX);
const py = generatePermutation(rotateY);
const pz = generatePermutation(rotateZ);

console.log("const rotX = " + JSON.stringify(px) + ";");
console.log("const rotY = " + JSON.stringify(py) + ";");
console.log("const rotZ = " + JSON.stringify(pz) + ";");
