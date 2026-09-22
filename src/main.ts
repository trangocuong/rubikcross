import "cubing/twisty";
// @ts-ignore
import Cube from "cubejs";
import { Alg } from "cubing/alg";
import type { CubeColors } from "./cubeState";
import {
  createSolvedCube,
  applyAlgorithm,
  isCrossSolved,
} from "./cubeState";
import { solveCross } from "./crossSolver";

// ─── DOM Elements ───
const player = document.querySelector("#player") as any;
const btnScramble = document.querySelector("#btn-scramble") as HTMLButtonElement;
const scrambleText = document.querySelector("#scramble-text") as HTMLDivElement;
const customScrambleInput = document.querySelector("#custom-scramble-input") as HTMLInputElement;
const btnApplyScramble = document.querySelector("#btn-apply-scramble") as HTMLButtonElement;
const cbPreOriented = document.querySelector("#cb-pre-oriented") as HTMLInputElement;
const colorOptions = document.querySelectorAll(".color-btn");
const userSolutionInput = document.querySelector("#user-solution") as HTMLInputElement;
const btnPlaySolution = document.querySelector("#btn-play-solution") as HTMLButtonElement;
const btnCheckSolution = document.querySelector("#btn-check-solution") as HTMLButtonElement;
const feedbackMsg = document.querySelector("#feedback-message") as HTMLDivElement;
const btnShowOptimal = document.querySelector("#btn-show-optimal") as HTMLButtonElement;
const optimalContainer = document.querySelector("#optimal-solution-container") as HTMLDivElement;
const optimalGrid = document.querySelector("#optimal-solution-grid") as HTMLDivElement;
// Setup global function for play buttons
(window as any).playHintAlg = function(algStr: string, color: string) {
  if (!currentScrambleStr) return;
  // We must set the twisty player's alg.
  // The twisty player ALREADY has the setupAlg applied which puts currentCrossColor on the bottom.
  // If the user clicks play for a DIFFERENT color, it will play relative to the CURRENT holding orientation!
  // To make it physically correct, the alg given by the solver is relative to color `c` being on the bottom.
  // Wait, if the player is currently holding White on bottom, and the user plays the Red cross solution...
  // The Red cross solution expects Red on bottom!
  // So we must temporarily change the player's setupAlg to match color `c`!
  // Actually, a better UX is to switch the app's current cross color to `color` when they click play!
  if (currentCrossColor !== color) {
    const btn = document.querySelector(`.color-btn[data-color="${color}"]`) as HTMLButtonElement;
    if (btn) btn.click(); // This will trigger updateStateForOrientation and hide optimal hints...
    // Wait, if it hides hints, that's bad.
  }

  // Let's just set the player alg. The twisty player is smart enough? 
  // No, the solution is relative to color `c` on bottom.
  // If we want to play it correctly on the current player, we must apply the rotation difference.
  // Or we just update the player's experimentalSetupAlg without triggering a full app reset!
  
  const isPreOriented = cbPreOriented.checked;
  const rot1 = crossRotations[currentCrossColor] || "";
  const invRot1 = invCrossRotations[currentCrossColor] || "";
  
  const physicalWcaScramble = isPreOriented ? 
    (rot1 ? `${rot1} ${currentScrambleStr} ${invRot1}` : currentScrambleStr) : 
    currentScrambleStr;
  
  const setupForC = physicalWcaScramble + " " + (crossRotations[color] || "");
  player.experimentalSetupAlg = setupForC;
  player.alg = new Alg(algStr);
  player.timestamp = 0;
  player.play();
};

// ─── State ───
let currentScrambleStr = "";
let currentCrossColor = "white";
let scrambledCubeState: CubeColors | null = null;

const crossRotations: Record<string, string> = {
  white: "z2",
  yellow: "",
  red: "z",
  orange: "z'",
  green: "x'",
  blue: "x"
};

const invCrossRotations: Record<string, string> = {
  white: "z2",
  yellow: "",
  red: "z'",
  orange: "z",
  green: "x",
  blue: "x'"
};

// ─── Setup Event Listeners ───
function init() {
  btnScramble.addEventListener("click", generateScramble);
  btnApplyScramble.addEventListener("click", applyCustomScramble);
  cbPreOriented.addEventListener("change", updateStateForOrientation);
  btnCheckSolution.addEventListener("click", checkUserSolution);
  btnPlaySolution.addEventListener("click", playUserSolution);
  
  btnShowOptimal.addEventListener("click", () => {
    optimalContainer.classList.remove("hidden");
    btnShowOptimal.classList.add("hidden");
    updateOptimalSolution();
  });

  colorOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorOptions.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCrossColor = (btn as HTMLElement).dataset.color || "white";
      updateStateForOrientation();
    });
  });
}

