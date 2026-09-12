/*
 * CLIENT
 * -------------------------------------------------------
 * Client meminta hasil ke GameEngine, kemudian menjalankan
 * animasi berdasarkan hasil yang sudah ditentukan.
 */

"use strict";

(() => {
  const START_CREDIT = 1000000;
  const START_BET = 10000;
  const BETS = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];

  let credit = START_CREDIT;
  let betIndex = BETS.indexOf(START_BET);
  let spinning = false;
  let autoTimer = null;
  let jackpot = 10000000;

  const $ = id => document.getElementById(id);

  const creditEl = $("credit");
  const betEl = $("bet");
  const winEl = $("win");
  const messageEl = $("message");
  const jackpotEl = $("jackpot");
  const spinBtn = $("spinBtn");
  const reels = [...document.querySelectorAll(".reel")];
  const winLines = $("win-lines");
  const toast = $("toast");

  function fmt(value) {
    return Number(value).toLocaleString("id-ID");
  }

  function updateUI() {
    creditEl.textContent = fmt(credit);
    betEl.textContent = fmt(BETS[betIndex]);
    jackpotEl.textContent = fmt(jackpot);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function createSymbol(key, extraClass = "") {
    const data = GameEngine.symbols[key];
    const el = document.createElement("div");
    el.className = "symbol " + extraClass;
    el.dataset.symbol = key;
    el.title = data.name;
    el.textContent = data.icon;
    return el;
  }

  function randomKey() {
    const keys = Object.keys(GameEngine.symbols);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function clearWins() {
    document.querySelectorAll(".symbol.win").forEach(el => el.classList.remove("win"));
  }

  function renderFinalGrid(grid) {
    reels.forEach((reel, reelIndex) => {
      const strip = reel.querySelector(".reel-strip");
      strip.innerHTML = "";

      for (let row = 0; row < 3; row++) {
        strip.appendChild(createSymbol(grid[row][reel]));
      }

      strip.style.transition = "none";
      strip.style.transform = "translateY(0)";
    });
  }

  function prepareReelAnimation(reel, finalColumn, reelIndex) {
    const strip = reel.querySelector(".reel-strip");
    strip.innerHTML = "";

    // Banyak simbol palsu untuk menciptakan efek putaran.
    const sequence = [];
    const loops = 9 + reelIndex * 2;

    for (let i = 0; i < loops * 3; i++) {
      sequence.push(randomKey());
    }

    sequence.push(finalColumn[0], finalColumn[1], finalColumn[2]);

    sequence.forEach(key => strip.appendChild(createSymbol(key)));

    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";

    // Memastikan browser menerapkan posisi awal sebelum transisi.
    void strip.offsetHeight;

    const reelHeight = reel.clientHeight;
    const cellHeight = reelHeight / 3;
    const finalOffset = (sequence.length - 3) * cellHeight;

    strip.style.transition =
      `transform ${1.15 + reelIndex * 0.18}s cubic-bezier(.12,.75,.2,1)`;
    strip.style.transform = `translateY(-${finalOffset}px)`;

    return 1150 + reelIndex * 180;
  }

  function highlightWins(result) {
    clearWins();

    result.wins.forEach(win => {
      win.positions.forEach(pos => {
        const reel = reels[pos.reel];
        const strip = reel.querySelector(".reel-strip");
        const symbols = [...strip.querySelectorAll(".symbol")];

        // Setelah animasi selesai, tiga simbol terakhir adalah final row 0..2.
        const target = symbols[symbols.length - 3 + pos.row];
        if (target) target.classList.add("win");
      });
    });
  }

  function animateToResult(result) {
    clearWins();

    const durations = result.grid[0].map((_, reelIndex) => {
      const column = [
        result.grid[0][reelIndex],
        result.grid[1][reelIndex],
        result.grid[2][reelIndex]
      ];
      return prepareReelAnimation(reels[reelIndex], column, reelIndex);
    });

    return new Promise(resolve => {
      setTimeout(() => {
        renderFinalGrid(result.grid);
        highlightWins(result);
        resolve();
      }, Math.max(...durations) + 80);
    });
  }

  async function spin() {
    if (spinning) return;

    const currentBet = BETS[betIndex];

    if (credit < currentBet) {
      showToast("Kredit tidak cukup");
      stopAuto();
      return;
    }

    spinning = true;
    spinBtn.disabled = true;
    clearWins();
    winEl.textContent = "0";
    messageEl.textContent = "Menghubungkan ke Game Engine...";

    credit -= currentBet;
    updateUI();

    try {
      // Ini adalah batas API/Server simulasi.
      const result = await GameEngine.requestSpin(currentBet);

      messageEl.textContent = "RNG selesai — menampilkan hasil...";

      await animateToResult(result);

      credit += result.totalWin;

      // Jackpot demo bertambah sedikit setiap spin.
      jackpot += Math.floor(currentBet * 0.02);

      winEl.textContent = fmt(result.totalWin);

      if (result.totalWin > 0) {
        messageEl.textContent =
          `MENANG • ${result.wins.length} payline • ${result.requestId}`;
        showToast(`WIN ${fmt(result.totalWin)}`);
      } else {
        messageEl.textContent = `Belum menang • ${result.requestId}`;
      }

      updateUI();
    } catch (error) {
      credit += currentBet;
      messageEl.textContent = "Terjadi kesalahan. Taruhan dikembalikan.";
      showToast("Spin gagal");
      console.error(error);
      updateUI();
    } finally {
      spinning = false;
      spinBtn.disabled = false;
    }
  }

  function changeBet(direction) {
    if (spinning) return;
    betIndex = Math.max(0, Math.min(BETS.length - 1, betIndex + direction));
    updateUI();
  }

  function maxBet() {
    if (spinning) return;
    betIndex = BETS.length - 1;
    updateUI();
  }

  function startAuto() {
    if (autoTimer || spinning) return;

    showToast("Auto Spin aktif");
    autoTimer = setInterval(async () => {
      if (!spinning) {
        if (credit < BETS[betIndex]) {
          stopAuto();
          showToast("Auto Spin berhenti: kredit habis");
          return;
        }
        await spin();
      }
    }, 3200);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Klik singkat = satu spin. Tekan/tahan = auto spin.
  let holdTimer = null;
  let holding = false;

  spinBtn.addEventListener("pointerdown", event => {
    if (spinning) return;
    holding = false;
    holdTimer = setTimeout(() => {
      holding = true;
      startAuto();
    }, 650);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
    spinBtn.addEventListener(type, () => {
      clearTimeout(holdTimer);
    });
  });

  spinBtn.addEventListener("click", () => {
    if (!holding) {
      if (autoTimer) stopAuto();
      else spin();
    }
    holding = false;
  });

  $("betMinus").addEventListener("click", () => changeBet(-1));
  $("betPlus").addEventListener("click", () => changeBet(1));
  $("maxBet").addEventListener("click", maxBet);

  const dialog = $("paytableDialog");
  $("infoBtn").addEventListener("click", () => {
    buildPaytable();
    dialog.showModal();
  });

  $("closeInfo").addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  function buildPaytable() {
    const container = $("paytable");
    container.innerHTML = "";

    Object.entries(GameEngine.symbols).forEach(([key, data]) => {
      const row = document.createElement("div");
      row.className = "pay-row";
      row.innerHTML = `
        <div class="pay-symbol">${data.icon}</div>
        <span>3× ${fmt(data.payouts[3] || 0)}x</span>
        <span>4× ${fmt(data.payouts[4] || 0)}x</span>
        <span>5× ${fmt(data.payouts[5] || 0)}x</span>
      `;
      container.appendChild(row);
    });
  }

  // Tampilan awal 5x3.
  const initialGrid = [
    ["FORTUNE", "GOD", "FORTUNE", "INGOT", "COIN"],
    ["INGOT", "LANTERN", "FORTUNE", "LION", "COIN"],
    ["FORTUNE", "LANTERN", "FORTUNE", "GOD", "POT"]
  ];
  renderFinalGrid(initialGrid);
  updateUI();
})();
