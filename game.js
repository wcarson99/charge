/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/
*/

const squareX = 60;
const squareY = 60;
const boardRows = 10;
const boardColumns = 6;
const boardCenterX = squareX*boardColumns/2
const boardCenterY = squareY*boardRows/2

let timeText;


const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}
const levels = [
    {
        map:
            [
                "......",
                ".s....",
                "......",
                "..s...",
                "......",
                "......",
                "...s..",
                "......",
                "....s.",
                "......"
            ],
        players:
        {
            0:
            {
                units:
                    [{ x: 0, y: 0, type: 'soldier' },
                     { x: 0, y: 0, type: 'soldier' }
                    ]
            }
        }
    }
]

class Square
{
    constructor(board, index, type, x, y)
    {
        this.board = board;
        this.index = index;
        this.x = x;
        this.y = y;
        this.contents = [];
        let image = this.board.scene.add.image(x*squareX,y*squareY,type)
        image.setDisplaySize(squareX,squareY)
        board.container.add(image)
    }
}

class Board
{
    constructor(scene, rows, columns, level)
    {
        this.scene = scene;
        this.rows = rows;
        this.columns = columns;
        let x = squareX*columns;
        let y = squareY*rows;
        
        this.container = scene.add.container(100,100);
        this.container.setSize(columns*squareX, rows*squareY)

        this.createMap();
    }

    createMap()
    {
        let i = 0;
        this.data = []
        let level = levels[0]
        let map = level.map
        for (let y = 0; y < map.length; y++)
        {
            let row = map[y]
            console.log(row)
            this.data[y] = [];
            for (let x = 0; x < row.length; x++)
            {
                let type = square_types[row[x]]
                console.log('x '+x+' y '+y+' type '+type)
                this.data[y][x] = new Square(this, i, type, x, y);
                i++;
            }
        }  
        console.log('elements '+this.container.first)
    }
}

class Example extends Phaser.Scene
{
    preload ()
    {
        this.load.image('buttonBG', 'assets/sprites/button-bg.png');
        this.load.image('buttonText', 'assets/sprites/button-text.png');
        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.image('square_sand', 'assets/square_sand.png');
        this.load.image('unit_wall', 'assets/unit_wall.png');

    }

    timerEvent;
    stateText;

    create ()
    {
        this.state = 'Uninitialized'

        timeText = this.add.text(0,0,'time: ', { fontSize: '14px'})
        this.stateText = this.add.text(0,20,'uninitialized', { fontSize: '14px'})
        this.board = new Board(this, boardRows, boardColumns)
        this.stateText.setText('waiting_for_actions')
        //console.log('State is '+this.stateText.text)
        if (false) 
        {
            const bg = this.add.image(0, 0, 'buttonBG');
            const text = this.add.image(0, 0, 'buttonText');
    
            this.board = this.add.container(squareX*boardColumns/10,squareY*boardRows);
            //this.board.setSize(boardRows*squareX, boardColumns*squareY)
    
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
        }
        this.timedEvent = this.time.addEvent({ delay: 2000, callback: this.onTimer, callbackScope: this, loop: true });

    }

    onTimer()
    {
        $.ajax({
            dataType: "json",
            url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
            success: function (data) {
                //console.log(data)
                let timeStr = data['datetime']
                timeText.setText('time: ' + timeStr)
            }
        });
        if (false) {

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
            this.stateText.setText('state: ' + stateStr)
            this.units.removeAll(true)
            this.update_board()



        }
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
