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
    game.load.image('platform-ice', 'assets/platform-ice.png');
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
    //game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;

    // Keep original size
    // game.scale.fullScreenScaleMode = Phaser.ScaleManager.NO_SCALE;

    // Maintain aspect ratio
    // game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

    // Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 2000, 2000);

    // Our tiled scrolling background
    sky = game.add.tileSprite(-1000, -1000, 2000, 2000, 'earth');
    //sky.fixedToCamera = true;

    // create platforms group
    platforms = game.add.group();

    // create platforms in group
    // 0 = normal
    // 1 = icy
    // 2 = moving
    var platformData = [{
        x: -300,
        y: -800,
        type: 0
    }, {
        x: -500,
        y: -400,
        type: 0
    }, {
        x: -100,
        y: 200,
        type: 2
    }, {
        x: 500,
        y: 400,
        type: 1
    }, {
        x: -400,
        y: 400,
        type: 0
    }, {
        x: 750,
        y: 900,
        type: 0
    }, ];
    for (var i = 0; i < platformData.length; i++) {
        var image;

        switch (platformData[i].type) {
            case 0:
            case 2:
                image = 'platform';
                break;
            case 1:
                image = 'platform-ice';
                break;
        }
        //platforms.create(game.world.randomX, game.world.randomY, 'platform');
        platforms.create(platformData[i].x, platformData[i].y, image);
    }
    // set platform properties
    game.physics.enable(platforms, Phaser.Physics.ARCADE);
    var count = 0;
    platforms.children.forEach(function(platform) {
        platform.type = platformData[count].type;

        switch (platform.type) {
            case 0: // normal
                platform.body.allowGravity = false;
                platform.body.immovable = true;
                platform.body.moves = false;
                break;
            case 1: // icy
                platform.body.allowGravity = false;
                platform.body.immovable = true;
                platform.body.moves = false;
                break;

            case 2: // moving
                platform.body.allowGravity = false;
                platform.body.immovable = true;
                platform.body.moves = true;
                platform.body.velocity.x = 50;
                break;
            default:
        }

        count++;
    });

    // The base of our player
    var startX = Math.round(Math.random() * (1000) - 500);
    var startY = Math.round(Math.random() * (1000) - 500);
    // fixed start coords
    startX = 0;
    startY = 0;
    player = game.add.sprite(startX, startY, 'dude');
    player.d = 0; // default to facing right
    player.anchor.setTo(0.5, 0.5);
    // animations
    player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    player.animations.add('stop', [3], 20, true);

    // TODO: derek Add
    //player.gravity.y = 1000;

    // This will force it to decelerate and limit its speed
    //player.body.drag.setTo(200, 200)
    game.physics.enable(player, Phaser.Physics.ARCADE);
    //player.body.maxVelocity.setTo(400, 400);
    player.body.collideWorldBounds = true;

    // gravity & bounce
    player.body.bounce.y = 0.3;
    player.body.gravity.y = 200;

    //  Set the world (global) gravity
    game.physics.arcade.gravity.y = 100;

    // Create some baddies to waste :)
    enemies = [];

    //player.bringToTop();

    game.camera.follow(player, Phaser.Camera.FOLLOW_LOCKON);
    //game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    //game.camera.focusOnXY(0, 0);

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

function playerFlap(e) {
    console.log("flap!");
    //player.body.gravity.y = -300;
    player.body.velocity.y = -200;

    if (playerDirection === 1)
        player.body.velocity.x = -85;
    else player.body.velocity.x = 85;
    //player.body.velocity.x = 50;
}

function playerRight(e) {
    console.log('RIGHT');
    if (playerDirection === 1) {
        player.anchor.setTo(0.5, 0.5);
        player.scale.x *= -1;
    }
    playerDirection = 0;
    player.d = 0;
    //player.loadTexture('birdL', 0);
    //player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
    //player.body.velocity.x = 50;
}

function playerLeft(e) {
    console.log('LEFT');
    if (playerDirection === 0) {
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
    // round values
    player.x = Math.round(player.x * 100) / 100;
    player.y = Math.round(player.y * 100) / 100;

    //////////////////////////////
    // collisions
    //////////////////////////////

    // enemy collision
    for (var i = 0; i < enemies.length; i++) {
        //if (enemies[i].alive) {
            enemies[i].update();
            game.physics.arcade.collide(player, enemies[i].player, playerCollision, null, this);
        //}
    }

    // platform collision
    game.physics.arcade.collide(player, platforms, platformDrag, null, this);

    //////////////////////////////
    // player move state (check after collisions)
    //////////////////////////////
    var standing = player.body.velocity.x === 0 && (player.body.blocked.down || player.body.touching.down);
    //console.log("s:",standing);

    //////////////////////////////
    // if moving, move player data to socket
    //////////////////////////////
    //console.log('player:', player.x, player.y);
    //if (standing === true) {
        socket.emit('move player', {
            x: player.x,
            y: player.y,
            d: player.d
        });
    //}
}

function playerCollision(objPlayer, objEnemy)
{
    console.log('HIT********');
}
function platformDrag(objPlayer, objPlatform) {
    //console.log(objPlatform.type);
    // objPlatform.type (0 = normal, 1 = ice)
    var pvx = objPlayer.body.velocity.x;
    var dragValue;

    switch (objPlatform.type) {
        case 0:
            dragValue = 5; // normal
            break;
        case 1:
            dragValue = 0.5; // slippery ice
            break;
        case 2:
            dragValue = 5; // normal (moving platform)
            break;
    }

    if (objPlayer.y < objPlatform.y && pvx !== 0) {
        if (pvx > 0) {
            objPlayer.body.velocity.x -= dragValue;
            if (pvx < 0) objPlayer.body.velocity.x = 0;
        } else {
            objPlayer.body.velocity.x += dragValue;
            if (pvx > 0) objPlayer.body.velocity.x = 0;
        }
    }
}

function render() {
    game.renderer.renderSession.roundPixels = true;

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
