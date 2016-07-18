/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

written by : http://underscorediscovery.ca
written for : http://buildnewgames.com/real-time-multiplayer/

MIT Licensed.
*/

var
    game_server = module.exports = { games : {}, game_count:0 },
    UUID        = require('node-uuid'),
    verbose     = true;

    //Since we are sharing code with the browser, we
    //are going to include some values to handle that.
global.window = global.document = global;

//Import shared game library code.
//require('./node_modules/underscore/underscore-min.js');
//var _ = require("underscore");
// console.log('us', __);
//require('./class.player.js');
require('./game.core.js');

    //A simple wrapper for logging so we can toggle it,
    //and augment it for clarity.
game_server.log = function() {
    if(verbose) console.log.apply(this,arguments);
};

game_server.fake_latency = 0;
game_server.local_time = 0;
game_server._dt = new Date().getTime();
game_server._dte = new Date().getTime();
    //a local queue of messages we delay if faking latency
game_server.messages = [];

setInterval(function(){
    game_server._dt = new Date().getTime() - game_server._dte;
    game_server._dte = new Date().getTime();
    game_server.local_time += game_server._dt/1000.0;
}, 4);

game_server.onMessage = function(client,message) {
    //console.log('onMessage', client, message);
    if(this.fake_latency && message.split('.')[0].substr(0,1) == 'i') {

            //store all input message
        game_server.messages.push({client:client, message:message});

        setTimeout(function(){
            if(game_server.messages.length) {
                game_server._onMessage( game_server.messages[0].client, game_server.messages[0].message );
                game_server.messages.splice(0,1);
            }
        }.bind(this), this.fake_latency);

    } else {
        game_server._onMessage(client, message);
    }
};

game_server._onMessage = function(client,message) {
    //this.log('_onMessage', message);
        //Cut the message up into sub components
    var message_parts = message.split('.');
        //The first is always the type of message
    var message_type = message_parts[0];

    /*var other_client =
        (client.game.player_host.userid == client.userid) ?
            client.game.player_client : client.game.player_host;*/

    if(message_type == 'i') {
            //Input handler will forward this
        this.onInput(client, message_parts);
    } else if(message_type == 'p') {
        client.send('s.p.' + message_parts[1]);
    } else if(message_type == 'c') {    //Client changed their color!
        /*if(other_client)
            other_client.send('s.c.' + message_parts[1]);*/
    } else if(message_type == 'l') {    //A client is asking for lag simulation
        this.fake_latency = parseFloat(message_parts[1]);
    }

}; //game_server.onMessage

game_server.onInput = function(client, parts) {
        //The input commands come in like u-l,
        //so we split them up into separate commands,
        //and then update the players
    var input_commands = parts[1].split('-');
    var input_time = parts[2].replace('-','.');
    var input_seq = parts[3];

        //the client should be in a game, so
        //we can tell that game to handle the input
    if(client && client.game && client.game.gamecore) {
        client.game.gamecore.handle_server_input(client, input_commands, input_time, input_seq);
    }

}; //game_server.onInput

    //Define some required functions
game_server.createGame = function(client)
{
    this.log('server.createGame');
    client.isHost = true;
    client.isMe = true;
    //Create a new game instance
    var allClients = [];
    allClients.push(client);
    var thegame =
    {
        id : UUID(),                //generate a new id for the game
        player_host:client,         //so we know who initiated the game
        player_client:null,         //nobody else joined yet, since its new
        player_clients: allClients, // derek added, store array of player clients
        player_count:1              //for simple checking of state
    };

    this.log('new game id', thegame.id);

    //Store it in the list of game
    this.games[ thegame.id ] = thegame;

    //Keep track
    this.game_count++;

    //Create a new game core instance, this actually runs the
    //game code like collisions and such.
    thegame.gamecore = new game_core( thegame );
    //Start updating the game loop on the server
    thegame.gamecore.update( new Date().getTime() );

    //tell the player that they are now the host
    //s=server message, h=you are hosting

    client.send('s.h.'+ String(thegame.gamecore.local_time).replace('.','-'));
    this.log('server host at ' + thegame.gamecore.local_time);
    client.game = thegame;
    client.hosting = true;

    this.log('player ' + client.userid + ' created & is HOSTING ' + client.hosting + ' a game with id ' + client.game.id);
    //console.log(player);

        //return it
    return thegame;

}; //game_server.createGame

