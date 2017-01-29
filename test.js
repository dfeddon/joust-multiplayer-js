var cluster  = require('cluster'), 
_portSocket  = 4004, 
_portRedis   = 6379, 
_HostRedis   = 'localhost';


if (cluster.isMaster) {	
	var server = require('http').createServer(), 
    socketIO = require('socket.io').listen(server), 
    redis = require('socket.io-redis');	
	socketIO.adapter(redis({ host: _HostRedis, port: _portRedis }));
	
	var numberOfCPUs = require('os').cpus().length;
	for (var i = 0; i < numberOfCPUs; i++) {
		cluster.fork();		
	}
	
	cluster.on('fork', function(worker) {
        console.log('Worker %s create', worker.id);
    });
    cluster.on('online', function(worker) {
         console.log('Worker %s online', worker.id);
    });
    cluster.on('listening', function(worker, addr) {
        console.log('Worker %s listening to %s:%d', worker.id, addr.address, addr.port);
    });
    cluster.on('disconnect', function(worker) {
        console.log('Worker %s disconnect', worker.id);
    });
    cluster.on('exit', function(worker, code, signal) {
        console.log('Worker %s died (%s)', worker.id, signal || code);
        if (!worker.suicide) {
            console.log('New worker %s create', worker.id);
            cluster.fork();
        }
    });
}

if (cluster.isWorker) {	

	var http = require('http');
	
	http.globalAgent.maxSockets = Infinity;	
	
	var app = require('express')(), 
    ent = require('ent'), 
    fs  = require('fs'), 
    server = http.createServer(app).listen(_portSocket), 
    socketIO = require('socket.io').listen(server), 
    redis = require('socket.io-redis');
	
	socketIO.adapter(redis({ host: _HostRedis, port: _portRedis }));
	
	// app.get('/', function (req, res) { res.emitfile(__dirname + '/index.html');});
    app.get( '/', function( req, res )
    {
        console.log('trying to load %s', __dirname + '/index.html');
        res.sendFile( '/index.html' , { root:__dirname });
    });
	
	socketIO.sockets.on('connection', function(socket, pseudo) {

		socket.setNoDelay(true);
		
		socket.on('new_client', function(pseudo) {
			pseudo = ent.encode(pseudo);			
			socket.pseudo = pseudo;
			try {
				socket.broadcast.to(socket.room).emit('new_client', pseudo);
			} catch(e) {
				socket.to(socket.room).emit('new_client', pseudo);
			}
			console.log('User : '+socket.pseudo+' logged in');
		});	

		socket.on('message', function(data) {
			socket.broadcast.to(socket.room).emit('dispatch', data);
		});	

		socket.on('exit', function(data) { socket.close();});
		
		socket.on('room', function(newroom) {
			socket.room = newroom;
			socket.join(newroom);	
			console.log('Member '+socket.pseudo+' has joined the room '+socket.room);
			socket.broadcast.to(socket.room).emit('dispatch', 'User : '+socket.pseudo+' has joined the room : '+socket.room);
		});
	});
	
}