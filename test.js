///////////////////////////////////
// packages
///////////////////////////////////
var
    gameport        = process.env.PORT || 4004,
    socketport      = 3000,
    redisport       = 6379,
    redishost       = "localhost",
    verbose         = false,

    io              = require('socket.io'),
    clientIo        = require('socket.io-client'),
    uws             = require('uws'),

    express         = require('express'),
    http            = require('http'),
    // net             = require('net'),

    cluster         = require('cluster'),
    os              = require('os'),

    sio_redis       = require('socket.io-redis'),
    sticky          = require('socketio-sticky-session'),
    httpProxy       = require('http-proxy'),

    // num_processes   = require('os').cpus().length,
    UUID            = require('node-uuid'),

    debug           = require('debug'),
    winston         = require('winston'),
    util            = require('util');

///////////////////////////////////
// webserver
///////////////////////////////////
var app = require('http').createServer(handler);
app.listen(8088);
console.log('@ http listening on port 8088');

///////////////////////////////////
// socket.io/redis
///////////////////////////////////
var io = require('socket.io').listen(app);

var redis = require('redis');
var redis2 = require('socket.io-redis');

io.adapter(redis2({ host: 'localhost', port: 6379 }));

var fs = require('fs');

///////////////////////////////////
// file handler
///////////////////////////////////
function handler(req,res)
{
    fs.readFile(__dirname + '/test.html', function(err,data)
    {
        if(err)
        {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200);
        console.log("* test.html listening on port 8088");
        res.end(data);
    });
}

///////////////////////////////////
// redis init pub/sub
///////////////////////////////////
var store = redis.createClient();   
var pub = redis.createClient();
var sub = redis.createClient();

sub.on("message", function (channel, data) 
{
    data = JSON.parse(data);
    console.log("Inside Redis_Sub: data from channel " + channel + ": " + (data.sendType));

    switch(data.sendType)
    {
        // send to self
        case "sendToSelf":
            io.emit(data.method, data.data);
            break;

        // send to all clients
        case "sendToAllConnectedClients":
            io.sockets.emit(data.method, data.data);
            break;

        // send to all clients in room
        case "sendToAllClientsInRoom":
            io.sockets.in(channel).emit(data.method, data.data);
            break;

        // send to all clients in room
        case "sendToOtherClientsInRoom":
            // socket.broadcast.to(channel).emit(data.method, data.data);
            break;

        default: console.log('Error:', data);
    }

});

///////////////////////////////////
// io connection
///////////////////////////////////
io.sockets.on('connection', function (socket) 
{
    console.log('* io.sockets connection:', socket.connected);
    
    sub.on("subscribe", function(channel, count) 
    {
        console.log("Subscribed to " + channel + ". Now subscribed to " + count + " channel(s).");
    });

    socket.on("setUsername", function (data) 
    {
        console.log("Got 'setUsername' from client, " + JSON.stringify(data));
        var reply = JSON.stringify({
                method: 'message',
                sendType: 'sendToSelf',
                data: "You are now online"
            });     
    });

    socket.on("createRoom", function (data) 
    {
        console.log("Got 'createRoom' from client , " + JSON.stringify(data));
        sub.subscribe(data.room);
        socket.join(data.room);     

        var reply = JSON.stringify({
                method: 'message', 
                sendType: 'sendToSelf',
                data: "Share this room name with others to Join:" + data.room
            });
        pub.publish(data.room,reply);
    });

    socket.on("joinRooom", function (data) 
    {
        console.log("Got 'joinRooom' from client , " + JSON.stringify(data));
        sub.subscribe(data.room);
        socket.join(data.room);     
    });

    socket.on("sendMessage", function (data) 
    {
        console.log("Got 'sendMessage' from client , " + JSON.stringify(data));
        var reply = JSON.stringify({
                method: 'message', 
                sendType: 'sendToAllClientsInRoom',
                data: data.user + ":" + data.msg 
            });
        pub.publish(data.room,reply);
    });

    socket.on('connect', function () 
    {
        console.log('* new socket connected');
        
        // sub.quit();
        // pub.publish("chatting","User is disconnected :" + socket.id);

    });

    socket.on('disconnect', function () 
    {
        sub.quit();
        pub.publish("chatting","User is disconnected :" + socket.id);
    });

  });