/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.

    Usage : node app.js
*/

'use strict';
 
var
    gameport        = process.env.PORT || 4004,

    io              = require('socket.io'),
    clientIo        = require('socket.io-client'),
    express         = require('express'),
    UUID            = require('node-uuid'),

    debug           = require('debug'),
    winston         = require('winston'),
    // xml2js          = require('xml2js'),

    verbose         = false,
    http            = require('http'),
    app             = express(),
    server          = http.createServer(app),
    //throng          = require('throng'),
    //memwatch        = require('memwatch-next'),
    //heapdump        = require('heapdump'),
    util            = require('util'),
    WORKERS         = process.env.WEB_CONCURRENCY || 1;

/* Express server set up. */

//The express server handles passing our content to the browser,
//As well as routing users where they need to go. This example is bare bones
//and will serve any file the user requests from the root of your web server (where you launch the script from)
//so keep this in mind - this is not a production script but a development teaching tool.

//Tell the server to listen for incoming connections
server.listen(gameport);

//Log something so we know that it succeeded.
console.log('\t :: Express :: Listening on port ' + gameport );

//By default, we forward the / path to index.html automatically.
app.get( '/', function( req, res )
{
    //console.log('trying to load %s', __dirname + '/index.html');
    res.sendfile( '/index.html' , { root:__dirname });
});

// security
app.get('/app.js', function(req, res)
{
    res.status(404).end();
});
app.get('/game.core.js', function(req, res)
{
    //console.log('stop!', req.headers);
    res.status(404).end();
});
app.get('/game.server.js', function(req, res)
{
    res.status(404).end();
});
app.get('/class.player.js', function(req, res)
{
    res.status(404).end();
});
app.get('/class.chest.js', function(req, res)
{
    res.status(404).end();
});
app.get('/class.flag.js', function(req, res)
{
    res.status(404).end();
});
app.get('/class.toast.js', function(req, res)
{
    res.status(404).end();
});
app.get('/egyptian_set.js', function(req, res)
{
    res.status(404).end();
});
app.get('/package.json', function(req, res)
{
    res.status(404).end();
});


//This handler will listen for requests on /*, any file from the root of our server.
//See expressjs documentation for more info on routing.
app.get( '/*' , function( req, res, next )
{
    //This is the current file they have requested
    var file = req.params[0];

    //For debugging, we can track what files are requested.
    //if(verbose)
    console.log('\t :: Express :: file requested : ' + file);

    //Send the requesting client the file.
    res.sendfile( __dirname + '/' + file );
}); //app.get *

app.post( '/api/orbs' , function( req, res, next )
{
    console.log('api POST - app get orbs', game_server[0]);//.games.length);//, req);
    return res.send('hi', game_server.games.length);//[0]);
});
app.post( '/api/playernames', function(req, res, next)
{
    console.log('api POST - app get player names', game_server[0]);
})

/* Socket.IO server set up. */

//Express and socket.io can work together to serve the socket.io client files for you.
//This way, when the client requests '/socket.io/' files, socket.io determines what the client needs.

//Create a socket.io instance using our express server
//console.log('server prot', server);
var sio = io.listen(server);//, {transports:['websocket']});

// using uws module
// https://github.com/uWebSockets/uWebSockets
//*
//sio.set('transports', ['websocket']);

//console.log('engine', sio.engine);
sio.engine.ws = new (require('uws').Server)(
{
    noServer: true,
    perMessageDeflate: false
});
//*/

//Configure the socket.io connection settings.
//See http://socket.io/
//sio.set('transports', ['websocket']);
//clientIo.set('transports', ['websocket']);
/*
sio.configure(function ()
{
    //sio.set('log level', 0);
    // force websocket transport (disable fallback to xhr-polling)
    sio.set('transports', ['websocket']);

    // sio.set('authorization', function (handshakeData, callback)
    // {
    //   callback(null, true); // error first callback style
    // });

});
//*/
//sio.set('log level', 0);
// sio.set('transports', ['websocket']);
// sio.set('authorization', function (handshakeData, callback)
// {
//     console.log('handshakeData', handshakeData);
    
//   callback(null, true); // error first callback style
// });

