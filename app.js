/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.

    Usage : node app.js
*/

'use strict';
 
const
    // gameport        = process.env.PORT || 4004,

    server_port_1   = process.env.POST || 4004,
    server_port_2   = process.env.POST || 4005,
    server_port_3   = process.env.POST || 4006,
    server_port_4   = process.env.POST || 4007,
    server_port_5   = process.env.POST || 4008,
    server_port_6   = process.env.POST || 4009,
    server_port_7   = process.env.POST || 4010,
    server_port_8   = process.env.POST || 4011,
    server_port_9   = process.env.POST || 4012,
    server_port_10  = process.env.POST || 4013,

    // socket_port_1   = process.env.POST || 5004,
    // socket_port_2   = process.env.POST || 5005,
    // socket_port_3   = process.env.POST || 5006,
    // socket_port_4   = process.env.POST || 5007,
    // socket_port_5   = process.env.POST || 5008,
    // socket_port_6   = process.env.POST || 5009,
    // socket_port_7   = process.env.POST || 5010,
    // socket_port_8   = process.env.POST || 5011,
    // socket_port_9   = process.env.POST || 5012,
    // socket_port_10  = process.env.POST || 5013,
    
    // socketport      = process.env.PORT || 3000,
    // redisport       = 6379,
    // redishost       = "localhost",
    // verbose         = false,

    // Primus          = require('primus'),
    // Rooms           = require('primus-rooms'),
    // // PrimusCluster   = require('primus-cluster'),//require('primus-redis-rooms'),
    // Emitter         = require('primus-emitter'),
    // uws             = require('uws'),

    // ioredis         = require('ioredis'),//(),
    // metroplex       = require('metroplex'),
    // omega_supreme   = require('omega-supreme'),
    // omega_supreme_rooms_middleware = require('omega-supreme-rooms-middleware'),
    // roomsAdapter    = new (require('primus-rooms-redis-adapter'))(ioredis, {omegaSupreme: true, metroplex: true});

    express         = require('express'),
    http            = require('http'),
    // net             = require('net'),
    // vhost           = require('vhost'),

    // cluster         = require('cluster'),
    // os              = require('os'),
    // num_processes   = require('os').cpus().length,

    // httpProxy       = require('http-proxy'),

    // UUID            = require('node-uuid'),
    // getUid          = require('get-uid'),

    // debug           = require('debug'),
    // winston         = require('winston'),
    // util            = require('util'),
    // xml2js          = require('xml2js'),
    //app             = express(),
    //server          = http.createServer(app),
    // memwatch        = require('memwatch-next'),
    //heapdump        = require('heapdump'),

    // throng          = require('throng'),
    // WORKERS         = process.env.WEB_CONCURRENCY || 4;

    pmx = require('pmx').init(
    {
        http          : true, // HTTP routes logging (default: true)
        ignore_routes : [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
        errors        : true, // Exceptions loggin (default: true)
        custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
        network       : true, // Network monitoring at the application level
        ports         : true  // Shows which ports your app is listening on (default: false)
    });
    
    // var game_server     = require('./game.server.js');
    var game_connections = require('./game.connections');
    var game_core = require('./game.core');
    //game_server_instance = init();//new Object();
// init();
// return;
// 
// for (var u = 0; u < 100; u++)
//     console.log('uid', Math.floor(new Date().valueOf() * Math.random()));

/*
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {

        // Replace the dead worker, we're not sentimental
        console.log('Worker %d died :(', worker.id);
        cluster.fork();

    });
init();
// Code to run if we're in a worker process
} else {

    // Include Express
    var express = require('express');

    // Create a new Express application
    var app = express();

    // Add a basic route – index page
    app.get('/', function (request, response) {
        console.log('Request to worker %d', cluster.worker.id);
        response.send('Hello from Worker ' + cluster.worker.id);
    });

    // Bind to a port
    app.listen(3000);
    console.log('Worker %d running!', cluster.worker.id);

}
*/
//*
// ### move all game init code *before* clustering
//var game_server = require('./game.server.js');
/*
if (cluster.isMaster) 
{
    //console.log('port', gameport);
    
    // This stores our workers. We need to keep them to be able to reference
    // them based on source IP address. It's also useful for auto-restart,
    // for example.
    var workers = [];

    // Helper function for spawning worker at index 'i'.
    var spawn = function(i) {
        workers[i] = cluster.fork();
        // workers[i].game_server_instance = game_server_instance;

        // Optional: Restart worker on exit
        workers[i].on('exit', function(code, signal) 
        {
            console.log('respawning worker', i);    
        });
    };

    // Spawn workers.
    for (var i = 0; i < num_processes; i++) 
    {
        console.log('@ master spawning worker', i);
        
        spawn(i);
    }

    // Helper function for getting a worker index based on IP address.
    // This is a hot path so it should be really fast. The way it works
    // is by converting the IP address to a number by removing non numeric
    // characters, then compressing it to the number of slots we have.
    //
    // Compared against "real" hashing (from the sticky-session code) and
    // "real" IP number conversion, this function is on par in terms of
    // worker index distribution only much faster.
    var worker_index = function(ip, len) 
    {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) 
        {
            if (!isNaN(ip[i])) 
            {
                s += ip[i];
            }
        }

        return Number(s) % len;
    };

    // Create the outside facing server listening on our port.
    //var server = net.createServer({ pauseOnConnect: true }, function(connection) 
    // var app = express();
    // app.get( '/', function( req, res )
    // {
    //     console.log('trying to load %s', __dirname + '/index.html');
    //     res.sendFile( '/index.html' , { root:__dirname });
    // });
    
    // var game_server_instance = init();
    //console.log('game_server:', game_server_instance);
    var netserver = net.createServer({ pauseOnConnect: true }, function(connection) 
    {
        console.log('@ master passing connection to worker...', connection.remoteAddress, num_processes);
        console.log('gs?', game_server_instance);
        //connection.gsi = game_server_instance;
        
        // We received a connection and need to pass it to the appropriate
        // worker. Get the worker for this connection's source IP and pass
        // it the connection.
        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        console.log('@ worker id to receive is', worker.id);
        
        worker.send('sticky-session:connection', connection);
    }).listen(gameport);



	// var server = require('http').createServer(), 
    // socketIO = require('socket.io').listen(server), 
    // redis = require('socket.io-redis');	

	// socketIO.adapter(redis({ host: redishost, port: redisport }));
	
	// var numberOfCPUs = require('os').cpus().length;
	// for (var i = 0; i < numberOfCPUs; i++) {
	// 	cluster.fork();		
	// }
	
	// cluster.on('fork', function(worker) {
    //     console.log('Worker created', worker.id);
    // });
    // cluster.on('online', function(worker) {
    //      console.log('Workers online', worker.id);
    // });
    // cluster.on('listening', function(worker, addr) {
    //     console.log('Workers listening on', worker.id, addr.address, addr.port);
    // });
    // cluster.on('disconnect', function(worker) {
    //     console.log('Worker disconnected', worker.id);
    // });
    // cluster.on('exit', function(worker, code, signal) {
    //     console.log('Dead worker', worker.id, signal || code);
    //     if (!worker.suicide) {
    //         console.log('New worker created', worker.id);
    //         cluster.fork();
    //     }
    // });
}
else // worker
{
    // console.log('* worker initialized...', this.game_server_instance);
    // Note we don't use a port here because the master listens on it for us.
    var app = express();

    // Here you might use middleware, attach routes, etc.

    // Don't expose our internal server to the outside.
    var server = app.listen(0, 'localhost');
    return;
    // app.get( '/', function( req, res )
    // {
    //     console.log('trying to load %s', __dirname + '/index.html');
    //     res.sendFile( '/index.html' , { root:__dirname });
    // });
    
    // var io = io(server);

    // Tell Socket.IO to use the redis adapter. By default, the redis
    // server is assumed to be on localhost:6379. You don't have to
    // specify them explicitly unless you want to change them.
    // io.adapter(sio_redis({ host: 'localhost', port: 6379 }));

    // Here you might use Socket.IO middleware for authorization etc.

    // Listen to messages sent from the master. Ignore everything else.
    // console.log('gsi:', game_server_instance);
    
    // io.on('connection', function(client)
    // {
    //     console.log('socket client', client);
        
    //     client.setNoDelay(true);

        process.on('message', function(message, connection) 
        {
            console.log('* worker message', message);
            console.log('* worker connection', connection);
            
            
            if (message !== 'sticky-session:connection') {
                console.warn('! not a sticky-session!');
                
                return;
            }

            // Emulate a connection event on the server by emitting the
            // event with the connection the master sent us.
            console.log('* worker emiting to Socket connection');//, connection);


    console.log('client.connection');//, client.conn.transport);
    
    //Generate a new UUID, looks something like
    //5b2ca132-64bd-4513-99da-90e838ca47d1
    //and store this on their socket/connection
    var client = connection;
    client.userid = getUid();
    console.log('@@ new client connected', client.userid);//, client);

    //tell the player they connected, giving them their id
    client.emit('onconnected', { id: client.userid } );

    //now we can find them a game to play with someone.
    //if no game exists with someone waiting, they create one and wait.
    console.log('gs:', game_server_instance);
    
    game_server_instance.findGame(client);

    //Useful to know when someone connects
    console.log('\t socket.io:: player ' + client.userid + ' connected');

    //Now we want to handle some of the messages that clients will send.
    //They send messages here, and we send them to the game_server to handle.
    client.on('message', function(m)
    {
        //console.log('client-to-server message', m);
        game_server_instance.onMessage(client, m);
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
        if(client.game && client.gameid)//game.id)
        {
            //player leaving a game should destroy that game
            //game_server.endGame(client.game.id, client.userid);
            game_server_instance.endGame(client.gameid, client.userid);
        } //client.game_id

    }); //client.on disconnect





            //server.emit('connection', connection);

            connection.resume();
        });
    // });
    
} // end worker
return;
//*/

//if (cluster.isMaster) {
    console.log('@ MASTER');

    /////////////////////////////////////////////////
    /////////////////////////////////////////////////
    // app server
    /////////////////////////////////////////////////
    /////////////////////////////////////////////////
    console.log('init!');

    /////////////////////////////////////////////////
    // servers
    /////////////////////////////////////////////////
    var app = express();

    var server1 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_1 );

    var server2 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_2 );

    var server3 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_3 );

    var server4 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_4 );

    var server5 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_5 );

    var server6 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_6 );

    var server7 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_7 );

    var server8 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_8 );

    var server9 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_9 );

    var server10 = http.createServer(app);
    console.log('\t :: Express :: Listening on port ' + server_port_10 );

    // app.use(vhost('svr1.localhost', function(req, res) {
    //     console.log('SVR1!');
    //     server1.emit('request', req, res)
    // }));
    // app.use(vhost('svr1.localhost', server1));

    //By default, we forward the / path to index.html automatically.
    app.engine('.html', require('ejs').__express);
    app.set('views', __dirname);
    app.set('view engine', 'html');
    app.get( '/', function( req, res )
    {
        // console.log('trying to load %s', __dirname + '/index.html', req.headers, req.socket.server._connectionKey, req.socket.localPort, req.socket.remotePort);
        // res.set({'x_port': "4000"});
        // res.sendFile( '/index.html' , { root:__dirname, headers: {'x-port': req.socket.localPort} });
        // res.status(200).json({port:2000});
        // res.redirect(200, '/index.html?port=' + req.socket.localPort);

        // we're rending index.html via ebs module so that we can pass the
        // proxied port number over to the client.
        res.render('index', 
        {
           xport: req.socket.localPort 
        });
    });

    // security

    app.get('/app.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/package.json', function(req, res)
    {
        //console.log('stop!', req.headers);
        res.status(404).end();
    });
    // app.get('/index.css', function(req, res)
    // {
    //     res.status(404).end();
    // });
    app.get('/class.consumable.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.buffs.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.event.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.flag.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.getplayers.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.globals.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.platform.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.player.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/class.round.js', function(req, res)
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
    app.get('/game.core.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/game.connections.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/core.client.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/game.server.js', function(req, res)
    {
        res.status(404).end();
    });
    app.get('/singleton.assets.js', function(req, res)
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
        console.log(':: Express :: file requested : ' + file);

        //Send the requesting client the file.
        res.sendFile( __dirname + '/' + file );
    }); //app.get *

    // app.post( '/api/orbs' , function( req, res, next )
    // {
    //     console.log('api POST - app get orbs', game_server[0]);//.games.length);//, req);
    //     return res.send('hi', game_server.games.length);//[0]);
    // });
    // app.post( '/api/playernames', function(req, res, next)
    // {
    //     console.log('api POST - app get player names', game_server[0]);
    // })

    // clusters
	
    // var server = require('http').createServer(), 
    // socketIO = require('socket.io').listen(server), 
    // redis = require('socket.io-redis');	

	// socketIO.adapter(redis({ host: redishost, port: redisport }));
	
	// var numberOfCPUs = require('os').cpus().length;
	// for (var i = 0; i < numberOfCPUs; i++) {
	// 	cluster.fork();		
	// }
	
	// cluster.on('fork', function(worker) {
    //     console.log('Worker created', worker.id);
    // });
    // cluster.on('online', function(worker) {
    //      console.log('Workers online', worker.id);
    // });
    // cluster.on('listening', function(worker, addr) {
    //     console.log('Workers listening on', worker.id, addr.address, addr.port);
    // });
    // cluster.on('disconnect', function(worker) {
    //     console.log('Worker disconnected', worker.id);
    // });
    // cluster.on('exit', function(worker, code, signal) {
    //     console.log('Dead worker', worker.id, signal || code);
    //     if (!worker.suicide) {
    //         console.log('New worker created', worker.id);
    //         cluster.fork();
    //     }
    // });




