/* global Phaser RemotePlayer io */
// TODO: Change Phaser.CANVAS to Phaser.AUTO for production
var game = new Phaser.Game(window.outerWidth, window.outerWidth, Phaser.CANVAS, 'flapjoustio', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {
    game.load.image('earth', 'assets/sky-tile.png');
    game.load.image('platform', 'assets/platform-1.png');
    game.load.spritesheet('dude', 'assets/bird.png', 64, 64);
    //game.load.spritesheet('dudeL', 'assets/birdL.png', 64, 64);
    game.load.spritesheet('enemy', 'assets/bird.png', 64, 64);
}

var socket; // Socket connection

var sky;
var platforms;

var player;

var enemies;

var currentSpeed = 0;
var cursors;

var playerDirection = 0;

var rect, circle, point;

function create() {
    console.log('create');
    socket = io.connect();

    game.stage.backgroundColor = "#000";
    // Stretch to fill
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;

    // Keep original size
    // game.scale.fullScreenScaleMode = Phaser.ScaleManager.NO_SCALE;

    // Maintain aspect ratio
    // game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

    // UI
    // rect = new Phaser.Rectangle( 100, 100, 100, 100 );
    // game.physics.enable(rect, Phaser.Physics.ARCADE);
    // rect.immovable = true;
    //var rectUI = new Phaser.Rectangle( 100, 100, 100, 100 );
    // circle = new Phaser.Circle( 280, 150, 100 ) ;
    // point = new Phaser.Point( 100, 280 ) ;
    //var bg = game.add.sprite(50, 50, rectUI);
    //rectUI.fixedToCamera = true;
    // var font = game.make.bitmapData(320, 150);
    // var mask = game.make.bitmapData(320, 150);
    // mask.fill(50, 50, 50);
    // font.draw('font');
    // font.update();
    // game.add.sprite(0, 0, font);
    // game.add.sprite(0, 150, mask);
    // var text = "- phaser -\n with a sprinkle of \n pixi dust.";
    // var style = { font: "65px Arial", fill: "#ff0044", align: "center" };
    //
    // var t = game.add.text(game.world.centerX-300, 0, text, style);

    // Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);

    // set render type to canvas (webgl is sllllooooww)
    //game.renderType = Phaser.CANVAS;

    // Our tiled scrolling background
    sky = game.add.tileSprite(-1000, -1000, 2000, 2000, 'earth');
    //sky.fixedToCamera = true;

    // create platforms group
    platforms = game.add.group();

    // create platforms in group
    var coordinates = [
        {x:-300, y:-800},
        {x:-500, y:-400},
        {x:-50, y:200},
        {x:500, y:400},
        {x:-400, y:400},
        {x:750, y:900},
    ];
    for (var i = 0; i < coordinates.length - 1; i++)
    {
        //platforms.create(game.world.randomX, game.world.randomY, 'platform');
        console.log(i, coordinates[i].x, coordinates[i].y);
        platforms.create(coordinates[i].x, coordinates[i].y, 'platform');
    }
    // set properties
    game.physics.enable(platforms, Phaser.Physics.ARCADE);
    platforms.children.forEach(function(platform)
    {
        platform.body.allowGravity = false;
        platform.body.immovable = true;
        platform.body.moves = false;
    });
    // platform = game.add.sprite(0, 0, 'platform');
    // game.physics.enable(platforms, Phaser.Physics.ARCADE);
    // platforms.body.allowGravity = false;
    // platforms.body.immovable = true;
    // platforms.body.moves = false;

    // The base of our player
    var startX = Math.round(Math.random() * (1000) - 500);
    var startY = Math.round(Math.random() * (1000) - 500);
    // fixed start coords
    startX = 0;startY = 0;
    player = game.add.sprite(startX, startY, 'dude');
    player.d = 0;
    player.anchor.setTo(0.5, 0.5);
    player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    player.animations.add('stop', [3], 20, true);

    // TODO: derek Add
    //player.gravity.y = 1000;

    // This will force it to decelerate and limit its speed
    // player.body.drag.setTo(200, 200)
    game.physics.enable(player, Phaser.Physics.ARCADE);
    //player.body.maxVelocity.setTo(400, 400);
    player.body.collideWorldBounds = true;

    // gravity
    //player.body.gravity.y = 1000;
    //  This sets the image bounce energy for the horizontal  and vertical vectors (as an x,y point). "1" is 100% energy return
    /*player.body.bounce.set(0.8);
    player.body.velocity.setTo(200, 200);
    player.body.gravity.set(0, 180);*/
    player.body.bounce.y = 0.3;
    player.body.gravity.y = 200;

    // Create some baddies to waste :)
    enemies = [];

    //player.bringToTop();

    game.camera.follow(player);
    //game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    //game.camera.focusOnXY(0, 0);
    //  Set the world (global) gravity
    game.physics.arcade.gravity.y = 100;

    //cursors = game.input.keyboard.createCursorKeys();

    //player.body.velocity.setTo(200, 200);
    var space_key = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    space_key.onDown.add(playerFlap, this);

    var move_left = this.game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
    move_left.onDown.add(playerLeft, this);

    var move_right = this.game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
    move_right.onDown.add(playerRight, this);

    // Start listening for events
    setEventHandlers();
}
function playerFlap(e)
{
    console.log("flap!");
    //player.body.gravity.y = -300;
    player.body.velocity.y = -200;

    if (playerDirection === 1)
        player.body.velocity.x = -85;
    else player.body.velocity.x = 85;
    //player.body.velocity.x = 50;
}
function playerRight(e)
{
    console.log('RIGHT');
    if (playerDirection === 1)
    {
        player.anchor.setTo(0.5, 0.5);
        player.scale.x *= -1;
    }
    playerDirection = 0;
    player.d = 0;
    //player.loadTexture('birdL', 0);
    //player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    //player.body.velocity.x = 50;
}
function playerLeft(e)
{
    console.log('LEFT');
    if (playerDirection === 0)
    {
        player.anchor.setTo(0.5, 0.5);
        player.scale.x *= -1;
    }
    playerDirection = 1;
    player.d = 1;
    //player.loadTexture('bird', 64);
    //player.body.velocity.x = -50;
}

var setEventHandlers = function() {
    // Socket connection successful
    socket.on('connect', onSocketConnected);

    // Socket disconnection
    socket.on('disconnect', onSocketDisconnect);

    // New player message received
    socket.on('new player', onNewPlayer);

    // Player move message received
    socket.on('move player', onMovePlayer);

    // Player removed message received
    socket.on('remove player', onRemovePlayer);
};

// Socket connected
function onSocketConnected() {
    console.log('Connected to socket server');

    // Reset enemies on reconnect
    enemies.forEach(function(enemy) {
        enemy.player.kill();
    });
    enemies = [];

    // Send local player data to the game server
    socket.emit('new player', {
        x: player.x,
        y: player.y,
        d: player.d
    });
}

// Socket disconnected
function onSocketDisconnect() {
    console.log('Disconnected from socket server');
}

// New player
function onNewPlayer(data) {
    console.log('New player connected:', data.id, data);

    // Avoid possible duplicate players
    var duplicate = playerById(data.id);
    if (duplicate) {
        console.log('Duplicate player!');
        return;
    }

    // Add new player to the remote players array
    enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.d));
}

