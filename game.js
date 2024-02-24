/*
Notes:

For creating sprites - https://www.piskelapp.com/
For Glitch - https://en.flossmanuals.net/phaser-game-making-in-glitch/_full/
EGA palette - https://en.wikipedia.org/wiki/Enhanced_Graphics_Adapter
Fonts - https://www.hostinger.com/tutorials/best-html-web-fonts#:~:text=Web%2Dsafe%20fonts%20are%20fonts,Times%20New%20Roman%2C%20and%20Helvetica.


TODO:
* deploy to glitch
* tighten down animation
* level selection screen
* scoring based on remaining player and unit HPs
* 3 good levels
* fill out unit types
* combat on move completion
* cleanup unit text
* reset units to inventory
* image load issues
* eliminate Items
* only 4 actions per turn
* fix player status alignment
. magnify unit on hover
. consistent fonts

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

const unitFrameRate = 8
const moveFrames = 4

const animConfig = { frameWidth: 32, frameHeight: 32 } 
const buttonConfig = { fontSize: '64px', fontFamily:'Courier',fontStyle:'Bold', color:cDarkGreen}
const unitTextConfig = { fontSize: '12px', fontFamily:'Courier',fontStyle:'Bold'}
const playerTextConfig = { fontSize: 3*squareX/4, fontFamily:'Courier', fontStyle:'Bold'} // 'Courier'
const winnerTextConfig = {fontSize: '128px', align:'center',fontFamily:'Courier', fontStyle:'Bold'}
const welcomeTextConfig = { 
    //align: "center",
    fontFamily: "Courier",
    fontSize: 64,
    fontStyle: 'Bold',
    color: cText,
}
const ZIGZAG = 'zigzag'

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
let unitStatus

const square_types = {
    '.': 'square_empty',
    's': 'square_sand',
    'w': 'unit_wall'
}

const unitDefns = {
    'unit_knight': {'attack':1, 'hp':2, 'shield':3  ,'horizontal':'none'},
    'unit_goblin': {'attack':2, 'hp':2, 'shield':1, 'horizontal':'none'},
    'unit_golem': {'attack':3, 'hp':3, 'shield':1, 'horizontal':'none'},
    'unit_snake': {'attack':5, 'hp':3, 'shield':0, 'horizontal':ZIGZAG}
}

const unitAbbrevs = {
    'k':'unit_knight',
    'g':'unit_goblin',
    'G':'unit_golem'
}

let levelNum = 0
const runConfig = {
    computer: {
        hp: 10,
        attack: 2,
        shield: 2,
        rowChange: 1,
        color: cComputer
    },
    human: {
        hp: 10,
        attack: 2,
        shield: 2,
        rowChange: -1,
        color: cHuman
    },
    levels: [
        {
            computer: {
                units: [
                    "gggggg",
                    "g.gg.gg"
                ]
            },
            human: {
                units: 'kGG'
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
                units: 'kGkkGkG'
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
                units: 'kkkkGGGG'
            }
        },
    ]
}

levels = runConfig.levels

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
            0,0,'', playerTextConfig)
        this.hpText.setColor(defn['color'])
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
        this.hpText.setText(
            ' A '+('0'+this.attack).slice(-2)
            +' S '+('0'+this.shield).slice(-2)
            +' H '+('0'+this.hp).slice(-2))
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
        this.initialShield = this.defn.shield
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

        let textColor = cGreen
        let imageName = typ
        if (rowChange>0)
        {
            imageName += '_down'
            textColor = cWhite
        }
        else
        {
            imageName += '_up'
            textColor = cWhite
        }
        this.animKey = imageName+'_anim'
        
        this.sprite = (scene.add.sprite(0,0,imageName)
            .setOrigin(0,0)
            .setDisplaySize(squareX,squareY)
        )
        this.sprite.on("animationcomplete", (pointer) => this.sprite.setFrame(0), this)
        
        this.statusText = scene.add.text(32,48, this.statusString(), unitTextConfig)
        this.statusText.setColor(textColor)
        this.statusText.setOrigin(0.5,0)
        this.statusText.setVisible(false)
        this.add([this.sprite, this.statusText])
        this.scene.add.existing(this)
        square.board.add(this)
        //this.sprite.play(imageName+'_anim')

    }

    statusString()
    {
        return (
            'A '+('0'+this.attack).slice(-2)
            +' S '+('0'+this.shield).slice(-2)
            +' H '+('0'+this.hp).slice(-2))
    }

    update()
    {
        // TODO: This shouldn't be needed
        console.log("setting frame")
        //this.sprite.asetFrame(0)
        this.sprite.anims.currentAnim.getFrameByProgress(0)
        console.log(this)

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
                delay: 100,
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
        image.on('pointerdown', (pointer) => this.magnify(), this)
        image.on('pointerup', (pointer) => this.unmagnify(), this)
        image.setInteractive()
        this.image = image
        this.add(this.image)

        board.add(this)
        board.group.add(this) 
    }

    unmagnify()
    {
        if (this.contents.length==1)
        {
            unitStatus.setVisible(false)
        }
    }

    magnify()
    {
        if (this.contents.length==1)
        {
            let unit = this.contents[0]
            if (unit.rowChange==1)
            {
                unitStatus.setColor(cComputer)
            }
            else
            {
                unitStatus.setColor(cHuman)
            }
            let text = unit.statusString()
            unitStatus.setText(' '+text+' ')
            unitStatus.setVisible(true)
        }
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

    updateMap()
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
        console.log(levelNum)
        let level = runConfig.levels[levelNum]
        console.log(level)
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
        //this.setInteractive(scene.input.makePixelPerfect());
        this.setOrigin(0,0)

        
        items.group.add(this)
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

    createItems(defn)
    {   
       for (let i=0; i<defn.length;i++)
       {
            let typ = unitAbbrevs[defn[i]]
            //console.log('Adding item '+typ)
            let item = new Item(this.scene, this, typ)
            item.setVisible(false)
            this.add(item)
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
        this.load.spritesheet('combat', 'combat.png', animConfig)

        this.load.image('square_empty_even', 'square_empty_even.png')
        this.load.image('square_empty_odd', 'square_empty_odd.png')
        this.load.spritesheet('unit_knight_up', 'unit_knight_up.png',animConfig)

        this.load.spritesheet('unit_goblin_down', 'unit_goblin_down.png',animConfig)
        this.load.spritesheet('unit_golem_up', 'unit_golem_up.png',animConfig)
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
            key:'unit_goblin_down_anim',
            frames: 'unit_goblin_down',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 0
        })
        this.anims.create({
            key:'unit_knight_up_anim',
            frames: 'unit_knight_up',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 0

        })
        this.anims.create({
            key:'unit_golem_up_anim',
            frames: 'unit_golem_up',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 0
        })

        this.anims.create({
            key:'unit_snake_up_anim',
            frames: 'unit_snake_up',
            //duration: unitAnimationDuration,
            frameRate: unitFrameRate,
            repeat: 1

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
        
        //this.scene.start('Play')
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
            "30 GOTO 20"
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
    
    preload ()
    {

        }

    timerEvent;
    stateText;

    create ()
    {
        console.log('Level '+levelNum)
        //timeText = this.add.text(100,0,'time: ', { fontSize: '14px'})
        let levelDefn = levels[levelNum]

        computer = new Player(this, buttonX,computerY, runConfig.computer)
        unitStatus = this.add.text(buttonX,computerY,"",playerTextConfig)
        unitStatus.setOrigin(0.5,0)
        unitStatus.setBackgroundColor(cLightGreen)
        board = new Board(this, boardXOffset, boardYOffset)
        human = new Player(this, buttonX, humanY, runConfig.human)
        items = new Inventory(this, inventoryX,inventoryY, levelDefn.human.units)

        chargeButton = new Button(this, buttonX,buttonY,'button_empty','CHARGE!')
        chargeButton.button.on('pointerup', (pointer) => this.performActions())
        
        restartButton = new Button(this, buttonX, buttonY, 'button_empty','RESTART!')
        restartButton.button.on('pointerup', (pointer) => this.restart())
        restartButton.setVisible(false)

        welcomeButton = new Button(this, buttonX,buttonY,'button_empty','NEW GAME!')
        welcomeButton.button.on('pointerup', (pointer) => this.scene.start('Welcome'))
        welcomeButton.setVisible(false)

        // TODO: move continueText to performActions
        let continueText = 'NEXT LEVEL '+(levelNum+1)+'!'
        continueButton = new Button(this, buttonX,buttonY,'button_empty',continueText)
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
            gameObject.setDisplaySize(squareX/2,squareY/2)
            console.log(gameObject)
            console.log(pointer)
            console.log((pointer.downX-gameObject.x)+' '+(pointer.downY-gameObject.y))
            gameObject.setPosition(gameObject.x+squareX/4, gameObject.y+squareY/4)
        })

        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            gameObject.setPosition(dragX, dragY)
        })

        this.input.on('dragend', function (pointer, item) {
        
            if (item.newSquare == null)
            {
                item.setDisplaySize(squareX,squareY)
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

    newGame()
    {
        welcomeButton.setVisible(false)
        levelNum = 0
        this.scene.start('Welcome')
    }
    restart()
    {
        console.log('Restarting')
        board.clear()
        this.scene.restart()
    }

    nextLevel()
    {
        console.log('Next Level')
        //levelNum += 1
        this.scene.start('Play')
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
            let text = this.add.text(buttonX,400,'', 
                winnerTextConfig).setOrigin(0.5)
            if (human.hp==computer.hp)
            {
                text.setColor(cComputer)
                text.setText("No\nwinner!")
                welcomeButton.setVisible(true)
            }
            else if (human.hp>computer.hp)
            {
                levelNum +=1
                if (levelNum==levels.length){
                    text.setColor(cHuman)
                    text.setText("The\ncomputer\nis\ndefeated!\n")
                    welcomeButton.setVisible(true)
                }
                else {
                    text.setColor(cHuman)
                    text.setText("The\nhuman\nwins!")
                    //let continueText = 'NEXT LEVEL '+(levelNum+1)+'!'
                    //continueButton.text.setText(continueText)
                    continueButton.setVisible(true)
                }
            }
            else
            {
                text.setColor(cComputer)
                text.setText("The\nhuman\nis\ndefeated!")
                welcomeButton.setVisible(true)
            }
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
    pixelArt: true,
    scene: [Preload, Welcome, Play]
};

const game = new Phaser.Game(config);
