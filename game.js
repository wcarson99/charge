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
let combatSprite;

const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}

const unitDefns = {
    'unit_soldier': {'attack':1, 'hp':10, 'shield':0},
    'unit_shield': {'attack':1, 'hp':10, 'shield':1}
}

const levels = [
    {
        map:
            [
                "......",
                "......",
                "......",
                "......",
                "......",
                "......",
                "......",
                "......",
                "......",
                "......",
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
                    { c: 3, r: 0, typ: 'unit_soldier' },
                    { c: 3, r: 8, typ: 'unit_soldier' }
                ],
                rowChange: 1,
                color: '#3000f0'
            },
            'human':
            {
                hp:10,
                attack: 2,
                shield: 2,
                items: [{ typ:'unit_soldier', num:5},
                        { typ:'unit_shield', num:2}],
                rowChange: -1,
                color: '#fb0000'
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
            0,0,'', 
            { fontSize: '32px', fontFamily:'Courier', color:defn['color']})
        this.hpText.setOrigin(0.5,0)
        this.container.add(this.hpText)
        this.update()
    }
    update() 
    {
        this.hpText.setText('HP '+('0'+this.hp).slice(-2)
        +' AT '+('0'+this.attack).slice(-2)
        +' SH '+('0'+this.shield).slice(-2))
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
        let image = this.items.scene.add.image(column*squareX,0,typ+'_up')
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
    constructor(scene, levelNum, x, y, defn)
    {
        this.scene = scene
        this.level = levels[levelNum]

        this.container = scene.add.container(x,y)
        this.container.setSize(numItems*squareX,squareY)
        this.group = scene.physics.add.group(
            {
            
            }
        )
        this.addItems(defn);
    }
    remove(item)
    {
        this.group.remove(item)
    }

    addItems(defn)
    {   
        console.log(defn)
        let c = 0;
        this.itemData = []
        for (let itemDefn of defn)
        {
            let typ = itemDefn['typ']
            let num = itemDefn['num']
            for (let i=0; i<num; i++)
            {
                this.itemData[c] = new Item(this, c, typ,c,-1)
                c++
                if (c>=6)
                {
                    break
                }    
            }
        }
    }
}

