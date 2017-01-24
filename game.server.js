/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

written by : http://underscorediscovery.ca
written for : http://buildnewgames.com/real-time-multiplayer/

MIT Licensed.
*/

'use strict';

var MAX_PLAYERS_PER_GAME = 30;
var MAX_GAMES_PER_SERVER = 20;

var
    game_server = module.exports = { games : {}, game_count:0 },
    UUID        = require('node-uuid'),
    //namegen     = require('./name_generator'),
    name_set    = require('./egyptian_set'),
    _           = require('lodash'),
    //config      = require('./class.globals'),
    //getplayers  = require('./class.getplayers'),
    verbose     = true;

//Since we are sharing code with the browser, we
//are going to include some values to handle that.
global.window = global.document = global;

//Import shared game library code.
require('./game.core.js');

//A simple wrapper for logging so we can toggle it,
//and augment it for clarity.
game_server.log = function()
{
    if(verbose) console.log.apply(this,arguments);
};

game_server.fake_latency = 0;
game_server.local_time = 0;
game_server._dt = new Date().getTime();
game_server._dte = new Date().getTime();
    //a local queue of messages we delay if faking latency
game_server.messages = [];

var gameservertime = function()
{
    game_server._dt = new Date().getTime() - game_server._dte;
    game_server._dte = new Date().getTime();
    game_server.local_time += game_server._dt/1000.0;
}
setInterval(function()
{
    gameservertime();
    // game_server._dt = new Date().getTime() - game_server._dte;
    // game_server._dte = new Date().getTime();
    // game_server.local_time += game_server._dt/1000.0;
}, 4);

game_server.setIO = function(io, emitter)
{
    this.io = io;
    this.emitter = emitter;
    // console.log('setIO', io);
    
}

game_server.onMessage = function(client,message)
{
    //console.log('@@ onMessage', client, message);
    if(this.fake_latency && message.split('.')[0].substr(0,1) == 'i')
    {
        //store all input message
        game_server.messages.push({client:client, message:message});

        setTimeout(function()
        {
            if(game_server.messages.length)
            {
                game_server._onMessage( game_server.messages[0].client, game_server.messages[0].message );
                game_server.messages.splice(0,1);
            }
        }.bind(this), this.fake_latency);
    }
    else
    {
        game_server._onMessage(client, message);
    }
};

game_server._onMessage = function(client,message)
{
    //this.log('@@ _onMessage', message, client.mp);

    //Cut the message up into sub components
    var message_parts = message.split('.');
    //The first is always the type of message
    var message_type = message_parts[0];

    /*var other_client =
        (client.game.player_host.userid == client.userid) ?
            client.game.player_client : client.game.player_host;*/

    if(message_type == 'i')
    {
        //Input handler will forward this
        //this.log('@@ _onMessage', message, client);
        this.onInput(client, message_parts);
    }
    else if(message_type == 'p')
    {
        client.send('s.p.' + message_parts[1]);
    }
    else if(message_type == 'c')
    {    //Client changed their color!
        //if(other_client)
        var other_clients = [];

        for (var i = 0; i < client.game.player_clients.length; i++)
        {
            if (client.game.player_clients[i].userid != client.userid)
                other_clients.push(client.game.player_clients[i]);
        }

        if (other_clients.length > 0)
        {
            for (var j = 0; j < other_clients.length; j++)
            {
                //other_client.send('s.c.' + message_parts[1]);
                other_clients[j].send('s.c' + message_parts[1]);
            }
        }
    }
    else if(message_type == 'l')
    {    //A client is asking for lag simulation
        this.fake_latency = parseFloat(message_parts[1]);
    }
    else if (message_type == 'n') // store playerName and playerSkin
    {
        var mp = message_parts[1];
        var gameId = message_parts[2];
        var split = message_parts[3].split("|");
        var playerName = split[0];
        var playerSkin = split[1];
        this.log('getting player names for', message_parts);// '...');
        var p = client.game.gamecore.getplayers.allplayers;
        var arr = [];
        var source;
        for (var j = 0; j < p.length; j++)
        {
            this.log(p[j].mp, p[j].playerName, p[j].team, p[j].skin);
            if (p[j].mp != mp && p[j].mp != "hp" && p[j].instance)
            {
                // update others' server player
                arr.push({mp:p[j].mp, name:p[j].playerName, team:p[j].team, skin:p[j].skin});
                // also, 'notify' other's client of the new player (name, skin, etc. that isn't sent live)
                // p[j].instance.send('s.n.' + mp + name + skin);
            }
            else if (p[j].mp == mp)
            {
                // update server's player name and skin
                this.log('* updating my server creds', playerName, playerSkin);
                if (playerName !== undefined)
                    p[j].playerName = playerName;
                p[j].skin = playerSkin;

                // set vis (when respawning!)
                p[j].visible = true;
                p[j].active = true;
            }
        }
        this.log(arr);

        // update player(s) in the appropriate game
        var thegame = this.games[gameId];
        for (var i = 0; i < thegame.player_clients.length; i++)
        {
            console.log('* clients', thegame.player_clients[i].mp);
            
            if (thegame.player_clients[i].mp == mp)
            {
                // send other players data to requesting (new) client
                thegame.player_clients[i].send('s.n.' + JSON.stringify(arr));

                // remove client socket
                //thegame.player_clients.splice(i, 1);
            }
            else
            {
                // update other clients of new players name/team/skin
                console.log('informing others', thegame.player_clients[i].mp, 'about', mp, playerName, playerSkin);
                
                thegame.player_clients[i].send('s.n.' + JSON.stringify({mp:mp,name:playerName,skin:playerSkin}));
            }
        }
        
        //this.log(source);
        //source.send('s.n' + JSON.stringify(arr));
    }

}; //game_server.onMessage

