/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/
*/

const squareX = 60;
const squareY = 60;
const boardRows = 11;
const boardColumns = 6;
const boardCenterX = squareX*boardColumns/2
const boardCenterY = squareY*boardRows/2
const numItems = 6;

let timeText;
let board;
let items;

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
                "..s...",
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
                    [{ c: 0, r: 0, typ: 'unit_soldier' },
                     { c: 3, r: 0, typ: 'unit_soldier' }
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

class Item
{   
    constructor(items, index, typ, column)
    {
        this.items = items
        this.index = index
        this.typ = typ
        this.column = column;
        let image = this.items.scene.add.image(column*squareX,0,typ)
        image.setData('obj', this)
        image.setData('newSquare',undefined)
        image.setDisplaySize(squareX,squareY)
        image.setSize(squareX,squareY)
        image.setInteractive({ draggable: true})
        items.container.add(image)
        items.group.add(image)
    }
}

class Items
{
    constructor(scene, levelNum, x, y)
    {
        this.scene = scene
        this.level = levels[levelNum]

        this.container = scene.add.container(x,y)
        this.container.setSize(numItems*squareX,squareY)
        this.group = scene.physics.add.group(
            {
            
            }
        )
        this.addItems();
    }
    remove(item)
    {
        this.group.remove(item)
    }

    addItems()
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
        this.attack = this.defn.attack
        this.hp = this.defn.hp
        this.shield = this.defn.shield

        this.image = owner.scene.add.image(0,0,typ)
        this.image.setDisplaySize(squareX,squareY)
        this.statusText = owner.scene.add.text(-24,16,this.statusString(), 
            { fontSize: '10px', fontFamily:'Arial', color:'Black'})
        this.container = owner.scene.add.container(column*squareX, row*squareY, [this.image,this.statusText])
        this.container.setSize(squareX,squareY)

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
    destroy()
    {
        this.container.destroy()
    }
    damage(units)
    {
        let numDefenders = units.length
        let unitDamage = this.attack/numDefenders
        for (let unit of units)
        {   
            if (unit==this)
            {
                console.log('Me')
                continue
            }
            let damage = unitDamage
            if (unit.shield<damage)
            {
                unit.shield -= damage
            }
            else
            {
                damage -= unit.shield
                unit.shield = 0
                unit.hp -= shield
            }
        }
    }
}

class Square
{
    constructor(board, index, type, c, r)
    {
        this.board = board;
        this.index = index;
        this.column = c;
        this.row = r;
        this.contents = [];
        this.image = board.scene.add.image(c*squareX,r*squareY,type)
        this.image.setDisplaySize(squareX,squareY)
        this.image.setSize(squareX,squareY)
        this.image.setData('obj',this)
        board.container.add(this.image)
        board.group.add(this.image) 

        this.text = board.scene.add.text(c*squareX,r*squareY,this.contents.length, { fontSize: '28px'})
        board.container.add(this.text)
    }

    addUnit(unit)
    {
        this.contents.push(unit)
        this.update()
    }

    update()
    {
        this.text.setText(this.contents.length)
    }

    resolveCombat()
    {

    }
}

class Board
{
    constructor(scene, rows, columns, levelNum)
    {
        this.scene = scene;
        this.rows = rows;
        this.columns = columns
        this.level = levels[levelNum]
        this.unitIndex = 0
        
        this.computer = new Player(this, 100,30, this.level.players.computer)
        this.human = new Player(this, 100,730, this.level.players.human)

        this.group = scene.physics.add.group()
        this.container = scene.add.container(100,90)
        this.container.setSize(columns*squareX, rows*squareY)
        this.mapData = []
        this.createMap()
        this.addStartingUnits()
    }

    createMap()
    {
        let i = 0;
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
        // Advance all units, handling top and bottom rows as attacking a player
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                let contents = square.contents
                let newContents = []
                if (contents.length>0) {
                    while (contents.length>0)
                    {
                        let unit = contents.pop()
                        let newRow = unit.row+unit.rowChange
                        if (newRow==boardRows)
                        {
                            this.human.hp = this.human.hp - unit.attack
                            unit.hp = unit.hp - this.human.attack
                            if (unit.hp<=0)
                            {
                                unit.destroy()
                                continue
                            }
                        }
                        else if (newRow==-1)
                        {
                            this.computer.hp = this.computer.hp - unit.attack
                            unit.hp = unit.hp - this.computer.attack
                            if (unit.hp<=0)
                            {
                                unit.destroy()
                                continue
                            }
                        }
                        else
                        {
                            console.log(unit)
                            unit.row = newRow
                            unit.container.y += squareY*unit.rowChange
                            console.log(unit)
                        }
                        unit.update()
                        newContents.push(unit)
                    }
                square.contents = newContents
                }
            }
        }

        // Unit combat
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                let done = false
                while (false)
                {
                    done = true
                    // Deal damage
                    let c = square.contents
                    if (c.length>1)
                    {            
                        console.log("before")        
                        console.log(square)

                        for (let unit in c)
                        {
                            unit.damage(c)
                        }
                        console.log("after")        
                        console.log(square)
                    }
                    // Remove dead units
                    let newContents = []
                    for (let unit in c)
                    {
                        if (unit.hp<=0)
                        {
                            unit.destroy()
                        }
                        else
                        {
                            newContents.push(unit)
                        }
                    }
                    this.contents = newContents
                    if (newContents.length>1)
                    {
                        done = false
                    }
                }
            }
        }

        this.human.hpText.setText('HP '+this.human.hp+' ATK '+this.human.attack+' SHD '+this.human.shield)
        this.computer.hpText.setText('HP '+this.computer.hp+' ATK '+this.computer.attack+' SHD '+this.computer.shield)
    }

    addUnit(typ, c, r, rowChange)
    {
        this.unitIndex++
        const unit = new Unit(this, this.unitIndex, typ, c, r, rowChange)
        let square = this.mapData[r][c]
        square.addUnit(unit)
    }

    addStartingUnits() 
    {
        this.unitData = []
        let level = levels[0]
        let units_def = level.players["computer"].units
        for (let def of units_def)
        {
            this.addUnit(def.typ, def.c, def.r, 1)
        } 
    }
}