// ─── Orientation Logic ───
// Whenever the scramble or the cross color changes, we must update the internal state
// and the 3D player to reflect the correct holding orientation.
function updateStateForOrientation() {
  if (!currentScrambleStr) return;

  const isPreOriented = cbPreOriented.checked;
  const rotAlg = crossRotations[currentCrossColor] || "";
  
  let setupAlgStr = "";
  if (isPreOriented) {
    setupAlgStr = rotAlg ? rotAlg + " " + currentScrambleStr : currentScrambleStr;
  } else {
    setupAlgStr = currentScrambleStr + (rotAlg ? " " + rotAlg : "");
  }

  // Update Indicator Text
  const indicator = document.querySelector("#orientation-indicator");
  if (indicator) {
    const colorNames: Record<string, string> = {
      white: "Trắng", yellow: "Vàng", red: "Đỏ", orange: "Cam", green: "Xanh Lá", blue: "Xanh Dương"
    };
    const frontNames: Record<string, string> = {
      white: "Xanh Lá", yellow: "Xanh Lá", red: "Xanh Lá", orange: "Xanh Lá", green: "Trắng", blue: "Vàng"
    };
    indicator.textContent = `(Đang mô phỏng: Đáy ${colorNames[currentCrossColor]}, Trước ${frontNames[currentCrossColor]})`;
  }

  // Update 3D Player Setup
  player.experimentalSetupAlg = new Alg(setupAlgStr);
  const userAlg = userSolutionInput.value.trim();
  player.alg = userAlg ? new Alg(userAlg) : new Alg("");

  // Update Internal State
  scrambledCubeState = createSolvedCube();
  applyAlgorithm(scrambledCubeState, setupAlgStr);

  // Compute optimal solution in background
  updateOptimalSolution();
}

// ─── Scramble ───
let solverInitialized = false;

async function generateScramble() {
  btnScramble.disabled = true;
  btnScramble.textContent = "Đang tạo...";

  try {
    if (!solverInitialized) {
      Cube.initSolver();
      solverInitialized = true;
    }
    
    // Generates a true random-state WCA-compliant scramble
    currentScrambleStr = Cube.scramble();
    scrambleText.textContent = currentScrambleStr;

    userSolutionInput.value = "";
    feedbackMsg.classList.add("hidden");
    optimalContainer.classList.add("hidden");
    btnShowOptimal.classList.remove("hidden");
    btnShowOptimal.textContent = "Xem gợi ý toàn diện (Phân tích Trắng/Vàng)";
    optimalGrid.innerHTML = "";

    updateStateForOrientation();
  } catch (err) {
    console.error("Scramble error:", err);
  } finally {
    btnScramble.disabled = false;
    btnScramble.textContent = "Tạo Scramble";
  }
}

// ─── Custom Scramble ───
function applyCustomScramble() {
  const customAlgStr = customScrambleInput.value.trim();
  if (!customAlgStr) return;

  try {
    // Validate by parsing
    new Alg(customAlgStr);
    
    currentScrambleStr = customAlgStr;
    scrambleText.textContent = currentScrambleStr;

    userSolutionInput.value = "";
    feedbackMsg.classList.add("hidden");
    optimalContainer.classList.add("hidden");
    btnShowOptimal.classList.remove("hidden");
    btnShowOptimal.textContent = "Xem gợi ý toàn diện (Phân tích Trắng/Vàng)";
    optimalGrid.innerHTML = "";

    updateStateForOrientation();
  } catch {
    alert("Công thức Scramble không hợp lệ. Vui lòng kiểm tra lại.");
  }
}

// ─── Play user solution on 3D cube ───
function playUserSolution() {
  if (!currentScrambleStr) return;
  const userAlgStr = userSolutionInput.value.trim();
  if (!userAlgStr) return;

  try {
    player.alg = new Alg(userAlgStr);
    player.timestamp = 0;
    player.play();
  } catch {
    showFeedback("Công thức không hợp lệ. Vui lòng kiểm tra lại (VD: y R U R' D2).", "error");
  }
}

// ─── Check user solution ───
function checkUserSolution() {
  if (!currentScrambleStr || !scrambledCubeState) {
    showFeedback("Hãy tạo Scramble trước.", "error");
    return;
  }
  const userAlgStr = userSolutionInput.value.trim();
  if (!userAlgStr) {
    showFeedback("Vui lòng nhập công thức.", "error");
    return;
  }

  try {
    new Alg(userAlgStr);
  } catch {
    showFeedback("Công thức không hợp lệ. Vui lòng kiểm tra lại.", "error");
    return;
  }

  try {
    const cube = scrambledCubeState.slice() as CubeColors;
    applyAlgorithm(cube, userAlgStr);

    // Since we applied the setup rotation, the target cross color is ALWAYS on the D face (face 3).
    const solved = isCrossSolved(cube, 3);

    if (solved) {
      const moveCount = userAlgStr.split(/\s+/).filter(Boolean).length;
      showFeedback(
        `🎉 Tuyệt vời! Cross ${currentCrossColor.toUpperCase()} đã giải xong trong ${moveCount} bước!`,
        "success"
      );
    } else {
      showFeedback(
        "❌ Chưa chính xác. Dấu thập chưa hoàn thành hoặc các cạnh chưa khớp tâm mặt bên.",
        "error"
      );
    }
  } catch (e) {
    console.error(e);
    showFeedback("Có lỗi khi kiểm tra. Vui lòng thử lại.", "error");
  }
}