sio.use(function(socket, next) 
{
  var handshakeData = socket.request;
  //console.log('handshakedata', socket.request);
  
  // make sure the handshake data looks good as before
  // if error do this:
    // next(new Error('not authorized');
  // else just call next
  next();
});

//Enter the game server code. The game server handles
//client connections looking for a game, creating games,
//leaving games, joining games and ending games when they leave.
var game_server = require('./game.server.js');

//Socket.io will call this function when a client connects,
//So we can send that client looking for a game to play,
//as well as give that client a unique ID to use so we can
//maintain the list if players.
sio.sockets.on('connection', function (client)
{
    console.log('client.connection');//, client.conn.transport);
    
    //Generate a new UUID, looks something like
    //5b2ca132-64bd-4513-99da-90e838ca47d1
    //and store this on their socket/connection
    client.userid = UUID();
    console.log('@@ new client connected', client.userid);//, client);

    //tell the player they connected, giving them their id
    client.emit('onconnected', { id: client.userid } );

    //now we can find them a game to play with someone.
    //if no game exists with someone waiting, they create one and wait.
    game_server.findGame(client);

    //Useful to know when someone connects
    console.log('\t socket.io:: player ' + client.userid + ' connected');

    //Now we want to handle some of the messages that clients will send.
    //They send messages here, and we send them to the game_server to handle.
    client.on('message', function(m)
    {
        //console.log('client-to-server message', m);
        game_server.onMessage(client, m);
    }); //client.on message

    //When this client disconnects, we want to tell the game server
    //about that as well, so it can remove them from the game they are
    //in, and make sure the other player knows that they left and so on.
    client.on('disconnect', function ()
    {
        //Useful to know when soomeone disconnects
        console.log('\t socket.io:: client disconnected ' + client.userid + ' ' + client.gameid);//client.game.id);

        // remove player from allplayers array
        //console.log('game', client.game.gamecore);
        // for (var i = 0; i < client.game.gamecore.allplayers.length; i++)
        // {
        //     console.log('::', client.userid, (client.game.gamecore.allplayers[i].instance) ? client.game.gamecore.allplayers[i].instance.userid : "nope");
            
        // }
        

        //If the client was in a game, set by game_server.findGame,
        //we can tell the game server to update that game state.
        if(client.game && client.game.id)
        {
            //player leaving a game should destroy that game
            //game_server.endGame(client.game.id, client.userid);
            game_server.endGame(client.gameid, client.userid);
        } //client.game_id

    }); //client.on disconnect
}); //sio.sockets.on connection

// clientIo.on('connection', function (client)
// {
//     console.log('client io connected...');
// });
// auto-create host game
var host = clientIo.connect(UUID());
/*
    , 
    {
        'transports':['websocket']
        // 'force new connection': false,
        // 'path': '/socket.io/socket.io.js'//-client/so'
    }
);
*/
host.userid = UUID();
host.hosting = true;
//console.log('host', host);
//console.log('host.io.engine.transport.name', host.io.opts.transports);

game_server.createGame(host);

/*
setInterval(function()
{
    if (typeof(global.gc) == 'function')
        global.gc();
    console.log('** GC done')
}, 1000*60);
//*/

////////////////////////////////////////
// Memwatch
////////////////////////////////////////
/*
var hd;
memwatch.on('leak', function(info) 
{
    console.log('Memory Leak!!!:', info);
    if (!hd)
    {
        hd = new memwatch.HeapDiff();
    }
    else
    {
        var diff = hd.end();
        console.error(util.inspect(diff, true, null));
        hd = null;
    }
    //process.kill(process.pid, 'SIGUSR2'); 
});

memwatch.on('stats', function(stats)
{
    console.log('V8 GC stats', stats);
    //process.kill(process.pid, 'SIGUSR2');
})
//*/

////////////////////////////////////////
// concurrency via 
// https://github.com/hunterloftis/throng
////////////////////////////////////////
/*
function startWorker(id)
{
    console.log('app.startWorker id ${id} concurrency workers...');

    process.on('SIGTERM', () => {
        console.log(`Worker ${ id } exiting...`);
        console.log('(cleanup would happen here)');
        process.exit();
    });
}

function startMaster()
{
    console.log('app.startMaster()');    
}
//*/
/*
throng( 
{
    workers: WORKERS,
    lifetime: Infinity,
    master: startMaster,
    start: startWorker
});
//*/