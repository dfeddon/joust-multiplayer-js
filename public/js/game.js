/* global Phaser RemotePlayer io */

var game = new Phaser.Game(window.outerWidth, window.outerWidth, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: update,
    render: render
});

function preload() {
    game.load.image('earth', 'assets/green-hex.jpg');
    game.load.spritesheet('dude', 'assets/bird.png', 64, 64);
    //game.load.spritesheet('dudeL', 'assets/birdL.png', 64, 64);
    game.load.spritesheet('enemy', 'assets/bird.png', 64, 64);
}

var socket; // Socket connection

var sky;

var player;

var enemies;

var currentSpeed = 0;
var cursors;

var playerDirection = 0;

function create() {
    console.log('create');
    socket = io.connect();

    // Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-5000, -5000, 10000, 10000);

    // Our tiled scrolling background
    sky = game.add.tileSprite(-5000, -5000, 10000, 10000, 'earth');
    //sky.fixedToCamera = true;

    // The base of our player
    var startX = Math.round(Math.random() * (1000) - 500);
    var startY = Math.round(Math.random() * (1000) - 500);
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
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);
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

    if (currentSpeed > 0) {
        player.animations.play('move');
    } else {
        player.animations.play('stop');
    }

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

function render() {

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
