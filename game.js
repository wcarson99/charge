/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/


TODO:
* tighten down animation
* level selection screen
* scoring based on remaining player and unit HPs
* only 4 moves per turn
* 3 good levels
* fill out unit types
* reset units to inventory

EGA palett - https://en.wikipedia.org/wiki/Enhanced_Graphics_Adapter
*/

class Button extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, key, text, fontColor = '#000') {
        super(scene, x, y)
        this.scene = scene

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
        this.scene.add.existing(this)
      }
}

class CombatAnimation extends Phaser.GameObjects.Sprite
{
    constructor(scene, board, x, y)
    {
        super(scene,x,y,'combat')

        this.setOrigin(0,0)
        this.play('combat_anim')        
        this.on('animationcomplete', function() {
            this.destroy()
        }, this)
        scene.add.existing(this)
        board.add(this)
    }
}

const cGold = '#aaaa00'
const cBlue = '#5555ff'
const cDarkBlue = '#0000aa'
const cGreen = '#00aa00'
const cDarkGreen = '#005500'
const cLightGreen = '#00aa55'
const cWhite = '#ffffff'
const cBlack = '#000000'
const cMagenta = '#aa55aa'

const cText = cGreen
const cBackground = cDarkGreen
const cSquare = cLightGreen
const cInventory = cMagenta

const screenX = 400
const screenY = 900
const squareX = 60
const squareY = 60
const boardRows = 11
const boardColumns = 6
const boardCenterX = squareX*boardColumns/2
const boardCenterY = squareY*boardRows/2
const boardXOffset = (screenX-squareX*boardColumns)/2
const boardYOffset = 60
const numItems = 6

const unitFrameRate = 4
const unitAnimationDuration = 1000
const moveFrames = 4
buttonFontFamily = "Arial" //"Verdana"
const ZIGZAG = 'zigzag'

let timeText;
let board;
let items;
let chargeButton;
let restartButton;
let human;
let computer;

const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}

const unitDefns = {
    'unit_soldier': {'attack':1, 'hp':10, 'shield':0,'horizontal':'none'},
    'unit_shield': {'attack':1, 'hp':10, 'shield':1, 'horizontal':'none'},
    'unit_snake': {'attack':5, 'hp':3, 'shield':0, 'horizontal':ZIGZAG}
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
                items: [{ typ:'unit_soldier', num:4},
                        { typ:'unit_snake', num:2},
                        { typ:'unit_soldier', num:2},
                        { typ:'unit_shield', num:3}],
                rowChange: -1,
                color: '#fb0000'
            }
        }
    }
]

class Player 
{
    constructor(scene, x, y, defn)
    {
        this.scene = scene;
        this.hp = defn.hp
        this.attack = defn.attack
        this.shield = defn.shield
        this.rowChange = defn.rowChange
        this.container = scene.add.container(x,y)
        this.hpText = scene.add.text(
            0,0,'', 
            { fontSize: '32px', fontFamily:'Verdana', color:defn['color']})
        this.hpText.setOrigin(0.5,0)
        this.container.add(this.hpText)
        this.update()
    }

