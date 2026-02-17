const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: 400,
    height: 600,
    backgroundColor: "#111",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { create, update }
};

new Phaser.Game(config);

// ================= GLOBAL =================
let player, obstacles = [];
let lanes = [100, 200, 300];
let currentLane = 1;
let cursors;
let speed, score, gameOver;
let scoreText, highScoreText, nameText;
let spawnDelay, spawnTimer;
let playerName, highScores;
let soundOn = true;

// AUDIO
let audioCtx = null;

// ================= NAME =================
function getPlayerName() {
    playerName = localStorage.getItem("lane_player");
    if (!playerName) {
        playerName = prompt("Enter Your Name:");
        if (!playerName || playerName.trim() === "") playerName = "Player";
        localStorage.setItem("lane_player", playerName);
    }
}

// ================= AUDIO CORE =================

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function tapSound() {
    if (!soundOn) return;
    initAudio();

    const now = audioCtx.currentTime;

    // Soft bass pulse
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();

    bass.type = "sine";
    bass.frequency.value = 120 + speed * 5;

    bass.connect(bassGain);
    bassGain.connect(audioCtx.destination);

    bassGain.gain.setValueAtTime(0.06, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    bass.start(now);
    bass.stop(now + 0.25);

    // Click tone (finger feedback)
    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();

    click.type = "triangle";
    click.frequency.value = 900;

    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);

    clickGain.gain.setValueAtTime(0.03, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    click.start(now);
    click.stop(now + 0.07);
}

function playCollect() {
    if (!soundOn) return;
    initAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.value = 700;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playCrash() {
    if (!soundOn) return;
    initAudio();

    const bufferSize = audioCtx.sampleRate * 0.25;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    source.start();
}

// ================= CREATE =================
function create() {

    getPlayerName();

    gameOver = false;
    obstacles = [];
    speed = 3;
    score = 0;
    spawnDelay = 1000;
    currentLane = 1;

    highScores = JSON.parse(localStorage.getItem("lane_scores")) || {};

    // Road
    this.add.rectangle(200, 300, 260, 600, 0x1e1e1e);
    this.add.rectangle(70, 300, 5, 600, 0x333333);
    this.add.rectangle(330, 300, 5, 600, 0x333333);

    // UI Panel
    this.add.rectangle(200, 55, 360, 90, 0x181818)
        .setStrokeStyle(2, 0x333333);

    // Player
    player = this.add.rectangle(lanes[currentLane], 520, 45, 75, 0x00ffaa);
    player.setStrokeStyle(2, 0xffffff);

    cursors = this.input.keyboard.createCursorKeys();

    nameText = this.add.text(200, 20, playerName, {
        fontSize: "18px",
        fill: "#00ffaa",
        fontStyle: "bold"
    }).setOrigin(0.5);

    scoreText = this.add.text(200, 45, "Score: 0", {
        fontSize: "20px",
        fill: "#ffffff"
    }).setOrigin(0.5);

    let best = highScores[playerName] || 0;

    highScoreText = this.add.text(200, 70, "Best: " + best, {
        fontSize: "16px",
        fill: "#aaaaaa"
    }).setOrigin(0.5);

    // Sound toggle
    let soundBtn = this.add.text(370, 20, "🔊", {
        fontSize: "20px"
    }).setOrigin(0.5).setInteractive();

    soundBtn.on("pointerdown", () => {
        soundOn = !soundOn;
        soundBtn.setText(soundOn ? "🔊" : "🔇");
    });

    // First tap unlock audio
    this.input.once("pointerdown", () => {
        initAudio();
    });

    // Spawn
    spawnTimer = this.time.addEvent({
        delay: spawnDelay,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    // Difficulty
    this.time.addEvent({
        delay: 6000,
        callback: () => {
            if (speed < 8) speed += 0.5;
            if (spawnDelay > 500) {
                spawnDelay -= 50;
                spawnTimer.delay = spawnDelay;
            }
        },
        loop: true
    });

    // Touch control
    this.input.on("pointerdown", (pointer) => {
        if (gameOver) return;

        tapSound(); // 🔥 music tied to tap

        if (pointer.x < 200 && currentLane > 0) currentLane--;
        else if (pointer.x >= 200 && currentLane < 2) currentLane++;

        movePlayer.call(this);
    });
}

// ================= UPDATE =================
function update() {

    if (gameOver) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.left) && currentLane > 0) {
        currentLane--;
        tapSound();
        movePlayer.call(this);
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.right) && currentLane < 2) {
        currentLane++;
        tapSound();
        movePlayer.call(this);
    }

    for (let i = 0; i < obstacles.length; i++) {

        obstacles[i].y += speed;

        if (checkCollision(obstacles[i])) {

            if (obstacles[i].type === "red") {
                endGame.call(this);
                return;
            }

            if (obstacles[i].type === "green") {
                score++;
                scoreText.setText("Score: " + score);
                playCollect();
                obstacles[i].destroy();
                obstacles.splice(i, 1);
                i--;
                continue;
            }
        }

        if (obstacles[i].type === "green" && obstacles[i].y > 650) {
            endGame.call(this);
            return;
        }

        if (obstacles[i].y > 650) {
            obstacles[i].destroy();
            obstacles.splice(i, 1);
            i--;
        }
    }
}

// ================= HELPERS =================
function movePlayer() {
    this.tweens.add({
        targets: player,
        x: lanes[currentLane],
        duration: 120,
        ease: "Power2"
    });
}

function spawnObstacle() {
    if (gameOver) return;

    let lane = Phaser.Math.Between(0, 2);
    let isGreen = Phaser.Math.Between(1, 100) <= 25;

    let obstacle = this.add.rectangle(
        lanes[lane],
        -50,
        45,
        75,
        isGreen ? 0x00ff00 : 0xff3333
    );

    obstacle.type = isGreen ? "green" : "red";
    obstacles.push(obstacle);
}

function checkCollision(obj) {
    return (
        Math.abs(obj.x - player.x) < 35 &&
        Math.abs(obj.y - player.y) < 55
    );
}

function endGame() {

    gameOver = true;
    playCrash();

    this.cameras.main.shake(200, 0.01);

    if (!highScores[playerName] || score > highScores[playerName]) {
        highScores[playerName] = score;
        localStorage.setItem("lane_scores", JSON.stringify(highScores));
    }

    this.add.text(200, 300, "GAME OVER", {
        fontSize: "28px",
        fill: "#ff4444"
    }).setOrigin(0.5);

    this.add.text(200, 340, "Tap To Restart", {
        fontSize: "18px",
        fill: "#ffffff"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => {
        this.scene.restart();
    });
}
