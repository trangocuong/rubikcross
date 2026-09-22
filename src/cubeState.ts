/**
 * CubeState: A lightweight 3x3x3 Rubik's Cube simulator.
 */

export type CubeColors = number[];

const U = 0, R = 1, F = 2, D = 3, L = 4, B = 5;

export const colorToFace: Record<string, number> = {
  white: U, red: R, green: F, yellow: D, orange: L, blue: B,
};

export function createSolvedCube(): CubeColors {
  const cube: CubeColors = new Array(54);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 9; j++) {
      cube[i * 9 + j] = i;
    }
  }
  return cube;
}

export function cloneCube(cube: CubeColors): CubeColors {
  return cube.slice();
}

function cycle4(cube: CubeColors, a: number, b: number, c: number, d: number) {
  const tmp = cube[d];
  cube[d] = cube[c];
  cube[c] = cube[b];
  cube[b] = cube[a];
  cube[a] = tmp;
}

function rotateFaceCW(cube: CubeColors, face: number) {
  const f = face * 9;
  cycle4(cube, f + 0, f + 2, f + 8, f + 6);
  cycle4(cube, f + 1, f + 5, f + 7, f + 3);
}

const moveDefs: Record<string, number[][]> = {
  U: [
    [L*9+0, B*9+0, R*9+0, F*9+0],
    [L*9+1, B*9+1, R*9+1, F*9+1],
    [L*9+2, B*9+2, R*9+2, F*9+2],
  ],
  D: [
    [R*9+6, B*9+6, L*9+6, F*9+6],
    [R*9+7, B*9+7, L*9+7, F*9+7],
    [R*9+8, B*9+8, L*9+8, F*9+8],
  ],
  R: [
    [U*9+2, B*9+6, D*9+2, F*9+2],
    [U*9+5, B*9+3, D*9+5, F*9+5],
    [U*9+8, B*9+0, D*9+8, F*9+8],
  ],
  L: [
    [D*9+0, B*9+8, U*9+0, F*9+0],
    [D*9+3, B*9+5, U*9+3, F*9+3],
    [D*9+6, B*9+2, U*9+6, F*9+6],
  ],
  F: [
    [R*9+0, D*9+2, L*9+8, U*9+6],
    [R*9+3, D*9+1, L*9+5, U*9+7],
    [R*9+6, D*9+0, L*9+2, U*9+8],
  ],
  B: [
    [L*9+0, D*9+6, R*9+2, U*9+2],
    [L*9+3, D*9+7, R*9+5, U*9+1],
    [L*9+6, D*9+8, R*9+8, U*9+0],
  ],
};

const faceMap: Record<string, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

const rotX = [18,19,20,21,22,23,24,25,26,15,12,9,16,13,10,17,14,11,27,28,29,30,31,32,33,34,35,53,52,51,50,49,48,47,46,45,38,41,44,37,40,43,36,39,42,8,7,6,5,4,3,2,1,0];
const rotY = [6,3,0,7,4,1,8,5,2,45,46,47,48,49,50,51,52,53,9,10,11,12,13,14,15,16,17,29,32,35,28,31,34,27,30,33,18,19,20,21,22,23,24,25,26,36,37,38,39,40,41,42,43,44];
const rotZ = [42,39,36,43,40,37,44,41,38,6,3,0,7,4,1,8,5,2,24,21,18,25,22,19,26,23,20,15,12,9,16,13,10,17,14,11,33,30,27,34,31,28,35,32,29,47,50,53,46,49,52,45,48,51];

function applyPermutation(cube: CubeColors, perm: number[]) {
  const oldCube = cube.slice();
  for (let i = 0; i < 54; i++) {
    cube[i] = oldCube[perm[i]];
  }
}

export function applyMove(cube: CubeColors, moveName: string): void {
  const face = moveName[0];
  const modifier = moveName.substring(1);
  
  let count = 1;
  if (modifier === "2") count = 2;
  else if (modifier === "'" || modifier === "\u2019") count = 3;

  if (face === "x" || face === "y" || face === "z") {
    let perm = rotX;
    if (face === "y") perm = rotY;
    if (face === "z") perm = rotZ;
    for (let c = 0; c < count; c++) applyPermutation(cube, perm);
    return;
  }

  const faceIdx = faceMap[face];
  if (faceIdx === undefined) return;
  const cycles = moveDefs[face];
  
  for (let i = 0; i < count; i++) {
    rotateFaceCW(cube, faceIdx);
    for (const c of cycles) {
      cycle4(cube, c[0], c[1], c[2], c[3]);
    }
  }
}

export function applyAlgorithm(cube: CubeColors, alg: string): void {
  if (!alg.trim()) return;
  const moves = alg.trim().split(/\s+/);
  for (const m of moves) {
    if (m) applyMove(cube, m);
  }
}

export function getCrossEdges(crossFace: string): { faceSticker: number; adjSticker: number }[] {
  switch (crossFace) {
    case "U": return [
      { faceSticker: U*9+1, adjSticker: B*9+1 },
      { faceSticker: U*9+3, adjSticker: L*9+1 },
      { faceSticker: U*9+5, adjSticker: R*9+1 },
      { faceSticker: U*9+7, adjSticker: F*9+1 },
    ];
    case "D": return [
      { faceSticker: D*9+1, adjSticker: F*9+7 },
      { faceSticker: D*9+3, adjSticker: L*9+7 },
      { faceSticker: D*9+5, adjSticker: R*9+7 },
      { faceSticker: D*9+7, adjSticker: B*9+7 },
    ];
    case "F": return [
      { faceSticker: F*9+1, adjSticker: U*9+7 },
      { faceSticker: F*9+3, adjSticker: L*9+5 },
      { faceSticker: F*9+5, adjSticker: R*9+3 },
      { faceSticker: F*9+7, adjSticker: D*9+1 },
    ];
    case "B": return [
      { faceSticker: B*9+1, adjSticker: U*9+1 },
      { faceSticker: B*9+3, adjSticker: R*9+5 },
      { faceSticker: B*9+5, adjSticker: L*9+3 },
      { faceSticker: B*9+7, adjSticker: D*9+7 },
    ];
    case "R": return [
      { faceSticker: R*9+1, adjSticker: U*9+5 },
      { faceSticker: R*9+3, adjSticker: F*9+5 },
      { faceSticker: R*9+5, adjSticker: B*9+3 },
      { faceSticker: R*9+7, adjSticker: D*9+5 },
    ];
    case "L": return [
      { faceSticker: L*9+1, adjSticker: U*9+3 },
      { faceSticker: L*9+3, adjSticker: B*9+5 },
      { faceSticker: L*9+5, adjSticker: F*9+3 },
      { faceSticker: L*9+7, adjSticker: D*9+3 },
    ];
    default: return [];
  }
}

export function isCrossSolved(cube: CubeColors, crossFace: number): boolean {
  const faceChars = ["U", "R", "F", "D", "L", "B"];
  const faceName = faceChars[crossFace];
  const edges = getCrossEdges(faceName);

  const centerColor = cube[crossFace * 9 + 4];

  for (const edge of edges) {
    if (cube[edge.faceSticker] !== centerColor) return false;
    const adjFaceIdx = Math.floor(edge.adjSticker / 9);
    const adjCenterColor = cube[adjFaceIdx * 9 + 4];
    if (cube[edge.adjSticker] !== adjCenterColor) return false;
  }
  return true;
}