game_server.onInput = function(client, parts)
{
    //this.log('@@ onInput', client.userid, parts);
    //The input commands come in like u-l,
    //so we split them up into separate commands,
    //and then update the players
    var input_commands = parts[1].split('-');
    var input_time = parts[2].replace('-','.');
    var input_seq = parts[3];

    //the client should be in a game, so
    //we can tell that game to handle the input
    if(client && client.game && client.game.gamecore)
    {
        client.game.gamecore.handle_server_input(client, input_commands, input_time, input_seq);
    }

}; //game_server.onInput

//Define some required functions
game_server.createGame = function(client)
{
    this.log('@@ createGame by HOST id', client.userid);
    //Create a new game instance
    // client.hosting = true; // TODO: forced 'hosting' prop -- is this valid?
    var clients = [];
    //if (!ghostHost)
    clients.push(client);
    //var clients = [client]; // include host client

    var thegame =
    {
        id : UUID(),                 //generate a new id for the game
        player_host: client,         //so we know who initiated the game
        player_client: null,         //nobody else joined yet, since its new
        player_clients: clients,
        player_count: 0              //for simple checking of state
    };

    this.log("@@ game id", thegame.id);

    //Store it in the list of game
    this.games[ thegame.id ] = thegame;

    //Keep track
    this.game_count++;

    //Create a new game core instance, this actually runs the
    //game code like collisions and such.
    thegame.gamecore = new game_core( thegame, this.io );
    //Start updating the game loop on the server
    //thegame.gamecore.update( new Date().getTime() );

    // if (ghostHost)
    // {
    //     client.game = thegame;
    //     client.hosting = true;
    //     return thegame;
    // }
    // else

    // this starts the server game loop
    // TODO: dependency = client => this.players.self
    thegame.gamecore.update( new Date().getTime() );

    //tell the player that they are now the host
    //s=server message, h=you are hosting
    // client.send('s.h.'+ String(thegame.gamecore.local_time).replace('.','-'));
    client.send('s.r.'+ String(thegame.gamecore.local_time).replace('.','-'));
    // console.log('@@ inform client that we are hosting (client.hosting=true) at  ' + thegame.gamecore.local_time);
    client.game = thegame;
    // client.hosting = true;

    this.log('@@ player ' + client.userid + ' created a game with id ' + client.game.id);

    // now that game is created, let's add the client to game
    this.findGame(client);
    //return it
    return thegame;
}; //game_server.createGame

    //we are requesting to kill a game in progress.
