/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/
*/

class CombatAnimation
{
    constructor(scene, container, x, y)
    {
        const anim = scene.add.sprite(x,y,'combat')
        anim.setOrigin(0,0)
        anim.play('combat_anim')        
        anim.on('animationcomplete', function() {
            anim.destroy()
        }, anim)
        container.add(anim)
    }
}

const screenX = 600
const screenY = 900
const squareX = 60
const squareY = 60
const boardRows = 11
const boardColumns = 6
const boardCenterX = squareX*boardColumns/2
const boardCenterY = squareY*boardRows/2
const boardXOffset = (screenX-squareX*boardColumns)/2
const numItems = 6

const moveFrames = 5
buttonFontFamily = "Arial" //"Verdana"

let timeText;
let board;
let items;
let chargeButton;
let restartButton;

const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}

const unitDefns = {
    'unit_soldier': {'attack':1, 'hp':10, 'shield':0},
    'unit_shield': {'attack':1, 'hp':10, 'shield':1}
}

const unitAbbrevs = {
    's':'unit_soldier',
    'S':'unit_shield'
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
                    ["ssssss",
                     "s.s.s."
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
                        { typ:'unit_shield', num:5}],
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
            { fontSize: '32px', fontFamily:'Verdana', color:defn['color']})
        this.hpText.setOrigin(0.5,0)
        this.container.add(this.hpText)
        this.update()
    }

    takeDamage(attack)
    {
        this.hpText.setTint('0x808080')
        this.board.scene.time.addEvent(
            { delay: 1000,
              callback: function() {this.hpText.clearTint()},
              callbackScope: this,
            }
        )
        if (this.shield>attack)
        {
            this.shield -= attack
        }
        else
        {
            this.hp = this.hp + this.shield - attack
            this.shield = 0
        }
    }

    update() 
    {
        this.hpText.setText('HP '+('0'+this.hp).slice(-2)
        +' AT '+('0'+this.attack).slice(-2)
        +' SH '+('0'+this.shield).slice(-2))
    }
}

class Item extends Phaser.GameObjects.Image
{   
    constructor(scene, index, items, typ)
    {
        super(scene,0,0,typ+'_up')
        this.scene = scene
        this.index = index
        this.items = items
        this.typ = typ
        
        this.setData('obj', this)
        this.setData('newSquare',undefined)
        this.setDisplaySize(squareX,squareY)
        this.setSize(squareX,squareY)
        this.setInteractive({ draggable: true})
        this.setOrigin(0,0)

        items.group.add(this)
        this.scene.add.existing(this)
    }
}

class Items extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, defn)
    {
        super(scene)
        this.scene = scene
        this.x = x
        this.y = y

        const image = scene.add.image(0,0,'white')
        image.setDisplaySize(numItems*squareX,squareY)
        image.setOrigin(0,0)
        image.setTint(0x008000)
        this.add(image) 

        this.group = scene.physics.add.group()
        this.scene.add.existing(this)

        //this.available = []
        this.remaining = []
        this.createItems(defn);
    }

    createItems(defn)
    {   
        console.log(defn)
        let ind = 0
        for (let itemDefn of defn)
        {
            let typ = itemDefn['typ']
            let num = itemDefn['num']
            for (let i=0; i<num; i++)
            { 
                let item = new Item(this.scene, ind, this, typ)
                item.setVisible(false)
                this.remaining.push(item)
                ind += 1
            }
        }
        this.fill()
    }

    fill()
    {        
        let gameObjects = this.getAll()
        for (let item of gameObjects.slice(1,gameObjects.length))
        {   
            items.remove(item)
            item.setVisible(false)
            this.remaining.push(item)
        }

        let i = 0
        while (this.remaining.length>0)
        {
            console.log(i)
            let item = this.remaining.shift()
            console.log(item)
            item.x = i*squareX
            item.y = 0
            item.setVisible(true)
            this.add(item)
            i++
            if (i==numItems)
            {
                break
            }
        }
    }
}

class Unit extends Phaser.GameObjects.Container
{
    constructor(scene, owner, index, typ, column, row, rowChange)
    {
        super(scene)

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

        this.x = column*squareX
        this.y = row*squareY
        this.setSize(squareX, squareY)

        let imageName = typ
        if (rowChange>0)
        {
            imageName += '_down'
        }
        else
        {
            imageName += '_up'
        }
        console.log(this)
        
        this.sprite = (scene.add.sprite(0,0,imageName)
            .setOrigin(0,0)
            .setDisplaySize(squareX,squareY)
        )
        //this.sprite.play(imageName+'_anim')
        this.statusText = scene.add.text(5,48, this.statusString(), 
            { fontSize: '10px', fontFamily:buttonFontFamily, color:'White'})
        this.statusText.setOrigin(0,0)
       this.add([this.sprite, this.statusText])
    }

