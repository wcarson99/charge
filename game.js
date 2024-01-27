var timeStr = "Noon";
var stateStr = "Unknown"
var unitList = [];

var squareX = 60;
var squareY = 60;
var boardRows = 10
var boardColumns = 6

class Example extends Phaser.Scene
{
    preload ()
    {
        this.load.image('buttonBG', 'assets/sprites/button-bg.png');
        this.load.image('buttonText', 'assets/sprites/button-text.png');
        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.image('square_sand', 'assets/square_sand.png');

    }

    timerEvent;
    timeText;
    stateText;

    update_board()
    {
        for (let r = 0; r < boardRows; r++) {
            for (let c = 0; c<boardColumns; c++) {
                let x = c*squareX
                let y = r*squareY
                let image = 'square_empty'
                if ((c+r) % 2==0) {
                    image = 'square_sand'
                }
                console.log('x '+x+' y '+y+' type '+image)
                let square = this.add.image(x,y,image)
                square.displayHeight = squareY 
                square.displayWidth = squareX
                this.board.add(square)
            }
        }
    }
    create ()
    {
        this.timeText = this.add.text(0,0,'time: ', { fontSize: '14px'})
        this.stateText = this.add.text(0,20,'state: '+stateStr, { fontSize: '14px'})
        console.log(this.timeText)
        const bg = this.add.image(0, 0, 'buttonBG');
        const text = this.add.image(0, 0, 'buttonText');

        this.board = this.add.container(200,100);
        this.board.setSize(boardRows*squareX, boardColumns*squareY)

        this.units = this.add.container(200,700);
        this.units.setSize(4*squareX,squareY)

        const container = this.add.container(100, 400, [ bg, text ]);

        container.setSize(bg.width, bg.height);

        container.setInteractive();

        this.input.setDraggable(container);

        container.on('pointerover', () =>
        {

            bg.setTint(0x44ff44);

        });

        container.on('pointerout', () =>
        {

            bg.clearTint();

        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) =>
        {

            gameObject.x = dragX;
            gameObject.y = dragY;

        });

        this.timedEvent = this.time.addEvent({ delay: 2000, callback: this.onTimer, callbackScope: this, loop: true });

    }

    onTimer()
    {
        //this.timeUTC = Date.now();
        //this.timeText.setText('time: '+this.timeUTC)
        $.ajax({
            dataType: "json",
            url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
            success: function (data) {
                //console.log(data)
                timeStr = data['datetime']
                //console.log(timeStr)
            }
        });
        //console.log("Here "+timeStr+" "+this.timeText)
        this.timeText.setText('time: '+timeStr )

        console.log('Before')
        $.ajax({
            dataType: "json",
            url: "http://localhost:8765/games?user_name=wcarson&game_id=6&action=get",
            success: function (data) {
                stateStr = data['state']
                let player = data['public']
                console.log(player)
                for (unit in player['units']) {
            
                }

            }
        });
        this.stateText.setText('state: '+stateStr )
        this.units.removeAll(true)
        this.update_board()


    }   
}


const config = {
    type: Phaser.AUTO,
    width: 600,
    height: 900,
    backgroundColor: '#010101',
    parent: 'phaser-example',
    scene: Example
};

const game = new Phaser.Game(config);