//} // end master

//else if (cluster.isWorker) {
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// socket server
/////////////////////////////////////////////////
/////////////////////////////////////////////////

// http.globalAgent.maxSockets = Infinity;
/* Express server set up. */

/* Socket.IO server set up. */

//Express and socket.io can work together to serve the socket.io client files for you.
//This way, when the client requests '/socket.io/' files, socket.io determines what the client needs.
/*
var ioserver = http.createServer(function(req, res)
{ 
    // Send HTML headers and message
    // res.writeHead(200,{ 'Content-Type': 'text/html' }); 
    // res.end('<h1>Hello Socket Lover!</h1>');
});
ioserver.listen(3000);
*/

// the *single* game instance across *all* servers
var gameInstanceType = 1; // 1: single instance game / 2: multi-instance per server
// establish primus connections
var connectionType = 1; // 1: single proxy connection / 2: multi/server-based proxies

var gamecore = new game_core(1);
var proxy, proxy2, gamecore2;

proxy = new game_connections().createConnection(server1, gamecore);

if (gameInstanceType === 2)
    gamecore2 = new game_core(1);
else gamecore2 = gamecore;
if (connectionType !== 1)
{
    proxy2 = proxy1.createConnection(server1, gamecore2);
    // etc...
}
// else proxy2 = game_connections().createConnection(server2, gamecore);
// var socketServer = http.createServer(function connection(spark)
// {
//     // console.log('socketServer', spark);//, req, res);
// });
// var primus = new Primus(server2, 
// {
//     // port: 4005,
//     transformer: 'uws',
//     parser: 'binary',
//     iknowhttpsisbetter: true,
//     // middleware: omega_supreme_rooms_middleware,//require('omega-supreme-rooms-middleware'),
//     namespace: 'metroplex',
//     redis: ioredis.createClient()
// });