class Unit
{
    constructor(owner, index, typ, column, row, rowChange)
    {
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

        let imageName = typ
        if (rowChange>0)
        {
            imageName += '_down'
        }
        else
        {
            imageName += '_up'
        }

        this.image = owner.scene.add.image(0,0,imageName)
        this.image.setDisplaySize(squareX,squareY)
        this.statusText = owner.scene.add.text(-24,16,this.statusString(), 
            { fontSize: '10px', fontFamily:'Arial', color:'White'})
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
        console.log('Destroying')
        console.log(this)
        this.container.destroy()
        //this.image.destroy()
    }
    dealDamage(units)
    {
        let numDefenders = units.length
        if (units.length==1)
        {
            return
        }

        let unitDamage = this.attack/(numDefenders-1)
        for (let unit of units)
        {   
            if (unit==this)
            {
                console.log('Me')
                continue
            }
            let damage = unitDamage
            if (unit.shield>damage)
            {
                unit.shield -= damage
            }
            else
            {
                unit.hp = unit.hp+unit.shield-damage
                unit.shield = 0
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
        this.x = c*squareX
        this.y = r*squareY
        this.contents = [];
        this.nextContents = []
        this.image = board.scene.add.image(this.x,this.y,type)
        this.image.setDisplaySize(squareX,squareY)
        this.image.setSize(squareX,squareY)
        this.image.setData('obj',this)
        board.container.add(this.image)
        board.group.add(this.image) 

        this.text = board.scene.add.text(this.x,this.y,this.contents.length, { fontSize: '40px'})
        this.text.setOrigin(0.5)
        board.container.add(this.text)
        // Remove to see the number of units on a square
        this.text.setVisible(false)

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
        if (this.contents.length<=1)
        {
            return
        }
        //this.board.scene.add.sprite(this.x, this.y, 'combat').play()
        this.combatSprite = this.board.scene.add.sprite(this.x,this.y,'combat')
        this.board.container.add(this.combatSprite)
        this.combatSprite.play('combat_anim')
        console.log(Phaser)
        
        this.combatSprite.on('animationcomplete', function() {
            this.combatSprite.destroy()
        }, this)
        
        while (this.contents.length>1)
        {

            // Deal damage
            let c = this.contents
            console.log("before")        
            console.log(this.contents)

            for (let unit of c)
            {
                unit.dealDamage(c)
            }

                // Remove dead units
            let newContents = []
            for (let unit of c)
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
        }
        this.update()
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
        
        let width = columns*squareX
        let height = columns*squareY
        this.computer = new Player(this, 100+width/2,15, this.level.players.computer)
        this.human = new Player(this, 100+width/2, 730, this.level.players.human)

        this.group = scene.physics.add.group()
        this.container = scene.add.container(100,90)
        this.container.setSize(width, height)
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
                //let newContents = []
                while (contents.length>0)
                {
                    let unit = contents.pop()
                    let newRow = unit.row + unit.rowChange
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
                        //console.log(unit)
                        unit.row = newRow
                        unit.container.y += squareY*unit.rowChange
                        //console.log(unit)
                    }
                    this.mapData[unit.row][unit.column].nextContents.push(unit)
                    unit.update()
                }
            }
        }
        // Update square contents
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                square.contents = square.nextContents
                square.nextContents = []
            }
        }

        // Unit combat
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                square.resolveCombat()
            }
        }

        this.human.update()
        this.computer.update()
        if (this.human.hp<=0 || this.computer.hp<=0)
        {
            let text = this.scene.add.text(300,400,'', 
                {fontSize: '80px', align:'center'}).setOrigin(0.5)
            if (this.human.hp==this.computer.hp)
            {
                text.setText("No\nwinner!")
            }
            else if (this.human.hp>this.computer.hp)
            {
                text.setText("The\nhuman\nwins!")
            }
            else
            {
                text.setText("The\ncomputer\nwins!")
            }
        }
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
        this.load.spritesheet('combat', 'assets/combat.png',
            { frameWidth: 60, frameHeight: 60 })

        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.image('unit_soldier_up', 'assets/unit_soldier_up.png');
        this.load.image('unit_soldier_down', 'assets/unit_soldier_down.png');
        this.load.image('unit_shield_up', 'assets/unit_shield_up.png');
    }

    timerEvent;
    stateText;

    create ()
    {
        timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        let levelNum = 0
        let levelDefn = levels[levelNum]
        board = new Board(this, boardRows, boardColumns,0)
        items = new Items(this, 0,100,810, levelDefn['players']['human']['items'])

        this.anims.create({
            key: 'combat_anim',
            frames: 'combat',
            frameRate: 10,
            repeat: 2
        })

        const chargeButtonImg = this.add.image(0,0,"button_charge")
        const chargeButton = this.add.container(250,870)
        chargeButton.setSize(80,80)
        chargeButton.setInteractive()
        chargeButton.add([chargeButtonImg])
        chargeButton.on('pointerover', (pointer) => chargeButtonImg.setTint(0x808080))
        chargeButton.on('pointerout', (pointer) => chargeButtonImg.clearTint())
        chargeButton.on('pointerup', (pointer) => board.updateMap())

        this.physics.add.overlap(board.group, items.group, function(squareImage, itemImage)
        {   
            let square = squareImage.getData('obj')
            let item = itemImage.getData('obj')
            item.newSquare = square
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
        })

        this.input.on('dragend', function (pointer, gameObject) {
            console.log('Here '+gameObject)
            console.log(gameObject)
            let item = gameObject.getData('obj')
            console.log('item')
            console.log(item)
            console.log(typeof item.newSquare)
            if (typeof item.newSquare != "undefined")
            {
                items.remove(gameObject)
                board.addUnit(item.typ, item.newSquare.column, boardRows-1, -1)
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
            // If you want to see hit boxes
            //debug: true
        }
    },
    pixelArt: true,
    scene: Play
};

const game = new Phaser.Game(config);
