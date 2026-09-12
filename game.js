"use strict";

/*
 * FORTUNE SPIN - GAME.JS
 * Versi perbaikan:
 * - SPIN dapat dimainkan berkali-kali
 * - Tidak berhenti setelah putaran pertama
 * - Tombol SPIN otomatis aktif kembali setelah putaran selesai
 * - HOLD FOR AUTO tetap berfungsi
 * - Bet +/- dan MAX BET tetap berfungsi
 * - Kompatibel dengan .reel dan .reel-strip
 * - Menggunakan GameEngine.requestSpin() jika tersedia
 */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENT
    ========================================================= */

    const creditEl =
        document.getElementById("credit") ||
        document.getElementById("credits") ||
        document.getElementById("kredit");

    const betEl =
        document.getElementById("bet") ||
        document.getElementById("totalBet") ||
        document.getElementById("betAmount");

    const jackpotEl =
        document.getElementById("jackpot") ||
        document.getElementById("jackpotValue");

    const winEl =
        document.getElementById("win") ||
        document.getElementById("winAmount");

    const spinBtn =
        document.getElementById("spinBtn") ||
        document.querySelector(".spin-btn") ||
        document.querySelector("[data-action='spin']");

    const minusBtn =
        document.getElementById("betMinus") ||
        document.getElementById("minusBet") ||
        document.querySelector("[data-action='bet-minus']");

    const plusBtn =
        document.getElementById("betPlus") ||
        document.getElementById("plusBet") ||
        document.querySelector("[data-action='bet-plus']");

    const maxBetBtn =
        document.getElementById("maxBet") ||
        document.querySelector("[data-action='max-bet']");

    const reels = Array.from(document.querySelectorAll(".reel"));

    /* =========================================================
       SETTING
    ========================================================= */

    const BETS = [
        1000,
        5000,
        10000,
        25000,
        50000,
        100000,
        250000,
        500000
    ];

    let betIndex = 2;

    let credit = 1000000;
    let jackpot = 10000000;

    let win = 0;

    /*
     * PENTING:
     * spinning hanya aktif selama SATU putaran.
     * Setelah selesai akan dikembalikan menjadi false.
     */
    let spinning = false;

    let autoSpin = false;
    let autoTimer = null;

    let holdTimer = null;
    let holding = false;

    let spinNumber = 0;

    /* =========================================================
       SYMBOL
    ========================================================= */

    const SYMBOLS = [
        "福",
        "🧧",
        "🪙",
        "🏮",
        "🀄",
        "🦁",
        "🏆"
    ];

    /* =========================================================
       FORMAT
    ========================================================= */

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("id-ID");
    }

    /* =========================================================
       RANDOM
    ========================================================= */

    function randomInt(max) {
        if (max <= 0) return 0;

        try {
            if (
                window.crypto &&
                typeof window.crypto.getRandomValues === "function"
            ) {
                const array = new Uint32Array(1);
                window.crypto.getRandomValues(array);
                return array[0] % max;
            }
        } catch (error) {
            console.warn("Crypto random gagal:", error);
        }

        return Math.floor(Math.random() * max);
    }

    function randomSymbol() {
        const weights = [
            30, // 福
            12, // 🧧
            16, // 🪙
            18, // 🏮
            20, // 🀄
            3,  // 🦁
            1   // 🏆
        ];

        const total = weights.reduce((a, b) => a + b, 0);

        let r = randomInt(total);

        for (let i = 0; i < weights.length; i++) {
            if (r < weights[i]) {
                return SYMBOLS[i];
            }

            r -= weights[i];
        }

        return SYMBOLS[0];
    }

    function randomGrid() {
        const grid = [];

        for (let row = 0; row < 3; row++) {
            const line = [];

            for (let col = 0; col < 5; col++) {
                line.push(randomSymbol());
            }

            grid.push(line);
        }

        return grid;
    }

    /* =========================================================
       UI
    ========================================================= */

    function renderHeader() {

        if (creditEl) {
            creditEl.textContent = formatMoney(credit);
        }

        if (betEl) {
            betEl.textContent = formatMoney(BETS[betIndex]);
        }

        if (jackpotEl) {
            jackpotEl.textContent = formatMoney(jackpot);
        }

        if (winEl) {
            winEl.textContent = formatMoney(win);
        }
    }

    function setWin(value) {
        win = Math.max(0, Number(value) || 0);

        if (winEl) {
            winEl.textContent = formatMoney(win);
        }
    }

    /* =========================================================
       SPIN BUTTON STATE
    ========================================================= */

    function updateSpinButton() {

        if (!spinBtn) return;

        if (spinning) {

            spinBtn.disabled = true;

            spinBtn.classList.add("spinning");

            const text =
                spinBtn.querySelector(".spin-text") ||
                spinBtn.querySelector("span");

            if (text) {
                text.textContent = "SPIN...";
            }

        } else {

            spinBtn.disabled = false;

            spinBtn.classList.remove("spinning");

            const text =
                spinBtn.querySelector(".spin-text") ||
                spinBtn.querySelector("span");

            if (text) {
                text.textContent = "SPIN";
            }
        }
    }

    /* =========================================================
       REEL RENDER
    ========================================================= */

    function getReelStrip(reel) {
        return (
            reel.querySelector(".reel-strip") ||
            reel.querySelector(".symbols") ||
            reel
        );
    }

    function createSymbolElement(symbol) {

        const el = document.createElement("div");

        el.className = "symbol";

        el.textContent = symbol;

        return el;
    }

    function renderGrid(grid) {

        if (!reels.length) {
            return;
        }

        /*
         * Grid dari GameEngine:
         *
         * [
         *   [row1,row1,row1,row1,row1],
         *   [row2,row2,row2,row2,row2],
         *   [row3,row3,row3,row3,row3]
         * ]
         *
         * Reel membutuhkan:
         * reel 0 = row1/row2/row3 kolom 0
         * reel 1 = row1/row2/row3 kolom 1
         * dst.
         */

        reels.forEach((reel, col) => {

            const strip = getReelStrip(reel);

            if (!strip) return;

            strip.innerHTML = "";

            for (let row = 0; row < 3; row++) {

                const symbol =
                    grid?.[row]?.[col] ??
                    randomSymbol();

                const element =
                    createSymbolElement(symbol);

                strip.appendChild(element);
            }

            strip.style.transform = "translateY(0)";
        });
    }

    /* =========================================================
       CLEAR WIN
    ========================================================= */

    function clearWinHighlight() {

        document
            .querySelectorAll(
                ".symbol.win, .symbol.winner, .winning, .win-symbol"
            )
            .forEach(el => {
                el.classList.remove(
                    "win",
                    "winner",
                    "winning",
                    "win-symbol"
                );
            });
    }

    /* =========================================================
       HIGHLIGHT WIN
    ========================================================= */

    function highlightWins(result) {

        clearWinHighlight();

        if (!result) return;

        /*
         * Jika GameEngine mengirim posisi kemenangan.
         */

        if (Array.isArray(result.wins)) {

            result.wins.forEach(winData => {

                if (!winData) return;

                let positions =
                    winData.positions ||
                    winData.cells ||
                    winData.path;

                if (!Array.isArray(positions)) {
                    return;
                }

                positions.forEach(position => {

                    if (!Array.isArray(position)) {
                        return;
                    }

                    const row = Number(position[0]);
                    const col = Number(position[1]);

                    if (
                        Number.isInteger(row) &&
                        Number.isInteger(col) &&
                        row >= 0 &&
                        row < 3 &&
                        col >= 0 &&
                        col < reels.length
                    ) {

                        const strip =
                            getReelStrip(reels[col]);

                        const symbols =
                            strip.querySelectorAll(".symbol");

                        if (symbols[row]) {

                            symbols[row].classList.add("win");

                        }
                    }
                });
            });

            return;
        }

        /*
         * Fallback:
         * cari simbol sama dalam baris.
         */

        const grid =
            Array.isArray(result.grid)
                ? result.grid
                : null;

        if (!grid) return;

        for (let row = 0; row < 3; row++) {

            const first =
                grid?.[row]?.[0];

            if (!first) continue;

            let count = 1;

            for (let col = 1; col < 5; col++) {

                if (grid?.[row]?.[col] === first) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 3) {

                for (let col = 0; col < count; col++) {

                    if (!reels[col]) continue;

                    const strip =
                        getReelStrip(reels[col]);

                    const symbols =
                        strip.querySelectorAll(".symbol");

                    if (symbols[row]) {
                        symbols[row].classList.add("win");
                    }
                }
            }
        }
    }

    /* =========================================================
       ANIMATE REELS
    ========================================================= */

    function animateReel(reel, delay) {

        return new Promise(resolve => {

            if (!reel) {
                resolve();
                return;
            }

            const strip =
                getReelStrip(reel);

            if (!strip) {
                resolve();
                return;
            }

            reel.classList.add("spinning");

            strip.classList.add("spinning");

            /*
             * Bersihkan transform lama supaya putaran
             * berikutnya tetap bisa berjalan.
             */

            strip.style.transition = "none";
            strip.style.transform = "translateY(0)";

            /*
             * Force reflow.
             */

            void strip.offsetHeight;

            setTimeout(() => {

                strip.style.transition =
                    "transform 1.15s cubic-bezier(.15,.75,.25,1)";

                /*
                 * Nilai visual cukup besar agar terlihat
                 * seperti reel berputar.
                 */

                const distance = 420 + randomInt(180);

                strip.style.transform =
                    "translateY(-" + distance + "px)";

            }, 30);

            setTimeout(() => {

                reel.classList.remove("spinning");

                strip.classList.remove("spinning");

                strip.style.transition = "none";
                strip.style.transform = "translateY(0)";

                resolve();

            }, 1250 + delay);
        });
    }

    async function animateReels() {

        if (!reels.length) {
            await sleep(1000);
            return;
        }

        const promises =
            reels.map((reel, index) =>
                animateReel(reel, index * 90)
            );

        await Promise.all(promises);
    }

    function sleep(ms) {
        return new Promise(resolve =>
            setTimeout(resolve, ms)
        );
    }

    /* =========================================================
       GAME ENGINE
    ========================================================= */

    async function requestSpinFromEngine(bet) {

        /*
         * Gunakan GameEngine jika file
         * game-engine.js tersedia.
         */

        if (
            window.GameEngine &&
            typeof window.GameEngine.requestSpin === "function"
        ) {

            return await window.GameEngine.requestSpin(bet);
        }

        /*
         * Fallback jika GameEngine belum tersedia.
         */

        await sleep(150);

        const grid = randomGrid();

        let totalWin = 0;

        /*
         * Fallback sederhana.
         */

        for (let row = 0; row < 3; row++) {

            const symbol = grid[row][0];

            let count = 1;

            for (let col = 1; col < 5; col++) {

                if (grid[row][col] === symbol) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 3) {

                let multiplier = 0;

                if (count === 3) {
                    multiplier = 2;
                } else if (count === 4) {
                    multiplier = 8;
                } else if (count >= 5) {
                    multiplier = 25;
                }

                totalWin += bet * multiplier;
            }
        }

        return {
            requestId:
                "fallback-" +
                Date.now() +
                "-" +
                randomInt(999999),

            timestamp: Date.now(),

            grid: grid,

            wins: [],

            totalWin: totalWin
        };
    }

    /* =========================================================
       SPIN ONCE
    ========================================================= */

    async function spinOnce() {

        /*
         * Jangan jalankan dua spin secara bersamaan.
         */

        if (spinning) {
            return false;
        }

        const bet = BETS[betIndex];

        if (credit < bet) {

            showToast("Kredit tidak cukup untuk SPIN.");

            stopAutoSpin();

            return false;
        }

        /*
         * LOCK SPIN
         */

        spinning = true;

        updateSpinButton();

        clearWinHighlight();

        setWin(0);

        /*
         * Kurangi kredit saat spin dimulai.
         */

        credit -= bet;

        /*
         * Jackpot bertambah.
         */

        jackpot += Math.floor(bet * 0.02);

        spinNumber++;

        renderHeader();

        try {

            /*
             * Request hasil dilakukan SEBELUM animasi selesai
             * agar hasil sudah siap saat reel berhenti.
             */

            const resultPromise =
                requestSpinFromEngine(bet);

            /*
             * Jalankan animasi reel.
             */

            await animateReels();

            /*
             * Ambil hasil dari engine.
             */

            const result =
                await resultPromise;

            /*
             * Pastikan grid valid.
             */

            const grid =
                Array.isArray(result?.grid)
                    ? result.grid
                    : randomGrid();

            /*
             * Tampilkan hasil.
             */

            renderGrid(grid);

            /*
             * Ambil total WIN.
             */

            const totalWin =
                Math.max(
                    0,
                    Number(
                        result?.totalWin ??
                        result?.win ??
                        0
                    )
                );

            /*
             * Tambahkan kemenangan ke kredit.
             */

            if (totalWin > 0) {

                credit += totalWin;

                setWin(totalWin);

                highlightWins(result);

                showToast(
                    "WIN +" +
                    formatMoney(totalWin)
                );

            } else {

                setWin(0);
            }

            renderHeader();

            return true;

        } catch (error) {

            console.error(
                "FORTUNE SPIN ERROR:",
                error
            );

            /*
             * Jika spin gagal, kredit taruhan
             * dikembalikan kepada pemain.
             */

            credit += bet;

            setWin(0);

            renderHeader();

            showToast(
                "Spin gagal. Kredit dikembalikan."
            );

            return false;

        } finally {

            /*
             * =================================================
             * INI BAGIAN PENTING
             * =================================================
             *
             * Setelah satu putaran selesai,
             * spinning HARUS kembali false.
             *
             * Dengan demikian tombol SPIN bisa
             * ditekan lagi berkali-kali.
             */

            spinning = false;

            updateSpinButton();

            /*
             * Jika AUTO SPIN aktif,
             * lanjutkan putaran berikutnya.
             */

            if (autoSpin) {
                scheduleNextAutoSpin();
            }
        }
    }

    /* =========================================================
       PUBLIC SPIN
    ========================================================= */

    async function spin() {

        return await spinOnce();
    }

    /* =========================================================
       BET
    ========================================================= */

    function decreaseBet() {

        if (spinning) return;

        if (betIndex > 0) {
            betIndex--;
        }

        renderHeader();
    }

    function increaseBet() {

        if (spinning) return;

        if (betIndex < BETS.length - 1) {
            betIndex++;
        }

        renderHeader();
    }

    function maxBet() {

        if (spinning) return;

        betIndex = BETS.length - 1;

        renderHeader();
    }

    /* =========================================================
       AUTO SPIN
    ========================================================= */

    function startAutoSpin() {

        if (autoSpin) {
            return;
        }

        autoSpin = true;

        showToast("Auto Spin aktif");

        scheduleNextAutoSpin();
    }

    function stopAutoSpin() {

        autoSpin = false;

        if (autoTimer) {

            clearTimeout(autoTimer);

            autoTimer = null;
        }

        holding = false;

        if (!spinning) {
            updateSpinButton();
        }

        showToast("Auto Spin berhenti");
    }

    function scheduleNextAutoSpin() {

        if (!autoSpin) {
            return;
        }

        if (autoTimer) {
            clearTimeout(autoTimer);
        }

        autoTimer = setTimeout(async () => {

            autoTimer = null;

            if (!autoSpin) {
                return;
            }

            if (spinning) {

                scheduleNextAutoSpin();

                return;
            }

            const bet = BETS[betIndex];

            if (credit < bet) {

                autoSpin = false;

                showToast(
                    "Auto Spin berhenti: kredit habis"
                );

                updateSpinButton();

                return;
            }

            await spinOnce();

        }, 1800);
    }

    /* =========================================================
       HOLD FOR AUTO
    ========================================================= */

    function beginHold() {

        if (!spinBtn) return;

        if (spinning) return;

        holding = false;

        clearTimeout(holdTimer);

        holdTimer = setTimeout(() => {

            holding = true;

            if (!autoSpin) {
                startAutoSpin();
            }

        }, 650);
    }

    function endHold() {

        clearTimeout(holdTimer);

        holdTimer = null;
    }

    /* =========================================================
       SPIN BUTTON EVENTS
    ========================================================= */

    if (spinBtn) {

        /*
         * Pointer Down
         */

        spinBtn.addEventListener(
            "pointerdown",
            event => {

                if (spinBtn.disabled) {
                    return;
                }

                beginHold();
            }
        );

        /*
         * Pointer Up
         */

        spinBtn.addEventListener(
            "pointerup",
            event => {

                endHold();
            }
        );

        /*
         * Pointer Cancel
         */

        spinBtn.addEventListener(
            "pointercancel",
            event => {

                endHold();
            }
        );

        /*
         * Pointer Leave
         */

        spinBtn.addEventListener(
            "pointerleave",
            event => {

                endHold();
            }
        );

        /*
         * CLICK
         *
         * Klik biasa = satu spin.
         *
         * Klik saat auto spin = stop auto.
         */

        spinBtn.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                /*
                 * Jika sebelumnya HOLD,
                 * jangan jalankan spin tambahan.
                 */

                if (holding) {

                    holding = false;

                    return;
                }

                /*
                 * Jika Auto Spin sedang aktif,
                 * klik tombol untuk menghentikan.
                 */

                if (autoSpin) {

                    stopAutoSpin();

                    return;
                }

                /*
                 * Spin normal.
                 */

                await spinOnce();
            }
        );
    }

    /* =========================================================
       BET BUTTON EVENTS
    ========================================================= */

    if (minusBtn) {

        minusBtn.addEventListener(
            "click",
            decreaseBet
        );
    }

    if (plusBtn) {

        plusBtn.addEventListener(
            "click",
            increaseBet
        );
    }

    if (maxBetBtn) {

        maxBetBtn.addEventListener(
            "click",
            maxBet
        );
    }

    /* =========================================================
       PAYTABLE / INFO
    ========================================================= */

    const infoBtn =
        document.getElementById("infoBtn") ||
        document.getElementById("paytableBtn") ||
        document.querySelector("[data-action='info']");

    const paytable =
        document.getElementById("paytable") ||
        document.getElementById("paytableModal") ||
        document.getElementById("infoModal");

    const closePaytable =
        document.getElementById("closePaytable") ||
        document.getElementById("closeModal") ||
        document.querySelector(".close-modal");

    if (infoBtn && paytable) {

        infoBtn.addEventListener(
            "click",
            () => {

                paytable.classList.add("show");

                paytable.style.display = "flex";
            }
        );
    }

    if (closePaytable && paytable) {

        closePaytable.addEventListener(
            "click",
            () => {

                paytable.classList.remove("show");

                paytable.style.display = "";
            }
        );
    }

    if (paytable) {

        paytable.addEventListener(
            "click",
            event => {

                if (event.target === paytable) {

                    paytable.classList.remove("show");

                    paytable.style.display = "";
                }
            }
        );
    }

    /* =========================================================
       TOAST
    ========================================================= */

    let toastTimer = null;

    function showToast(message) {

        let toast =
            document.getElementById("toast");

        if (!toast) {

            toast =
                document.createElement("div");

            toast.id = "toast";

            toast.style.position = "fixed";
            toast.style.left = "50%";
            toast.style.bottom = "30px";
            toast.style.transform =
                "translateX(-50%)";
            toast.style.zIndex = "99999";
            toast.style.padding = "10px 18px";
            toast.style.borderRadius = "10px";
            toast.style.fontSize = "14px";
            toast.style.fontWeight = "700";
            toast.style.pointerEvents = "none";
            toast.style.transition =
                "opacity .2s ease";

            document.body.appendChild(toast);
        }

        toast.textContent = message;

        toast.style.opacity = "1";

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {

            toast.style.opacity = "0";

        }, 1800);
    }

    /* =========================================================
       KEYBOARD
    ========================================================= */

    document.addEventListener(
        "keydown",
        event => {

            /*
             * SPACE = SPIN
             */

            if (
                event.code === "Space" &&
                !event.repeat
            ) {

                event.preventDefault();

                if (!spinning && !autoSpin) {
                    spinOnce();
                }

                return;
            }

            /*
             * ARROW LEFT = BET -
             */

            if (event.code === "ArrowLeft") {

                event.preventDefault();

                decreaseBet();

                return;
            }

            /*
             * ARROW RIGHT = BET +
             */

            if (event.code === "ArrowRight") {

                event.preventDefault();

                increaseBet();

                return;
            }

            /*
             * ESC = STOP AUTO
             */

            if (event.code === "Escape") {

                if (autoSpin) {
                    stopAutoSpin();
                }
            }
        }
    );

    /* =========================================================
       INITIAL GRID
    ========================================================= */

    function initialGrid() {

        /*
         * Coba gunakan grid awal.
         */

        const grid = randomGrid();

        renderGrid(grid);
    }

    /* =========================================================
       INIT
    ========================================================= */

    renderHeader();

    initialGrid();

    updateSpinButton();

    /* =========================================================
       GLOBAL API
    ========================================================= */

    window.FortuneSpin = {

        spin: spin,

        spinOnce: spinOnce,

        startAuto: startAutoSpin,

        stopAuto: stopAutoSpin,

        increaseBet: increaseBet,

        decreaseBet: decreaseBet,

        maxBet: maxBet,

        getState: () => ({
            credit,
            jackpot,
            win,
            bet: BETS[betIndex],
            spinning,
            autoSpin,
            spinNumber
        })
    };

    console.log(
        "FORTUNE SPIN siap dimainkan."
    );

    console.log(
        "SPIN dapat dilakukan berkali-kali."
    );

});
