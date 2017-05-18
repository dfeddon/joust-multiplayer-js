/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

written by : http://underscorediscovery.ca
written for : http://buildnewgames.com/real-time-multiplayer/

MIT Licensed.
*/

'use strict';

// players per game: 40 (20 per team)
// games per server: 10
// total players per server: ppg * gps = 400;
const MAX_PLAYERS_PER_GAME = 40;
const MAX_PLAYERS_PER_TEAM = MAX_PLAYERS_PER_GAME / 2;
const MAX_GAMES_PER_SERVER = 10;
const MAX_PLAYERS_PER_SERVER = MAX_PLAYERS_PER_GAME * MAX_GAMES_PER_SERVER;
// const MAX_GAMES_PER_SUPER_SERVER = 1;

const PORT_RANGE_START = 4004;
const PORT_RANGE_END = 4013;

const
    // game_server = module.exports = { games : {}, game_count:0 },
    // UUID        = require('node-uuid'),
    getUid      = require('get-uid'),
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
// var game_core = require('./game.core.js');

function game_server(game_core)
{
    var _this = this;
    console.log('game_server constructor');

    this.newClientConnection = [];

    this.fake_latency = 0;
    this.local_time = 0;
    this._dt = new Date().getTime();
    this._dte = new Date().getTime();
        //a local queue of messages we delay if faking latency
    this.messages = [];

    this.games = {};
    this.game_count = 0;

    this.game_core = game_core;

    setInterval(function()
    {
        _this.gameservertime();
        // game_server._dt = new Date().getTime() - game_server._dte;
        // game_server._dte = new Date().getTime();
        // game_server.local_time += game_server._dt/1000.0;
    }, 4);

}
//A simple wrapper for logging so we can toggle it,
//and augment it for clarity.
game_server.prototype.log = function()
{
    if(verbose) console.log.apply(this,arguments);
};

game_server.prototype.gameservertime = function()
{
    this._dt = new Date().getTime() - this._dte;
    this._dte = new Date().getTime();
    this.local_time += this._dt/1000.0;
}

