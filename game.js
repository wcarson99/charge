/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/
EGA palette - https://en.wikipedia.org/wiki/Enhanced_Graphics_Adapter
Fonts - https://www.hostinger.com/tutorials/best-html-web-fonts#:~:text=Web%2Dsafe%20fonts%20are%20fonts,Times%20New%20Roman%2C%20and%20Helvetica.


TODO:
* level selection screen
* scoring based on remaining player and unit HPs
* 3 good levels
* fill out unit types
* reset units to inventory
* eliminate Items
. fix player stats alignment
. cleanup unit text
. magnify unit on hover
. consistent fonts
. deploy to glitch
. tighten down animation
. combat on move completion
? image load issues - local only?

NICE TO HAVE:
* only 4 actions per turn
* intra-move combat?

*/

class Button extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, key, text) {
        super(scene, x, y)
        this.scene = scene
        this.scene.add.existing(this)

        // TODO: Remove \n and get positioning correct
        this.text = this.scene.add.text(0,0, '\n'+text, 
            buttonConfig)
            
        const button = this.scene.add.image(0, 0, key).setInteractive()
        button.setDisplaySize(boardWidth,buttonHeight)
        button.setDisplayOrigin(64,0)
        this.add(button);
        this.add(this.text);

        Phaser.Display.Align.In.Center(this.text, button);
        button.on('pointerover', (pointer) => button.setTint(0x808080))
        button.on('pointerout', (pointer) => button.clearTint())
        button.on('pointerdown', (pointer) => button.setTint(0xc08080))
        
        button.on('pointerup', () => {
          console.log('No pointerup handler implemented')
        });
        this.button = button
      }
}

class CombatAnimation extends Phaser.GameObjects.Sprite
{
    constructor(scene, board, x, y)
    {
        super(scene,x,y,'combat')

        this.setOrigin(0,0)
        this.setDisplaySize(squareX,squareY)
        this.play('combat_anim')        
        this.on('animationcomplete', function() {
            this.destroy()
        }, this)
        scene.add.existing(this)
        board.add(this)
    }
}

const cGold = '#aaaa00'
const cLightGold = '#aaaa55'
const cBlue = '#5555ff'
const cDarkBlue = '#0000aa'
const cGreen = '#008844'
const cDarkGreen = '#003311'
const cLightGreen = '#00aa55'
const cWhite = '#ffffff'
const cBlack = '#000000'
const cMagenta = '#aa55aa'

const cText = cGreen
const cBackground = cDarkGreen
const cSquare = cLightGreen
const cInventory = cMagenta
const cHuman = cGold
const cComputer = cBlue

const screenWidth = 1000
const screenHeight = 1400
const squareX = 128
const squareY = 128
const boardRows = 7
const boardColumns = 6
const boardWidth = squareX*boardColumns
const boardHeight = squareY*boardRows
const boardCenterX = boardWidth/2
const boardCenterY = boardHeight/2
const playerX = boardCenterX
const playerHeight = squareX
const computerY = 0
const boardXOffset = (screenWidth-squareX*boardColumns)/2
const boardYOffset = playerHeight
const inventoryX = boardXOffset
const inventoryY = boardYOffset+boardHeight
const buttonHeight = 128
const buttonX = boardXOffset+boardWidth/2
const buttonY = inventoryY+squareY+5
const humanY = buttonY + squareX
const numItems = 6

const numFrames = 4
const animRepeat = 1
const unitAnimDuration = 1000   
const unitFrameRate = (1+animRepeat)*numFrames*1000/unitAnimDuration
//const moveFrames = 4

const animConfig = { frameWidth: 32, frameHeight: 32 } 
const buttonConfig = { fontSize: 64, fontFamily:'Courier',fontStyle:'Bold', color:cDarkGreen}
const playerTextConfig = { fontSize: 80, fontFamily:'Courier', fontStyle:'Bold'} // 'Courier'
const winnerTextConfig = {fontSize: 128, align:'center',fontFamily:'Courier', fontStyle:'Bold'}
const welcomeTextConfig = { 
    //align: "center",
    fontFamily: "Courier",
    fontSize: 64,
    fontStyle: 'Bold',
    color: cText,
}
const ZIGZAG = 'zigzag'
const CENTER = 'center'
//const DOWN_RIGHT = 'down_right'
//const UP_RIGHT = 'up_right'
const LEFT = 'left'
const RIGHT = 'right'
const UP = 'up'
//const UP_CENTER = 'up_center'
const DOWN = 'down'
//const DOWN_CENTER = 'down_center'