game_server.endGame = function(gameid, userid)
{
    this.log("@@ endGame", gameid, 'for user', userid);

    var thegame = this.games[gameid];

    if(thegame)
    {
        //stop the game updates immediate
        //thegame.gamecore.stop_update();

        //if the game has two players, the one is leaving
        this.log('total players', thegame.player_count, 'clients', thegame.player_clients.length);
        if(thegame.player_count > 1)
        {
            // get host client and all non-hosting clients
            var allplayers = thegame.gamecore.getplayers.allplayers;
            var host;
            var nonhosts = [];
            var game_instance = this.games[gameid];
            this.log("player clients", thegame.player_clients.length);
            for (var i = 0; i < thegame.player_clients.length; i++)
            {
                // if (thegame.player_clients[i].hosting)
                //     host = thegame.player_clients[i];
                // else nonhosts.push(thegame.player_clients[i]);
                this.log(thegame.player_clients.length, thegame.player_clients[i].userid, userid, thegame.player_clients[i].hosting);
                if (thegame.player_clients[i].userid == userid)
                {
                    console.log('@@ removing client id', userid, thegame.player_clients[i].hosting);

                    // tell client game is ended
                    thegame.player_clients[i].send('s.e');

                    // remove client socket
                    //console.log("* is client host?, player_client", thegame.player_clients[i]);//.hosting, thegame.gamecore.players.self.host);
                    //console.log('* players.self', thegame.gamecore.players.self);
                    
                    thegame.player_clients.splice(i, 1);
                }
            }
            var disconnected_mp;
            for (var j = 0; j < allplayers.length; j++)
            {
                if (allplayers[j].id == userid)
                {
                    console.log('@@ removing player', allplayers[j].mp, userid, allplayers[j].host);
                    disconnected_mp = allplayers[j].mp;
                    if (!allplayers[j].host)
                        allplayers[j].instance = null;//.splice(j, 1);
                    else this.log("* not disconnecting host player...");
                    allplayers[j].disconnected = true;
                    // allplayers[j].active = false;
                    // allplayers[j].pos = {x:0, y:0};
                    allplayers[j].reset();
                    game_instance.player_count--;
                }
            }
            if (disconnected_mp)
            {
                for (var k = 0; k < allplayers.length; k++)
                {
                    if (allplayers[k].mp != disconnected_mp && allplayers[k].mp != "hp" && allplayers[k].instance)
                    {
                        console.log('@@ informing player', allplayers[k].mp, 'about', disconnected_mp);                    
                        allplayers[k].instance.send('s.e.' + disconnected_mp);
                        //thegame.gamecore.players.self = allplayers[k];
                    }
                }
                this.log("player clients", thegame.player_clients.length);
            }

            // if host, send the players the msg the game is ending
            // if (userid == host.userid)
            // {
            //     //the host left, oh snap. Lets try join another game
            //     for (var j = 0; j < nonhosts.length; j++)
            //     {
            //         if(nonhosts[j])
            //         {
            //             //tell them the game is over
            //             nonhosts[j].send('s.e');
            //             //now look for/create a new game.
            //             this.findGame(nonhosts[j]);
            //         }
            //     }
            // }
            // else // not host
            // {
            //     //the other player left, we were hosting
            //     if (host)
            //     {
            //         //tell the client the game is ended
            //         host.send('s.e');
            //         //i am no longer hosting, this game is going down
            //         host.hosting = false;
            //         //now look for/create a new game.
            //         this.findGame(host);
            //     }
            // }

            // if host, send the players the message the game is ending
            /*if(userid == thegame.player_host.userid)
            {
                //the host left, oh snap. Lets try join another game
                if(thegame.player_client)
                {
                    //tell them the game is over
                    thegame.player_client.send('s.e');
                    //now look for/create a new game.
                    this.findGame(thegame.player_client);
                }

            }
            else // not host
            {
                //the other player left, we were hosting
                if(thegame.player_host)
                {
                    //tell the client the game is ended
                    thegame.player_host.send('s.e');
                    //i am no longer hosting, this game is going down
                    thegame.player_host.hosting = false;
                    //now look for/create a new game.
                    this.findGame(thegame.player_host);
                }
            }*/
        }

        // delete this.games[gameid];
        // this.game_count--;
        //
        // this.log('@@ game removed. there are now ' + this.game_count + ' games' );
    }
    else
    {
        this.log('@@ that game was not found!');
    }

}; //game_server.endGame

