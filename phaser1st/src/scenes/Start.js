export default class Start extends Phaser.Scene {
    constructor() {
        super("Start");
    }

    preload() {
        this.load.image("logo", "assets/spaceship.png"); // optional
    }

    create() {

        this.add.text(300, 200, "My First Phaser Game", {
            fontSize: "32px",
            color: "#ffffff"
        });

        this.add.text(320, 260, "Click Anywhere!", {
            fontSize: "20px",
            color: "#ffff00"
        });

        this.input.on("pointerdown", () => {
            console.log("Clicked!");
        });

    }
}

