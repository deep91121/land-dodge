const config = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: 400,
    height: window.innerHeight - 50,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};


new Phaser.Game(config);

let player;
let obstacles = [];
let lanes = [100, 200, 300];
let currentLane = 1;
let cursors;
let speed = 5;
let gameOver = false;
let score = 0;
let scoreText;

function preload() {}

function create() {

    gameOver = false;
    obstacles = [];
    speed = 5;
    score = 0;

    this.cameras.main.setBackgroundColor('#222222');

    player = this.add.rectangle(lanes[currentLane], 520, 50, 80, 0x00ff00);

    cursors = this.input.keyboard.createCursorKeys();

    scoreText = this.add.text(10, 10, "Score: 0", {
        fontSize: "20px",
        fill: "#ffffff"
    });

    // Spawn items faster over time
    this.time.addEvent({
        delay: 800,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    // Increase difficulty every 5 seconds
    this.time.addEvent({
        delay: 5000,
        callback: () => { speed += 1; },
        loop: true
    });
    // Mobile touch control
this.input.on('pointerdown', function (pointer) {

    if (pointer.x < 200 && currentLane > 0) {
        currentLane--;
        player.x = lanes[currentLane];
    }
    else if (pointer.x >= 200 && currentLane < 2) {
        currentLane++;
        player.x = lanes[currentLane];
    }

});

}

function update() {

    if (gameOver) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.left) && currentLane > 0) {
        currentLane--;
        player.x = lanes[currentLane];
    }

    if (Phaser.Input.Keyboard.JustDown(cursors.right) && currentLane < 2) {
        currentLane++;
        player.x = lanes[currentLane];
    }

    for (let i = 0; i < obstacles.length; i++) {

        obstacles[i].y += speed;

        // RED = crash
        if (obstacles[i].type === "red") {
            if (
                Math.abs(obstacles[i].x - player.x) < 40 &&
                Math.abs(obstacles[i].y - player.y) < 60
            ) {
                endGame();
            }
        }

        // GREEN = collect
        if (obstacles[i].type === "green") {
            if (
                Math.abs(obstacles[i].x - player.x) < 40 &&
                Math.abs(obstacles[i].y - player.y) < 60
            ) {
                score++;
                scoreText.setText("Score: " + score);
                obstacles[i].destroy();
                obstacles.splice(i, 1);
                i--;
                continue;
            }

            // If missed green → game over
            if (obstacles[i].y > 650) {
                endGame();
            }
        }

        // Remove red if off screen
        if (obstacles[i].type === "red" && obstacles[i].y > 650) {
            obstacles[i].destroy();
            obstacles.splice(i, 1);
            i--;
        }
    }
}

function spawnObstacle() {

    if (gameOver) return;

    let randomLane = Phaser.Math.Between(0, 2);

    // 70% red, 30% green
    let isGreen = Phaser.Math.Between(1, 100) <= 30;

    let color = isGreen ? 0x00ff00 : 0xff0000;

    let obstacle = this.add.rectangle(
        lanes[randomLane],
        -50,
        50,
        80,
        color
    );

    obstacle.type = isGreen ? "green" : "red";

    obstacles.push(obstacle);
}

function endGame() {
    gameOver = true;
    alert("Game Over! Score: " + score);
    location.reload();
} 