    statusString()
    {
        return 'A'+this.attack+' S'+this.shield+' H'+this.hp
    }

    update()
    {
        this.statusText.setText(this.statusString())
    }

    takeDamage(attack)
    {
        if (this.shield>attack)
        {
            this.shield -= attack
        }
        else
        {
            this.hp = this.hp + this.shield - attack
            this.shield = 0
        }
        this.update()
    }

    dealDamage(units)
    {
        let numDefenders = units.length-1
        let unitDamage = this.attack/numDefenders
        for (let unit of units)
        {   
            if (unit==this)
            {
                continue
            }
           unit.takeDamage(unitDamage)
        }
    }

    fightPlayer(player)
    {
        while (this.hp>0 && player.hp>0)
        {
            this.takeDamage(player.attack)
            player.takeDamage(this.attack)
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
        this.image.setOrigin(0,0)
        this.image.setData('obj',this)
        board.container.add(this.image)
        board.group.add(this.image) 

        this.text = board.scene.add.text(this.x,this.y,this.contents.length, { fontSize: '40px'})
        this.text.setOrigin(0,0)
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
       const combatAnim = new CombatAnimation(
           this.board.scene, this.board.container, this.x, this.y)
        
        while (this.contents.length>1)
        {

            // Deal damage
            let c = this.contents
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
        this.turn = 0
        
        let width = columns*squareX
        let height = columns*squareY
        this.computer = new Player(this, screenX/2,20, this.level.players.computer)
        this.human = new Player(this, screenX/2, 850, this.level.players.human)

        this.group = scene.physics.add.group()
        this.container = scene.add.container(boardXOffset,60)
        this.container.setSize(width, height)
        this.mapData = []
        this.createMap()
        this.addComputerUnits()
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
        let movingUnits = []
        for (let r of this.mapData)
        {
            for (let square of r)
            {
                let contents = square.contents
                while (contents.length>0)
                {
                    let unit = contents.pop()
                    let newRow = unit.row + unit.rowChange
                    if (newRow==boardRows)
                    {
                        unit.fightPlayer(this.human)
                        if (unit.hp<=0)
                        {
                            unit.destroy()
                            continue
                        }
                    }
                    else if (newRow==-1)
                    {
                        unit.fightPlayer(this.computer)
                        if (unit.hp<=0)
                        {
                            unit.destroy()
                            continue
                        }
                    }
                    else
                    {
                        unit.row = newRow
                        movingUnits.push(unit)
                    }
                    this.mapData[unit.row][unit.column].nextContents.push(unit)
                    unit.update()
                }
            }
        }
        this.timedEvent = this.scene.time.addEvent(
            {
                delay: 100,
                repeat: moveFrames-1,
                callback: function () {
                    for (let unit of movingUnits) {
                        //unit.sprite.play(unit.typ)
                        unit.y += unit.rowChange * squareY / moveFrames
                    }
                },
                callbackScope: this,
            })

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
        this.addComputerUnits()
    }

    addUnit(typ, c, r, rowChange)
    {
        this.unitIndex++
        const unit = new Unit(this.scene, this, this.unitIndex, typ, c, r, rowChange)
        this.container.add(unit)
        let square = this.mapData[r][c]
        square.addUnit(unit)
    }

    addComputerUnits() 
    {
        this.unitData = []
        let level = levels[0]
        let units_def = level.players["computer"].units
        for (let c in units_def[this.turn])
        {
            let abbrev = units_def[this.turn][c]
            if (abbrev=='.')
            {
                continue
            }
            let typ = unitAbbrevs[units_def[0][c]]
            console.log('turn '+this.turn+' '+c+' '+typ)
            this.addUnit(typ, c, 0, 1)
        } 
        this.turn +=1
    }
}

class Button extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, key, text, fontColor = '#000') {
        super(scene)
        this.scene = scene
        this.x = x
        this.y = y

        const button = this.scene.add.image(0, 0, key).setInteractive()
        const buttonText = this.scene.add.text(0, 0, text, 
            { fontSize: '28px', color: fontColor , fontFamily:buttonFontFamily})
        button.setDisplaySize(buttonText.width,30)
            
