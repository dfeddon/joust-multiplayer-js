var express = require('express');
var app = express().use(express.static('../public/'));
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var path = require('path');

var Player = require('./Player');
/* ************************************************
 ** GAME VARIABLES
 ************************************************ */
var socket; // Socket controller
var players; // Array of connected players

/* ************************************************
 ** GAME INITIALISATION
 ************************************************ */

// Create and start the http server
io.on('connection', function() {
    console.log('connected...');
});
//app.use(express.static(path.join(__dirname, 'public'), {index: '_'}));
server.listen(3000, function(err) {
    if (err) throw err;

    console.log('init');
    init();
});

app.get('/', function(req, res){
    res.sendFile('index.html', { root: path.resolve(__dirname, '../public') } );
});

function init() {
    console.log("initializing...");
    // Create an empty array to store players
    players = [];

    // Attach Socket.IO to server
    socket = io.listen(server);

    // Start listening for events
    setEventHandlers();
}

var setEventHandlers = function() {
    // Socket.IO
    console.log('event handlers');
    socket.sockets.on('connection', onSocketConnection);
};


// New socket connection
function onSocketConnection(client) {
    console.log('hi');
    console.log('New player has connected: ' + client.id);

    // Listen for client disconnected
    client.on('disconnect', onClientDisconnect);

    // Listen for new player message
    client.on('new player', onNewPlayer);

    // Listen for move player message
    client.on('move player', onMovePlayer);
}

// Socket client has disconnected
function onClientDisconnect() {
    console.log('Player has disconnected: ' + this.id);

    var removePlayer = playerById(this.id);

    // Player not found
    if (!removePlayer) {
        console.log('Player not found: ' + this.id);
        return;
    }

    // Remove player from players array
    players.splice(players.indexOf(removePlayer), 1);

    // Broadcast removed player to connected socket clients
    this.broadcast.emit('remove player', {
        id: this.id
    });
}

// New player has joined
function onNewPlayer(data) {
    // Create a new player
    //console.log('newplayer', data);
    var newPlayer = new Player(data.x, data.y, data.d);
    newPlayer.id = this.id;

    // Broadcast new player to connected socket clients
    this.broadcast.emit('new player', {
        id: newPlayer.id,
        x: newPlayer.getX(),
        y: newPlayer.getY(),
        d: newPlayer.getD()
    });

    // Send existing players to the new player
    var i, existingPlayer;
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        this.emit('new player', {
            id: existingPlayer.id,
            x: existingPlayer.getX(),
            y: existingPlayer.getY(),
            d: existingPlayer.getD()
        });
    }

    // Add new player to the players array
    players.push(newPlayer);
}

// Player has moved
function onMovePlayer(data) {
    //console.log("moving...", data);
    // Find player in array
    var movePlayer = playerById(this.id);

    // Player not found
    if (!movePlayer) {
        console.log('Player not found: ' + this.id);
        return;
    }

    // Update player position
    movePlayer.setX(data.x);
    movePlayer.setY(data.y);
    movePlayer.setD(data.d);

    // Broadcast updated position to connected socket clients
    this.broadcast.emit('move player', {
        id: movePlayer.id,
        x: movePlayer.getX(),
        y: movePlayer.getY(),
        d: movePlayer.getD()
    });
}

/* ************************************************
 ** GAME HELPER FUNCTIONS
 ************************************************ */
// Find player by ID
function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id === id) {
            return players[i];
        }
    }

    return false;
}
