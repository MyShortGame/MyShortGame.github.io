/*
 * GAME ENGINE / RNG DEMO
 * -------------------------------------------------------
 * GitHub Pages hanya menjalankan JavaScript di browser.
 * Karena itu file ini adalah simulasi "Game Server/RNG".
 *
 * Arsitektur demo:
 * Client -> requestSpin() -> Game Engine/RNG -> Result -> Client
 *
 * Untuk produksi, engine ini harus dipindahkan ke backend
 * yang server-authoritative. Demo ini hanya memakai kredit virtual.
 */

(function () {
  "use strict";

  const SYMBOLS = {
    FORTUNE: { icon: "福", name: "Fortune", weight: 30, payouts: { 3: 2, 4: 8, 5: 25 } },
    GOD:     { icon: "🧧", name: "God of Fortune", weight: 12, payouts: { 3: 5, 4: 20, 5: 80 } },
    INGOT:   { icon: "🪙", name: "Golden Ingot", weight: 16, payouts: { 3: 3, 4: 12, 5: 40 } },
    LANTERN: { icon: "🏮", name: "Lantern", weight: 18, payouts: { 3: 2, 4: 7, 5: 20 } },
    COIN:    { icon: "🀄", name: "Lucky Coin", weight: 20, payouts: { 3: 2, 4: 6, 5: 15 } },
    LION:    { icon: "🦁", name: "Lucky Lion", weight: 3, payouts: { 3: 10, 4: 35, 5: 150 } },
    POT:     { icon: "🏆", name: "Treasure Pot", weight: 1, payouts: { 3: 20, 4: 100, 5: 500 } }
  };

  const SYMBOL_KEYS = Object.keys(SYMBOLS);
  const TOTAL_WEIGHT = SYMBOL_KEYS.reduce((sum, key) => sum + SYMBOLS[key].weight, 0);

  // 9 paylines. Angka adalah index baris 0,1,2 untuk masing-masing reel.
  const PAYLINES = [
    [1,1,1,1,1], // 1 tengah
    [0,0,0,0,0], // 2 atas
    [2,2,2,2,2], // 3 bawah
    [0,1,2,1,0], // 4 V
    [2,1,0,1,2], // 5 ^
    [0,0,1,2,2], // 6 turun
    [2,2,1,0,0], // 7 naik
    [1,0,1,2,1], // 8 zigzag
    [1,2,1,0,1]  // 9 zigzag
  ];

  function secureRandomInt(max) {
    if (max <= 1) return 0;
    const cryptoObj = window.crypto || window.msCrypto;

    if (cryptoObj && cryptoObj.getRandomValues) {
      const maxUint = 0xFFFFFFFF;
      const limit = maxUint - (maxUint % max);
      const arr = new Uint32Array(1);
      let value;
      do {
        cryptoObj.getRandomValues(arr);
        value = arr[0];
      } while (value >= limit);
      return value % max;
    }

    return Math.floor(Math.random() * max);
  }

  function weightedSymbol() {
    let roll = secureRandomInt(TOTAL_WEIGHT);
    for (const key of SYMBOL_KEYS) {
      roll -= SYMBOLS[key].weight;
      if (roll < 0) return key;
    }
    return SYMBOL_KEYS[SYMBOL_KEYS.length - 1];
  }

  function makeGrid() {
    return Array.from({ length: 3 }, () =>
      Array.from({ length: 5 }, () => weightedSymbol())
    );
  }

  function evaluate(grid, bet) {
    const wins = [];
    let totalWin = 0;

    PAYLINES.forEach((line, index) => {
      const first = grid[line[0]][0];
      let count = 1;

      for (let reel = 1; reel < 5; reel++) {
        if (grid[line[reel]][reel] === first) count++;
        else break;
      }

      if (count >= 3) {
        const payout = SYMBOLS[first].payouts[count] || 0;
        const amount = Math.floor(bet * payout);

        if (amount > 0) {
          wins.push({
            payline: index + 1,
            symbol: first,
            count,
            amount,
            positions: line.map((row, reel) => ({ row, reel }))
          });
          totalWin += amount;
        }
      }
    });

    // Bonus kecil jika seluruh 5 simbol pada payline sama.
    // Nilainya tetap virtual dan ditentukan oleh paytable.
    return { totalWin, wins };
  }

  async function requestSpin(bet) {
    // Simulasi latency API/server agar alurnya terasa seperti request nyata.
    await new Promise(resolve => setTimeout(resolve, 180));

    const grid = makeGrid();
    const evaluation = evaluate(grid, bet);

    return {
      ok: true,
      requestId: "SPIN-" + Date.now() + "-" + secureRandomInt(1000000),
      timestamp: new Date().toISOString(),
      grid,
      wins: evaluation.wins,
      totalWin: evaluation.totalWin
    };
  }

  window.GameEngine = {
    symbols: SYMBOLS,
    payLines: PAYLINES,
    requestSpin
  };
})();