game_server.startGame = function(game, newplayer)
{
    this.log('@@ startGame', game.id, newplayer.mp, newplayer.userid);
    this.log('* total clients', game.player_clients.length);

    var teamObj = this.getTeams(game);
    this.log('* team obj', teamObj);
    if (teamObj.isfull)
    {
        console.warn("Game is full!");
    }
    else team = teamObj.recommend;
    this.log('* teams', team);

    // set start position (based on team)
    var startPos = {x:0,y:0};
    var teamRed_x = 3;
    var teamRed_y = 4;
    var teamBlue_x = 47;
    var teamBlue_y = 26;
    var sx, sy;
    // var sx = Math.floor(Math.random() * teamRed_x) + 1;
    // var sy = Math.floor(Math.random() * teamRed_y) + 1;
    if (team === 1) // red
    {
        sx = teamRed_x;
        sy = teamRed_y;
    }
    else if (team === 2)
    {
        sx = teamBlue_x;
        sy = teamBlue_y;
    }
    else 
    {
        console.warn("player team undecided!"); return;
    }
    // TODO: set position based on team
    var pos = game.gamecore.gridToPixel(sx, sy);//3,4);
    startPos.x = pos.x;
    startPos.y = pos.y;
    
    //right so a game has 2 players and wants to begin
    //the host already knows they are hosting,
    //tell the other client they are joining a game
    //s=server message, j=you are joining, send them the host id

    var newplayerInstance, playerName, playerMP, team, playerUserId;
    var p = game.gamecore.getplayers.allplayers;
    // get host client and all non-hosting clients
    var host;
    var nonhosts = [];
    for (var x = 0; x < p.length; x++)
    {
        // asign game id to *all* users
        // p[x].gameid = game.id;
        if (p[x].mp == newplayer.mp)
        {
            //this.log("found HOST");//this.log("p:", p[x].mp);
            this.log("* found server newplayer instance", p[x].playerName);
            p[x].instance.gameid = game.id;
            p[x].active = true;
            p[x].visible = true;
            p[x].dead = false;
            p[x].vuln = false;
            p[x].landed = 0;
            newplayerInstance = p[x];
            playerName = p[x].playerName;
            playerMP = p[x].mp;
            playerUserId = p[x].instance.userid;
            //team = team;//Math.floor(Math.random() * 2) + 1; // 1 = red, 2 = blue
            // only assign team if team has not yet been assigned
            //if (p[x].team == 0)
            //{
            newplayerInstance.team = team;
            p[x].team = team;
            p[x].pos = startPos;
            //}
            nonhosts.push(p[x].instance);
            console.log('* player', newplayerInstance.mp, 'assigned to team', team);
        }
        /*else if (p[x].instance && p[x].instance.hosting)//this.log(x, p[x].mp, p[x].playerName, p[x].instance);
        {
            this.log("* found host", p[x].mp);
            host = p[x].instance;
        }*/
        else if (p[x].instance)// nonhosts
        {
            nonhosts.push(p[x].instance);
        }
    }

    // // get host client and all non-hosting clients
    // var host;
    // var nonhosts = [];
    // this.log('player_clients', game.player_clients.length);
    // for (var i = 0; i < game.player_clients.length; i++)
    // {
    //     if (game.player_clients[i].hosting)
    //     {
    //         host = game.player_clients[i];
    //         this.log("host client", host.mp, host.userid);
    //     }
    //     else
    //     {
    //         this.log("nonhost client", game.player_clients[i].mp, game.player_clients[i].userid);
    //         nonhosts.push(game.player_clients[i]);
    //     }
    // }

    var game_instance = this.games[game.id];

    // if (host)
    // {
        //host.send('s.j.', host.userid);
        console.log('nonhosts len', nonhosts.length);
        for (var j = 0; j < nonhosts.length; j++)
        {
            this.log('@@', nonhosts[j].userid, nonhosts[j].mp, nonhosts.pos);
            //var playerName, playerMP;
            var p = game_instance.gamecore.getplayers.allplayers;
            for (var x = 0; x < p.length; x++)
            {
                //this.log("**", p[x].mp, nonhosts[j].mp, newplayer.mp);
                if (p[x].mp == nonhosts[j].mp)// && nonhosts[j].mp == newplayer.mp)
                {
                    //this.log("found HOST");//this.log("p:", p[x].mp);
                    this.log("* found server player instance", p[x].playerName);
                    //playerName = p[x].playerName;
                    //playerMP = p[x].mp;
                    //game_instance.gamecore.players.self =
                }
                //else this.log(x, p[x].mp, p[x].playerName);
            }
            // TODO: Replace orbs array with active chests (and player instance) array
            //console.log('*chests', game_instance.gamecore.chests);
            var chestsarray = [];
            var chest;
            var obj;
            for (var k = 0; k < game_instance.gamecore.chests.length; k++)
            {
                chest = game_instance.gamecore.chests[k];
                obj =
                {
                    i: chest.data.i,
                    d: chest.data.d,
                    m: chest.data.m,
                    t: chest.data.t,
                    x: chest.data.x,
                    y: chest.data.y
                };
                chestsarray.push(obj);
            }
            var flagsArray = [];
            var flag;
            var fo = game_instance.gamecore.config.flagObjects;
            // if (fo)
            // {
            for (var l = 0; l < fo.length; l++)
            {
                //this.log("* flagObject", fo[l]);
                if (fo[l].type == "flag")
                {
                    flag = 
                    {
                        name: fo[l].name,
                        x: fo[l].x,
                        y: fo[l].y,
                        sourceSlot: fo[l].sourceSlot,
                        visible: fo[l].visible,
                        isActive: fo[l].isActive
                    };
                    flagsArray.push(flag);
                }
            }
            // }
            // if (nonhosts[j].mp != newplayer.mp)
            // {
            //     this.log('* sending joingame event to', nonhosts[j].mp);//, nonhosts[j].hosting);
            //     this.log("* data:", playerMP, playerName, playerUserId);
                
            //     //nonhosts[j].send('s.j.' + nonhosts[j].mp + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName);
            //     // nonhosts[j].send('s.j.' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
            // }
            // else
            // {
                this.log('* sending hostgame event to', nonhosts[j].mp);//, nonhosts[j].hosting);
                this.log("* data:", playerMP, playerName);

                // joing game/room
                // this.log('****', nonhosts[j]);
                nonhosts[j].game = game;
                nonhosts[j].join(game.id);
                this.log("player joined game", game.id);
                //nonhosts[j].send('s.j.' + nonhosts[j].mp + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName);
                //nonhosts[j].send('s.h.' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                //console.log('nonhosts[j]', nonhosts[j]);
                this.log("hostgame", this.games[game.id].id);
                nonhosts[j].emit('onhostgame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId, function(err, success)
                {
                    if (err)
                        this.log("ERROR:", err);
                    else this.log("Success", success);
                });

                // let others know player has joined their 
                console.log('player', nonhosts[j].userid, 'sending joingame to other...');
                
                nonhosts[j].broadcast.to(game.id).emit('onjoingame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                //this.io.in(game.id).emit('hostgame' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
            // }
            // nonhosts[j].game = game;
        }
    // }

    // send readyup to *all* players
    this.log('sending readyup to all', nonhosts.length);
    this.io.in(game.id).emit('onreadygame', String(game.gamecore.local_time).replace('.','-'));
    // for (var k = 0; k < nonhosts.length; k++)
    // {
    //     //this.log("readyup!", nonhosts[k].userid);
    //     //if (nonhosts[k] != "host")
    //     nonhosts[k].emit('onreadygame', String(game.gamecore.local_time).replace('.','-'));
    // }
    // if (host)
    // {
    //     this.log('readyup host!');
    //     host.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    // }

    //set this flag, so that the update loop can run it.
    // game.active = true;

}; //game_server.startGame

game_server.findGame = function(client)
{
    this.log('@@ findGame', client.userid, 'looking for a game. We have : ' + this.game_count);

    // if (this.game_count && this.game_count === MAX_GAMES_PER_SERVER)
    // {
    //     this.log("game count maxed", this.game_count);
    //     return;
    // }
    //so there are games active,
    //lets see if one needs another player

    // set max number of games per server
    if(this.game_count)
    {
        var joined_a_game = false;

        //Check the list of games for an open game
        for(var gameid in this.games)
        {
            //only care about our own properties.
            if(!this.games.hasOwnProperty(gameid)) continue;

            this.log("@@ game id", gameid);

            //get the game we are checking against
            var game_instance = this.games[gameid];

            //If the game is a player short
            this.log('@@ player count', game_instance.player_count, 'of', MAX_PLAYERS_PER_GAME);

            if(game_instance.player_count < MAX_PLAYERS_PER_GAME)
            {
                this.log("@@ player", client.userid, "joining game", gameid);
                //someone wants us to join!
                joined_a_game = true;
                //increase the player count and store
                //the player as the client of this game (into array)
                game_instance.player_clients.push(client);
                //game_instance.player_client = client; // <- remove this later

                // add player to client AND/OR server
                //getplayers.allplayers.push(game_instance.gamecore.newPlayer(client, false));

                // add client to player instance
                this.log("@@ assigning client to MY (other, client-based) player instance!");

                // assign player_clients to allplayers (client var is new player)
                var client_added = false;
                var host_added = false;
                var players;
                this.log("@@ total clients", game_instance.player_clients.length);
                for (var j = 0; j < game_instance.player_clients.length; j++)
                {
                    //console.log('^', game_instance.player_clients[j].userid, game_instance.player_clients[j].hosting);
                    players = game_instance.gamecore.getplayers.allplayers;
                    for (var i = 0; i < players.length; i++)
                    {
                        // find null instance
                        if (!players[i].instance)
                        {
                            //console.log('@@ evaluating players for instancing', players[i].mp);
                            if (client_added === false)
                            {
                                // use cp, as host's hp and his props are already defined
                                console.log('*** found client', players[i].mp, client.userid, players[i].team);//players[i].id);
                                players[i].instance = client;
                                players[i].id = client.userid;
                                players[i].isLocal = true;
                                players[i].gameid = gameid;
                                client.mp = players[i].mp;
                                client_added = true;
                            }
                        }
                        else
                        {
                            console.log(players[i].mp, 'has instance!');
                            this.log('mp =', players[i].mp, game_instance.player_clients[j].hosting);
                            /*if (game_instance.player_clients[j].hosting === true && players[i].mp == 'hp')
                            {
                                console.log('*** found host!', game_instance.player_clients[j].userid);//, players[i].instance);
                                players[i].host = true;
                                //client.mp = players[i].mp;
                                host_added = true;
                                //break;
                                //players[i].mp = 'hp';
                                //players[i].mis = 'his';
                                players[i].instance = game_instance.player_clients[j];
                                host_added = true;
                                this.log("* player host is", players[i].mp)
                            }*/
                        }
                    }
                }
                //game_instance.gamecore.players.other.instance = client;
                // create new player
                // add instance to new player
                // add new player to gamecore.allplayers array
                // to to allplayers array
                this.log('@@ allplayers num', players.length);//.push(other); // TODO: is this correct?
                /*for (var i = 0; i < getplayers.allplayers.length; i++)
                {
                    //this.log(getplayers.allplayers[i].instance);
                    this.log('i', getplayers.allplayers[i].host);
                    for (var j = 0; j < getplayers.allplayers[i].instance.length; j++)
                    {
                        this.log('j', typeof(getplayers.allplayers[i].instance[j]));
                        if (getplayers.allplayers[i].instance[j] === null)
                        {
                            this.log("ISNULLL");
                            getplayers.allplayers[i].instance[j] = client;
                        }
                    }
                }*/

                // increase game's player counter
                game_instance.player_count++;

                //start running the game on the server,
                //which will tell them to respawn/start
                this.startGame(game_instance, client);
                break;

            } //end if game has less than max players
            else
            {
                this.log("@@ game is FULL...");
                // client will create a new game (as host)
                client.hosting = true;
            }
        } //for all games

        //now if we didn't join a game,
        //we must create one
        if(!joined_a_game)
        {
            this.log('@@ failed to join a game, ergo we must create one (likely game is full)');
            var game = this.createGame(client);
            //var player = 
            this.startGame(game, client);
            // this.findGame(client);
        } //if no join already

    }
    else
    { //if there are any games at all

        //no games? create one!
        this.createGame(client);
    }

}; //game_server.findGame

game_server.getTeams = function(game_instance)
{
    this.log("== getTeams ==");
    var _this = this;
    var blue = 0;
    var red = 0;
    var total = 0;
    var full = false;
    var rec;

    var players = game_instance.gamecore.getplayers.allplayers;
    _.forEach(players, function(player)
    {
        if (player.instance)
        {
            _this.log("player team", player.team);
            if (player.team === 1)
                red++;
            else if (player.team === 2)
                blue++;
            
            total++;
        }
    });

    //total--; // remove "host" player
    total--; // remove new player

    _this.log('red', red, 'blue', blue);

    if (total === MAX_PLAYERS_PER_GAME)
        full = true;
    else
    {
        if (red > blue)
            rec = 2;
        else if (red < blue)
            rec = 1;
        else // tie
        {
            var rnd = Math.random() >= 0.5;
            _this.log('* team rnd', rnd);
            if (rnd) rec = 1;
            else rec = 2;
        }
    }

    return { red: red, blue: blue, total: total, isfull: full, recommend:rec };
};
// game_server.hasHost = function()
// {
//     var val = null;
//     for (var i = 0; i < this.allplayers.length; i++)
//     {
//         if (this.allplayers[i].host === true)
//         {
//             this.log('@@ host exists!');
//             val = this.allplayers[i];
//             break;
//         }
//     }
//     return val;
// };
// game_server.nameGenerator = function()
// {
//     // name generator
//     var set = new name_set().getSet();
//     var rnd = Math.floor(Math.random() * set.length);
//     var pname = set[rnd];
//     console.log('pname', pname);
//
//     return pname;
// }
