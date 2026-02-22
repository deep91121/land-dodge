const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: 400,
    height: 600,
    backgroundColor: "#111",

    dom: {
        createContainer: true
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MenuScene, HelpScene, SettingsScene, ScoreScene, GameScene]
};

new Phaser.Game(config);

// ================= GLOBAL =================
let SETTINGS = JSON.parse(localStorage.getItem("lane_settings")) || {
    volume: 0.5,
    difficulty: "easy",
    startSpeed: 2.5,
    maxSpeed: 10,
    spawnDelay: 1200,
    survivalMode: false
};

let playerName = localStorage.getItem("lane_player") || "Player";

// ================= AUDIO =================
let audioCtx = null;

function initAudio() {
    if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, duration = 0.15, type = "triangle") {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(SETTINGS.volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playCrash() {
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++)
        data[i] = Math.random() * 2 - 1;

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(SETTINGS.volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    source.start();
}

// ================= BUTTON =================
function createButton(scene, x, y, label, callback) {

    let btn = scene.add.text(x, y, label, {
        fontSize: "20px",
        backgroundColor: "#222",
        padding: { x: 20, y: 10 },
        fill: "#ffffff"
    }).setOrigin(0.5).setInteractive();

    btn.on("pointerdown", () => {
        playTone(500);
        btn.setStyle({ backgroundColor: "#00aa66" });

        scene.tweens.add({
            targets: btn,
            duration: 120,
            onComplete: () => {
                btn.setStyle({ backgroundColor: "#222" });
                callback();
            }
        });
    });

    return btn;
}

// ================= MENU =================
function MenuScene() { Phaser.Scene.call(this, { key: "MenuScene" }); }
MenuScene.prototype = Object.create(Phaser.Scene.prototype);

MenuScene.prototype.create = function () {

    this.input.once("pointerdown", initAudio);

    this.add.text(200, 120, "CANDLE DODGE",
        { fontSize: "28px", fill: "#00ffaa" }).setOrigin(0.5);

    createButton(this, 200, 220, "PLAY",
        () => this.scene.start("GameScene"));

    createButton(this, 200, 290, "SETTINGS",
        () => this.scene.start("SettingsScene"));

    createButton(this, 200, 360, "HIGH SCORES",
        () => this.scene.start("ScoreScene"));

    createButton(this, 200, 430, "HELP",
        () => this.scene.start("HelpScene"));
};

// ================= HELP =================
function HelpScene() { Phaser.Scene.call(this, { key: "HelpScene" }); }
HelpScene.prototype = Object.create(Phaser.Scene.prototype);

HelpScene.prototype.create = function () {

    this.add.text(200, 50, "HOW TO PLAY",
        { fontSize: "24px", fill: "#00ffaa" }).setOrigin(0.5);

    let helpText = `
MOVE:
Tap left/right or use arrow keys.

OBJECTIVE:
Avoid RED candles.
Collect GREEN candles.

GENERAL MODE:
• Green = +1 point
• Miss green = -1 point
• Score below 0 = Game Over

SURVIVAL MODE:
• Collect ALL green candles
• Missing green = Instant Game Over
• Red candle = Instant Game Over
• Faster speed & spawn rate
`;

    this.add.text(200, 200, helpText, {
        fontSize: "16px",
        align: "center",
        wordWrap: { width: 360 }
    }).setOrigin(0.5);

    createButton(this, 200, 520, "BACK",
        () => this.scene.start("MenuScene"));
};

// ================= SETTINGS =================
function SettingsScene() { Phaser.Scene.call(this, { key: "SettingsScene" }); }
SettingsScene.prototype = Object.create(Phaser.Scene.prototype);

SettingsScene.prototype.create = function () {

    this.add.text(200, 80, "SETTINGS",
        { fontSize: "24px", fill: "#00ffaa" }).setOrigin(0.5);

    // ================= PLAYER NAME =================
    this.add.text(200, 120, "PLAYER NAME", {
        fontSize: "16px",
        fill: "#ffffff"
    }).setOrigin(0.5);

    let nameInput = this.add.dom(200, 150, 'input', {
        width: '180px',
        fontSize: '16px',
        padding: '6px',
        textAlign: 'center'
    });

    nameInput.node.value = playerName;
    nameInput.node.maxLength = 12;

    nameInput.addListener('input');
    nameInput.on('input', function () {

        playerName = nameInput.node.value.trim();

        if (playerName.length === 0) {
            playerName = "Player";
        }

        localStorage.setItem("lane_player", playerName);
    });

    // ================= VOLUME SLIDER =================
    this.add.text(200, 200, "VOLUME", {
        fontSize: "16px",
        fill: "#ffffff"
    }).setOrigin(0.5);

    let volumeText = this.add.text(200, 230,
        Math.round(SETTINGS.volume * 100) + "%",
        { fontSize: "16px" }).setOrigin(0.5);

    let sliderBg = this.add.rectangle(200, 260, 220, 10, 0x444444);

    let handleX = 200 - 110 + SETTINGS.volume * 220;

    let sliderHandle = this.add.circle(handleX, 260, 10, 0x00ffaa)
        .setInteractive({ draggable: true });

    this.input.setDraggable(sliderHandle);

    sliderHandle.on("drag", (pointer, dragX) => {

        dragX = Phaser.Math.Clamp(dragX, 90, 310);
        sliderHandle.x = dragX;

        let value = (dragX - 90) / 220;
        SETTINGS.volume = value;

        volumeText.setText(Math.round(value * 100) + "%");

        localStorage.setItem("lane_settings", JSON.stringify(SETTINGS));
    });

    // ================= DIFFICULTY =================
    this.add.text(200, 310, "DIFFICULTY", {
        fontSize: "16px",
        fill: "#00aa66"
    }).setOrigin(0.5);

    ["easy", "medium", "hard", "survival"].forEach((lvl, i) => {

        let isSelected = SETTINGS.difficulty === lvl;

        let btn = this.add.text(200, 350 + i * 45,
            lvl.toUpperCase(),
            {
                fontSize: "18px",
                backgroundColor: isSelected ? "#00aa66" : "#222",
                padding: { x: 20, y: 8 }
            }
        ).setOrigin(0.5).setInteractive();

        btn.on("pointerdown", () => {

            SETTINGS.difficulty = lvl;
            SETTINGS.survivalMode = false;

            if (lvl === "easy") {
                SETTINGS.startSpeed = 2.5;
                SETTINGS.maxSpeed = 10;
                SETTINGS.spawnDelay = 1200;
                SETTINGS.speedin = 0.0015;
            }

            if (lvl === "medium") {
                SETTINGS.startSpeed = 3.5;
                SETTINGS.maxSpeed = 14;
                SETTINGS.spawnDelay = 900;
                SETTINGS.speedin = 0.001;
            }

            if (lvl === "hard") {
                SETTINGS.startSpeed = 4.5;
                SETTINGS.maxSpeed = 18;
                SETTINGS.spawnDelay = 700;
                SETTINGS.speedin = 0.001;
            }

            if (lvl === "survival") {
                SETTINGS.startSpeed = 5.5;
                SETTINGS.maxSpeed = 22;
                SETTINGS.spawnDelay = 600;
                SETTINGS.speedin =0.002;
                SETTINGS.survivalMode = true;
            }

            localStorage.setItem("lane_settings", JSON.stringify(SETTINGS));
            playTone(700);
            this.scene.restart();
        });
    });

    createButton(this, 200, 570, "BACK",
        () => this.scene.start("MenuScene"));
};
// ================= SCORES =================
function ScoreScene() { Phaser.Scene.call(this, { key: "ScoreScene" }); }
ScoreScene.prototype = Object.create(Phaser.Scene.prototype);

ScoreScene.prototype.create = function () {

    let key = "lane_top10_" + SETTINGS.difficulty;
    let scores = JSON.parse(localStorage.getItem(key)) || [];

    let title = SETTINGS.difficulty === "survival"
        ? "SURVIVAL TOP 10"
        : "TOP 10 - " + SETTINGS.difficulty.toUpperCase();

    this.add.text(200, 100, title,
        { fontSize: "22px", fill: "#ffcc00" }).setOrigin(0.5);

    scores.forEach((entry, i) => {
        this.add.text(200, 150 + i * 30,
            (i + 1) + ". " + entry.name + " - " + entry.score,
            { fontSize: "18px" }).setOrigin(0.5);
    });

    createButton(this, 200, 520, "BACK",
        () => this.scene.start("MenuScene"));
};

// ================= GAME =================
function GameScene() { Phaser.Scene.call(this, { key: "GameScene" }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);

GameScene.prototype.create = function () {

    this.lanes = [100, 200, 300];
    this.currentLane = 1;
    this.speed = SETTINGS.startSpeed;
    this.speedIncrease = SETTINGS.speedin;
    this.score = 0;
    this.gameOver = false;
    this.obstacles = [];

    this.add.rectangle(200, 300, 260, 600, 0x1e1e1e);

    this.player = this.add.rectangle(
        this.lanes[this.currentLane], 520, 45, 75, 0x00ff00);

    this.scoreText = this.add.text(200, 40,
        "Score: 0", { fontSize: "20px" }).setOrigin(0.5);

    this.add.text(200, 10, "Mode: " + SETTINGS.difficulty.toUpperCase(),
        { fontSize: '16px', fill: '#ffffff' }).setOrigin(0.5);

    this.input.on("pointerdown", (pointer) => {
        if (pointer.x < 200) this.moveLane(-1);
        else this.moveLane(1);
    });

    this.input.keyboard.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard.on("keydown-RIGHT", () => this.moveLane(1));

    this.spawnTimer = this.time.addEvent({
        delay: SETTINGS.spawnDelay,
        loop: true,
        callback: this.spawnObstacle,
        callbackScope: this
    });
};

GameScene.prototype.moveLane = function (dir) {

    if (this.gameOver) return;

    this.currentLane = Phaser.Math.Clamp(this.currentLane + dir, 0, 2);

    this.tweens.add({
        targets: this.player,
        x: this.lanes[this.currentLane],
        duration: 120
    });

    playTone(400);
};

GameScene.prototype.spawnObstacle = function () {

    let lane = Phaser.Math.Between(0, 2);
    let greenChance = SETTINGS.survivalMode ? 40 : 25;
    let isGreen = Phaser.Math.Between(1, 100) <= greenChance;

    let obj = this.add.rectangle(
        this.lanes[lane], -50, 45, 75,
        isGreen ? 0x00ff00 : 0xff3333
    );

    obj.type = isGreen ? "green" : "red";
    this.obstacles.push(obj);
};

GameScene.prototype.update = function (time, delta) {

    if (this.gameOver) return;

    if (this.speed < SETTINGS.maxSpeed) {
        this.speed += this.speedIncrease*delta/10;
    }

    for (let i = 0; i < this.obstacles.length; i++) {

        let obj = this.obstacles[i];
        obj.y += this.speed;

        if (Phaser.Geom.Intersects.RectangleToRectangle(
            obj.getBounds(), this.player.getBounds()
        )) {

            if (obj.type === "red") {
                this.endGame();
                return;
            }

            if (obj.type === "green") {
                this.score++;
                this.scoreText.setText("Score: " + this.score);
                playTone(750, 0.1, "square");
                obj.destroy();
                this.obstacles.splice(i, 1);
                i--;
            }
        }

        if (obj.y > 650) {

            if (obj.type === "green") {

                if (SETTINGS.survivalMode) {
                    this.endGame();
                    return;
                } else {
                    this.score--;
                    this.scoreText.setText("Score: " + this.score);
                    playTone(180, 0.15, "sawtooth");
                }
            }

            obj.destroy();
            this.obstacles.splice(i, 1);
            i--;
        }
    }

    if (!SETTINGS.survivalMode && this.score < 0) {
        this.endGame();
    }
};

GameScene.prototype.endGame = function () {

    this.gameOver = true;
    playCrash();

    let key = "lane_top10_" + SETTINGS.difficulty;
    let scores = JSON.parse(localStorage.getItem(key)) || [];

    scores.push({ name: playerName, score: this.score });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);

    localStorage.setItem(key, JSON.stringify(scores));

    this.add.rectangle(200, 300, 400, 600, 0x000000, 0.7);

    this.add.text(200, 260, "GAME OVER",
        { fontSize: "28px", fill: "#ff4444" }).setOrigin(0.5);

    this.add.text(200, 300,
        "Score: " + this.score,
        { fontSize: "20px" }).setOrigin(0.5);

    createButton(this, 200, 360, "RESTART",
        () => this.scene.restart());

    createButton(this, 200, 420, "MENU",
        () => this.scene.start("MenuScene"));
};