let columnChanges = { 'left': -1, 'center': 0, 'right': 1}
let rowChanges = {'up': -1, 'down':1}

let timeText
let board
let items
let startButton
let chargeButton
let restartButton
let continueButton
let welcomeButton
let human
let computer
let unitStats

const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}

const unitDefns = {
    'unit_knight': {'attack':3, 'hp':3, 'shield':3  ,'movement':CENTER},
    'unit_goblin': {'attack':3, 'hp':4, 'shield':1, 'movement':CENTER},
    'unit_golem': {'attack':4, 'hp':7, 'shield':3, 'movement':CENTER},
    'unit_troll': {'attack':5, 'hp':6, 'shield':1, 'movement':CENTER},
    'unit_minotaur': {'attack':5, 'hp':8, 'shield':0,'movement':RIGHT},
    'unit_lminotaur': {'attack':5, 'hp':8, 'shield':0,'movement':LEFT, 'texture': 'unit_minotaur'},
    'unit_dragon': {'attack':5, 'hp':8, 'shield':0,'movement':RIGHT},
    'unit_ldragon': {'attack':5, 'hp':8, 'shield':0,'movement':LEFT, 'texture': 'unit_dragon'},
    'unit_snake': {'attack':5, 'hp':3, 'shield':0, 'movement':ZIGZAG}
}

const unitAbbrevs = {
    'k':'unit_knight',
    'g':'unit_goblin',
    'G':'unit_golem',
    'T':'unit_troll',
    'M':'unit_minotaur',
    'm':'unit_lminotaur',
    'D':'unit_dragon',
    'd':'unit_ldragon',
}

let levelNum = 0
const runConfig = {
    computer: {
        hp: 12,
        attack: 2,
        shield: 2,
        rowChange: 1,
        direction: DOWN,
        color: cComputer
    },
    human: {
        hp: 12,
        attack: 2,
        shield: 2,
        rowChange: -1,
        direction: UP,
        color: cHuman
    },
    levels: [
        {
            computer: {
                units: [
                    "..dD..",
                    "T.gg.T"
                ]
            },
            human: {
                units: [
                    'kGmMGk',
                    'kk'
                ]
            }
        },
        {
            computer: {
                units: [
                    "g.gg.g",
                    "gg..gg",
                    "gggggg"
                ]
            },
            human: {
                units: ['MGkkGM']
            }
        },
        {
            computer: {
                units: [
                    "gggggg",
                    "gggggg",
                    "gggggg"
                ]
            },
            human: {
                units: ['kkkkGGGG']
            }
        },
    ]
}

var levels = runConfig.levels

class Player extends Phaser.GameObjects.Text
{
    constructor(scene, x, y, defn)
    {
        super(scene, x, y,'',playerTextConfig)
        this.scene.add.existing(this)

        this.hp = defn.hp
        this.attack = defn.attack
        this.shield = defn.shield
        this.rowChange = defn.rowChange
        this.direction = defn.direction
        this.color = defn.color
        this.setColor(this.color)
        this.setOrigin(0.5,0)
        this.update()
    }