// // add plugins
// primus.plugin('rooms', Rooms);
// primus.plugin('emitter', Emitter);
// // primus.plugin('omega-supreme', omega_supreme); // * must be loaded _before_ metroplex!
// primus.plugin('metroplex', metroplex);//require('metroplex'));

// // primus.options.middleware = omega_supreme_rooms_middleware();
// // use redis
// // primus.use('cluster', PrimusCluster);

// primus.metroplex.servers(function(err, servers)
// {
//     console.log('registered servers:', servers);
// });

// // generate client wrapper
// primus.save(__dirname + '/primus/primus.js');

// // connection
// primus.on('connection', function (spark)
// {
//     console.log('@ client connected');//, spark);
//     // console.log('connection has the following headers', spark.headers);
//     console.log('@ connection was made from', spark.address);
//     console.log('@ connection id', spark.id);
//     primus.metroplex.spark(spark.id, function(err, server)
//     {
//         console.log('@spark server', server);   
//     });
//     // console.log('@ current port', )
//     // spark.on('open', function open()
//     // {
//     //     console.log('@ Connection is alive and kicking');
//     // });
//     /*console.log('@ client.connection', Rooms);//, client.conn.transport);
//     spark.userid = getUid();
//     // client.playerdata = client.handshake.query['playerdata'];
//     // console.log('@@ new client connected', client.userid, client.id, client.handshake.query['playerdata']);//, client);

