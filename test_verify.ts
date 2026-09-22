import { createSolvedCube, applyAlgorithm } from "./src/cubeState.ts";
import { solveCross } from "./src/crossSolver.ts";

async function main() {
  const cube = createSolvedCube();
  const scramble = "D' B' D2 R' U F' B' D2 L R2 D L2 F2 U D2 B2 D' F2 B2 D' B2";
  applyAlgorithm(cube, scramble + " z2");
  
  console.log("Solving D cross for corrected state...");
  const sol = await solveCross(cube, 3, 8);
  console.log("New Optimal Solution:", sol);
}

main();
