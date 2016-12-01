/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

written by : http://underscorediscovery.ca
written for : http://buildnewgames.com/real-time-multiplayer/

MIT Licensed.
*/

'use strict';

var MAX_PLAYERS_PER_GAME = 30;

var
    game_server = module.exports = { games : {}, game_count:0 },
    UUID        = require('node-uuid'),
    //namegen     = require('./name_generator'),
    name_set    = require('./egyptian_set'),
    config      = require('./class.globals'),
    getplayers  = require('./class.getplayers'),
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

setInterval(function()
{
    game_server._dt = new Date().getTime() - game_server._dte;
    game_server._dte = new Date().getTime();
    game_server.local_time += game_server._dt/1000.0;
}, 4);

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
    else if (message_type == 'n')
    {
        this.log('getting player names for', message_parts[1], '...');
        var p = getplayers.allplayers;
        var arr = [];
        var source;
        for (var j = 0; j < p.length; j++)
        {
            //this.log(p[j].mp, p[j].playerName, p[j].team);
            if (p[j].mp != message_parts[1] && p[j].mp != "hp" && p[j].instance)
                arr.push({mp:p[j].mp, name:p[j].playerName, team:p[j].team});
        }
        this.log(arr);

        // message_parts[2] is game id
        var thegame = this.games[message_parts[2]];
        for (var i = 0; i < thegame.player_clients.length; i++)
        {
            if (thegame.player_clients[i].mp == message_parts[1])
            {
                // tell client game is ended
                thegame.player_clients[i].send('s.n.' + JSON.stringify(arr));

                // remove client socket
                thegame.player_clients.splice(i, 1);
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
    client.hosting = true; // TODO: forced 'hosting' prop -- is this valid?
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
        player_count: 1              //for simple checking of state
    };

    //Store it in the list of game
    this.games[ thegame.id ] = thegame;

    //Keep track
    this.game_count++;

    //Create a new game core instance, this actually runs the
    //game code like collisions and such.
    thegame.gamecore = new game_core( thegame );
    //Start updating the game loop on the server
    //thegame.gamecore.update( new Date().getTime() );

    // if (ghostHost)
    // {
    //     client.game = thegame;
    //     client.hosting = true;
    //     return thegame;
    // }
    // else
    thegame.gamecore.update( new Date().getTime() );

    //tell the player that they are now the host
    //s=server message, h=you are hosting
    client.send('s.h.'+ String(thegame.gamecore.local_time).replace('.','-'));
    console.log('@@ inform client that we are hosting (client.hosting=true) at  ' + thegame.gamecore.local_time);
    client.game = thegame;
    client.hosting = true;

    this.log('@@ player ' + client.userid + ' created a game with id ' + client.game.id);

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
            var host;
            var nonhosts = [];
            var game_instance = this.games[gameid];
            for (var i = 0; i < thegame.player_clients.length; i++)
            {
                // if (thegame.player_clients[i].hosting)
                //     host = thegame.player_clients[i];
                // else nonhosts.push(thegame.player_clients[i]);
                if (thegame.player_clients[i].userid == userid)
                {
                    console.log('@@ removing client id', userid);

                    // tell client game is ended
                    thegame.player_clients[i].send('s.e');

                    // remove client socket
                    thegame.player_clients.splice(i, 1);
                }
            }
            var disconnected_mp;
            for (var j = 0; j < getplayers.allplayers.length; j++)
            {
                if (getplayers.allplayers[j].id == userid)
                {
                    console.log('@@ removing player', getplayers.allplayers[j].mp, userid);
                    disconnected_mp = getplayers.allplayers[j].mp;
                    getplayers.allplayers[j].instance = null;//.splice(j, 1);
                    getplayers.allplayers[j].active = false;
                    getplayers.allplayers[j].pos = {x:0, y:0};
                    game_instance.player_count--;
                }
            }
            if (disconnected_mp)
            {
                for (var k = 0; k < getplayers.allplayers.length; k++)
                {
                    if (getplayers.allplayers[k].mp != disconnected_mp && getplayers.allplayers[k].mp != "hp" && getplayers.allplayers[k].instance)
                    {
                        console.log('@@ informing player', getplayers.allplayers[k].mp, 'about', disconnected_mp);                    
                        getplayers.allplayers[k].instance.send('s.e.' + disconnected_mp);
                    }
                }
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
    //right so a game has 2 players and wants to begin
    //the host already knows they are hosting,
    //tell the other client they are joining a game
    //s=server message, j=you are joining, send them the host id

    var newplayerInstance, playerName, playerMP, team;
    var p = getplayers.allplayers;
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
            team = Math.floor(Math.random() * 2) + 1;; // 1 = red, 2 = blue
            // only assign team if team has not yet been assigned
            if (p[x].team == 0)
            {
                newplayerInstance.team = team;
            }
            nonhosts.push(p[x].instance);
            console.log('* player', newplayerInstance.mp, 'assigned to team', team);
        }
        else if (p[x].instance && p[x].instance.hosting)//this.log(x, p[x].mp, p[x].playerName, p[x].instance);
        {
            this.log("* found host", p[x].mp);
            host = p[x].instance;
        }
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

    if (host)
    {
        //host.send('s.j.', host.userid);
        console.log('nonhosts len', nonhosts.length);
        for (var j = 0; j < nonhosts.length; j++)
        {
            this.log('@@', nonhosts[j].userid, nonhosts[j].mp, nonhosts.pos);
            var playerName, playerMP;
            var p = getplayers.allplayers;
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
                else this.log(x, p[x].mp, p[x].playerName);
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
            this.log('* sending joingame event to', nonhosts[j].mp);//, nonhosts[j].hosting);
            this.log("* data:", playerMP, playerName);
            
            //nonhosts[j].send('s.j.' + nonhosts[j].mp + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName);
            nonhosts[j].send('s.j.' + playerMP + "|" + this.games[game.id].id + "|" + JSON.stringify(chestsarray) + "|" + team + "|" + playerName);
            nonhosts[j].game = game;
        }
    }

    for (var k = 0; k < nonhosts.length; k++)
    {
        this.log("readyup!", nonhosts[k].userid);
        //if (nonhosts[k] != "host")
        nonhosts[k].send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    }
    if (host)
    {
        this.log('readyup host!');
        host.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    }

    //set this flag, so that the update loop can run it.
    game.active = true;

}; //game_server.startGame

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
game_server.findGame = function(client)
{
    this.log('@@ findGame', client.userid, 'looking for a game. We have : ' + this.game_count);

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

            //get the game we are checking against
            var game_instance = this.games[gameid];

            //If the game is a player short
            this.log('@@ player count', game_instance.player_count, 'of', MAX_PLAYERS_PER_GAME);

            if(game_instance.player_count < MAX_PLAYERS_PER_GAME)
            {
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
                this.log("@@ total clients", game_instance.player_clients.length);
                for (var j = 0; j < game_instance.player_clients.length; j++)
                {
                    //console.log('^', game_instance.player_clients[j].userid, game_instance.player_clients[j].hosting);
                //}
                    for (var i = 0; i < getplayers.allplayers.length; i++)
                    {
                        //console.log('mp =', getplayers.allplayers[i].mp);
                        // find null instance
                        //console.log('derek', getplayers.allplayers[i].instance);
                        if (!getplayers.allplayers[i].instance)
                        {
                            console.log('@@ evaluating players for instancing', getplayers.allplayers[i].mp);
                            if (client_added === false)
                            {
                                // use cp, as host's hp and his props are already defined
                                console.log('*** found client', getplayers.allplayers[i].mp, client.userid);//getplayers.allplayers[i].id);
                                getplayers.allplayers[i].instance = client;
                                getplayers.allplayers[i].id = client.userid;
                                getplayers.allplayers[i].isLocal = true;
                                // player start position
                                var teamRed_x = 6;
                                var teamRed_y = 6;
                                var sx = Math.floor(Math.random() * teamRed_x) + 1;
                                var sy = Math.floor(Math.random() * teamRed_y) + 1;
                                // TODO: set position based on team
                                getplayers.allplayers[i].pos = game_instance.gamecore.gridToPixel(sx, sy);//3,4);
                                // getplayers.allplayers[i].playerName = this.nameGenerator();
                                // console.log('playername', getplayers.allplayers[i].playerName);
                                getplayers.allplayers[i].gameid = gameid;
                                client.mp = getplayers.allplayers[i].mp;
                                //this.log(client);
                                //client.me = true;
                                client_added = true;
                                //break;
                            }
                            //break;
                            //getplayers.allplayers[i].mp = 'cp'+getplayers.allplayers.length-1;
                            //getplayers.allplayers[i].mis = 'cis'+getplayers.allplayers.length-1;
                        }
                        else
                        {
                            console.log(getplayers.allplayers[i].mp, 'has instance!');
                            continue;
                            //getplayers.allplayers[i].instance = game_instance.player_clients[j];
                            //getplayers.allplayers[i].id = game_instance.player_clients[j].userid;
                            //console.log('mp =', getplayers.allplayers[i].mp);
                            if (game_instance.player_clients[j].hosting === true && getplayers.allplayers[i].mp == 'hp')
                            {
                                console.log('*** found host!', game_instance.player_clients[j].userid);//, getplayers.allplayers[i].instance);
                                getplayers.allplayers[i].host = true;
                                //client.mp = getplayers.allplayers[i].mp;
                                host_added = true;
                                //break;
                                //getplayers.allplayers[i].mp = 'hp';
                                //getplayers.allplayers[i].mis = 'his';
                                getplayers.allplayers[i].instance = game_instance.player_clients[j];
                                host_added = true;
                            }
                        }
                    }
                }
                //game_instance.gamecore.players.other.instance = client;
                // create new player
                // add instance to new player
                // add new player to gamecore.allplayers array
                // to to allplayers array
                this.log('@@ allplayers num', getplayers.allplayers.length);//.push(other); // TODO: is this correct?
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

            } //end if game has less than max players
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
        this.createGame(client);
    }

}; //game_server.findGame