// client disconnect
game_server.clientDisconnected = function(gameid, userid)
{
    this.log('client', userid, 'disconnected from game id', gameid);
    var thegame = this.games[gameid];
    var allplayers = thegame.gamecore.allplayers;

    // remove client
    for (var i = 0; i < thegame.player_clients.length; i++)
    {
        if (thegame.player_clients[i].userid == userid)
        {
            // remove client
            this.log('removing client', userid);
            thegame.player_count--;
            this.log('clients left', thegame.player_count);
        }
    }
    // remove player
    for (var j = 0; j < allplayers.length; j++)
    {
        if (allplayers[j].instance.userid == userid)
            allplayers.splice(j, 1);
        //this.log('->', allplayers[j].instance.userid, userid);
    }
    this.log('players left', allplayers.length);
};
//we are requesting to kill a game in progress.
game_server.endGame = function(gameid, userid)
{
    this.log("endGame", userid);

    var thegame = this.games[gameid];

    if(thegame)
    {
        //stop the game updates immediate
        thegame.gamecore.stop_update();

        //if the game has two players, the one is leaving
        if(thegame.player_count > 1)
        {
            for (var i = 0; i < thegame.player_clients.length; i++)
            {
                if (userid == thegame.player_clients[i].userid)
                {
                    // end the game!
                    //thegame.player_clients[i].send('s.e');
                }
            }
            //send the players the message the game is ending
            /*if(userid == thegame.player_host.userid)
            {
                //the host left, oh snap. Lets try join another game
                if(thegame.player_client)
                {
                    //tell them the game is over
                    thegame.player_client.send('s.e');
                    //now look for/create a new game.
                    this.log('sending player CLIENT');
                    this.findGame(thegame.player_client);
                }

            }
            else
            {
                //the other player left, we were hosting
                if(thegame.player_host)
                {
                    //tell the client the game is ended
                    thegame.player_host.send('s.e');
                    //i am no longer hosting, this game is going down
                    thegame.player_host.hosting = false;
                    //now look for/create a new game.
                    this.log('sending player HOST');
                    this.findGame(thegame.player_host);
                }
            }*/
        }
        /*
        delete this.games[gameid];
        this.game_count--;

        this.log('game removed. there are now ' + this.game_count + ' games' );
        */

    }
    else
    {
        this.log('that game was not found!');
    }

}; //game_server.endGame

game_server.startGame = function(game, client) {
    this.log('startGame');
    //console.log(":::", game.player_host, game.player_client);
    //right so a game has 2 players and wants to begin
    //the host already knows they are hosting,
    //tell the other client they are joining a game
    //s=server message, j=you are joining, send them the host id
    /*if (game.player_client)
    {
        game.player_client.send('s.j.' + game.player_host.userid);
        game.player_client.game = game;
    }*/
    client.isHost = false;
    client.isMe = true;
    game.player_clients.push(client);
    client.send('s.j');
    console.log('client #', game.player_clients.length);
    // for (var i = 0; i < game.player_clients.length; i++)
    // {
    //     if (game.player_clients[i].hosting !== true)// == client.userid)
    //     {
    //         this.log("# joining game...");
    //         game.player_clients[i].send('s.j.');//+ game.player[]);
    //     }
    // }

    //now we tell both that the game is ready to start
    //clients will reset their positions in this case.
    /*for (var j = 0; j < game.player_clients.length; j++)
    {
        this.log('send readyup msg');
        game.player_clients[j].send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    }*/
    /*if (game.player_client)
    game.player_client.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    if (game.player_host)
    game.player_host.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));*/

    //set this flag, so that the update loop can run it.
    game.active = true;

}; //game_server.startGame

game_server.findGame = function(client)
{
    this.log('server.findGame', client.userid);
    this.log('looking for a game. We have : ' + this.game_count + ' games available');
    //this.log('player hosting?', player.hosting);

    //so there are games active,
    //lets see if one needs another player
    if(this.game_count)
    {

        var joined_a_game = false;

        //Check the list of games for an open game
        for(var gameid in this.games)
        {
            //only care about our own properties.
            if(!this.games.hasOwnProperty(gameid)) continue;

            //get the game we are checking against
            var game_instance = this.games[gameid];

            //If the game is a player short
            console.log('TOTAL PLAYERS:', game_instance.player_count);
            if(game_instance.player_count < 2)
            {
                //someone wants us to join!
                joined_a_game = true;
                //increase the player count and store
                //the player as the client of this game TODO: Store array of clients
                game_instance.player_client = client;
                // other should be array?
                //game_instance.gamecore.players.other = game_instance.gamecore.newPlayer();
                game_instance.gamecore.allplayers.push(game_instance.gamecore.newPlayer(client, false));
                game_instance.player_count++;
                // TODO: revise players.other to support allplayers array
                // for (var i=0; i < game_instance.gamecore.allplayers; i++)
                // {
                //     console.log("=========================");
                //     console.log('player', game_instance.gamecore.allplayers[i]);
                //     console.log("=========================");
                // }
                // add new player
                //var game_player = new Player();
                //console.log('::::::',game_instance.gamecore.newPlayer());
                /*game_instance.gamecore.players.other = game_instance.gamecore.newPlayer();//game_instance, game_instance.gamecore.instance.player_client, false);
                game_instance.gamecore.players.other.instance = player;
                game_instance.player_count++;
                console.log('player added', game_instance.player_count, game_instance.gamecore.allplayers.length);*/

                //start running the game on the server,
                //which will tell them to respawn/start
                this.startGame(game_instance, client);

            } //if less than 2 players
        } //for all games

        //now if we didn't join a game,
        //we must create one
        if(!joined_a_game)
        {
            this.createGame(client);
        } //if no join already

    }
    else
    { //if there are any games at all

        //no games? create one!
        console.log('no games available; creating one for player', client.id);
        this.createGame(client);
    }

}; //game_server.findGame
