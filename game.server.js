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
    //console.log('onMessage', client, message);
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
    //this.log('@@ _onMessage', message, client);

    //Cut the message up into sub components
    var message_parts = message.split('.');
    //The first is always the type of message
    var message_type = message_parts[0];

    /*var other_client =
        (client.game.player_host.userid == client.userid) ?
            client.game.player_client : client.game.player_host;*/

    var other_clients = [];
    for (var i = 0; i < client.game.player_clients.length; i++)
    {
        if (client.game.player_clients[i].userid != client.userid)
            other_clients.push(client.game.player_clients[i]);
    }

    if(message_type == 'i')
    {
        //Input handler will forward this
        this.onInput(client, message_parts);
    }
    else if(message_type == 'p')
    {
        client.send('s.p.' + message_parts[1]);
    }
    else if(message_type == 'c')
    {    //Client changed their color!
        //if(other_client)
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

}; //game_server.onMessage

game_server.onInput = function(client, parts)
{
    //this.log('@@ onInput', client.userid);
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
            for (var j = 0; j < game_instance.gamecore.allplayers.length; j++)
            {
                if (game_instance.gamecore.allplayers[j].id == userid)
                {
                    console.log('@@ removing player', userid);
                    game_instance.gamecore.allplayers[j].instance = null;//.splice(j, 1);
                    game_instance.player_count--;
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

game_server.startGame = function(game)
{
    this.log('@@ startGame');
    //right so a game has 2 players and wants to begin
    //the host already knows they are hosting,
    //tell the other client they are joining a game
    //s=server message, j=you are joining, send them the host id

    // get host client and all non-hosting clients
    var host;
    var nonhosts = [];
    for (var i = 0; i < game.player_clients.length; i++)
    {
        if (game.player_clients[i].hosting)
        {
            host = game.player_clients[i];

            //game_instance.gamecore.allplayers
            //host.mp = "hp";
            //host.mis = "his";
        }
        else
        {
            nonhosts.push(game.player_clients[i]);
        }
    }

    var game_instance = this.games[game.id];
    if (host && nonhosts.length > 0)
    {
        this.log("%%%%%%%%%%%%", game_instance.gamecore.allplayers.length);
        var p = game_instance.gamecore.allplayers;
        for (var x = 0; x < p.length; x++)
        {
            if (p[x].mp == "hp")
            {
                this.log("found HOST");//this.log("p:", p[x].mp);
                //game_instance.gamecore.players.self =
            }
            else this.log(x, p[x].mp);
        }
    }

    //this.log('host', host);//.userid);
    this.log('others', nonhosts.length);
    this.log('total orbs', game_instance.gamecore.orbs.length, this.games[game.id].id);
    // player client(s) must join game hosted by HOST
    /*game.player_client.send('s.j.' + game.player_host.userid);
    game.player_client.game = game;*/
    if (host)
    {
        //host.send('s.j.', host.userid);
        for (var j = 0; j < nonhosts.length; j++)
        {
            this.log('@@', nonhosts[j].userid, nonhosts[j].mp);
            // assign player to server instance
            //game_instance.gamecore.players.self.instance = nonhosts[j];
            //game_instance.gamecore.players.self.mp = nonhosts[j].mp;
            //var hosted = this.hasHost();
            //if (hosted)
                //this.log('@@ hosted by', hosted);
            // send user mp, game id, orbs array
            //this.players.self = nonhosts[j];
            nonhosts[j].send('s.j.' + nonhosts[j].mp + "|" + this.games[game.id].id + "|" + JSON.stringify(game_instance.gamecore.orbs));
            nonhosts[j].game = game;
        }
    }

    //now we tell both that the game is ready to start
    //clients will reset their positions in this case.
    // game.player_client.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
    // game.player_host.send('s.r.'+ String(game.gamecore.local_time).replace('.','-'));
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

game_server.findGame = function(client)
{
    this.log('@@ findGame', client.userid, 'looking for a game. We have : ' + this.game_count);

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
            this.log('@@ player count', game_instance.player_count);

            if(game_instance.player_count < 20)
            {
                //someone wants us to join!
                joined_a_game = true;
                //increase the player count and store
                //the player as the client of this game (into array)
                game_instance.player_clients.push(client);
                //game_instance.player_client = client; // <- remove this later

                // add player to client AND/OR server
                //game_instance.gamecore.allplayers.push(game_instance.gamecore.newPlayer(client, false));

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
                    for (var i = 0; i < game_instance.gamecore.allplayers.length; i++)
                    {
                        //console.log('mp =', game_instance.gamecore.allplayers[i].mp);
                        // find null instance
                        //console.log('derek', game_instance.gamecore.allplayers[i].instance);
                        if (!game_instance.gamecore.allplayers[i].instance)
                        {
                            console.log('@@ evaluating players for instancing', game_instance.gamecore.allplayers[i].mp);
                            if (client_added === false)
                            {
                                // use cp, as host's hp and his props are already defined
                                console.log('*** found client', game_instance.gamecore.allplayers[i].mp, client.userid);//game_instance.gamecore.allplayers[i].id);
                                game_instance.gamecore.allplayers[i].instance = client;
                                game_instance.gamecore.allplayers[i].id = client.userid;
                                game_instance.gamecore.allplayers[i].isLocal = true;
                                //game_instance.gamecore.allplayers[i].gameid = gameid;
                                client.mp = game_instance.gamecore.allplayers[i].mp;
                                //this.log(client);
                                //client.me = true;
                                client_added = true;
                                //break;
                            }
                            //break;
                            //game_instance.gamecore.allplayers[i].mp = 'cp'+game_instance.gamecore.allplayers.length-1;
                            //game_instance.gamecore.allplayers[i].mis = 'cis'+game_instance.gamecore.allplayers.length-1;
                        }
                        else
                        {
                            console.log('has instance!');continue;
                            //game_instance.gamecore.allplayers[i].instance = game_instance.player_clients[j];
                            //game_instance.gamecore.allplayers[i].id = game_instance.player_clients[j].userid;
                            //console.log('mp =', game_instance.gamecore.allplayers[i].mp);
                            if (game_instance.player_clients[j].hosting === true && game_instance.gamecore.allplayers[i].mp == 'hp')
                            {
                                console.log('*** found host!', game_instance.player_clients[j].userid);//, game_instance.gamecore.allplayers[i].instance);
                                game_instance.gamecore.allplayers[i].host = true;
                                //client.mp = game_instance.gamecore.allplayers[i].mp;
                                host_added = true;
                                //break;
                                //game_instance.gamecore.allplayers[i].mp = 'hp';
                                //game_instance.gamecore.allplayers[i].mis = 'his';
                                game_instance.gamecore.allplayers[i].instance = game_instance.player_clients[j];
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
                this.log('@@ allplayers num', game_instance.gamecore.allplayers.length);//.push(other); // TODO: is this correct?
                /*for (var i = 0; i < game_instance.gamecore.allplayers.length; i++)
                {
                    //this.log(game_instance.gamecore.allplayers[i].instance);
                    this.log('i', game_instance.gamecore.allplayers[i].host);
                    for (var j = 0; j < game_instance.gamecore.allplayers[i].instance.length; j++)
                    {
                        this.log('j', typeof(game_instance.gamecore.allplayers[i].instance[j]));
                        if (game_instance.gamecore.allplayers[i].instance[j] === null)
                        {
                            this.log("ISNULLL");
                            game_instance.gamecore.allplayers[i].instance[j] = client;
                        }
                    }
                }*/

                // increase game's player counter
                game_instance.player_count++;

                //start running the game on the server,
                //which will tell them to respawn/start
                this.startGame(game_instance);

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
        this.createGame(client);
    }

}; //game_server.findGame
