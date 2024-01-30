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

const unitDefns = {
    'unit_soldier': {'attack':1, 'hp':10, 'shield':0}
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
            'computer':
            {
                hp: 10,
                attack: 2,
                shield: 2,
                units:
                    [{ c: 0, r: 0, typ: 'soldier' },
                     { c: 3, r: 0, typ: 'soldier' }
                    ],
                rowChange: 1
            },
            'human':
            {
                hp:10,
                attack: 2,
                shield: 2,
                units: [],
                rowChange: -1
            }
        }
    }
]

class Player 
{
    constructor(board, x, y, defn)
    {
        this.board = board;
        this.hp = defn.hp
        this.attack = defn.attack
        this.shield = defn.shield
        this.rowChange = defn.rowChange
        this.container = board.scene.add.container(x,y)
        this.hpText = board.scene.add.text(
            0,0,'HP '+this.hp+' ATK '+this.attack+' SHD '+this.shield, 
            { fontSize: '28px', fontFamily:'Arial'})
        this.container.add(this.hpText)
    }
    update() 
    {

    }
}
class Square
{
    constructor(board, index, type, c, r)
    {
        this.board = board;
        this.index = index;
        this.c = c;
        this.r = r;
        this.contents = [];
        let image = this.board.scene.add.image(c*squareX,r*squareY,type)
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
    constructor(owner, index, typ, column, row, rowChange)
    {
        console.log(typ)
        this.owner = owner
        this.index = index
        this.typ = typ
        this.column = column
        this.row = row
        this.rowChange = rowChange
        this.defn = unitDefns[typ]
        console.log(this.defn)
        this.attack = this.defn.attack
        this.hp = this.defn.hp
        this.shield = this.defn.shield

        this.container = owner.scene.add.container(column*squareX,row*squareY)
        this.container.setSize(squareX,squareY)
        this.image = owner.scene.add.image(0,0,typ)
        this.image.setDisplaySize(squareX,squareY)
        this.container.add(this.image)
        this.statusText = owner.scene.add.text(-24,16,this.statusString(), 
        { fontSize: '10px', fontFamily:'Arial', color:'Black'})
        this.container.add(this.statusText)

        owner.container.add(this.container)
    }
    statusString()
    {
        return 'A'+this.attack+' S'+this.shield+' H'+this.hp
    }
    update()
    {
        this.statusText.setText(this.statusString())
    }
}

class Board
/*
TODO: Should map be a separate object?
*/
{
    constructor(scene, rows, columns, levelNum)
    {
        this.scene = scene;
        this.rows = rows;
        this.columns = columns
        this.level = levels[levelNum]
        console.log(this.level)
        let x = squareX*columns
        let y = squareY*rows
        
        this.container = scene.add.container(100,120)
        this.container.setSize(columns*squareX, rows*squareY)
        this.createMap()
        this.addUnits()

        this.items = scene.add.container(100,820)
        this.items.setSize(numItems*squareX,squareY)
        this.createItems();

        this.computer = new Player(this, 100,60, this.level.players.computer)
        this.human = new Player(this, 100,700, this.level.players.human)
    }

    createMap()
    {
        let i = 0;
        this.mapData = []
        let mapDef = this.level.map
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
                        let newRow = unit.row+unit.rowChange
                        if (newRow==boardRows)
                        {
                            this.human.hp = this.human.hp - unit.attack
                            unit.hp = unit.hp - this.human.attack
                        }
                        else
                        {
                            unit.row = newRow
                            unit.container.y += squareY
                            console.log(unit)
                        }
                        unit.update()
                    }
                }
            }
        }
        this.human.hpText.setText('HP '+this.human.hp+' ATK '+this.human.attack+' SHD '+this.human.shield)
    }
    addUnits() 
    {
        this.unitData = []
        let level = levels[0]
        let units_def = level.players["computer"].units
        let i = 0
        for (let def of units_def)
        {
            console.log(def)
            const unit = new Unit(this, i, 'unit_'+def.typ, def.c, def.r, 1)
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
        this.board = new Board(this, boardRows, boardColumns,0)
        this.stateText.setText('waiting_for_actions')

        const chargeButtonImg = this.add.image(0,0,"button_charge")
        this.chargeButton = this.add.container(250,760)
        this.chargeButton.setSize(80,80)
        this.chargeButton.setInteractive()
        this.chargeButton.add([chargeButtonImg])
        this.chargeButton.on('pointerover', (pointer) => chargeButtonImg.setTint(0x808080))
        this.chargeButton.on('pointerout', (pointer) => chargeButtonImg.clearTint())
        this.chargeButton.on('pointerup', (pointer) => this.board.updateMap())

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
                let timeStr = data['datetime'].split('T')[1].split('.')[0]
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
                    for (let unit in player['units']) {
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
    backgroundColor: '#4a6741',
    parent: 'phaser-example',
    scene: Example
};

const game = new Phaser.Game(config);