    takeDamage(attack)
    {
        this.hpText.setTint('0x808080')
        this.scene.time.addEvent(
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

class Unit extends Phaser.GameObjects.Container
{
    constructor(scene, square, index, typ, column, row, rowChange)
    {
        super(scene)

        this.owner = square
        this.index = index
        this.typ = typ
        this.column = column
        this.row = row
        this.rowChange = rowChange
        this.columnChange = 0

        this.defn = unitDefns[typ]
        this.attack = this.defn.attack
        this.hp = this.defn.hp
        this.shield = this.defn.shield
        this.horizontal = this.defn.horizontal
        if (this.horizontal==ZIGZAG)
        {
            if (column==0) {
                this.columnChange = 1
            }
            else
            {
                this.columnChange = -1
            }
        }
        else
        {
            this.columnChange = 0
        }
        this.setPosition(column*squareX, row*squareY)
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
        this.animKey = imageName+'_anim'
        
        this.sprite = (scene.add.sprite(0,0,imageName)
            .setOrigin(0,0)
            .setDisplaySize(squareX,squareY)
        )
        this.statusText = scene.add.text(5,48, this.statusString(), 
            { fontSize: '10px', fontFamily:buttonFontFamily, color:'White'})
        this.statusText.setOrigin(0,0)
        this.add([this.sprite, this.statusText])
        this.scene.add.existing(this)
        square.board.add(this)
        //this.sprite.play(imageName+'_anim')

    }

    statusString()
    {
        return 'A'+this.attack+' S'+this.shield+' H'+this.hp
    }

    update()
    {
        this.statusText.setText(this.statusString())
        if (this.horizontal==ZIGZAG)
        {
            this.columnChange = -1*this.columnChange
        }
    }

    move()
    {
        this.sprite.play(this.animKey)
        this.row += this.rowChange
        let rowInc = this.rowChange * squareY / moveFrames
        this.column += this.columnChange
        let columnInc = this.columnChange * squareX / moveFrames
        if (this.column==boardColumns)
        {
            this.column -=1
            columnInc = 0
        }
        else if (this.column==-1)
        {
            this.column = 0 
            columnInc = 0
        }
        console.log(this)
        this.timedEvent = this.scene.time.addEvent(
            {
                delay: 200,
                repeat: moveFrames-1,
                callback: function () {
                    this.y += rowInc
                    this.x += columnInc
                },
                callbackScope: this,
            }
        )
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

class Square extends Phaser.GameObjects.Container
{
    constructor(board, index, typ, c, r)
    {
        super(board.scene,c*squareX,r*squareY)
        this.scene.add.existing(this);

        this.scene = board.scene
        this.board = board
        this.index = index
        this.column = c
        this.row = r
        this.contents = []
        this.nextContents = []
        let image = board.scene.add.image(0,0,typ)
        image.setDisplaySize(squareX,squareY)
        image.setSize(squareX,squareY)
        image.setOrigin(0,0)
        image.on('pointerover', (pointer) => this.setTint(0x808080), this)
        image.on('pointerout', (pointer) => this.clearTint(), this)
        image.setInteractive()
        this.image = image
        this.add(this.image)

        board.add(this)
        board.group.add(this) 
    }

    setTint(value) 
    {
        this.image.setTint(value)
    }

    clearTint()
    {
        this.image.clearTint()
    }

    addUnit(typ, c, r, rowChange)
    {
        const unit = new Unit(this.scene, this, 0, typ, c, r, rowChange)    
        this.contents.push(unit)
    }

    resolveCombat()
    {
        if (this.contents.length>1)
        {
            const combatAnim = new CombatAnimation(
                this.board.scene, this.board, this.x, this.y)     
        }
        
        while (this.contents.length>1)
        {

            // Deal damage
            let c = this.contents

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
                    //unit.update()
                    newContents.push(unit)
                }
            }
            this.contents = newContents
        }
        if (this.contents.length==1)
        {
            let unit = this.contents[0]
            if (unit.row == boardRows-1) {
                const combatAnim = new CombatAnimation(
                    this.board.scene, this.board, this.x, this.y)
                unit.fightPlayer(human)
            }
            else if (unit.row == 0) {
                const combatAnim = new CombatAnimation(
                    this.board.scene, this.board, this.x, this.y)
                unit.fightPlayer(computer)
            }
            if (unit.hp<=0) {
                unit.destroy()
                this.contents = []
            }
            else
            {
                unit.update()                
            }
        }
    }
}

class Board extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, levelNum)
    {
        super(scene,x, y)

        this.level = levels[levelNum]
        this.unitIndex = 0
        this.turn = 0
        
        this.group = scene.physics.add.group()
        let width = boardRows*squareX
        let height = boardColumns*squareY
        this.setSize(width, height)
        this.mapData = []
        this.scene.add.existing(this)

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

        for (let r of this.mapData) {
            for (let square of r) {
                let contents = square.contents
                while (contents.length > 0) {
                    let unit = contents.pop()
                    unit.move()
                    movingUnits.push(unit)                        
                    this.mapData[unit.row][unit.column].nextContents.push(unit)
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

        this.addComputerUnits()
    }

    addUnit(typ, c, r, rowChange)
    {
        let square = this.mapData[r][c]
        square.addUnit(typ,c,r,rowChange)
    }

    addComputerUnits() 
    {
        this.unitData = []
        let level = levels[0]
        let units_def = level.players["computer"].units
        if (units_def.length==this.turn)
        {
            return
        }
        for (let c=0; c<boardColumns; c++)
        {
            let abbrev = units_def[this.turn][c]
            if (abbrev=='.')
            {
                continue
            }
            let typ = unitAbbrevs[units_def[0][c]]
            this.addUnit(typ, c, 0, 1)
        } 
        this.turn +=1
    }
}

class Item extends Phaser.GameObjects.Sprite
{   
    constructor(scene, items, typ)
    {
        super(scene,0,0,typ+'_up')
        this.scene.add.existing(this)

        this.items = items
        this.typ = typ
        this.newSquare = null
        this.animKey = typ+'_up_anim'
        
        this.setDisplaySize(squareX,squareY)
        this.setSize(squareX,squareY)
        this.setInteractive({ draggable: true})
        this.setOrigin(0,0)

        items.group.add(this)
    }
}

class Item2 extends Phaser.GameObjects.Sprite
{   
    constructor(scene, typ)
    {
        super(scene,0,0,typ+'_up')
        scene.add.existing(this)

        this.items = items
        this.typ = typ
        this.newSquare = null
        this.animKey = typ+'_up_anim'
        
        this.setDisplaySize(squareX,squareY)
        this.setSize(squareX,squareY)
        this.setInteractive({ draggable: true})
        this.setOrigin(0,0)
    }
}

class Inventory extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, defn)
    {
        super(scene, x, y)
        this.scene.add.existing(this)

        this.defn = defn

        const image = scene.add.image(0,0,'white')
        image.setDisplaySize(numItems*squareX,squareY)
        image.setOrigin(0,0)
        image.setTint(0x008000)
        this.add(image) 

        this.group = scene.physics.add.group()

        this.createItems(defn);
    }

    createItems(defn)
    {   
        for (let itemDefn of defn)
        {
            let typ = itemDefn['typ']
            let num = itemDefn['num']
            for (let i=0; i<num; i++)
            { 
                let item = new Item(this.scene, this, typ)
                //console.log('Playing')
                //console.log(item)
                //item.play(item.animKey)
                item.setVisible(false)
                this.add(item)
            }
        }
        this.fill()
    }

    fill()
    {        
        let gameObjects = this.getAll('newSquare')
        for (let item of gameObjects)
        {   
            if (item.visible==true)
            {
                this.remove(item)
                item.setVisible(false)
                this.add(item)
            }
        }

        gameObjects = this.getAll('newSquare')
        for (let i=0; i<gameObjects.length; i++)
        {
            let item = gameObjects[i]
            item.row=0
            item.column = i
            item.setPosition(i*squareX, 0)
            item.setVisible(true)
            this.add(item)
            if (i==numItems-1)
            {
                break
            }
        }
    }
}


class Welcome extends Phaser.Scene
{
    constructor()
    {
        super('Welcome')
    }

    preload()
    {
        this.load.image('black','assets/black.png')
        this.load.image('white','assets/white.png')
    }

    create()
    {
        /*
        https://www.hostinger.com/tutorials/best-html-web-fonts#:~:text=Web%2Dsafe%20fonts%20are%20fonts,Times%20New%20Roman%2C%20and%20Helvetica.
        */
        const welcome = [
            "Welcome to Attack!",
            "",
            "To play, drag units from the inventory",
            "on the bottom of the screen",
            "onto a square on the board.",
            "",
            "Click to start"
        ]
        const text = this.add.text(0,0,
            welcome.join("\n"),
            { 
                align: "center",
                fontFamily: "Geneva",
                fontSize: 25,
                color: cText,
            })
        this.input.on("pointerup", 
            function (pointer) { this.scene.start('Play')},
            this)
    }
}

const animConfig = { frameWidth: 60, frameHeight: 60 }
class Play extends Phaser.Scene
{
    constructor()
    {
        super('Play')
    }
    
    preload ()
    {
        this.load.image('button_charge', 'assets/button_charge.png');
        this.load.spritesheet('combat', 'assets/combat.png',animConfig)

        this.load.image('square_empty', 'assets/square_empty.png');
        this.load.spritesheet('unit_soldier_up', 'assets/unit_soldier_up.png',
            animConfig)

        this.load.spritesheet('unit_soldier_down', 'assets/unit_soldier_down.png',
            { frameWidth: 32, frameHeight: 32 })
        this.load.spritesheet('unit_shield_up', 'assets/unit_shield_up.png',
            animConfig)
        this.load.spritesheet('unit_snake_up', 'assets/unit_snake_up.png',
            { frameWidth: 30, frameHeight: 30 })

        }

    timerEvent;
    stateText;

    create ()
    {
        //timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        let levelNum = 0
        let levelDefn = levels[levelNum]

        this.anims.create({
            key: 'combat_anim',
            frames: 'combat',
            frameRate: 10,
            repeat: 2
        })
        this.anims.create({
            key:'unit_soldier_down_anim',
            frames: 'unit_soldier_down',
            frameRate: unitFrameRate,
            repeat: 0

        })
        this.anims.create({
            key:'unit_soldier_up_anim',
            frames: 'unit_soldier_up',
            duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 1

        })
        this.anims.create({
            key:'unit_shield_up_anim',
            frames: 'unit_shield_up',
            duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 1

        })

        this.anims.create({
            key:'unit_snake_up_anim',
            frames: 'unit_snake_up',
            duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 1

        })

        board = new Board(this, boardXOffset, boardYOffset,0)
        computer = new Player(this, screenX/2,20, levelDefn.players.computer)
        human = new Player(this, screenX/2, 850, levelDefn.players.human)
        items = new Inventory(this, boardXOffset,730, levelDefn['players']['human']['items'])

        chargeButton = new Button(this, screenX/2,830,'button_charge')
        chargeButton.button.setDisplaySize(80,80)
        chargeButton.button.on('pointerup', (pointer) => this.performActions())

        restartButton = new Button(this, screenX/2, 830, 'white', 'RESTART')
        restartButton.setVisible(false)
        restartButton.button.on('pointerup', (pointer) => this.restart())

        this.physics.add.overlap(board.group, items.group, function(square, item)
        {   
            if (item.newSquare) 
            {
                item.newSquare.clearTint()
            }
            square.setTint(0x808080)
            item.newSquare = square
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.setPosition(dragX, dragY)
            gameObject.play(gameObject.animKey)
        })

        this.input.on('dragend', function (pointer, item) {
        
            if (item.newSquare == null)
            {
                item.setPosition(item.column*squareX,item.row*squareY)
            }
            else
            {
                items.remove(item)
                item.newSquare.clearTint()
                board.addUnit(item.typ, item.newSquare.column, boardRows-1, -1)
                item.destroy()
            }
        })

        this.timedEvent = this.time.addEvent({ delay: 2000, callback: this.onTimer, callbackScope: this, loop: true });
    }

    restart()
    {
        console.log('Restarting')
        this.scene.restart()
    }

    performActions()
    {
        chargeButton.setVisible(false)
        board.updateMap()
        items.fill()

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
        if (false)
        {
            $.ajax({
                dataType: "json",
                url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
                success: function (data) {
                    let timeStr = data['datetime'].split('T')[1].split('.')[0]
                    //timeText.setText('time: ' + timeStr)
                }
            });    
        }
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
    backgroundColor: cBackground,
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
    scene: [Welcome, Play]
};

const game = new Phaser.Game(config);