    takeDamage(attack)
    {
        this.setTint('0x808080')
        this.scene.time.addEvent(
            { delay: 1000,
              callback: function() {this.clearTint()},
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
        if (this.hp<0) {
            this.hp = 0
        }
    }

    update() 
    {
        this.setText(
            'A '+('0'+this.attack).slice(-2)
            +' S '+('0'+this.shield).slice(-2)
            +' H '+('0'+this.hp).slice(-2))
    }
}

function setUnitStats(unit) {
    unitStats.setText(unit.statsString())
    unitStats.setColor(unit.player.color)
    unitStats.setVisible(true)
}

class Unit extends Phaser.GameObjects.Sprite
{
    constructor(scene, square, typ, column, row, player)
    {
        super(scene, column*squareX, row*squareY,textureFor(typ,player.direction))
        this.scene.add.existing(this)

        this.typ = typ
        this.column = column
        this.row = row
        this.player = player

        this.rowDirection = player.direction

        this.defn = unitDefns[typ]
        this.attack = this.defn.attack
        this.hp = this.defn.hp
        this.initialShield = this.defn.shield
        this.shield = this.initialShield
        this.movement = this.defn.movement
        if (this.movement==ZIGZAG)
        {
            if (column==0) {
                this.columnDirection = RIGHT
            }
            else
            {
                this.columnDirection = LEFT
            }
        }
        else
        {
            this.columnDirection = this.movement
        }
        this.setSize(squareX, squareY)
        this.setOrigin(0,0).setDisplaySize(squareX,squareY)
        this.setFrame(this.animFrame())
    
        this.on("animationcomplete", (pointer) => this.setFrame(this.animFrame()), this)
        this.on('pointerdown', (pointer) => this.showStats(), this)
        this.on('pointerup', (pointer) => this.hideStats(), this)
        this.setInteractive({draggable: true})
                
        square.board.add(this)
    }

    animFrame()
    {
        //return 0
        if (this.columnDirection==LEFT) {
            return 4
        }
        else {
            return 0
        }
    }

    animKey()
    {
        let texture = textureFor(this.typ, this.rowDirection) +'_'+this.columnDirection
        return  texture+'_anim'
    }

    hideStats()
    {
        unitStats.setVisible(false)
    }

    showStats()
    {
        if (this.rowChange==1)
        {
            unitStats.setColor(cComputer)
        }
        else
        {
            unitStats.setColor(cHuman)
        }
        let text = this.statsString()
        unitStats.setText(' '+text+' ')
        unitStats.setVisible(true)
    }


    statsString()
    {
        return (
            'A '+('0'+this.attack).slice(-2)
            +' S '+('0'+this.shield).slice(-2)
            +' H '+('0'+this.hp).slice(-2))
    }

    update()
    {
        if (this.movement==ZIGZAG)
        {
            if (this.columnDirection==LEFT)
            {
                this.columnDirection = RIGHT
            }
            else
            {
                this.columnDirection = LEFT
            }
        }
    }

    move()
    {
        if (this.column==boardColumns-1) {
            if (this.columnDirection==RIGHT)
            {
                this.columnDirection = LEFT
            }
        }
        else if (this.column==0) {
            if (this.columnDirection==LEFT)
            {
                console.log(' bounce')
                this.columnDirection = RIGHT
            }
        }
        let rowChange = rowChanges[this.rowDirection]
        this.row += rowChange
        let rowInc = rowChange * squareY / (numFrames*(1+animRepeat))
        let columnChange = columnChanges[this.columnDirection]
        this.column += columnChange
        let columnInc = columnChange * squareX / (numFrames*(1+animRepeat))
        
        let startFrame = this.animFrame()
        this.play(this.animKey(), startFrame=startFrame)
        this.timedEvent = this.scene.time.addEvent(
            {
                delay: 1000/unitFrameRate,
                repeat: numFrames*(animRepeat+1)-1,
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
        console.log("fightPlayer ")
        console.log(this)
        console.log(player)
        while (this.hp>0 && player.hp>0)
        {
            this.takeDamage(player.attack)
            player.takeDamage(this.attack)
        }
        console.log("after")
        console.log(this)
        console.log(player)
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
        let imageName = typ
        if ((r+c) % 2==0)
        {
            imageName = imageName+'_even'
        }
        else
        {
            imageName = imageName+'_odd'
        }
        let image = board.scene.add.image(0,0,imageName)
        image.setDisplaySize(squareX,squareY)
        image.setSize(squareX,squareY)
        image.setOrigin(0,0)
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

    addUnit(typ, c, r, player)
    {
        const unit = new Unit(this.scene, this, typ, c, r, player)    
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
                this.contents = []
                console.log('destroy')
                console.log(unit)
                unit.destroy()
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
    constructor(scene, x, y)
    {
        super(scene,x, y)

        this.level = levels[levelNum]
        this.unitIndex = 0
        this.turn = 0
        
        this.group = scene.physics.add.group()
        //this.group.add(this)
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
        //let mapDef = this.level.map
        for (let r = 0; r < boardRows; r++)
        {
            //let row = mapDef[r]
            this.mapData[r] = [];
            for (let c = 0; c < boardColumns; c++)
            {
                //let type = square_types[row[c]]
                this.mapData[r][c] = new Square(this, i, 'square_empty', c, r);
                i++;
            }   
        }  
    }

    clear()
    {
        for (let r = 0; r < boardRows; r++)
        {
            let row = this.mapData[r]
            for (let c = 0; c < row.length; c++)
            {
                let square = row[c]
                square.destroy()
            }   
        }  
    }

    moveUnits()
    {
        // Advance all units, handling top and bottom rows as attacking a player
        let movingUnits = []

        for (let r of this.mapData) {
            for (let square of r) {
                let contents = square.contents
                while (contents.length > 0) {
                    let unit = contents.pop()
                    unit.shield = unit.initialShield
                    unit.move()
                    movingUnits.push(unit)             
                    this.mapData[unit.row][unit.column].nextContents.push(unit)
                }
            }
        }
    }

    resolveCombat() {
        for (let r of this.mapData) {
            for (let square of r) {
                square.contents = square.nextContents
                square.nextContents = []
            }
        }

        // Unit combat
        for (let r of this.mapData) {
            for (let square of r) {
                square.resolveCombat()
            }
        }
    }

    addComputerUnits() 
    {
        this.unitData = []
        let level = runConfig.levels[levelNum]
        let units_def = level.computer.units
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
            let typ = unitAbbrevs[abbrev]
            let square = this.mapData[0][c]
            square.addUnit(typ,c,0,computer)
        } 
        this.turn +=1
    }
}

function textureFor(typ, rowDirection) {
    let defn = unitDefns[typ]
    //console.log(typ)
    let texture = defn.texture
    if (texture===undefined) {
        texture = typ
    }
    return texture+'_'+rowDirection
}

class Item extends Phaser.GameObjects.Sprite
{   
    constructor(scene, inventory, typ, player) {
        super(scene,0,0,textureFor(typ,'up'))
        this.scene.add.existing(this)

        this.items = inventory
        this.typ = typ
        this.player = player

        this.defn = unitDefns[typ]
        this.attack = this.defn.attack
        this.hp = this.defn.hp
        this.columnDirection = this.defn.movement
        this.initialShield = this.defn.shield
        this.shield = this.initialShield

        this.newSquare = null
        //this.animKey = typ+'_up_anim'
        
        this.setDisplaySize(squareX,squareY)
        this.setSize(squareX,squareY)
        this.setInteractive({ draggable: true})
        //this.setInteractive(scene.input.makePixelPerfect());
        this.setOrigin(0,0)
        this.setFrame(this.animFrame())
        console.log(this)
        
        inventory.group.add(this)
    }
    animFrame()
    {
        //return 0
        if (this.columnDirection==LEFT) {
            return 4
        }
        else {
            return 0
        }
    }
    statsString()
    {
        return (
            'A '+('0'+this.attack).slice(-2)
            +' S '+('0'+this.shield).slice(-2)
            +' H '+('0'+this.hp).slice(-2))
    }
}

class Inventory extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, defn)
    {
        super(scene, x, y)
        this.scene.add.existing(this)

        this.defn = defn

        const image = scene.add.image(0,0,'black')
        image.setDisplaySize(numItems*squareX,squareY+2)
        image.setOrigin(0,0)
        //image.setTint(0x008000)
        this.add(image) 

        this.group = scene.physics.add.group()

        this.createItems(defn);
    }

    createItems(defn) {
       for (let i=0; i<defn.length;i++) {
            let unitRow = defn[i]
            for (let j=0; j<unitRow.length;j++) {
                let typ = unitAbbrevs[unitRow[j]]
                console.log('Adding item '+typ)
                let item = new Item(this.scene, this, typ, human)
                item.setVisible(false)
                this.add(item)    
            }
        }
        this.fill()
    }

    fill()
    {        
        let gameObjects = this.getAll('newSquare')
        for (let item of gameObjects) {   
            if (item.visible==true) {
                this.remove(item)
                item.setVisible(false)
                this.add(item)
            }
        }

        gameObjects = this.getAll('newSquare')
        for (let i=0; i<gameObjects.length; i++) {
            let item = gameObjects[i]
            item.row=0
            item.column = i
            item.setPosition(i*squareX, 0)
            item.setVisible(true)
            this.add(item)
            if (i==numItems-1) {
                break
            }
        }
    }
}

class Preload extends Phaser.Scene
{
    constructor()
    {
        super('Preload')
    }

    preload()
    {
        this.load.image('black','black.png')
        this.load.image('white','white.png')

        this.load.image('button_empty', 'button_empty.png')
        this.load.image('button_charge', 'button_charge2.png')
        this.load.image('button_restart', 'button_restart2.png')

        this.load.image('square_empty_even', 'square_empty_even.png')
        this.load.image('square_empty_odd', 'square_empty_odd.png')

        this.load.spritesheet('combat', 'combat.png', animConfig)
        this.load.spritesheet('unit_knight_up', 'unit_knight_up.png',animConfig)
        this.load.spritesheet('unit_goblin_down', 'unit_goblin_down.png',animConfig)
        this.load.spritesheet('unit_golem_up', 'unit_golem_up.png',animConfig)
        this.load.spritesheet('unit_troll_down', 'unit_troll_down.png',animConfig)
        this.load.spritesheet('unit_minotaur_up', 'unit_minotaur_right.png',animConfig)
        this.load.spritesheet('unit_dragon_down', 'unit_dragon_right.png',animConfig)
        this.load.spritesheet('unit_snake_up', 'unit_snake_up.png',animConfig)
    }

    create() 
    {
        this.anims.create({
            key: 'combat_anim',
            frames: 'combat',
            frameRate: 10,
            repeat: 2,
            //delay: 1000,
            //showBeforeDelay: false,
        })
        this.anims.create({
            key:'unit_goblin_down_center_anim',
            frames: 'unit_goblin_down',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_knight_up_center_anim',
            frames: 'unit_knight_up',
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_golem_up_center_anim',
            frames: 'unit_golem_up',
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_troll_down_center_anim',
            frames: 'unit_troll_down',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_minotaur_up_right_anim',
            frames: this.anims.generateFrameNames('unit_minotaur_up', {start:0, end:3}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_minotaur_up_left_anim',
            frames: this.anims.generateFrameNames('unit_minotaur_up', {start:4, end:7}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_lminotaur_up_right_anim',
            frames: this.anims.generateFrameNames('unit_minotaur_up', {start:0, end:3}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_lminotaur_up_left_anim',
            frames: this.anims.generateFrameNames('unit_minotaur_up', {start:4, end:7}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        this.anims.create({
            key:'unit_dragon_down_right_anim',
            frames: this.anims.generateFrameNames('unit_dragon_down', {start:0, end:3}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        
        this.anims.create({
            key:'unit_dragon_down_left_anim',
            frames: this.anims.generateFrameNames('unit_dragon_down', {start:4, end:7}),
            frameRate: unitFrameRate,
            repeat: animRepeat,
        })
        
        this.scene.start('Welcome')
    }

}

class Welcome extends Phaser.Scene
{
    constructor()
    {
        super('Welcome')
    }

    create()
    {
        levelNum = 0
        
        this.scene.start('Play')
        const welcome = [
            "",
            "Welcome to ATTACK!",
            "",
            "",
            "To Play:",
            "",
            "10 Drag units",
            "   from the inventory",
            "   on the bottom",
            "   of the screen",
            "   onto a square",
            "   on the board.",
            "",
            "20 Click CHARGE!",
            "",
            "30 GOTO 10"
        ]
        const text = this.add.text(buttonX,0,
            welcome.join("\n"), welcomeTextConfig)
        text.setOrigin(0.5,0)
        startButton = new Button(this, buttonX,buttonY,'button_empty','CLICK TO START!')
        startButton.button.setDisplaySize(boardWidth,buttonHeight)
        startButton.button.on('pointerup', (pointer) => this.scene.start("Play"))
    }
}

class Play extends Phaser.Scene
{
    constructor()
    {
        super('Play')
    }
    
    timerEvent;
    stateText;

    create ()
    {
        console.log('Level '+levelNum)
        //timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        let levelDefn = levels[levelNum]

        computer = new Player(this, buttonX, computerY, runConfig.computer)
        unitStats = this.add.text(buttonX, computerY, "", playerTextConfig)
        unitStats.setOrigin(0.5,0)
        unitStats.setBackgroundColor(cLightGreen)
        board = new Board(this, boardXOffset, boardYOffset)
        human = new Player(this, buttonX, humanY, runConfig.human)
        items = new Inventory(this, inventoryX, inventoryY, levelDefn.human.units)

        chargeButton = new Button(this, buttonX,buttonY,'button_empty','CHARGE!')
        chargeButton.button.on('pointerup', (pointer) => this.performActions())
        
        restartButton = new Button(this, buttonX, buttonY, 'button_empty','RESTART!')
        restartButton.button.on('pointerup', (pointer) => this.restart())
        restartButton.setVisible(false)

        welcomeButton = new Button(this, buttonX, buttonY,'button_empty','NEW GAME!')
        welcomeButton.button.on('pointerup', (pointer) => this.scene.start('Welcome'))
        welcomeButton.setVisible(false)

        // TODO: move continueText to performActions
        let continueText = 'NEXT LEVEL '+(levelNum+1)+'!'
        continueButton = new Button(this, buttonX, buttonY,'button_empty',continueText)
        continueButton.button.on('pointerup', (pointer) => this.nextLevel())
        continueButton.setVisible(false)

        this.physics.add.overlap(board.group, items.group, function(square, item)
        {   
            //console.log(square)
            if (item.newSquare) 
            {
                item.newSquare.clearTint()
            }
            square.setTint(0x808080)
            item.newSquare = square
        })

        this.input.on('dragstart', function (pointer, gameObject, dragX, dragY) {
            gameObject.setDisplaySize(squareX/4,squareY/4)
            //console.log(gameObject)
            //console.log(pointer)
            //console.log((pointer.downX-gameObject.x)+' '+(pointer.downY-gameObject.y))
            gameObject.setPosition(gameObject.x+squareX/4, gameObject.y+squareY/4)
            setUnitStats(gameObject)
            
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.setPosition(dragX, dragY)
        })

        this.input.on('dragend', function (pointer, item) {
            unitStats.setVisible(false)        
            if ((item.newSquare == null)||(item.newSquare.contents.length>0))
            {
                item.setDisplaySize(squareX,squareY)
                item.setPosition(item.column*squareX,item.row*squareY)
            }
            else
            {
                
                items.remove(item)
                item.newSquare.clearTint()
                item.newSquare.addUnit(item.typ, item.newSquare.column, boardRows-1, human)
                item.destroy()
            }
        })

        this.timedEvent = this.time.addEvent({ delay: 2000, callback: this.onTimer, callbackScope: this, loop: true });
    }

    newGame() {
        welcomeButton.setVisible(false)
        levelNum = 0
        this.scene.start('Welcome')
    }

    restart() {
        console.log('Restarting')
        board.clear()
        this.scene.restart()
    }

    nextLevel() {
        console.log('Next Level')
        this.scene.start('Play')
    }

    performActions() {
        chargeButton.setVisible(false)
        let moveEvent = this.time.addEvent(
            {
                callback: function() {
                    board.moveUnits()
                },
                callbackScope: this,
            }
        )
        // Delay to allow move animation to complete
        let combatEvent = this.time.addEvent(
            {
                delay: 1000,
                callback: function() {
                    board.resolveCombat()
                    this.changeState()
                },
                callbackScope: this,
            }
        )
    }

    changeState() {
        human.update()
        computer.update()

        if (human.hp<=0 || computer.hp<=0) {
            let text = this.add.text(buttonX,400,'', 
                 winnerTextConfig).setOrigin(0.5)
             if (human.hp==computer.hp) {
                 text.setColor(cComputer)
                 text.setText("No\nwinner!")
                 welcomeButton.setVisible(true)
             }
             else if (human.hp>computer.hp) {
                 levelNum +=1
                 if (levelNum==levels.length) {
                     text.setColor(cHuman)
                     text.setText("The\ncomputer\nis\ndefeated!\n")
                     welcomeButton.setVisible(true)
                 }
                 else {
                     text.setColor(cHuman)
                     text.setText("The\nhuman\nwins!")
                     continueButton.setVisible(true)
                 }
             }
             else {
                 text.setColor(cComputer)
                 text.setText("The\nhuman\nis\ndefeated!")
                 welcomeButton.setVisible(true)
             }
         }
         else {        
             board.addComputerUnits()
             items.fill()
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
    width: screenWidth,
    height: screenHeight,
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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: screenWidth,
        height: screenHeight
    },
    pixelArt: true,
    scene: [Preload, Welcome, Play]
};

const game = new Phaser.Game(config);