game_server.prototype.b64EncodeUnicode = function(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

game_server.prototype.onMessage = function(spark,message)
{
    if(this.fake_latency && message.split('.')[0].substr(0,1) == 'i')
    {
        //store all input message
        this.messages.push({client:spark, message:message});

        setTimeout(function()
        {
            if(this.messages.length)
            {
                this._onMessage( this.messages[0].client, this.messages[0].message );
                this.messages.splice(0,1);
            }
        }.bind(this), this.fake_latency);
    }
    else
    {
        // console.log('@@ onMessage', message);
        this._onMessage(spark, message);
    }
};

game_server.prototype._onMessage = function(spark,message)
{
    // TODO: if no players on server, force player (required) to port 4004 (primary game port)
    
    // this.log('@@ _onMessage', message);//, spark);//, client.mp);
    if (message.cc) // new client connected
    {
        this.log("@ new client connected (cc)");//, this.games);
        // create uid
        spark.userid = getUid();

        // next, determine the game port has available slot
        // otherwise, we'll need to set a new (arbitrary) port home
        // (client can reside on home port uri yet move to another port node)
        var split = message.cc.split("|");

        // only check counts if game exists
        var game = this.games[Object.keys(this.games)[0]];
        if (game !== undefined)
        {
            // var game = this.games[Object.keys(this.games)[0]];
            var room = game.gamecore.getplayers.fromRoom(split[2]);
            var totalUsers = 0;
            if (room)
            {
                for (var j = room.length - 1; j >= 0; j--)
                {
                    // check for non-instance player
                    if (room[j].instance)
                        totalUsers++;//console.log("@ we have a user!");
                }
            }
            this.log("@ server has", totalUsers, "users");
            if (totalUsers > MAX_PLAYERS_PER_GAME)
            {
                console.log("@ game is full, move client to a new port!");
                // find *first available* port
                var currentPort = parseInt(this.xport);
                console.log('current port', currentPort);
                var nextPort = currentPort + 1;
                if (nextPort > PORT_RANGE_END)
                    nextPort = PORT_RANGE_START;
                split[2] = nextPort;
                console.log("next port", nextPort);
                // store new port in (rebuilt!) messsage.cc[2];
            }
            else this.log("@ game slot available, assigning user to game on port", split[2]);
        }
        else this.log("@ this is the first connection on server!");
        // store data
        spark.playerdata = message.cc;

        // split string on delimiter
        // var split = message.cc.split("|");
        // get player name
        var playerName = 0;
        if (split[0] != "undefined")
            playerName = split[0];
        // get player skin
        var playerSkin = split[1];
        var playerPort = split[2];
        spark.playerPort = playerPort;

        // see if port room exists?
        // if ()
        // if not, create one
        // add room array to getplayers class by server's port number
        //this.games[game.id].gamecore.getplayers.addRoom(playerPort, MAX_PLAYERS_PER_GAME);
        // strip alpha chars and convert to int
        var skinNum = parseInt(playerSkin.replace(/\D/g,''));
        this.log('player cc:', playerName, playerSkin, skinNum, spark.userid, playerPort);

        // add new user to newClient array (spark, ip)
        this.newClientConnection.push(
        {
            spark:spark, 
            port:playerPort, 
            userid:spark.userid,
            createdGame: false,
            readyGame: false
        });
        // also, we will sort rooms by port (split[2])

        spark.write([1, spark.userid, playerName, skinNum, playerPort]);//{ id: spark.userid, playerName: playerName, playerSkin: skinNum });
        // var buffer = new ArrayBuffer(16);
        // var view = new Int32Array(buffer);
        // view[0] = spark.userid;
        // view[1] = playerName;
        // view[2] = skinNum;
        // console.log('1buffer',typeof(spark.userid), view, buffer);
        
        // spark.write(buffer);//{id: spark.userid, playerdata: spark.playerdata });
        this.findGame(spark);
        //return;
    }
    //Cut the message up into sub components
    // var message_parts = message.split('.');
    //The first is always the type of message
    // var message_type = message_parts[0];

    /*var other_client =
        (client.game.player_host.userid == client.userid) ?
            client.game.player_client : client.game.player_host;*/

    // if(message_type == 'i')
    else if (message.is)
    {
        var message_parts = message.is.split('.');
        var message_type = message_parts[0];

        //Input handler will forward this
        // this.log('@@ _onMessage', message);//, client);
        /*
        @@ _onMessage { is: 'i.r-x.11-003.475' }
        @@ _onMessage { is: 'i.r-x.11-032.476' }
        @@ _onMessage { is: 'i.r-u-x.11-063.477' }
        @@ _onMessage { is: 'i.r-u-x.11-084.478' }
        */
        this.onInput(spark, message_parts);//message.is);//_parts);
    }
    //return;
    // else if(message_type == 'p')
    // {
    //     spark.send('s.p.' + message_parts[1]);
    // }
    else if(message_type == 'c')
    {    //Client changed their color!
        //if(other_client)
        var other_clients = [];

        for (var i = 0; i < spark.game.player_clients.length; i++)
        {
            if (spark.game.player_clients[i].userid != spark.userid)
                other_clients.push(spark.game.player_clients[i]);
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
    else if (message.n) // store playerName and playerSkin
    {
        this.log("@ message type n", message.n);//_parts);
        var message_parts = message.n.split(".");
        var userid = message_parts[0];
        var port = message_parts[1];
        var split = message_parts[2].split("|");
        var playerName = split[0];
        var playerSkin = split[1];
        // this.log('getting player names for', message_parts);// '...');
        var p = spark.game.gamecore.getplayers.fromRoom(port);//.allplayers;
        /*for (i = p.length - 1; i >= 0; i--)
        {
            this.log("@ userid", p[i].userid, userid);
            if (p[i].userid === userid)
            {
                this.log("@ found respawned player");
                p[i].active = true;
                p[i].visible = true;
                p[i].vuln = false;
            }
        }*/
        var arr = [];
        var source;

        // update all clients that user has returned (reactive user);
        p[0].instance.room(port).write([7, userid]);
        /*
        for (j = p.length - 1; j >= 0; j--)
        {
            if (p[j].userid == userid)
            {
                this.log("@ respawning player");
                // respawning
                // move to base: set start position (based on team)
                /*var startPos = {x:0,y:0};
                var teamRed_x = 3;
                var teamRed_y = 4;
                var teamBlue_x = 47;
                var teamBlue_y = 26;
                var sx, sy;
                // var sx = Math.floor(Math.random() * teamRed_x) + 1;
                // var sy = Math.floor(Math.random() * teamRed_y) + 1;
                if (p[j].team === 1) // red
                {
                    sx = teamRed_x;
                    sy = teamRed_y;
                }
                else if (p[j].team === 2)
                {
                    sx = teamBlue_x;
                    sy = teamBlue_y;
                }
                else 
                {
                    console.warn("player team undecided!"); return;
                }
                // TODO: set position based on team
                var pos = spark.game.gamecore.gridToPixel(sx, sy);//3,4);
                p[j].pos = pos;
                // startPos.x = pos.x;
                // startPos.y = pos.y;

                // reactivate player
                // p[j].respawn();
                // p[j].visible = true;
                // p[j].active = true;
            }
            else // update "other" players
            {
                p[j].instance.write()
                // p[j].visible = true;
                // p[j].active = true;
            }
        }
        //*/
        /*for (var j = 0; j < p.length; j++)
        {
            this.log(p[j].userid, p[j].playerName, p[j].team, p[j].skin);
            if (p[j].userid != userid && p[j].instance)
            {
                // update others' server player
                arr.push({userid:p[j].userid, name:p[j].playerName, team:p[j].team, skin:p[j].skin});
                // also, 'notify' other's client of the new player (name, skin, etc. that isn't sent live)
                // p[j].instance.send('s.n.' + mp + name + skin);
            }
            else if (p[j].userid == userid)
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
        this.log(arr);*/

        // update player(s) in the appropriate game
        // this.log("games", this.games);
        /*var thegame = this.games[Object.keys(this.games)[0]];
        for (i = 0; i < thegame.player_clients.length; i++)
        {
            console.log('* clients', thegame.player_clients[i].userid, thegame.player_clients[i].userid);
            
            if (thegame.player_clients[i].userid == userid)
            {
                // send other players data to requesting (new) client
                // thegame.player_clients[i].send('s.n.' + JSON.stringify(arr));
                thegame.player_clients[i].emit('onplayernames', JSON.stringify(arr));
                // update other clients of new players name/team/skin
                // thegame.player_clients[i].send('s.n.' + JSON.stringify({mp:mp,name:playerName,skin:playerSkin}));
                thegame.player_clients[i].broadcast.to(gameId).emit('onplayernames', JSON.stringify({mp:mp,name:playerName,skin:playerSkin}));
                // remove client socket
                //thegame.player_clients.splice(i, 1);
                break;
            }
            // else
            // {
            //     // update other clients of new players name/team/skin
            //     console.log('informing others', thegame.player_clients[i].mp, 'about', mp, playerName, playerSkin);
                
            //     thegame.player_clients[i].send('s.n.' + JSON.stringify({mp:mp,name:playerName,skin:playerSkin}));
            // }
        }*/


        
        //this.log(source);
        //source.send('s.n' + JSON.stringify(arr));
    }

}; //game_server.onMessage

game_server.prototype.onInput = function(client, parts)
{
    // this.log('@@ onInput', client.userid, parts);
    //The input commands come in like u-l,
    //so we split them up into separate commands,
    //and then update the players
    var input_commands = parts[1].split('-');
    var input_time = parts[2].replace('-','.');
    var input_seq = parts[3];
    // this.log(parts, input_commands, input_time, input_seq);
    /*
    [ 'i', 'r-x', '88-868', '4437' ] [ 'r', 'x' ] '88.868' '4437'
    [ 'i', 'r-x', '88-887', '4438' ] [ 'r', 'x' ] '88.887' '4438'
    [ 'i', 'r-x', '88-904', '4439' ] [ 'r', 'x' ] '88.904' '4439'
    [ 'i', 'x', '88-919', '4440' ] [ 'x' ] '88.919' '4440'
    [ 'i', 'x', '88-936', '4441' ] [ 'x' ] '88.936' '4441'
    [ 'i', 'x', '88-963', '4442' ] [ 'x' ] '88.963' '4442'
    */
    //the client should be in a game, so
    //we can tell that game to handle the input
    if(client && client.game && client.game.gamecore)
    {
        client.game.gamecore.handle_server_input(client, input_commands, input_time, input_seq);
    }

}; //game_server.onInput

//Define some required functions
game_server.prototype.createGame = function(client)
{
    this.log('@@ createGame by HOST id', client.userid);
    //Create a new game instance
    // client.hosting = true; // TODO: forced 'hosting' prop -- is this valid?
    var clients = [];
    //if (!ghostHost)
    //clients.push(client);
    //var clients = [client]; // include host client

    var thegame =
    {
        id : getUid(),                 //generate a new id for the game
        // player_host: client,         //so we know who initiated the game
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
    this.log('gamecount', this.game_count);
    // thegame.gamecore = new this.game_core(thegame, this.spark );

    // take first new connection is newClientConnection array
    var newconnect = this.newClientConnection[0];
    newconnect.createdGame = true;
    thegame.gamecore = this.game_core.init(thegame);//, newconnect.spark);//this.spark);

    // add room array to getplayers class by server's port number
    // this.log("newconnect", thegame.gamecore.getplayers);
    if (thegame.gamecore.getplayers.fromRoom(newconnect.port) === undefined)
    {
        this.log('@ room doesnt exist -- creating...', newconnect.port);
        thegame.gamecore.getplayers.addRoom(newconnect.port);//, MAX_PLAYERS_PER_GAME);
    }
    // this.log("::", thegame.gamecore.getplayers.game_instance.inRoom);

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
    client.write('s.r.'+ String(thegame.gamecore.local_time).replace('.','-'));
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
game_server.prototype.endGame = function(gameid, userid)
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
            // var allplayers = thegame.gamecore.getplayers.allplayers;
            var allplayers = thegame.gamecore.getplayers.fromRoomByUserId(userid);
            //var host;
            var nonhosts = [];
            var game_instance = this.games[gameid];
            this.log("player clients", thegame.player_clients.length);
            // remove client from clients array
            for (var i = 0; i < thegame.player_clients.length; i++)
            {
                // if (thegame.player_clients[i].hosting)
                //     host = thegame.player_clients[i];
                // else nonhosts.push(thegame.player_clients[i]);
                this.log(thegame.player_clients.length, thegame.player_clients[i].userid, userid);//, thegame.player_clients[i].hosting);
                if (thegame.player_clients[i].userid == userid)
                {
                    console.log('@@ removing client id', userid);//, thegame.player_clients[i].hosting);

                    var p = thegame.player_clients[i];

                    // tell client game is ended
                    //p.emit('ondisconnect');
                    // inform other players
                    this.log('userid', p.userid, p.playerPort);//, p);//mp);
                    //thegame.allplayers[k].instance.send('s.e.' + thegame.player_clients[i].mp);
                    // thegame.player_clients[i].room(thegame.id).send('ondisconnect', thegame.player_clients[i].mp);
                    // p.room(p.playerPort).send('ondisconnect', p.mp);
                    p._rooms.primus.room(p.playerPort).write([25, p.userid]);
                    // leaving game
                    p.leave(p.playerPort);

                    // remove client socket
                    //console.log("* is client host?, player_client", thegame.player_clients[i]);//.hosting, thegame.gamecore.players.self.host);
                    //console.log('* players.self', thegame.gamecore.players.self);
                    
                    thegame.player_clients.splice(i, 1);
                }
            } // end for loop

            // remove player from allplayer array
            var disconnected_mp;
            var room = thegame.gamecore.getplayers.fromRoom(p.playerPort);
            for (var j = 0; j < room.length; j++)
            {
                if (room[j].id == userid)
                {
                    console.log('@@ removing player', room[j].playerPort, userid, room[j].playerName);//, allplayers[j].host);
                    
                    disconnected_mp = room[j].mp;
                    // if (!allplayers[j].host)
                    room[j].instance = null;//.splice(j, 1);
                    // else this.log("* not disconnecting host player...");
                    room[j].disconnected = true;
                    // allplayers[j].active = false;
                    // allplayers[j].pos = {x:0, y:0};
                    room[j].reset();
                    game_instance.player_count--;
                    break;
                }
            }
        }
        else // last player has disconnected
        {
            this.log("last player in game has disconnected...", thegame.player_clients[0].playerPort);

            // thegame.player_clients[0].send('s.e');

            this.log('mp', thegame.player_clients[0].mp);
            // the allplayer instance
            var room = thegame.gamecore.getplayers.fromRoom(thegame.player_clients[0].playerPort);
            for (var j = 0; j < room.length; j++)
            {
                if (room[j].userid == thegame.player_clients[0].userid)
                {
                    this.log("* found player, removing from canvas");
                    room[j].instance = null;
                    room[j].disconnected = true;
                    room[j].reset();
                }
            }
            // leaving game
            thegame.player_clients[0].leave(thegame.player_clients[0].playerPort);
            // remove client
            thegame.player_clients.splice(0, 1);
            thegame.player_count--;
            this.log("players left", thegame.player_clients.length, thegame.player_count);

            // quit game?
            if (this.games.length > 1)
            {
                delete this.games[gameid];
                this.game_count--;
                //
                this.log('@@ game removed. there are now ' + this.game_count + ' games' );
            }
            else this.log("@@ player left only remaining game (game remains active)");
        }
    }
    else
    {
        this.log('@@ that game was not found!');
    }

}; //game_server.endGame

game_server.prototype.startGame = function(game, newplayer)
{
    this.log('@@ startGame', game.id, newplayer.mp, newplayer.userid);
    this.log('* total clients', game.player_clients.length);

    var teamObj = this.getTeams(newplayer.playerPort, game);//game);
    this.log('* team obj', teamObj);
    // teamObj.isfull = true;
    if (teamObj.isfull)
    {
        console.warn("Game is full!");
        // players = game_instance.gamecore.getplayers.fromRoom(client.playerPort);
        newplayer.write([50]);
        return;
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

    var newplayerInstance, playerName, playerMP, team, playerUserId, playerSkin, playerPort;
    var p = game.gamecore.getplayers.fromRoom(newplayer.playerPort);//.allplayers;
    // get host client and all non-hosting clients
    var host;
    var nonhosts = [];
    for (var x = 0; x < p.length; x++)
    {
        // asign game id to *all* users
        // p[x].gameid = game.id;
        if (p[x].mp == newplayer.mp)
        {
            this.log("found HOST", p[x].skin);
            this.log("* found server newplayer instance", p[x].instance.userid);//.mp);//.playerName);
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
            playerSkin = p[x].skin;
            playerPort = p[x].playerPort;
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
    var others = [];
    var other;
    var pd;
    var buffs = [];
    var players = this.games[game.id].gamecore.getplayers.fromRoom(playerPort);
    for (var i = 0; i < game.player_clients.length; i++)
    {
        other = game.player_clients[i];
        console.log('@@ other', other.mp, other.userid, playerUserId, other.playerName, other.skin);
        
        if (other.userid && other.userid != playerUserId && other.playerPort == playerPort)
        {
            //playerdata: 'undefined|skin1'
            this.log('@ others len', players.length);
            pd = other.playerdata.split['|'];
            for (var a = 0; a < players.length; a++)
            {
                // get data from player
                this.log('@ mps', players[a].mp, other.mp);
                if (players[a].mp == other.mp)
                {
                    this.log('@ adding "other" player', other.playerName, other.userid);
                    others.push(
                    {
                        mp: other.mp, 
                        userid: other.userid, 
                        skin: players[a].skin, 
                        playerName: players[a].playerName, 
                        team: players[a].team,
                        buffs: players[a].game_buffs.getBuffsAsArray(players[a].slots)
                    });
                }
            }
        }
        // if (game.player_clients[i].hosting)
        // {
        //     host = game.player_clients[i];
        //     this.log("host client", host.mp, host.userid);
        // }
        // else
        // {
        //     this.log("nonhost client", game.player_clients[i].mp, game.player_clients[i].userid);
        //     nonhosts.push(game.player_clients[i]);
        // }
    }

    var game_instance = this.games[game.id];

    // if (host)
    // {
        //host.send('s.j.', host.userid);
        console.log('nonhosts len', nonhosts.length);
        for (var j = 0; j < nonhosts.length; j++)
        {
            this.log('@@', nonhosts[j].userid, nonhosts[j].mp, nonhosts.pos);
            //var playerName, playerMP;
            // p = game_instance.gamecore.getplayers.allplayers;
            p = game_instance.gamecore.getplayers.fromRoom(playerPort);
            for (x = 0; x < p.length; x++)
            {
                this.log("**", p[x].userid, nonhosts[j].userid, newplayer.userid);
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
            // for (var k = 0; k < game_instance.gamecore.chests.length; k++)
            var roomChests = game_instance.gamecore.getplayers.fromRoom(playerPort, 2); // <- returns inRoomChests array
            this.log("roomConsumables.length", roomChests.length);
            for (var k = roomChests.length - 1; k >= 0; k--)
            {
                chest = roomChests[k];//game_instance.gamecore.chests[k];
                this.log("* consumable:", chest);
                // { c: 2, v: 5, t: 1, i: 1192407040, x: '1904', y: '1408' }
                obj =
                {
                    i: chest.id,//data.i,
                    c: chest.category,//data.c,
                    v: chest.value,//data.v,
                    // t: chest.data.t,
                    x: parseInt(chest.x),
                    y: parseInt(chest.y)
                };
                chestsarray.push(obj);
            }
            var flagsArray = [];
            var flag;
            // var fo = game_instance.gamecore.config.flagObjects;
            var fo = game_instance.gamecore.getplayers.fromRoom(playerPort, 3);
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
                        x: parseInt(fo[l].x),
                        y: parseInt(fo[l].y),
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
            if (nonhosts[j].mp == newplayer.mp)
            {
                this.log('* instance =', nonhosts[j].userid);
                this.log('* sending hostgame event to', nonhosts[j].mp);//, nonhosts[j].hosting);
                this.log("* data:", playerMP, playerName, playerSkin, playerPort);

                // joing game/room
                // this.log('****', nonhosts[j]);
                // TODO: assign instance (nonhosts[j]) to allplayers.player
                nonhosts[j].game = game;
                nonhosts[j].active = true;
                nonhosts[j].visible = true;

                // joining port-based room
                nonhosts[j].join(playerPort);//game.id); // <- port/ip address

                // add room array to getplayers class by server's port number
                // this.games[game.id].gamecore.getplayers.addRoom(playerPort, MAX_PLAYERS_PER_GAME);

                this.log("player joined game", playerPort, game.id);
                // this.log("player", nonhosts[j]);
                //nonhosts[j].send('s.j.' + nonhosts[j].mp + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName);
                //nonhosts[j].send('s.h.' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                //console.log('nonhosts[j]', nonhosts[j]);
                // for (var a = 0; a < others.length; a++)
                //     this.log('other:', others[a].buffs);
                // this.log('hi:', this.games[game.id].gamecore.getplayers);
                // this.log("hostgame", this.games[game.id].id, this.games[game.id].gamecore.getplayers.fromRoom(playerPort, 5));
                // TODO: onhostgame: id "other" players by sending array matching mp to players assigned a userid
                var data = [];
                data[0] = playerMP;
                data[1] = this.games[game.id].id;
                data[2] = chestsarray;
                data[3] = team;
                data[4] = playerName;
                data[5] = flagsArray;
                data[6] = playerUserId;
                data[7] = others;
                data[8] = playerSkin;
                data[9] = game_instance.gamecore.getplayers.fromRoom(playerPort, 5);
                this.log('@ onhostgame', data);
                // this.log('roundEndTime', game_instance.gamecore.roundEndTime);
                nonhosts[j].send('onhostgame', data);
                this.log('@ data', data);

                // nonhosts[j].send('onhostgame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId + "|" + JSON.stringify(others), function(err, success)
                // {
                //     if (err)
                //         this.log("ERROR:", err);
                //     else this.log("Success", success);
                // });

                // let others know player has joined their 
                console.log('player', nonhosts[j].userid, 'sending joingame to other...');
                // nonhosts[j].broadcast.to(game.id).emit('onjoingame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                var joindata = 
                [
                    10,//'onjoingame', 
                    playerUserId,//playerMP,
                    this.games[game.id].id,
                    chestsarray,//JSON.stringify(chestsarray),
                    team,
                    playerName,
                    flagsArray,//JSON.stringify(flagsArray),
                    playerMP,
                    playerSkin
                ];
                //nonhosts[j].room(game.id).except(nonhosts[j].id).write(joindata);//'onjoingame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                nonhosts[j].room(playerPort).except(nonhosts[j].id).write(joindata);//'onjoingame', playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
                
                //this.io.in(game.id).emit('hostgame' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName + "|" + JSON.stringify(flagsArray) + "|" + playerUserId);
            }
            // nonhosts[j].game = game;
        }
    // }

    // send readyup to *all* players
    this.log('sending readyup to all', nonhosts.length);

    // remove new connection from newClientConnection array, return the removed client

    this.log(playerUserId);
    var clientReady = _.remove(this.newClientConnection, {userid: playerUserId});
    // if (clientReady.length > 0)
    clientReady[0].spark.write('onreadygame', String(game.gamecore.local_time).replace('.','-'));

    // remove new client from newClientConnection array

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

game_server.prototype.findGame = function(client)
{
    var localGames = 0;

    // get players on local port
    if (this.game_count > 0)
    {
        if (game_instance !== undefined)
        {
            var playersOnPort = game_instance.gamecore.getplayers.fromRoom(client.playerPort);
            if (playersOnPort === undefined) localGames = 0; // port game not yet instantiated
            else localGames = playersOnPort.length;
        }
    }
    this.log('@@ findGame for userid', client.userid, 'on port', client.playerPort, 'looking for a game. We have : ', localGames, ' local games and ', this.game_count, ' total games on server');

    // if (this.game_count && this.game_count === MAX_GAMES_PER_SUPER_SERVER)
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
            this.log('@@ player count', game_instance.player_count, 'of', MAX_PLAYERS_PER_GAME, game_instance.player_clients.length);

            if(game_instance.player_count < MAX_PLAYERS_PER_GAME)
            {
                this.log("@@ player", client.userid, "joining game", gameid);
                //someone wants us to join!
                joined_a_game = true;

                // ensure room exists (port-based)
                if (!game_instance.gamecore.getplayers.roomExists(client.playerPort))
                {
                    this.log("@ room", client.playerPort, 'does not exist -- creating room!');
                    game_instance.gamecore.getplayers.addRoom(client.playerPort);
                }
                else this.log('@ room', client.playerPort, 'exists!');
                
                //increase the player count and store
                //the player as the client of this game (into array)
                this.log('@ adding client', client.userid, 'to game_instance.player_clients array...');
                game_instance.player_clients.push(client);
                //game_instance.player_client = client; // <- remove this later

                // add player to client AND/OR server
                //getplayers.allplayers.push(game_instance.gamecore.newPlayer(client, false));

                // add client to player instance
                this.log("@@ assigning client to player instance!");

                // assign player_clients to allplayers (client var is new player)
                var client_added = false;
                var host_added = false;
                var players;
                this.log("@@ total clients", game_instance.player_clients.length);
                for (var j = 0; j < game_instance.player_clients.length; j++)
                {
                    //console.log('^', game_instance.player_clients[j].userid, game_instance.player_clients[j].hosting);
                    // players = game_instance.gamecore.getplayers.allplayers;
                    players = game_instance.gamecore.getplayers.fromRoom(client.playerPort);
                    for (var i = 0; i < players.length; i++)
                    {
                        // find null instance
                        if (!players[i].instance)
                        {
                            //console.log('@@ evaluating players for instancing', players[i].mp);
                            if (client_added === false)
                            {
                                // use cp, as host's hp and his props are already defined
                                console.log('*** found client', players[i].mp, client.userid, client.playerdata, client.playerPort, players[i].team);//players[i].id);
                                // this.log("* client", client);
                                var split = client.playerdata.split("|");
                                players[i].instance = client;
                                players[i].id = client.userid;
                                players[i].userid = client.userid;
                                players[i].playerPort = client.playerPort;
                                this.log('@ playerName', split[0], '/', players[i].playerName);
                                if (split[0] !== "undefined" && split[0].length > 2)
                                {
                                    console.log('@ got user-defined name', split[0]);
                                    players[i].playerName = split[0];
                                }
                                else if (players[i].playerName === undefined || players[i].playerName.length === 0)
                                {
                                    console.log('@ auto-generating user name', players[i].playerName);
                                    
                                    players[i].playerName = game_instance.gamecore.nameGenerator();
                                }
                                else console.log('default player name is', players[i].playerName);
                                
                                if (split[1].length > 0)
                                    players[i].skin = split[1];
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
    } // if game_count
    else
    { //if there are any games at all

        //no games? create one!
        this.log("@ there are NO GAMES at all, so create one...");
        this.createGame(client);
    }
}; //game_server.findGame

game_server.prototype.getTeams = function(port, game_instance)
{
    this.log("== getTeams ==");
    var _this = this;
    var blue = 0;
    var red = 0;
    var total = 0;
    var full = false;
    var rec;

    var players = game_instance.gamecore.getplayers.fromRoom(port);//allplayers;
    var player;
    //_.forEach(players, function(player)
    for (var i = 0; i < players.length; i++)
    {
        player = players[i];
        if (player.instance)
        {
            _this.log("player team", player.team);
            if (player.team === 1)
                red++;
            else if (player.team === 2)
                blue++;
            
            total++;
        }
    }

    //total--; // remove "host" player
    total--; // remove new player

    _this.log('red', red, 'blue', blue, 'total', total);

    if (total > MAX_PLAYERS_PER_GAME)
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
module.exports = game_server;
