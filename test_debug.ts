import { createSolvedCube, applyAlgorithm, isCrossSolved, getCrossEdges } from "./src/cubeState.ts";
import { solveCross } from "./src/crossSolver.ts";

// Test: A real scramble from WCA, verify solver output
async function main() {
  // Test with a known scramble where white cross solution is known
  const cube1 = createSolvedCube();
  const scramble = "R' U F2 D B' L2 U R D' F' R2 B2 U2 L2 D B2 L2 U' R2 B2";
  applyAlgorithm(cube1, scramble);
  
  console.log("After scramble:", scramble);
  console.log("U face:", cube1.slice(0, 9));
  console.log("F face:", cube1.slice(18, 27));
  
  // Solve white cross (U face)
  const sol = await solveCross(cube1.slice(), "U", 8);
  console.log("White cross solution:", sol);
  
  if (sol) {
    const verify = cube1.slice();
    applyAlgorithm(verify, sol);
    const edges = getCrossEdges("U");
    console.log("\nAfter applying solution:");
    for (const edge of edges) {
      const adjFace = Math.floor(edge.adjSticker / 9);
      const adjFaceChar = ["U","R","F","D","L","B"][adjFace];
      console.log(`  U-edge sticker[${edge.faceSticker}]=${verify[edge.faceSticker]} adj[${edge.adjSticker}](${adjFaceChar})=${verify[edge.adjSticker]}`);
    }
    console.log("  isCrossSolved('U'):", isCrossSolved(verify, "U"));
    
    // Also check U face manually
    console.log("  U[1](UB):", verify[1], "U[3](UL):", verify[3], "U[5](UR):", verify[5], "U[7](UF):", verify[7]);
    // And their real physical neighbors:
    console.log("  B[1](UB-B side):", verify[45+1], "vs B[7](DB-B side):", verify[45+7]);
    console.log("  L[1](UL-L side):", verify[36+1]);
    console.log("  R[1](UR-R side):", verify[9+1]);
    console.log("  F[1](UF-F side):", verify[18+1]);
  }
  
  // Test: Check adjacency mapping
  console.log("\n=== Adjacency mapping analysis ===");
  console.log("U cross edges use adjSticker positions:");
  const uEdges = getCrossEdges("U");
  for (const e of uEdges) {
    const adjFace = Math.floor(e.adjSticker / 9);
    const adjPos = e.adjSticker % 9;
    console.log(`  U sticker ${e.faceSticker % 9} ↔ Face ${["U","R","F","D","L","B"][adjFace]} position ${adjPos}`);
  }
  
  // The correct mapping should be:
  // U[1] ↔ B[1] (UB edge, B[1] is the B sticker of UB edge confirmed by U CW test)
  // U[3] ↔ L[1] (UL edge)
  // U[5] ↔ R[1] (UR edge)
  // U[7] ↔ F[1] (UF edge)
  // My code currently maps U[1] ↔ B[7] which is WRONG (B[7] = DB edge, not UB)
}

main();