class Play extends Phaser.Scene
{
    preload ()
    {
        this.load.image('button_charge', 'assets/button_charge.png');

        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.image('square_sand', 'assets/square_sand.png');
        this.load.image('unit_wall', 'assets/unit_wall.png');
        this.load.image('unit_soldier', 'assets/unit_soldier.png');
    }

    timerEvent;
    stateText;

    create ()
    {
        timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        board = new Board(this, boardRows, boardColumns,0)
        items = new Items(this, 0,100,850)

        const chargeButtonImg = this.add.image(0,0,"button_charge")
        const chargeButton = this.add.container(250,790)
        chargeButton.setSize(80,80)
        chargeButton.setInteractive()
        chargeButton.add([chargeButtonImg])
        chargeButton.on('pointerover', (pointer) => chargeButtonImg.setTint(0x808080))
        chargeButton.on('pointerout', (pointer) => chargeButtonImg.clearTint())
        chargeButton.on('pointerup', (pointer) => board.updateMap())

        this.physics.add.overlap(board.group, items.group, function(square, item)
        {
            let row = square.getData('row')
            let column = square.getData('column')
            item.setData('newSquare',square)
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
        })
        // TODO: Only allow units to be added at bottom row
        this.input.on('dragend', function (pointer, gameObject) {
            console.log('Here '+gameObject)
            console.log(gameObject)
            let values = gameObject.data.values
            let newSquare = gameObject.getData('obj')
            console.log(typeof newSquare)
            if (typeof newSquare != "undefined")
            {
                items.remove(gameObject)
                let item = gameObject.getData('obj')
                board.addUnit(item.typ, newSquare.column, boardRows-1, -1)
                gameObject.destroy()
            }
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
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 300 },
            debug: true
        }
    },
    scene: Play
};

const game = new Phaser.Game(config);