//     spark.write('onconnected', { id: spark.userid, playerdata: spark.playerdata });

//     game_server.setSpark(spark);
//     game_server.findGame(spark);

//     //Useful to know when someone connects
//     console.log('spark :: player ' + spark.userid + ' connected');*/

//     //They send messages here, and we send them to the game_server to handle.
//     spark.on('data', function(data)
//     {
//         // console.log('spark.on', data);
        
//         // console.log('client-to-server message', spark.primus.latency);
//         game_server.onMessage(spark, data);
//     }); //client.on message

//     // spark.on('disconnect', function ()
//     // {
//     //     //Useful to know when soomeone disconnects
//     //     console.log('\t socket.io:: client disconnected ' + spark.userid + ' ' + spark.gameid);//client.game.id);
        
//     //     //If the client was in a game, set by game_server.findGame,
//     //     //we can tell the game server to update that game state.
//     //     if(spark.game && spark.gameid)//game.id)
//     //     {
//     //         //player leaving a game should destroy that game
//     //         game_server.endGame(spark.gameid, spark.userid);
//     //     }

//     // }); 
// }); // connection

// primus.on('disconnection', function(spark)
// {
//     console.log('@ client has disconnected!');
//     if (spark.game && spark.gameid)
//         game_server.endGame(spark.gameid, spark.userid);
// });