// ─── Feedback ───
function showFeedback(msg: string, type: "success" | "error") {
  feedbackMsg.textContent = msg;
  feedbackMsg.className = `feedback ${type}`;
}

// ─── Optimal solution ───
async function updateOptimalSolution() {
  if (!currentScrambleStr) return;
  
  btnShowOptimal.disabled = true;
  optimalGrid.innerHTML = "<div style='grid-column: 1 / -1; text-align: center; color: #a1a1aa;'>Đang tính toán tối ưu cho Trắng/Vàng... Vui lòng đợi.</div>";

  const isPreOriented = cbPreOriented.checked;
  const rot1 = crossRotations[currentCrossColor] || "";
  const invRot1 = invCrossRotations[currentCrossColor] || "";
  
  const physicalWcaScramble = isPreOriented ? 
    (rot1 ? `${rot1} ${currentScrambleStr} ${invRot1}` : currentScrambleStr) : 
    currentScrambleStr;

  const colors = ["white", "yellow"];
  const colorNames: Record<string, string> = {
    white: "Trắng", yellow: "Vàng"
  };
  const colorCodes: Record<string, string> = {
    white: "#ffffff", yellow: "#ffd500"
  };

  const results: { color: string, moveCount: number, solution: string }[] = [];

  try {
    for (const c of colors) {
      const setupForC = physicalWcaScramble + " " + (crossRotations[c] || "");
      const cubeC = createSolvedCube();
      applyAlgorithm(cubeC, setupForC);
      
      const solution = await solveCross(cubeC, 3, 8);
      if (solution !== null) {
        const moveCount = solution === "" ? 0 : solution.split(/\s+/).length;
        results.push({ color: c, moveCount, solution });
      } else {
        results.push({ color: c, moveCount: 999, solution: "Không tìm thấy (<= 8 bước)" });
      }
    }
    const frontNames: Record<string, string> = {
      white: "Xanh Lá", yellow: "Xanh Lá", green: "Trắng", blue: "Vàng", red: "Xanh Lá", orange: "Xanh Lá"
    };

    // Find the minimum move count to highlight it
    const bestMoveCount = Math.min(...results.map(r => r.moveCount));
    
    // Fixed order for pairing (White/Yellow, Green/Blue, Red/Orange)
    const displayOrder = ["white", "yellow"];
    results.sort((a, b) => displayOrder.indexOf(a.color) - displayOrder.indexOf(b.color));
    
    let html = "";
    results.forEach((res) => {
      const isBest = res.moveCount === bestMoveCount && res.moveCount < 999;
      const displaySol = res.moveCount === 0 ? "Đã giải sẵn!" : res.solution;
      const name = colorNames[res.color];
      const code = colorCodes[res.color];
      const frontName = frontNames[res.color];
      
      html += `
        <div class="optimal-item ${isBest ? 'best' : ''}">
          <div class="optimal-info">
            <div class="optimal-title" style="display:flex; align-items:center;">
              <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${code}; border:1px solid #ccc; margin-right:6px;"></span>
              Cross ${name} <span style="font-size: 0.85em; font-weight: normal; color: #a1a1aa; margin-left: 6px;">(${res.moveCount} bước)</span>
            </div>
            <div style="font-size: 0.75em; color: #888; margin-top: 2px;">Cầm: Đáy ${name}, Trước ${frontName}</div>
            <div class="optimal-moves" style="margin-top: 4px;">${displaySol}</div>
          </div>
          ${res.moveCount > 0 && res.moveCount < 999 ? `<button class="optimal-play-btn hint-play-btn" data-alg="${res.solution}" data-color="${res.color}">▶ Chạy thử</button>` : ''}
        </div>
      `;
    });

    optimalGrid.innerHTML = html;

    // Attach event listeners safely
    const btns = optimalGrid.querySelectorAll('.hint-play-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const alg = target.getAttribute('data-alg')!;
        const color = target.getAttribute('data-color')!;
        (window as any).playHintAlg(alg, color);
      });
    });

  } catch (err) {
    console.error("Solver error:", err);
    optimalGrid.innerHTML = "<div style='grid-column: 1 / -1; text-align: center; color: #ff5555;'>Có lỗi xảy ra khi tính toán.</div>";
  } finally {
    btnShowOptimal.disabled = false;
  }
}

init();
