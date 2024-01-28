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
const numItems = 6;

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
                    [{ c: 0, r: 0, typ: 'soldier' },
                     { c: 3, r: 0, typ: 'soldier' }
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

class Item
{   
    constructor(board, index, type, column)
    {
        this.board = board;
        this.index = index;
        this.column = column;
        let image = this.board.scene.add.image(column*squareX,0,type)
        image.setDisplaySize(squareX,squareY)
        image.setInteractive({ draggable: true})
        board.items.add(image)
    }
}

class Unit
{
    constructor(owner, index, type, column, row)
    {
        console.log(type)
        this.owner = owner
        this.index = index
        this.row = row
        this.column = column
        this.image = this.owner.scene.add.image(column*squareX,row*squareY,type)
        this.image.setDisplaySize(squareX,squareY)
        owner.container.add(this.image)
    }
}

class Board
/*
TODO: Should map be a separate object?
*/
{
    constructor(scene, rows, columns, level)
    {
        this.scene = scene;
        this.rows = rows;
        this.columns = columns
        let x = squareX*columns
        let y = squareY*rows
        
        this.container = scene.add.container(100,120)
        this.container.setSize(columns*squareX, rows*squareY)
        this.createMap()
        this.addUnits()

        this.items = scene.add.container(100,800)
        this.items.setSize(numItems*squareX,squareY)
        this.createItems();
    }

    createMap()
    {
        let i = 0;
        this.mapData = []
        let level = levels[0]
        let mapDef = level.map
        for (let r = 0; r < mapDef.length; r++)
        {
            let row = mapDef[r]
            this.mapData[r] = [];
            for (let c = 0; c < row.length; c++)
            {
                let type = square_types[row[c]]
                this.mapData[r][c] = new Square(this, i, type, c, r);
                i++;
            }   
        }  
    }

    updateMap()
    {
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                // Pop contents and add them to the appropriate square
                let contents = square.contents
                if (contents.length>0) {
                    for (let unit of contents) {
                        unit.image.y +=squareY
                    }
                }
            }
        }
    }
    addUnits() 
    {
        this.unitData = []
        let level = levels[0]
        let units_def = level.players[0].units
        let i = 0
        for (let def of units_def)
        {
            console.log(def)
            const unit = new Unit(this, i, 'unit_'+def.typ, def.c, def.r)
            this.mapData[def.c][def.r].contents.push(unit)
            i++
        } 
    }

    createItems()
    {   
        let i = 0;
        this.itemData = []
        for (let c = 0; c<numItems; c++)
        {
            this.itemData[c] = new Item(this, i, 'unit_soldier',c,0)
            i++
        }
    }

}

class Example extends Phaser.Scene
{
    preload ()
    {
        //this.load.image('buttonBG', 'assets/sprites/button-bg.png');
        //this.load.image('buttonText', 'assets/sprites/button-text.png');
        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.image('square_sand', 'assets/square_sand.png');
        this.load.image('unit_wall', 'assets/unit_wall.png');
        this.load.image('unit_soldier', 'assets/unit_soldier.png');
        this.load.image('button_charge', 'assets/button_charge.png');
    }

    timerEvent;
    stateText;

    create ()
    {
        this.state = 'Uninitialized'

        timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        this.stateText = this.add.text(100,20,'uninitialized', { fontSize: '14px'})
        this.board = new Board(this, boardRows, boardColumns)
        this.stateText.setText('waiting_for_actions')

        const goButtonImg = this.add.image(0,0,"button_charge")
        this.goButton = this.add.container(250,720)
        this.goButton.setSize(80,80)
        this.goButton.setInteractive()
        this.goButton.add([goButtonImg])
        this.goButton.on('pointerover', (pointer) => goButtonImg.setTint(0x808080))
        this.goButton.on('pointerout', (pointer) => goButtonImg.clearTint())
        this.goButton.on('pointerup', (pointer) => this.board.updateMap())

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
        })

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