// Move player
function onMovePlayer(data) {
    var movePlayer = playerById(data.id);

    // Player not found
    if (!movePlayer) {
        console.log('Player not found: ', data.id);
        return;
    }

    // Update player position
    movePlayer.player.x = data.x;
    movePlayer.player.y = data.y;
    movePlayer.player.d = data.d;
}

// Remove player
function onRemovePlayer(data) {
    var removePlayer = playerById(data.id);

    // Player not found
    if (!removePlayer) {
        console.log('Player not found: ', data.id);
        return;
    }

    removePlayer.player.kill();

    // Remove player from array
    enemies.splice(enemies.indexOf(removePlayer), 1);
}

function update() {
    //*
    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) {
            enemies[i].update();
            game.physics.arcade.collide(player, enemies[i].player);
        }
    }

    // platform collision
    game.physics.arcade.collide(player, platforms, collisionCallback, processCallback, this);

    /*if (cursors.left.isDown) {
        player.angle -= 4;
    } else if (cursors.right.isDown) {
        player.angle += 4;
    }

    if (cursors.up.isDown) {
        // The speed we'll travel at
        currentSpeed = 300;
    } else {
        if (currentSpeed > 0) {
            currentSpeed -= 4;
        }
    }*/

    //game.physics.arcade.velocityFromRotation(player.rotation, currentSpeed, player.body.velocity);

    // if (currentSpeed > 0) {
    //     player.animations.play('move');
    // } else {
    //     player.animations.play('stop');
    // }

    //sky.tilePosition.x =  -game.camera.x;
    //sky.tilePosition.y = -game.camera.y;

    // if (game.input.activePointer.isDown) {
    //     if (game.physics.arcade.distanceToPointer(player) >= 10) {
    //         currentSpeed = 300;
    //
    //         player.rotation = game.physics.arcade.angleToPointer(player);
    //     }
    // }

    socket.emit('move player', {
        x: player.x,
        y: player.y,
        d: player.d
    });
    //*/
}
function collisionCallback (objPlayer, objPlatform) {
    //console.log(objPlayer.y, objPlatform.y);
    var pvx = objPlayer.body.velocity.x;

    if (objPlayer.y < objPlatform.y && pvx !== 0)
    {
        console.log("stop player", pvx);
        //player.linearDamping = 20;
        if (pvx > 0)
        {
            objPlayer.body.velocity.x -= 5;
            if (pvx < 0) objPlayer.body.velocity.x = 0;
        }
        else
        {
            objPlayer.body.velocity.x += 5;
            if (pvx > 0) objPlayer.body.velocity.x = 0;
        }
    }
}
function processCallback(objPlayer, objPlatform) {
    //console.log("collision!", objPlayer.body.velocity.x);
    return true;
}
function render() {
    game.debug.cameraInfo(game.camera, 32, 32);
    game.debug.spriteCoords(player, 32, 500);

    // game.debug.geom(rect,'#0fffff');
    // game.debug.geom(circle, '#000');
    // game.debug.geom(point, '#e81b1b');
}

// Find player by ID
function playerById(id) {
    for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].player.name === id) {
            return enemies[i];
        }
    }

    return false;
}
