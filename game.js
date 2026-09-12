"use strict";

/*
 * FORTUNE SPIN - game.js
 * Compatible dengan index.html:
 *
 * #reels
 *   .reel
 *     .reel-strip
 *
 * Fitur:
 * - SPIN berkali-kali
 * - Tidak berhenti setelah spin pertama
 * - 5 reel x 3 baris
 * - Animasi aman di dalam kotak reel
 * - GameEngine.requestSpin() digunakan jika tersedia
 * - Bet + / -
 * - MAX BET
 * - Hold for Auto
 * - Paytable
 * - WIN
 */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================================================
       ELEMENT
    ========================================================= */

    const creditEl = document.getElementById("credit");
    const jackpotEl = document.getElementById("jackpot");
    const winEl = document.getElementById("win");
    const messageEl = document.getElementById("message");

    const reelsContainer = document.getElementById("reels");
    const reels = Array.from(
        document.querySelectorAll(".reel")
    );

    const spinBtn = document.getElementById("spinBtn");

    const betMinus = document.getElementById("betMinus");
    const betPlus = document.getElementById("betPlus");
    const maxBet = document.getElementById("maxBet");

    const infoBtn = document.getElementById("infoBtn");
    const paytableDialog =
        document.getElementById("paytableDialog");

    const closeInfo =
        document.getElementById("closeInfo");

    const paytableEl =
        document.getElementById("paytable");

    const toastEl =
        document.getElementById("toast");

    /* =========================================================
       BET
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

    /* =========================================================
       GAME STATE
    ========================================================= */

    let credit = 1000000;

    let jackpot = 10000000;

    let currentWin = 0;

    /*
     * Hanya true ketika satu putaran sedang berlangsung.
     *
     * Setelah selesai:
     *
     * spinning = false
     *
     * sehingga SPIN berikutnya bisa dilakukan.
     */

    let spinning = false;

    let autoSpin = false;

    let autoTimer = null;

    let holdTimer = null;

    let holdTriggered = false;

    let spinCount = 0;

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
       UTILITY
    ========================================================= */

    function money(value) {

        return Number(value || 0)
            .toLocaleString("id-ID");
    }

    function sleep(ms) {

        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function randomInt(max) {

        if (max <= 0) {
            return 0;
        }

        try {

            if (
                window.crypto &&
                typeof window.crypto.getRandomValues ===
                "function"
            ) {

                const arr =
                    new Uint32Array(1);

                window.crypto.getRandomValues(arr);

                return arr[0] % max;
            }

        } catch (error) {

            console.warn(
                "Secure random gagal:",
                error
            );
        }

        return Math.floor(
            Math.random() * max
        );
    }

    /* =========================================================
       RANDOM SYMBOL
    ========================================================= */

    function randomSymbol() {

        /*
         * Weight:
         *
         * 福     30
         * 🧧     12
         * 🪙     16
         * 🏮     18
         * 🀄     20
         * 🦁      3
         * 🏆      1
         */

        const weights = [
            30,
            12,
            16,
            18,
            20,
            3,
            1
        ];

        const total =
            weights.reduce(
                function (a, b) {
                    return a + b;
                },
                0
            );

        let random =
            randomInt(total);

        for (
            let i = 0;
            i < weights.length;
            i++
        ) {

            if (random < weights[i]) {
                return SYMBOLS[i];
            }

            random -= weights[i];
        }

        return SYMBOLS[0];
    }

    /* =========================================================
       RANDOM GRID
    ========================================================= */

    function randomGrid() {

        const grid = [];

        for (
            let row = 0;
            row < 3;
            row++
        ) {

            const line = [];

            for (
                let col = 0;
                col < 5;
                col++
            ) {

                line.push(
                    randomSymbol()
                );
            }

            grid.push(line);
        }

        return grid;
    }

    /* =========================================================
       RENDER HEADER
    ========================================================= */

    function renderHeader() {

        if (creditEl) {

            creditEl.textContent =
                money(credit);
        }

        if (jackpotEl) {

            jackpotEl.textContent =
                money(jackpot);
        }

        if (winEl) {

            winEl.textContent =
                money(currentWin);
        }

        const betEl =
            document.getElementById("bet");

        if (betEl) {

            betEl.textContent =
                money(BETS[betIndex]);
        }
    }

    /* =========================================================
       MESSAGE
    ========================================================= */

    function setMessage(text) {

        if (messageEl) {

            messageEl.textContent =
                text;
        }
    }

    /* =========================================================
       TOAST
    ========================================================= */

    let toastTimer = null;

    function showToast(text) {

        if (!toastEl) {
            return;
        }

        toastEl.textContent = text;

        toastEl.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer =
            setTimeout(function () {

                toastEl.classList.remove(
                    "show"
                );

            }, 1800);
    }

    /* =========================================================
       CREATE SYMBOL
    ========================================================= */

    function createSymbol(symbol) {

        const element =
            document.createElement("div");

        element.className = "symbol";

        element.textContent = symbol;

        return element;
    }

    /* =========================================================
       GET STRIP
    ========================================================= */

    function getStrip(reel) {

        return reel.querySelector(
            ".reel-strip"
        );
    }

    /* =========================================================
       RENDER COLUMN
    ========================================================= */

    function renderColumn(
        reel,
        values
    ) {

        const strip =
            getStrip(reel);

        if (!strip) {
            return;
        }

        /*
         * Bersihkan isi lama.
         */

        strip.innerHTML = "";

        /*
         * Selalu hanya 3 simbol.
         *
         * Tidak ada transform besar.
         * Tidak ada simbol yang dibiarkan
         * keluar dari reel.
         */

        for (
            let row = 0;
            row < 3;
            row++
        ) {

            const symbol =
                values[row] ??
                randomSymbol();

            strip.appendChild(
                createSymbol(symbol)
            );
        }
    }

    /* =========================================================
       RENDER GRID
    ========================================================= */

    function renderGrid(grid) {

        if (!Array.isArray(grid)) {
            return;
        }

        /*
         * GameEngine menggunakan:
         *
         * grid[row][column]
         *
         * sedangkan setiap reel menyimpan
         * 3 baris.
         */

        for (
            let col = 0;
            col < 5;
            col++
        ) {

            const values = [
                grid?.[0]?.[col] ??
                    randomSymbol(),

                grid?.[1]?.[col] ??
                    randomSymbol(),

                grid?.[2]?.[col] ??
                    randomSymbol()
            ];

            if (reels[col]) {

                renderColumn(
                    reels[col],
                    values
                );
            }
        }
    }

    /* =========================================================
       INITIAL GRID
    ========================================================= */

    function createInitialGrid() {

        const grid =
            randomGrid();

        renderGrid(grid);
    }

    /* =========================================================
       REEL ANIMATION
    ========================================================= */

    async function animateReels() {

        /*
         * Jika HTML tidak mempunyai 5 reel,
         * jangan membuat error.
         */

        if (reels.length === 0) {

            await sleep(1000);

            return;
        }

        /*
         * Hapus highlight sebelumnya.
         */

        clearWin();

        /*
         * Setiap reel berputar dengan waktu
         * sedikit berbeda.
         */

        const promises =
            reels.map(
                function (reel, reelIndex) {

                    return animateSingleReel(
                        reel,
                        reelIndex
                    );
                }
            );

        await Promise.all(promises);
    }

    async function animateSingleReel(
        reel,
        reelIndex
    ) {

        const strip =
            getStrip(reel);

        if (!strip) {
            return;
        }

        /*
         * Tambahkan class spinning.
         * CSS lama boleh menggunakan class ini
         * untuk efek visual.
         */

        reel.classList.add(
            "spinning"
        );

        strip.classList.add(
            "spinning"
        );

        /*
         * Durasi tiap reel berbeda.
         */

        const duration =
            900 +
            (reelIndex * 180);

        const interval =
            80;

        const start =
            Date.now();

        /*
         * Animasi dilakukan dengan mengganti
         * isi simbol, bukan menggeser seluruh
         * strip ke luar kotak.
         */

        while (
            Date.now() - start <
            duration
        ) {

            const temporaryValues = [
                randomSymbol(),
                randomSymbol(),
                randomSymbol()
            ];

            renderColumn(
                reel,
                temporaryValues
            );

            await sleep(interval);
        }

        /*
         * Reel selesai.
         */

        reel.classList.remove(
            "spinning"
        );

        strip.classList.remove(
            "spinning"
        );
    }

    /* =========================================================
       GAME ENGINE REQUEST
    ========================================================= */

    async function requestSpin(bet) {

        /*
         * Gunakan GameEngine jika tersedia.
         */

        if (
            window.GameEngine &&
            typeof window.GameEngine.requestSpin ===
            "function"
        ) {

            return await window.GameEngine
                .requestSpin(bet);
        }

        /*
         * Fallback supaya game tetap bisa
         * berjalan apabila game-engine.js
         * gagal dimuat.
         */

        await sleep(150);

        return {
            requestId:
                "local-" +
                Date.now() +
                "-" +
                randomInt(999999),

            timestamp:
                Date.now(),

            grid:
                randomGrid(),

            wins: [],

            totalWin:
                0
        };
    }

    /* =========================================================
       CLEAR WIN
    ========================================================= */

    function clearWin() {

        document
            .querySelectorAll(
                ".symbol.win, " +
                ".symbol.winner, " +
                ".symbol.winning"
            )
            .forEach(
                function (element) {

                    element.classList.remove(
                        "win",
                        "winner",
                        "winning"
                    );
                }
            );
    }

    /* =========================================================
       HIGHLIGHT WIN
    ========================================================= */

    function highlightWins(result) {

        clearWin();

        if (!result) {
            return;
        }

        /*
         * Jika GameEngine mengirim data wins
         * dengan posisi sel.
         */

        if (Array.isArray(result.wins)) {

            result.wins.forEach(
                function (winData) {

                    if (!winData) {
                        return;
                    }

                    const positions =
                        winData.positions ||
                        winData.cells ||
                        winData.path;

                    if (
                        !Array.isArray(
                            positions
                        )
                    ) {
                        return;
                    }

                    positions.forEach(
                        function (position) {

                            if (
                                !Array.isArray(
                                    position
                                )
                            ) {
                                return;
                            }

                            const row =
                                Number(
                                    position[0]
                                );

                            const col =
                                Number(
                                    position[1]
                                );

                            if (
                                row < 0 ||
                                row > 2 ||
                                col < 0 ||
                                col > 4
                            ) {
                                return;
                            }

                            const reel =
                                reels[col];

                            if (!reel) {
                                return;
                            }

                            const strip =
                                getStrip(
                                    reel
                                );

                            if (!strip) {
                                return;
                            }

                            const symbols =
                                strip.querySelectorAll(
                                    ".symbol"
                                );

                            if (
                                symbols[row]
                            ) {

                                symbols[row]
                                    .classList
                                    .add(
                                        "win"
                                    );
                            }
                        }
                    );
                }
            );
        }
    }

    /* =========================================================
       SPIN ONE TIME
    ========================================================= */

    async function spinOnce() {

        /*
         * Jangan menjalankan dua putaran
         * secara bersamaan.
         */

        if (spinning) {
            return false;
        }

        const bet =
            BETS[betIndex];

        /*
         * Cek kredit.
         */

        if (credit < bet) {

            showToast(
                "Kredit tidak cukup."
            );

            setMessage(
                "Kredit tidak cukup untuk SPIN"
            );

            stopAuto();

            return false;
        }

        /*
         * LOCK
         */

        spinning = true;

        spinCount++;

        if (spinBtn) {

            spinBtn.disabled = true;

            spinBtn.classList.add(
                "spinning"
            );
        }

        /*
         * Reset WIN.
         */

        currentWin = 0;

        clearWin();

        setMessage(
            "Putaran " +
            spinCount +
            " sedang berjalan..."
        );

        /*
         * Kurangi kredit.
         */

        credit -= bet;

        /*
         * Tambahkan jackpot.
         */

        jackpot +=
            Math.floor(
                bet * 0.02
            );

        renderHeader();

        try {

            /*
             * Minta hasil dari GameEngine.
             */

            const resultPromise =
                requestSpin(bet);

            /*
             * Jalankan animasi.
             */

            await animateReels();

            /*
             * Tunggu hasil engine.
             */

            const result =
                await resultPromise;

            /*
             * Ambil grid.
             */

            const grid =
                Array.isArray(
                    result?.grid
                )
                    ? result.grid
                    : randomGrid();

            /*
             * Tampilkan hasil akhir.
             */

            renderGrid(grid);

            /*
             * Ambil WIN.
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
             * Simpan WIN.

             */

            currentWin =
                totalWin;

            /*
             * Tambahkan kemenangan
             * ke kredit.
             */

            if (
                totalWin > 0
            ) {

                credit +=
                    totalWin;

                highlightWins(
                    result
                );

                setMessage(
                    "WIN +" +
                    money(totalWin)
                );

                showToast(
                    "WIN +" +
                    money(totalWin)
                );

            } else {

                setMessage(
                    "Putaran selesai"
                );
            }

            renderHeader();

            return true;

        } catch (error) {

            console.error(
                "FORTUNE SPIN ERROR:",
                error
            );

            /*
             * Jika terjadi error,
             * kembalikan taruhan.
             */

            credit += bet;

            currentWin = 0;

            renderHeader();

            setMessage(
                "Spin gagal. Kredit dikembalikan."
            );

            showToast(
                "Spin gagal."
            );

            return false;

        } finally {

            /*
             * =================================================
             * SANGAT PENTING
             * =================================================
             *
             * Kunci spin dilepas SETELAH setiap putaran.
             *
             * Jadi:
             *
             * SPIN 1
             *   ↓
             * selesai
             *   ↓
             * spinning = false
             *   ↓
             * SPIN 2
             *   ↓
             * selesai
             *   ↓
             * spinning = false
             *   ↓
             * SPIN 3
             *   ↓
             * dst.
             */

            spinning = false;

            if (spinBtn) {

                spinBtn.disabled =
                    false;

                spinBtn.classList.remove(
                    "spinning"
                );
            }

            /*
             * Kalau Auto Spin aktif,
             * lanjutkan putaran berikutnya.
             */

            if (autoSpin) {

                scheduleAutoSpin();
            }
        }
    }

    /* =========================================================
       NORMAL SPIN
    ========================================================= */

    async function spin() {

        if (autoSpin) {
            return;
        }

        return await spinOnce();
    }

    /* =========================================================
       BET -
    ========================================================= */

    function decreaseBet() {

        if (spinning) {
            return;
        }

        if (betIndex > 0) {

            betIndex--;
        }

        renderHeader();
    }

    /* =========================================================
       BET +
    ========================================================= */

    function increaseBet() {

        if (spinning) {
            return;
        }

        if (
            betIndex <
            BETS.length - 1
        ) {

            betIndex++;
        }

        renderHeader();
    }

    /* =========================================================
       MAX BET
    ========================================================= */

    function setMaxBet() {

        if (spinning) {
            return;
        }

        betIndex =
            BETS.length - 1;

        renderHeader();
    }

    /* =========================================================
       AUTO SPIN
    ========================================================= */

    function startAuto() {

        if (autoSpin) {
            return;
        }

        autoSpin = true;

        setMessage(
            "Auto Spin aktif"
        );

        showToast(
            "Auto Spin aktif"
        );

        scheduleAutoSpin();
    }

    function stopAuto() {

        autoSpin = false;

        if (autoTimer) {

            clearTimeout(
                autoTimer
            );

            autoTimer = null;
        }

        if (!spinning) {

            setMessage(
                "Tekan SPIN untuk bermain"
            );
        }
    }

    function scheduleAutoSpin() {

        if (!autoSpin) {
            return;
        }

        if (autoTimer) {

            clearTimeout(
                autoTimer
            );
        }

        autoTimer =
            setTimeout(
                async function () {

                    autoTimer = null;

                    if (!autoSpin) {
                        return;
                    }

                    if (spinning) {

                        scheduleAutoSpin();

                        return;
                    }

                    const bet =
                        BETS[betIndex];

                    if (
                        credit < bet
                    ) {

                        stopAuto();

                        showToast(
                            "Auto Spin berhenti: kredit habis"
                        );

                        return;
                    }

                    await spinOnce();

                },
                1600
            );
    }

    /* =========================================================
       HOLD BUTTON
    ========================================================= */

    function beginHold() {

        if (!spinBtn) {
            return;
        }

        if (
            spinning ||
            autoSpin
        ) {
            return;
        }

        holdTriggered = false;

        clearTimeout(
            holdTimer
        );

        holdTimer =
            setTimeout(
                function () {

                    holdTriggered =
                        true;

                    startAuto();

                },
                650
            );
    }

    function endHold() {

        clearTimeout(
            holdTimer
        );

        holdTimer = null;
    }

    /* =========================================================
       SPIN BUTTON EVENTS
    ========================================================= */

    if (spinBtn) {

        spinBtn.addEventListener(
            "pointerdown",
            function () {

                if (
                    spinBtn.disabled
                ) {
                    return;
                }

                beginHold();
            }
        );

        spinBtn.addEventListener(
            "pointerup",
            function () {

                endHold();
            }
        );

        spinBtn.addEventListener(
            "pointercancel",
            function () {

                endHold();
            }
        );

        spinBtn.addEventListener(
            "pointerleave",
            function () {

                endHold();
            }
        );

        spinBtn.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();

                /*
                 * Kalau tombol ditahan sampai
                 * Auto Spin aktif, jangan melakukan
                 * spin manual tambahan.
                 */

                if (
                    holdTriggered
                ) {

                    holdTriggered =
                        false;

                    return;
                }

                /*
                 * Kalau Auto Spin aktif,
                 * klik tombol untuk berhenti.
                 */

                if (autoSpin) {

                    stopAuto();

                    showToast(
                        "Auto Spin berhenti"
                    );

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
       BET BUTTONS
    ========================================================= */

    if (betMinus) {

        betMinus.addEventListener(
            "click",
            decreaseBet
        );
    }

    if (betPlus) {

        betPlus.addEventListener(
            "click",
            increaseBet
        );
    }

    if (maxBet) {

        maxBet.addEventListener(
            "click",
            setMaxBet
        );
    }

    /* =========================================================
       PAYTABLE
    ========================================================= */

    function buildPaytable() {

        if (!paytableEl) {
            return;
        }

        paytableEl.innerHTML = "";

        const rows = [
            ["福", "2x", "8x", "25x"],
            ["🧧", "5x", "20x", "80x"],
            ["🪙", "3x", "12x", "40x"],
            ["🏮", "2x", "7x", "20x"],
            ["🀄", "2x", "6x", "15x"],
            ["🦁", "10x", "35x", "150x"],
            ["🏆", "20x", "100x", "500x"]
        ];

        const table =
            document.createElement(
                "table"
            );

        const header =
            document.createElement(
                "tr"
            );

        [
            "SIMBOL",
            "3",
            "4",
            "5"
        ].forEach(
            function (text) {

                const th =
                    document.createElement(
                        "th"
                    );

                th.textContent = text;

                header.appendChild(th);
            }
        );

        table.appendChild(header);

        rows.forEach(
            function (row) {

                const tr =
                    document.createElement(
                        "tr"
                    );

                row.forEach(
                    function (value) {

                        const td =
                            document.createElement(
                                "td"
                            );

                        td.textContent =
                            value;

                        tr.appendChild(td);
                    }
                );

                table.appendChild(tr);
            }
        );

        paytableEl.appendChild(
            table
        );
    }

    if (infoBtn) {

        infoBtn.addEventListener(
            "click",
            function () {

                buildPaytable();

                if (
                    paytableDialog &&
                    typeof paytableDialog.showModal ===
                    "function"
                ) {

                    paytableDialog.showModal();

                } else if (
                    paytableDialog
                ) {

                    paytableDialog.setAttribute(
                        "open",
                        ""
                    );
                }
            }
        );
    }

    if (closeInfo) {

        closeInfo.addEventListener(
            "click",
            function () {

                if (
                    paytableDialog &&
                    typeof paytableDialog.close ===
                    "function"
                ) {

                    paytableDialog.close();
                }
            }
        );
    }

    /* =========================================================
       ESC CLOSE DIALOG
    ========================================================= */

    if (paytableDialog) {

        paytableDialog.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    paytableDialog
                ) {

                    if (
                        typeof paytableDialog.close ===
                        "function"
                    ) {

                        paytableDialog.close();
                    }
                }
            }
        );
    }

    /* =========================================================
       KEYBOARD
    ========================================================= */

    document.addEventListener(
        "keydown",
        function (event) {

            /*
             * SPACE = SPIN
             */

            if (
                event.code === "Space" &&
                !event.repeat
            ) {

                event.preventDefault();

                if (
                    !spinning &&
                    !autoSpin
                ) {

                    spinOnce();
                }

                return;
            }

            /*
             * LEFT = BET -
             */

            if (
                event.code === "ArrowLeft"
            ) {

                event.preventDefault();

                decreaseBet();

                return;
            }

            /*
             * RIGHT = BET +
             */

            if (
                event.code === "ArrowRight"
            ) {

                event.preventDefault();

                increaseBet();

                return;
            }

            /*
             * ESC = STOP AUTO
             */

            if (
                event.code === "Escape"
            ) {

                if (autoSpin) {

                    stopAuto();
                }
            }
        }
    );

    /* =========================================================
       INITIALIZE
    ========================================================= */

    createInitialGrid();

    renderHeader();

    setMessage(
        "Tekan SPIN untuk bermain"
    );

    /* =========================================================
       GLOBAL API
    ========================================================= */

    window.FortuneSpin = {

        spin: spinOnce,

        startAuto: startAuto,

        stopAuto: stopAuto,

        increaseBet:
            increaseBet,

        decreaseBet:
            decreaseBet,

        maxBet:
            setMaxBet,

        getState:
            function () {

                return {
                    credit: credit,
                    jackpot: jackpot,
                    win: currentWin,
                    bet: BETS[betIndex],
                    spinning: spinning,
                    autoSpin: autoSpin,
                    spinCount: spinCount
                };
            }
    };

    console.log(
        "FORTUNE SPIN siap."
    );

    console.log(
        "5x3 reel aktif."
    );

    console.log(
        "Repeated SPIN aktif."
    );

});