server1.listen(server_port_1);//socketport);
server2.listen(server_port_2);
server3.listen(server_port_3);
server4.listen(server_port_4);
server5.listen(server_port_5);
server6.listen(server_port_6);
server7.listen(server_port_7);
server8.listen(server_port_8);
server9.listen(server_port_9);
server10.listen(server_port_10);
// console.log('\t :: Express :: Listening on port ' + socketport );

//} // end isWorker

//Enter the game server code. The game server handles
//client connections looking for a game, creating games,
//leaving games, joining games and ending games when they leave.
// var game_server = require('./game.server.js');
// this.game_server = game_server;
// clientIo.on('connection', function (client)
// {
//     console.log('client io connected...');
// });
// auto-create host game
/*
var host = clientIo.connect(getUid());
    , 
    {
        'transports':['websocket']
        // 'force new connection': false,
        // 'path': '/socket.io/socket.io.js'//-client/so'
    }
);
*/

/*
var gcFunc = function()
{
    hd = false;
    if (typeof(global.gc) == 'function')
        global.gc();
    console.log('** GC done')
}
setInterval(gcFunc, 30 * 1000);

// setInterval(function()
// {
//     if (typeof(global.gc) == 'function')
//         global.gc();
//     console.log('** GC done')
// }, 30 * 1000);
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
    //new memwatch.HeapDiff();
    if (!hd)
    {
        //process.kill(process.pid, 'SIGUSR2');
        hd = true;
    }
})
//*/

////////////////////////////////////////
// concurrency via 
// https://github.com/hunterloftis/throng
////////////////////////////////////////
/*
function startWorker(id)
{
    console.log('app.startWorker id', id, 'concurrency workers...');

    process.on('SIGTERM', () => {
        console.log('Worker', id, ' exiting...');
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

/*
var vp = 0;
var tot = 29;
var vplayer = function()
{
    console.log("this vp:", vp)
    if (vp === tot)
    {
        clearInterval(vplayer);
        return;
    }
    var c = new clientIo.connect('http://localhost:4004');//.connect(getUid());//, {"force new connection":true});
    console.log('new autoplayer...');
    // clientIo.connect();
    // c.userid = getUid();
    // c.on('connect', function(){console.log('cnct')});
    
    // c.hosting = false;
    //game_server.findGame(c);
    vp++;
}
// setInterval(vplayer.bind(this), 10 * 1000);

// auto create 20 games
var totalGames = 0;
//var host;
for (var i = 0; i < totalGames; i++)
{
    var host = clientIo.connect(getUid());
    host.userid = getUid();
    host.hosting = true;
    console.log('host', host.userid);
    game_server.createGame(host);
    //console.log('host.io.engine.transport.name', host.io.opts.transports);
}
// return game_server;
// }
//*/