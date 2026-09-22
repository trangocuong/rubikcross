/**
 * Cross Solver using IDA* (Iterative Deepening A*) with the custom CubeState.
 * Finds the optimal (shortest) solution to solve the cross for a given face.
 */

import type { CubeColors } from "./cubeState";
import { cloneCube, applyMove, isCrossSolved } from "./cubeState";

const faces = ["U", "D", "F", "B", "R", "L"];
const modifiers = ["", "'", "2"];

interface MoveInfo {
  name: string;
  face: string;
}

const allMoves: MoveInfo[] = [];
for (const f of faces) {
  for (const m of modifiers) {
    allMoves.push({ name: f + m, face: f });
  }
}

const oppositeFaces: Record<string, string> = {
  "U": "D", "D": "U",
  "F": "B", "B": "F",
  "R": "L", "L": "R"
};

function isRedundant(lastFace: string, newFace: string): boolean {
  if (!lastFace) return false;
  // Same face twice in a row is always redundant (combined into one move)
  if (lastFace === newFace) return true;
  // For opposite faces, enforce an ordering to avoid duplicates like U D vs D U
  if (oppositeFaces[lastFace] === newFace && lastFace > newFace) return true;
  return false;
}

/**
 * Solves the cross optimally using IDA*.
 * @param scrambledCube - The cube state after scramble
 * @param crossFace - Which face to solve the cross on ("U", "D", etc.)
 * @param maxDepth - Maximum search depth (8 is usually enough for any cross)
 * @returns The solution string, or null if not found within maxDepth
 */
export async function solveCross(
  scrambledCube: CubeColors,
  crossFace: number,
  maxDepth: number = 8
): Promise<string | null> {

  // Check if already solved
  if (isCrossSolved(scrambledCube, crossFace)) return "";

  for (let depth = 1; depth <= maxDepth; depth++) {
    const result = dfs(scrambledCube, crossFace, depth, "", []);
    if (result !== null) {
      return result;
    }
    // Yield to the event loop between depth iterations so the UI doesn't freeze
    await new Promise(r => setTimeout(r, 0));
  }

  return null;
}

function dfs(
  cube: CubeColors,
  crossFace: number,
  depthRemaining: number,
  lastFace: string,
  movesSoFar: string[]
): string | null {
  if (depthRemaining === 0) {
    return isCrossSolved(cube, crossFace) ? movesSoFar.join(" ") : null;
  }

  for (const move of allMoves) {
    if (isRedundant(lastFace, move.face)) continue;

    const newCube = cloneCube(cube);
    applyMove(newCube, move.name);

    movesSoFar.push(move.name);
    const result = dfs(newCube, crossFace, depthRemaining - 1, move.face, movesSoFar);
    if (result !== null) return result;
    movesSoFar.pop();
  }

  return null;
}