        Phaser.Display.Align.In.Center(buttonText, button);
        this.add(button);
        this.add(buttonText);
        button.on('pointerover', (pointer) => button.setTint(0x808080))
        button.on('pointerout', (pointer) => button.clearTint())
        button.on('pointerdown', (pointer) => button.setTint(0xc08080))
        
        button.on('pointerup', () => {
          console.log('No pointerup handler implemented')
        });
        this.button = button
        this.scene.add.existing(this);
      }
}

const animConfig = { frameWidth: 60, frameHeight: 60 }
class Play extends Phaser.Scene
{
    preload ()
    {
        this.load.image('button_charge', 'assets/button_charge.png');
        this.load.image('black','assets/black.png')
        this.load.image('white','assets/white.png')
        this.load.spritesheet('combat', 'assets/combat.png',animConfig)

        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.spritesheet('unit_soldier_up', 'assets/unit_soldier_up.png',
            animConfig)

        this.load.spritesheet('unit_soldier_down', 'assets/unit_soldier_down.png',
            { frameWidth: 30, frameHeight: 30 })
        this.load.spritesheet('unit_shield_up', 'assets/unit_shield_up.png',
            { frameWidth: 60, frameHeight: 60 })
    }

    timerEvent;
    stateText;

    create ()
    {
        //timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        let levelNum = 0
        let levelDefn = levels[levelNum]
        board = new Board(this, boardRows, boardColumns,0)
        console.log('boardXOffset '+boardXOffset)
        items = new Items(this, boardXOffset,730, levelDefn['players']['human']['items'])

        this.anims.create({
            key: 'combat_anim',
            frames: 'combat',
            frameRate: 10,
            repeat: 2
        })
        this.anims.create({
            key:'unit_soldier_down_anim',
            frames: 'unit_soldier_down',
            frameRate: 5,
            repeat: -1

        })
        this.anims.create({
            key:'unit_soldier_up_anim',
            frames: 'unit_soldier_up',
            frameRate: 5,
            repeat: 2

        })
        this.anims.create({
            key:'unit_shield_up_anim',
            frames: 'unit_shield_up',
            frameRate: 5,
            repeat: 2

        })

        if (true)
        {
            const chargeButtonImg = this.add.image(0,0,"button_charge")
            chargeButton = (
                this.add.container(screenX/2,830, [chargeButtonImg])
                .setSize(80,80)
                .setInteractive()
                .on('pointerover', (pointer) => chargeButtonImg.setTint(0x808080))
                .on('pointerout', (pointer) => chargeButtonImg.clearTint())
                .on('pointerup', (pointer) => this.performActions())
            )
        }

        restartButton = new Button(this, screenX/2, 830, 'white', 'RESTART')
        restartButton.button.on('pointerup', (pointer) => this.restart())
        restartButton.setVisible(false)

        this.physics.add.overlap(board.group, items.group, function(squareImage, item)
        {   
            let square = squareImage.getData('obj')
            item.newSquare = square
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.x = dragX
            gameObject.y = dragY
        })

        this.input.on('dragend', function (pointer, item) {
            //let item = gameObject
            console.log('item')
            console.log(item)
            console.log(typeof item.newSquare)
            if (typeof item.newSquare != "undefined")
            {
                item.setVisible(false)
                items.remove(item)
                board.addUnit(item.typ, item.newSquare.column, boardRows-1, -1)
                item.destroy()
            }
        })

        this.timedEvent = this.time.addEvent({ delay: 2000, callback: this.onTimer, callbackScope: this, loop: true });
    
        //console.log(game)
    }

    restart()
    {
        console.log('Restarting')
        this.scene.restart()
    }
    performActions()
    {
        console.log('this ')
        console.log(this)
        chargeButton.setVisible(false)
        board.updateMap()
        items.fill()

        let human = board.human
        let computer = board.computer
        human.update()
        computer.update()
        if (human.hp<=0 || computer.hp<=0)
        {
            let text = this.add.text(300,400,'', 
                {fontSize: '80px', align:'center'}).setOrigin(0.5)
            if (human.hp==computer.hp)
            {
                text.setText("No\nwinner!")
            }
            else if (human.hp>computer.hp)
            {
                text.setText("The\nhuman\nwins!")
            }
            else
            {
                text.setText("The\ncomputer\nwins!")
            }
            restartButton.setVisible(true)
        }
        else
        {
            chargeButton.setVisible(true)
        }

    }
    onTimer()
    {
        $.ajax({
            dataType: "json",
            url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
            success: function (data) {
                let timeStr = data['datetime'].split('T')[1].split('.')[0]
                //timeText.setText('time: ' + timeStr)
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
