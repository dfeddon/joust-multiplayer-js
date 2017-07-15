var game_server     = require('./game.server.js'),
    Primus          = require('primus'),
    Rooms           = require('primus-rooms'),
    // PrimusCluster   = require('primus-cluster'),//require('primus-redis-rooms'),
    Emitter         = require('primus-emitter'),
    uws             = require('uws'),

    ioredis         = require('ioredis'),//(),
    metroplex       = require('metroplex'),

    singlePort      = 3000;

function game_connections()
{
    console.log('game_connections constructor');
    this.SINGLE_PRIMUS_INSTANCE = 1;
    this.MULTI_PRIMUS_INSTANCES = 2;

    this.svr = null;

    this.type = this.SINGLE_PRIMUS_INSTANCE;
    this.primus = null;
    this.isRunning = false;

    // this.vPlayers();
}

game_connections.prototype.createConnection = function(svr, gamecore)
{
    // var parser = 
    // {
    //     encoder: function encoder(data, fn) { fn(undefined, data); },
    //     decoder: function decoder(data, fn) { fn(undefined, data); }
    // }

    var gameserver = new game_server(gamecore);
    var primus;

    // var primusOptions = 
    // {
    //     transformer: 'uws',
    //     parser: 'binary',
    //     iknowhttpsisbetter: true,
    //     // middleware: omega_supreme_rooms_middleware,//require('omega-supreme-rooms-middleware'),
    //     namespace: 'metroplex',
    //     redis: ioredis.createClient()
    // }

    console.log('primus.type', this.type, this.isRunning);
    // if running a single instance of primus
    if (this.type === this.SINGLE_PRIMUS_INSTANCE)
    {
        if (this.isRunning) 
        {
            console.log("@ already running primus, returning instance...");
            return this.primus;
        }
        else 
        {
            console.log('@ instantiating primus...');
            this.isRunning = true;
        }

        // var primus = new Primus(svr, 
        primus = new Primus.createServer(
        {
            // parser: parser,
            port: singlePort,
            transformer: 'uws',
            parser: 'binary',
            pingInterval: 1000,
            iknowhttpsisbetter: true,
            // middleware: omega_supreme_rooms_middleware,//require('omega-supreme-rooms-middleware'),
            namespace: 'metroplex',
            redis: ioredis.createClient()
            // redis: new ioredis(6379, "wingdom-redis-001.t1sekd.0001.use1.cache.amazonaws.com")
        });
    }
    else
    {
        primus = new Primus(svr, 
        {
            transformer: 'uws',
            parser: 'binary',
            pong: 1000,
            iknowhttpsisbetter: true,
            // middleware: omega_supreme_rooms_middleware,//require('omega-supreme-rooms-middleware'),
            namespace: 'metroplex',
            redis: ioredis.createClient()
        });
    }


    // add plugins
    primus.plugin('rooms', Rooms);
    primus.plugin('emitter', Emitter);
    // primus.plugin('omega-supreme', omega_supreme); // * must be loaded _before_ metroplex!
    primus.plugin('metroplex', metroplex);//require('metroplex'));

    // primus.options.middleware = omega_supreme_rooms_middleware();
    // use redis
    // primus.use('cluster', PrimusCluster);

    primus.metroplex.servers(function(err, servers)
    {
        console.log('registered servers:', servers);
    });

    // generate client wrapper
    // primus.save(__dirname + '/primus/primus.js');

    // connection
    primus.on('connection', function (spark)
    {
        console.log('@ client connected');//, spark);
        // console.log('connection has the following headers', spark.headers);
        console.log('@ connection was made from spark.address', spark.address);
        console.log('@ connection spark.id', spark.id);
        primus.metroplex.spark(spark.id, function(err, server)
        {
            console.log('@spark server', server);   
        });
        // console.log('@ current port', )
        // spark.on('open', function open()
        // {
        //     console.log('@ Connection is alive and kicking');
        // });
        /*console.log('@ client.connection', Rooms);//, client.conn.transport);
        spark.userid = getUid();
        // client.playerdata = client.handshake.query['playerdata'];
        // console.log('@@ new client connected', client.userid, client.id, client.handshake.query['playerdata']);//, client);

        spark.write('onconnected', { id: spark.userid, playerdata: spark.playerdata });

        game_server.setSpark(spark);
        game_server.findGame(spark);

        //Useful to know when someone connects
        console.log('spark :: player ' + spark.userid + ' connected');*/

        //They send messages here, and we send them to the game_server to handle.
        spark.on('heartbeat', function()
        {
            // console.log("@ heartbeat");
        });
        spark.on('outgoing::ping', function(time)
        {
            // console.log('@ ping', time);
        });
        spark.on('incoming::pong', function(time)
        {
            // console.log('@ pong', Math.abs((Date.now() - time)), time);
            if (gameserver.game_core.core_server)
            gameserver.game_core.core_server.ticker(spark);
        });
        spark.on('data', function(data)
        {
            // console.log('spark.on', data);
            
            // console.log('client-to-server message', spark.primus.latency);
            gameserver.onMessage(spark, data);
        }); //client.on message

        // spark.on('disconnect', function ()
        // {
        //     //Useful to know when soomeone disconnects
        //     console.log('\t socket.io:: client disconnected ' + spark.userid + ' ' + spark.gameid);//client.game.id);
            
        //     //If the client was in a game, set by game_server.findGame,
        //     //we can tell the game server to update that game state.
        //     if(spark.game && spark.gameid)//game.id)
        //     {
        //         //player leaving a game should destroy that game
        //         game_server.endGame(spark.gameid, spark.userid);
        //     }

        // }); 
    }); // connection

    primus.on('disconnection', function(spark)
    {
        console.log('@ client has disconnected!');
        if (spark.game && spark.gameid)
            gameserver.endGame(spark.gameid, spark.userid);
    });

    this.primus = primus;
    return primus;
}

game_connections.prototype.vPlayers = function()
{
    //*
    var vp = 0;
    var tot = 29;
    var socket;
    var hostname = "localhost";
    var socketPort = "3000";
    var _this = this;
    var Primus = require('./primus/primus');
    var vplayer = function()
    {
        console.log("this vp:", vp)
        if (vp === tot)
        {
            clearInterval(vplayer);
            return;
        }
        // var c = new clientIo.connect('http://localhost:4004');//.connect(getUid());//, {"force new connection":true});
        console.log('new autoplayer...');//, Primus);
        var url = "ws://" + hostname + ":" + socketPort;
        console.log('url', url);
        socket = new Primus.connect(url, 
        {
            parser: 'binary',
            //    manual: true,
            reconnect: 
            {
                max: Infinity, // Number: The max delay before we try to reconnect.
                min: 500, // Number: The minimum delay before we try reconnect.
                retries: 10 // Number: How many times we should try to reconnect.
            }
        });
        // socket = new Primus.Socket(url);
        console.log('@ socket', socket);
        // socket.write({cc: undefined + "|" + undefined + "|" + "4004"});
        socket.send('connection', {})
        vp++;
    };
    setInterval(vplayer.bind(this), 5 * 1000);

    // auto create 20 games
    /*
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
}

module.exports = game_connections;