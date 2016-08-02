/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/

//The main update loop runs on requestAnimationFrame,
//Which falls back to a setTimeout loop on the server
//Code below is from Three.js, and sourced from links below

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

var glog = false; // global console logging
var frame_time = 60/1000; // run the local game at 16ms/ 60hz
var worldWidth = 1200;//420;
var worldHeight = 1200;//720;
if('undefined' != typeof(global)) frame_time = 45; //on server we run at 45ms, 22hz

( function () {

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];
    //var canvas = document.getElementById('viewport');

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = Date.now(), timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }

    /* derek add */
    // window.addEventListener('resize', resizeCanvas, false);
    // function resizeCanvas()
    // {
    //     console.log('resizeCanvas');
    //     viewport.width = window.innerWidth;
    //     viewport.height = window.innerHeight;
    // }
    // resizeCanvas();

}() );

//Now the main game class. This gets created on
//both server and client. Server creates one for
//each game that is hosted, and client creates one
//for itself to play the game.

/* The game_core class */

var game_core = function(game_instance)
{
    console.log('## game_core instantiated');
    //Store the instance, if any
    this.instance = game_instance;
    //Store a flag if we are the server
    this.server = this.instance !== undefined;

    //Used in collision etc.
    this.world = {
        width : worldWidth,//720,
        height : worldHeight//480
    };

    this.world.gravity = 1.5;

    this.world.totalplayers = 15;

    this.allplayers = []; // client/server players store

    this.platforms = [];
    this.platforms.push({x:this.world.width/2,y:this.world.height-200,w:300,h:40});
    this.platforms.push({x:this.world.width/4,y:300,w:200,h:40});
    this.platforms.push({x:this.world.width -100,y:500,w:100,h:40});
    this.platforms.push({x:0,y:800,w:200,h:40});

    //We create a player set, passing them
    //the game that is running them, as well
    console.log('##-@@ is server?', this.server);
    if(this.server) // only for server, not clients (browsers)
    {
        console.log("##-@@ adding server player and assigning client instance...");

        var o;
        for (var i = 1; i < this.world.totalplayers; i++)
        {
            o = new game_player(this, null, false);
            //console.log('o', o.mp);
            //o.pos = {x:100, y:100};
            this.allplayers.push(o);
        }
        var hp = new game_player(this, this.instance.player_host, true);
        hp.pos = {x:0,y:-50};
        this.allplayers.push(hp);
        this.players = {};
        this.players.self = hp;

        // add player (host)
        //this.allplayers.push(this.players.self);
        console.log('len', this.allplayers.length);
        for (var x in this.allplayers)
            console.log(this.allplayers[x].mp);
        //this.allplayers.push(this.players.other);
        //console.log('^^',this.allplayers[1].instance.clientid);//host);

    }
    else // clients (browsers)
    {
        console.log("## adding client players...", this.world.totalplayers);

        //this.canvas = document.getElementById('viewport');
        //console.log('vp', this.canvas);

        this.players = {};
        var p;
        for (var j = 1; j < this.world.totalplayers; j++)
        {
            p = new game_player(this);
            console.log(j, p.mp);
            //p.pos = {x:100, y:100};
            this.allplayers.push(p);//,null,false));
        }
        var chost = new game_player(this);
        chost.mp = 'hp';
        chost.mis = 'his';
        chost.host = true;
        this.allplayers.push(chost);

        this.players.self = chost;//new game_player(this);

        //this.allplayers.push(this.players.self);
        /*this.players.other.mp = 'cp';
        this.players.other.mis = 'cis';
        this.players.self.mp = 'hp';
        this.players.self.mis = 'his';*/
        // add player(s) to store

        //this.allplayers.push(this.players.self);
        console.log('len2', this.allplayers.length);
        console.log('len', this.allplayers.length);
        for (var y in this.allplayers)
            console.log(this.allplayers[y].mp);
        //this.allplayers.push(this.players.other);

        //Debugging ghosts, to help visualise things
        /*this.ghosts =
        {
            //Our ghost position on the server
            server_pos_self : new game_player(this, null, true),
            //The other players server position as we receive it
            server_pos_other : new game_player(this, null, true),
            //The other players ghost destination position (the lerp)
            pos_other : new game_player(this)
        };

        this.ghosts.pos_other.state = 'dest_pos';

        this.ghosts.pos_other.info_color = 'rgba(255,255,255,0.1)';

        this.ghosts.server_pos_self.info_color = 'rgba(255,255,255,0.2)';
        this.ghosts.server_pos_other.info_color = 'rgba(255,255,255,0.2)';

        this.ghosts.server_pos_self.state = 'server_pos';
        this.ghosts.server_pos_other.state = 'server_pos';

        this.ghosts.server_pos_self.pos = { x:20, y:20 };
        this.ghosts.pos_other.pos = { x:500, y:200 };
        this.ghosts.server_pos_other.pos = { x:500, y:200 };*/
    }

    //The speed at which the clients move.
    this.playerspeed = 120;

    //Set up some physics integration values
    this._pdt = 0.0001;                 //The physics update delta time
    this._pdte = new Date().getTime();  //The physics update last delta time
        //A local timer for precision on server and client
    this.local_time = 0.016;            //The local timer
    this._dt = new Date().getTime();    //The local timer delta
    this._dte = new Date().getTime();   //The local timer last frame time

    //Start a physics loop, this is separate to the rendering
    //as this happens at a fixed frequency
    this.create_physics_simulation();

    //Start a fast paced timer for measuring time easier
    this.create_timer();

    //Client specific initialisation
    if(!this.server) {

        //Create a keyboard handler
        this.keyboard = new THREEx.KeyboardState();

        //Create the default configuration settings
        this.client_create_configuration();

        //A list of recent server updates we interpolate across
        //This is the buffer that is the driving factor for our networking
        this.server_updates = [];

        //Connect to the socket.io server!
        this.client_connect_to_server();

        //We start pinging the server to determine latency
        this.client_create_ping_timer();

        //Set their colors from the storage or locally
        this.color = localStorage.getItem('color') || '#cc8822' ;
        localStorage.setItem('color', this.color);
        this.players.self.color = this.color;

        //Make this only if requested
        if(String(window.location).indexOf('debug') != -1) {
            this.client_create_debug_gui();
        }


    } else { //if !server

        this.server_time = 0;
        this.laststate = {};

    }

}; //game_core.constructor

//server side we set the 'game_core' class to a global type, so that it can use it anywhere.
if( 'undefined' != typeof global ) {
    module.exports = global.game_core = game_core;
}

/*
    Helper functions for the game code

        Here we have some common maths and game related code to make working with 2d vectors easy,
        as well as some helpers for rounding numbers to fixed point.

*/

// (4.22208334636).fixed(n) will return fixed point value to n places, default n = 3
Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
//copies a 2d vector like object from one to another
game_core.prototype.pos = function(a) { return {x:a.x,y:a.y}; };
//Add a 2d vector with another one and return the resulting vector
game_core.prototype.v_add = function(a,b) { return { x:(a.x+b.x).fixed(), y:(a.y+b.y).fixed() }; };
//Subtract a 2d vector with another one and return the resulting vector
game_core.prototype.v_sub = function(a,b) { return { x:(a.x-b.x).fixed(),y:(a.y-b.y).fixed() }; };
//Multiply a 2d vector with a scalar value and return the resulting vector
game_core.prototype.v_mul_scalar = function(a,b) { return {x: (a.x*b).fixed() , y:(a.y*b).fixed() }; };
//For the server, we need to cancel the setTimeout that the polyfill creates
game_core.prototype.stop_update = function() {  window.cancelAnimationFrame( this.updateid );  };
//Simple linear interpolation
game_core.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed(); };
//Simple linear interpolation between 2 vectors
game_core.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t) }; };

/*

// Collision Decorator Pattern Abstraction

// These methods describe the attributes necessary for
// the resulting collision calculations

    var Collision = {

        // Elastic collisions refer to the simple cast where
        // two entities collide and a transfer of energy is
        // performed to calculate the resulting speed
        // We will follow Box2D's example of using
        // restitution to represent "bounciness"

        elastic: function(restitution) {
            this.restitution = restitution || 0.2;
        },

        displace: function() {
            // While not supported in this engine
    	       // the displacement collisions could include
            // friction to slow down entities as they slide
            // across the colliding entity
        }
    };
    // The physics entity will take on a shape, collision
    // and type based on its parameters. These entities are
    // built as functional objects so that they can be
    // instantiated by using the 'new' keyword.

    var PhysicsEntity = function(collisionName, type) {

        // Setup the defaults if no parameters are given
        // Type represents the collision detector's handling
        this.type = type || PhysicsEntity.DYNAMIC;

        // Collision represents the type of collision
        // another object will receive upon colliding
        this.collision = collisionName || PhysicsEntity.ELASTIC;

        // Take in a width and height
        this.width  = 20;
        this.height = 20;

        // Store a half size for quicker calculations
        this.halfWidth = this.width * 0.5;
        this.halfHeight = this.height * 0.5;

        var collision = Collision[this.collision];
        collision.call(this);

        // Setup the positional data in 2D

        // Position
        this.x = 0;
        this.y = 0;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Acceleration
        this.ax = 0;
        this.ay = 0;

        // Update the bounds of the object to recalculate
        // the half sizes and any other pieces
        this.updateBounds();
    };

    // Physics entity calculations
    PhysicsEntity.prototype = {

        // Update bounds includes the rect's
        // boundary updates
        updateBounds: function() {
            this.halfWidth = this.width * 0.5;
            this.halfHeight = this.height * 0.5;
        },

        // Getters for the mid point of the rect
        getMidX: function() {
            return this.halfWidth + this.x;
        },

        getMidY: function() {
            return this.halfHeight + this.y;
        },

        // Getters for the top, left, right, and bottom
        // of the rectangle
        getTop: function() {
            return this.y;
        },
        getLeft: function() {
            return this.x;
        },
        getRight: function() {
            return this.x + this.width;
        },
        getBottom: function() {
            return this.y + this.height;
        }
    };

    // Constants

    // Engine Constants

    // These constants represent the 3 different types of
    // entities acting in this engine
    // These types are derived from Box2D's engine that
    // model the behaviors of its own entities/bodies

    // Kinematic entities are not affected by gravity, and
    // will not allow the solver to solve these elements
    // These entities will be our platforms in the stage
    PhysicsEntity.KINEMATIC = 'kinematic';

    // Dynamic entities will be completely changing and are
    // affected by all aspects of the physics system
    PhysicsEntity.DYNAMIC   = 'dynamic';

    // Solver Constants

    // These constants represent the different methods our
    // solver will take to resolve collisions

    // The displace resolution will only move an entity
    // outside of the space of the other and zero the
    // velocity in that direction
    PhysicsEntity.DISPLACE = 'displace';

    // The elastic resolution will displace and also bounce
    // the colliding entity off by reducing the velocity by
    // its restituion coefficient
    PhysicsEntity.ELASTIC = 'elastic';

    // Rect collision tests the edges of each rect to
    // test whether the objects are overlapping the other
    var CollisionDetector = function(){};
    CollisionDetector.prototype.collideRect =
        function(collider, collidee) {

        // Store the collider and collidee edges
        var l1 = collider.getLeft();
        var t1 = collider.getTop();
        var r1 = collider.getRight();
        var b1 = collider.getBottom();

        var l2 = collidee.getLeft();
        var t2 = collidee.getTop();
        var r2 = collidee.getRight();
        var b2 = collidee.getBottom();

        // If the any of the edges are beyond any of the
        // others, then we know that the box cannot be
        // colliding
        if (b1 < t2 || t1 > b2 || r1 < l2 || l1 > r2) {
            return false;
        }

        // If the algorithm made it here, it had to collide
        return true;
    };
    //*/

    /*
        The player class

            A simple class to maintain state of a player on screen,
            as well as to draw that state when required.
    */
    game_core.prototype.newPlayer = function(client)
    {
      console.log('##-@@ proto-newplayer', client.userid);

      //var p = new game_player(this, this.instance.player_client, false);
      var p = new game_player(this, client, false);
      p.id = client.userid;

      return p;
    };

    var game_player = function( game_instance, player_instance, isHost )
    {
        //console.log('game_player', game_instance, player_instance);
        //Store the instance, if any
        // ## NOTE: only server sends instance, not clients!!
        if (player_instance) console.log('** server added player (with instance)');
        else console.log('** added player (without instance)');
        //if (isGhost) console.log('** ^ player is ghost, adding to ghost store');

        this.instance = player_instance;
        this.game = game_instance;

        //Set up initial values for our state information
        this.pos = { x:0, y:0 };
        //this.size = { x:16, y:16, hx:8, hy:8 };
        this.size = { x:32, y:32, hx:32, hy:32 };
        this.dir = 0; // 0 = right, 1 = left (derek added)
        this.v = { x:0, y:0 }; // velocity (derek added)
        this.flap = false; // flapped bool (derek added)
        this.active = false;
        this.state = 'not-connected';
        //this.color = 'rgba(255,255,255,0.1)';
        this.info_color = 'rgba(255,255,255,0.1)';
        this.id = '';

        this.isLocal = false;

        // assign pos and input seq properties
        if (isHost && player_instance)// && player_instance.host)
        {
            console.log('WE GOT SERVERS HOST!');
            this.mp = 'hp';
            this.mis = 'his';
        }
        else {
            this.mp = 'cp' + (this.game.allplayers.length + 1);
            this.mis = 'cis' + (this.game.allplayers.length + 1);
        }

        //These are used in moving us around later
        this.old_state = {pos:{x:0,y:0}};
        this.cur_state = {pos:{x:0,y:0}};
        this.state_time = new Date().getTime();

            //Our local history of inputs
        this.inputs = [];

            //The world bounds we are confined to
        this.pos_limits = {
            x_min: this.size.hx,
            x_max: this.game.world.width - this.size.hx,
            y_min: this.size.hy,
            y_max: this.game.world.height - this.size.hy
        };

        //The 'host' of a game gets created with a player instance since
        //the server already knows who they are. If the server starts a game
        //with only a host, the other player is set up in the 'else' below
        if(isHost) // if host?
        {
            this.pos = { x:0, y:-50 };
        }
        else
        {
            //this.pos = { x:Math.floor((Math.random() * this.game.world.width) + 1), y:Math.floor((Math.random() * this.game.world.height) + 1) };
            this.pos = { x:Math.floor((Math.random() * this.game.world.width) + 1), y:this.game.world.height-25 };
        }

    }; //game_player.constructor

    game_core.prototype.prerenderer = function()
    {
        console.log('## preprenderer');
        var v = document.getElementById("viewport");
        var canvas2 = document.createElement('canvas');
        canvas2.width = this.world.width;//v.width;
        canvas2.height = this.world.height;//v.height;
        var context2 = canvas2.getContext('2d');
        console.log(v.width, v.height);
        // center circle
        context2.beginPath();
    	context2.arc(this.world.width/2,this.world.height/2,50,0*Math.PI,2*Math.PI);
        context2.fillStyle = "red";
        //context2.shadowBlur = 10;
        //context2.shadowColor = 'red';
    	context2.closePath();
    	context2.fill();

        // draw borders
        // bottom
        context2.beginPath();
        context2.moveTo(0, this.world.height);
        context2.lineTo(this.world.width, this.world.height);
        //game.ctx.lineWidth = 10;
        context2.strokeStyle = 'yellow';
        context2.stroke();
        // top
        context2.beginPath();
        context2.moveTo(0, 0);
        context2.lineTo(this.world.width, 0);
        //game.ctx.lineWidth = 10;
        context2.strokeStyle = 'yellow';
        context2.stroke();
        // left
        context2.beginPath();
        context2.moveTo(0, this.world.height);
        context2.lineTo(0, 0);
        //game.ctx.lineWidth = 10;
        context2.strokeStyle = 'yellow';
        context2.stroke();
        // right
        context2.beginPath();
        context2.moveTo(this.world.width, this.world.height);
        context2.lineTo(this.world.width, 0);
        //game.ctx.lineWidth = 10;
        context2.strokeStyle = 'yellow';
        context2.stroke();

        // platforms
        for (var j = 0; j < this.platforms.length; j++)
        {
            context2.fillStyle = 'green';
            context2.fillRect(this.platforms[j].x, this.platforms[j].y, this.platforms[j].w, this.platforms[j].h);
        }

        //context2.restore();
        this.canvas2 = canvas2;
    };

    game_player.prototype.draw = function()
    {
        // player nametags (temp)
        for(var i=0; i < this.game.allplayers.length; i++)
        {
            //console.log(i, this.host);//this.game.allplayers[i].mp, this.mp);
            if (this.game.players.self.mp != this.game.allplayers[i].mp)// != this.mp)
            {
                game.ctx.fillStyle = 'red';
                game.ctx.fillText(this.game.allplayers[i].mp, this.game.allplayers[i].pos.x, this.game.allplayers[i].pos.y - 20);
            }
            else
            {
                game.ctx.fillStyle = 'white';
                game.ctx.fillText(this.game.players.self.mp + " " + this.game.fps.fixed(1), this.game.players.self.pos.x, this.game.players.self.pos.y - 20);
            }
        }

        // draw hitbox on players (if debugging)
        if(String(window.location).indexOf('debug') != -1)
        {
            game.ctx.beginPath();
            game.ctx.moveTo(this.pos.x + (this.size.hx/4), this.pos.y + (this.size.hy/4));
            game.ctx.lineTo(this.pos.x + (this.size.hx - this.size.hx/4), this.pos.y + (this.size.hy/4));
            game.ctx.strokeStyle = 'red';
            game.ctx.stroke();

            game.ctx.beginPath();
            game.ctx.moveTo(this.pos.x + (this.size.hx/4), this.pos.y + (this.size.hy/4));
            game.ctx.lineTo(this.pos.x + (this.size.hx/4), this.pos.y + (this.size.hy - this.size.hy/4));
            game.ctx.strokeStyle = 'red';
            game.ctx.stroke();

            game.ctx.beginPath();
            game.ctx.moveTo(this.pos.x + (this.size.hx - this.size.hx/4), this.pos.y + (this.size.hy/4));
            game.ctx.lineTo(this.pos.x + (this.size.hx - this.size.hx/4), this.pos.y + (this.size.hy - this.size.hy/4));
            game.ctx.strokeStyle = 'red';
            game.ctx.stroke();

            game.ctx.beginPath();
            game.ctx.moveTo(this.pos.x + (this.size.hx/4), this.pos.y + (this.size.hy - this.size.hy/4));
            game.ctx.lineTo(this.pos.x + (this.size.hx - this.size.hx/4), this.pos.y + (this.size.hy - this.size.hy/4));
            game.ctx.strokeStyle = 'red';
            game.ctx.stroke();
        }

        // player bitamps
        var img;
        if (this.flap === true)
        {
            //console.log("FLAP!");
            this.flap=false;
            if (this.dir === 1) img = document.getElementById("p1l");
            else img = document.getElementById("p1r");
        }
        else
        {
            if (this.dir === 1) img = document.getElementById("p2l");
            else img = document.getElementById("p2r");
        }
        //game.ctx.beginPath();
        if(String(window.location).indexOf('debug') == -1)
            game.ctx.drawImage(img, this.pos.x, this.pos.y, 40, 40);

        //game.ctx.translate(camX,camY);
        //game.ctx.restore();

    }; //game_player.draw

    function clamp(value, min, max)
    {
        return Math.max(min, Math.min(value, max));
        //console.log(value);//, min, max);
        /*if(value < min) return min;
        else if(value > max) return max;

        return value;*/
    }
//*/
/*

 Common functions

    These functions are shared between client and server, and are generic
    for the game state. The client functions are client_* and server functions
    are server_* so these have no prefix.

*/

//Main update loop
game_core.prototype.update = function(t)
{
    //console.log('##+@@update');
    //Work out the delta time
    this.dt = this.lastframetime ? ( (t - this.lastframetime)/1000.0).fixed() : 0.016;

    //Store the last frame time
    this.lastframetime = t;

    //Update the game specifics
    if(!this.server) {
        this.client_update();
    } else {
        this.server_update();
    }

    //schedule the next update
    this.updateid = window.requestAnimationFrame( this.update.bind(this), this.viewport );

}; //game_core.update


/*
    Shared between server and client.
    In this example, `item` is always of type game_player.
*/
game_core.prototype.check_collision = function( player )
{
    //console.log('##+@@check_collision');
    //Left wall. TODO:stop accel
    if(player.pos.x <= player.pos_limits.x_min) {
        player.pos.x = player.pos_limits.x_min;
    }

    //Right wall TODO: stop accel
    if(player.pos.x >= player.pos_limits.x_max ) {
        player.pos.x = player.pos_limits.x_max;
    }

    //Roof wall. TODO: stop accel
    if(player.pos.y <= player.pos_limits.y_min) {
        player.pos.y = player.pos_limits.y_min;
    }

    //Floor wall TODO: stop gravity
    if(player.pos.y >= player.pos_limits.y_max ) {
        player.pos.y = player.pos_limits.y_max;
    }

    //Fixed point helps be more deterministic
    //player.pos.x = player.pos.x.fixed(4);
    //player.pos.y = player.pos.y.fixed(4);

    // player collision
    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log('->', this.allplayers[i].pos);
        //this.allplayers[i].pos.x = this.allplayers[i].pos.x.fixed(4);
        //this.allplayers[i].pos.y = this.allplayers[i].pos.y.fixed(4);
        if (this.allplayers[i].mp != player.mp)
        {
            //console.log( (player.pos.x + (player.size.hx / 2)), (this.allplayers[i].pos.x + (this.allplayers[i].size.hx / 2)) );
            if ( player.pos.x + (player.size.hx/4) < this.allplayers[i].pos.x + (this.allplayers[i].size.hx - this.allplayers[i].size.hx/4) && player.pos.x + (player.size.hx - player.size.hx/4) > this.allplayers[i].pos.x + (this.allplayers[i].size.hx/4) && player.pos.y + (player.size.hy/4) < this.allplayers[i].pos.y + (this.allplayers[i].size.hy - this.allplayers[i].size.hy/4) && player.pos.y + (player.size.hy - player.size.hy/4) > this.allplayers[i].pos.y + (this.allplayers[i].size.hy/4)
            )
            {
                //console.log("HIT", player.mp, player.pos.y, this.allplayers[i].mp, this.allplayers[i].pos.y);
                if (player.pos.y === this.allplayers[i].pos.y)
                {
                    //console.log("TIE!", player.mp, this.allplayers[i].mp);
                }
                else
                {
                    if (player.pos.y < this.allplayers[i].pos.y)
                    {
                        //console.log(player.mp, 'WINS!', this.allplayers[i].mp);
                        this.allplayers[i].pos = {x:Math.floor((Math.random() * player.game.world.width) + 1), y:0};
                    }
                    else
                    {
                        //console.log(this.allplayers[i].mp, 'WINS!');
                        player.pos = {x:Math.floor((Math.random() * player.game.world.width) + 1), y:0};
                    }
                }

                break;
            }
            //if (player.pos.x >= this.allplayers[i].pos.x + this.allplayers[i].width && player.y == this.allplayers[i].pos.y)
                //console.log('HIT', player.mp, this.allplayers[i].mp);
        }
        //if (this.players.self.pos === this.allplayers[i].pos.x) console.log('!!!!!!!!!!!!!!!!!!!');

    }

    // platform collisions
    // game.ctx.moveTo(this.game.world.width / 2, this.game.world.height - 200);
    // game.ctx.lineTo(this.game.world.width / 2 + 300, this.game.world.height - 200);
    // game.ctx.lineWidth = 10;
    for (var j = 0; j < this.platforms.length; j++)
    {
        //console.log('platform', this.platforms[j]);
        if (
            player.pos.x < (this.platforms[j].x + this.platforms[j].w) &&
            (player.pos.x + player.size.hx) > this.platforms[j].x &&
            player.pos.y < (this.platforms[j].y + this.platforms[j].h) &&
            (player.pos.y + player.size.hy) > this.platforms[j].y
        )
        {
            //console.log('hit platform!');
            if (player.pos.y > (this.platforms[j].y))// + this.platforms[j].h))//this.world.height - 200)
            {
                //console.log('from bottom');
                player.pos.y += 5;
            }
            else //if (player.pos.y + player.size.hx > this.platforms.y) // from top (TODO: add friction)
            {
                player.pos.y = this.platforms[j].y - player.size.hy;// -= 1;// this.world.height-200;
                // decelerate
                if (player.v.x > 0)
                {
                    console.log('slowing', player.v.x);
                    player.v.x -= 1;
                }
                else player.v.x = 0;
            }

            break;
        }
    }

}; //game_core.check_collision


game_core.prototype.process_input = function( player )
{
    //console.log('##+@@process_input');
    //It's possible to have recieved multiple inputs by now,
    //so we process each one
    //console.log('player', player);
    var x_dir = 0;
    var y_dir = 0;
    var ic = player.inputs.length;
    if(ic) {
        for(var j = 0; j < ic; ++j) {
                //don't process ones we already have simulated locally
            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = 0; i < c; ++i) {
                var key = input[i];
                //console.log('key', key);
                if(key == 'l') {
                    //x_dir -= 1;
                    player.dir = 1;
                }
                if(key == 'r') {
                    //x_dir += 1;
                    player.dir = 0;
                }
                // if(key == 'd') {
                //     y_dir += 1;
                // }
                if(key == 'u') { // flap
                    //TODO: up should take player direction into account
                    player.flap = true;
                    this.playerspeed = 150;
                    player.v.y = -1;
                    y_dir -= 1;
                    if (player.dir === 0)
                    {
                        x_dir += 0;
                        if (player.v.x < 0 ) player.v.x = 6;
                        else player.v.x +=6;
                    }
                    if (player.dir === 1)
                    {
                        x_dir -= 0;
                        if (player.v.x > 0) player.v.x = -6;
                        else player.v.x -=6;
                    }
                }
                //if (key !== 'u') player.flap = false;
                // if(key == 'x') {
                //     y_dir -= 10;
                // }
            } //for all input values

        } //for each input command
    } //if we have inputs

        //we have a direction vector now, so apply the same physics as the client
    var resulting_vector = this.physics_movement_vector_from_direction(x_dir,y_dir);
    if(player.inputs.length) {
        //we can now clear the array since these have been processed

        player.last_input_time = player.inputs[ic-1].time;
        player.last_input_seq = player.inputs[ic-1].seq;
    }

        //give it back
    return resulting_vector;

}; //game_core.process_input

game_core.prototype.physics_movement_vector_from_direction = function(x,y) {
    //console.log('##+@@ physics_movement_vector_from_direction');
    //Must be fixed step, at physics sync speed.
    //console.log(':', x, y);
    return {
        x : (x * (this.playerspeed * 0.015)).fixed(3),
        y : (y * (this.playerspeed * 0.015)).fixed(3)
    };

}; //game_core.physics_movement_vector_from_direction

game_core.prototype.update_physics = function() {
    if (glog)
    console.log('##+@@ update_physics');
    // gravity TODO: add (g)ravity & variable ac-/de-celeration vars, which affect y
    // also, ignore grav if player on ground/platform
    if (this.playerspeed > 120)
        this.playerspeed -= 1;

    ////////////////////////////////////////////////////////
    // iterate players
    ////////////////////////////////////////////////////////
    //for (var i in this.players)
    for (var i = 0; i < this.allplayers.length; i++)
    {
        ////////////////////////////////////////////////////////
        // horizontal velocity
        ////////////////////////////////////////////////////////
        if (this.allplayers[i].v.x > 0)
        {
            this.allplayers[i].v.x=(this.allplayers[i].v.x-0.025).fixed(3);
            //console.log(this.players[i].v.x);
            if (this.allplayers[i].v.x < 0) this.allplayers[i].v.x = 0;
            this.allplayers[i].pos.x += (0.5 * 2);// this.players[i].v.x;
        }
        else if (this.allplayers[i].v.x < 0)
        {
            this.allplayers[i].v.x=(this.allplayers[i].v.x+0.025).fixed(3);
            if (this.allplayers[i].v.x > 0) this.allplayers[i].v.x = 0;
            this.allplayers[i].pos.x -= (0.5 * 2);// this.players[i].v.x;
        }
        ////////////////////////////////////////////////////////
        // vertical velocity
        ////////////////////////////////////////////////////////
        if (this.allplayers[i].v.y < 0)
        {
            //console.log('v.y', this.allplayers[i].v.y.fixed(3), this.allplayers[i].v.x);
            this.allplayers[i].v.y = (this.allplayers[i].v.y + 0.025).fixed(3);
            this.allplayers[i].pos.y = (this.allplayers[i].pos.y + 0.05 + this.allplayers[i].v.y).fixed(3);//this.players[i].v.y;
        }

        ////////////////////////////////////////////////////////
        // if player not on floor, apply gravity
        ////////////////////////////////////////////////////////
        if (this.allplayers[i].pos.y !== this.allplayers[i].pos_limits.y_max)
        {
            this.allplayers[i].pos.y+=this.world.gravity;
        }
        else // touching ground (TODO:add drag)
        {
            this.allplayers[i].v.y = 0;
            //console.log('floor!');
        }
        //else console.log(this.players[i].pos.y, "floor");
        //if (this.players.other.pos.y !== this.players.other.pos_limits.y_max)
            //this.players.other.pos.y+=this.world.gravity;
    }
    //console.log('v', this.players[i].v);
    //console.log('pos', this.players[i].pos);
    //if (this.players.self.pos.)
    //console.log(this.players.self.pos.y, this.players.self.pos_limits.y_max);// + this.players.self.size.hx, this.world.height);
    //if (this.players.self.pos.y + this.players.self.size.hx !== this.world.height)

    if(this.server) {
        this.server_update_physics();
    } else {
        this.client_update_physics();
    }

}; //game_core.prototype.update_physics

/*

 Server side functions

    These functions below are specific to the server side only,
    and usually start with server_* to make things clearer.

*/

//Updated at 15ms , simulates the world state
game_core.prototype.server_update_physics = function() {
    if (glog)
    console.log('##-@@ server_update_physics');

    /*
    //Handle player one
    this.players.self.old_state.pos = this.pos( this.players.self.pos );
    var new_dir = this.process_input(this.players.self);
    this.players.self.pos = this.v_add( this.players.self.old_state.pos, new_dir );

    //Handle player two (other players)
    this.players.other.old_state.pos = this.pos( this.players.other.pos );
    var other_new_dir = this.process_input(this.players.other);
    this.players.other.pos = this.v_add( this.players.other.old_state.pos, other_new_dir);

    //Keep the physics position in the world
    this.check_collision( this.players.self );
    this.check_collision( this.players.other );

    this.players.self.inputs = []; //we have cleared the input buffer, so remove this
    this.players.other.inputs = []; //we have cleared the input buffer, so remove this
    */
    for (var i = 0; i < this.allplayers.length; i++)
    {
        this.allplayers[i].old_state.pos = this.pos( this.allplayers[i].pos );
        var other_new_dir = this.process_input(this.allplayers[i]);
        this.allplayers[i].pos = this.v_add( this.allplayers[i].old_state.pos, other_new_dir);

        //Keep the physics position in the world
        this.check_collision( this.allplayers[i] );

        //this.players.self.inputs = []; //we have cleared the input buffer, so remove this
        this.allplayers[i].inputs = []; //we have cleared the input buffer, so remove this
    }

}; //game_core.server_update_physics

//Makes sure things run smoothly and notifies clients of changes
//on the server side
game_core.prototype.server_update = function()
{
    if (glog)
    console.log('##-@@ server_update', this.allplayers.length);//this.players.self.instance.userid, this.players.self.instance.hosting, this.players.self.host);
    //Update the state of our local clock to match the timer
    this.server_time = this.local_time;

    var host;
    var others = [];
    this.laststate = {};
    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log(':',i, this.allplayers[i].mp);
        /*if (this.allplayers[i].instance && this.allplayers[i].instance.hosting === true)
        {
            this.laststate.hp = this.allplayers[i].pos;
            this.laststate.his = this.allplayers[i].last_input_seq;
        }
        else
        {
            this.laststate.cp = this.allplayers[i].pos;
            this.laststate.cis = this.allplayers[i].last_input_seq;
        }*/
        if (this.allplayers[i].mp)
        {
            //console.log(this.allplayers[i].mp);
            this.laststate[this.allplayers[i].mp] = this.allplayers[i].pos;
            this.laststate[this.allplayers[i].mis] = this.allplayers[i].last_input_seq;
        }
    }
    //console.log(this.laststate);
    /*
    if (!this.laststate.cp) // TODO: STUB - Remove this check (forcing "other" player)
    {
        this.laststate.cp = this.players.other.pos;
        this.laststate.cis = this.players.other.last_input_seq;
    }
    //*/
    this.laststate.t = this.server_time;
    // console.log(this.laststate);
    //console.log('len', this.allplayers.length);
    for (var j = 0; j < this.allplayers.length; j++)
    {
        if (this.allplayers[j].instance)// && this.allplayers[j].instance != "host")
        {
            //console.log('inst', this.allplayers[j].instance);//.userid);
            this.allplayers[j].instance.emit('onserverupdate', this.laststate);
        }
    }

    //Make a snapshot of the current state, for updating the clients
    // this.laststate = {
    //     hp  : this.players.self.pos,                //'host position', the game creators position
    //     cp  : this.players.other.pos,               //'client position', the person that joined, their position
    //     his : this.players.self.last_input_seq,     //'host input sequence', the last input we processed for the host
    //     cis : this.players.other.last_input_seq,    //'client input sequence', the last input we processed for the client
    //     t   : this.server_time                      // our current local time on the server
    // };
    //if (glog)
    //console.log('ins', this.players.other.instance);
    /*
    //Send the snapshot to the 'host' player
    if(this.players.self.instance) {
        this.players.self.instance.emit( 'onserverupdate', this.laststate );
    }

    //Send the snapshot to the 'client' player
    if(this.players.other.instance) {
        this.players.other.instance.emit( 'onserverupdate', this.laststate );
    }
    */
}; //game_core.server_update


game_core.prototype.handle_server_input = function(client, input, input_time, input_seq)
{
    //if (glog)
    //console.log('##-@@ handle_server_input');
    //Fetch which client this refers to out of the two
    /*var player_client =
        (client.userid == this.players.self.instance.userid) ?
            this.players.self : this.players.other;*/
    // set default
    //var player_client;
    if (client.userid == this.players.self.instance.userid)
        player_client = this.players.self;//.instance.userid);
    else
    {
        for (var i = 0; i < this.allplayers.length; i++)
        {
            if (this.allplayers[i].instance.userid == client.userid)
            {
                //player_client = this.allplayers[i];
                //Store the input on the player instance for processing in the physics loop
                this.allplayers[i].inputs.push({inputs:input, time:input_time, seq:input_seq});
                break;
            }
        }
    }

    //Store the input on the player instance for processing in the physics loop
    //player_client.inputs.push({inputs:input, time:input_time, seq:input_seq});

}; //game_core.handle_server_input


/*

 Client side functions

    These functions below are specific to the client side only,
    and usually start with client_* to make things clearer.

*/

game_core.prototype.client_handle_input = function(){
    if (glog) console.log('## client_handle_input');
    //if(this.lit > this.local_time) return;
    //this.lit = this.local_time+0.5; //one second delay

    //This takes input from the client and keeps a record,
    //It also sends the input information to the server immediately
    //as it is pressed. It also tags each input with a sequence number.

    var x_dir = 0;
    var y_dir = 0;
    var input = [];
    this.client_has_input = false;

    if( this.keyboard.pressed('A') ||
        this.keyboard.pressed('left')) {

            //x_dir = -1;
            input.push('l');

        } //left

    if( this.keyboard.pressed('D') ||
        this.keyboard.pressed('right')) {

            //x_dir = 1;
            input.push('r');

        } //right

    if( this.keyboard.pressed('S') ||
        this.keyboard.pressed('down')) {

            //y_dir = 1;
            input.push('d');

        } //down

    if( this.keyboard.pressed('W') ||
        this.keyboard.pressed('up')) {

            //y_dir = -1;
            input.push('u');

        } //up

    if(input.length) {

            //Update what sequence we are on now
        this.input_seq += 1;

            //Store the input state as a snapshot of what happened.
        this.players.self.inputs.push({
            inputs : input,
            time : this.local_time.fixed(3),
            seq : this.input_seq
        });

            //Send the packet of information to the server.
            //The input packets are labelled with an 'i' in front.
        var server_packet = 'i.';
            server_packet += input.join('-') + '.';
            server_packet += this.local_time.toFixed(3).replace('.','-') + '.';
            server_packet += this.input_seq;

            //Go
        this.socket.send(  server_packet  );

            //Return the direction if needed
        return this.physics_movement_vector_from_direction( x_dir, y_dir );

    } else {

        return {x:0,y:0};

    }

}; //game_core.client_handle_input

game_core.prototype.client_process_net_prediction_correction = function()
{
    //if (glog)
    //console.log('## client_process_net_prediction_correction', this.players.self.mp);
    //No updates...
    if(!this.server_updates.length) return;

    //The most recent server update
    var latest_server_data = this.server_updates[this.server_updates.length-1];

    //Our latest server position
    //var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;
    var my_server_pos = latest_server_data[this.players.self.mp];

    //Update the debug server position block TODO: removed line below
    //this.ghosts.server_pos_self.pos = this.pos(my_server_pos);

    //here we handle our local input prediction ,
    //by correcting it with the server and reconciling its differences
    //var my_last_input_on_server = this.players.self.host ? latest_server_data.his : latest_server_data.cis;
    var my_last_input_on_server = latest_server_data[this.players.self.mis];
    if(my_last_input_on_server)
    {
        //The last input sequence index in my local input list
        var lastinputseq_index = -1;
        //Find this input in the list, and store the index
        for(var i = 0; i < this.players.self.inputs.length; ++i)
        {
            if(this.players.self.inputs[i].seq == my_last_input_on_server)
            {
                lastinputseq_index = i;
                break;
            }
        }

        //Now we can crop the list of any updates we have already processed
        if(lastinputseq_index != -1)
        {
            //so we have now gotten an acknowledgement from the server that our inputs here have been accepted
            //and that we can predict from this known position instead

            //remove the rest of the inputs we have confirmed on the server
            var number_to_clear = Math.abs(lastinputseq_index - (-1));
            this.players.self.inputs.splice(0, number_to_clear);
            //The player is now located at the new server position, authoritive server
            this.players.self.cur_state.pos = this.pos(my_server_pos);
            this.players.self.last_input_seq = lastinputseq_index;
            //Now we reapply all the inputs that we have locally that
            //the server hasn't yet confirmed. This will 'keep' our position the same,
            //but also confirm the server position at the same time.
            this.client_update_physics();
            this.client_update_local_position();

        } // if(lastinputseq_index != -1)
    } //if my_last_input_on_server

}; //game_core.client_process_net_prediction_correction

game_core.prototype.client_process_net_updates = function()
{
    if (glog)
    console.log('## client_process_net_updates');//, this.client_predict);
    // for (var i = 0; i < this.allplayers.length; i++)
    // {
    //     console.log('::', this.allplayers[i].host, this.allplayers[i].id);
    // }

    //No updates...
    if(!this.server_updates.length) return;

    //First : Find the position in the updates, on the timeline
    //We call this current_time, then we find the past_pos and the target_pos using this,
    //searching throught the server_updates array for current_time in between 2 other times.
    // Then :  other player position = lerp ( past_pos, target_pos, current_time );

    //Find the position in the timeline of updates we stored.
    var current_time = this.client_time;
    var count = this.server_updates.length-1;
    var target = null;
    var previous = null;

    //We look from the 'oldest' updates, since the newest ones
    //are at the end (list.length-1 for example). This will be expensive
    //only when our time is not found on the timeline, since it will run all
    //samples. Usually this iterates very little before breaking out with a target.
    for(var i = 0; i < count; ++i)
    {
        var point = this.server_updates[i];
        var next_point = this.server_updates[i+1];

        //Compare our point in time with the server times we have
        if(current_time > point.t && current_time < next_point.t)
        {
            target = next_point;
            previous = point;
            break;
        }
    }

    //With no target we store the last known
    //server position and move to that instead
    if(!target)
    {
        target = this.server_updates[0];
        previous = this.server_updates[0];
    }
    //console.log('target', target);
    //console.log('previous', previous);
    //Now that we have a target and a previous destination,
    //We can interpolate between then based on 'how far in between' we are.
    //This is simple percentage maths, value/target = [0,1] range of numbers.
    //lerp requires the 0,1 value to lerp to? thats the one.

     if(target && previous)
     {

        this.target_time = target.t;

        var difference = this.target_time - current_time;
        var max_difference = (target.t - previous.t).fixed(3);
        var time_point = (difference/max_difference).fixed(3);

        //Because we use the same target and previous in extreme cases
        //It is possible to get incorrect values due to division by 0 difference
        //and such. This is a safe guard and should probably not be here. lol.
        if( isNaN(time_point) ) time_point = 0;
        if(time_point == -Infinity) time_point = 0;
        if(time_point == Infinity) time_point = 0;

        //The most recent server update
        var latest_server_data = this.server_updates[ this.server_updates.length-1 ];

        //These are the exact server positions from this tick, but only for the ghost
        // var other_server_pos = this.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        //var other_server_pos2 = [];
        //var other_target_pos2 = [];
        //var other_past_pos2 = [];
        //*
        var ghostStub;
        //console.log('len', this.allplayers.length, this.players.self.mp);
        for (var j = 0; j < this.allplayers.length; j++)
        {
            if (this.allplayers[j] != this.players.self)// && previous[this.allplayers[j].mp])
            {
                //console.log('**', j, this.allplayers[j].mp);
                // other_server_pos2=latest_server_data[this.allplayers[j].mp];
                // other_target_pos2=latest_server_data[this.allplayers[j].mp];
                // other_past_pos2=latest_server_data[this.allplayers[j].mp];
                // console.log('*', previous[this.allplayers[j].mp]);
                ghostStub = this.v_lerp(
                    previous[this.allplayers[j].mp],//other_past_pos2,
                    target[this.allplayers[j].mp],//other_target_pos2,
                    time_point
                );
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this._pdt*this.client_smooth);
                this.allplayers[j].pos = this.v_lerp(this.allplayers[j].pos, ghostStub, this._pdt * this.client_smooth);
                //console.log(this.allplayers[j].pos);
            }
        }
        // console.log(other_server_pos2);
        //*/

        //The other players positions in this timeline, behind us and in front of us
        /*var other_target_pos = this.players.self.host ? target.cp : target.hp;
        var other_past_pos = this.players.self.host ? previous.cp : previous.hp;*/

        //update the dest block, this is a simple lerp
        //to the target from the previous point in the server_updates buffer
        // TODO: Stub - other_server_pos is undefined
        //console.log("^^",other_server_pos);
        // if (other_server_pos)
        //if (other_past_pos)
        // {
            //console.log('a', other_past_pos);
            //console.log('b', other_target_pos);
            //console.log('c', time_point);
            // var ghostStub = this.v_lerp(other_past_pos, other_target_pos, time_point);
            //this.ghosts.server_pos_other.pos = this.pos(other_server_pos);
            //this.ghosts.pos_other.pos = this.v_lerp(other_past_pos, other_target_pos, time_point);

            //if(this.client_smoothing)
            //{
                //this.players.other.pos = this.v_lerp( this.players.other.pos, this.ghosts.pos_other.pos, this._pdt*this.client_smooth);
                // TODO: remove check below
                //if (other_server_pos)
                // this.players.other.pos = this.v_lerp( this.players.other.pos, ghostStub, this._pdt*this.client_smooth);
            /*}
            else
            {
                this.players.other.pos = this.pos(this.ghosts.pos_other.pos);
            }*/
            //}

            //Now, if not predicting client movement , we will maintain the local player position
            //using the same method, smoothing the players information from the past.

            /*if(!this.client_predict && !this.naive_approach)
            {
                //These are the exact server positions from this tick, but only for the ghost
                var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;

                //The other players positions in this timeline, behind us and in front of us
                var my_target_pos = this.players.self.host ? target.hp : target.cp;
                var my_past_pos = this.players.self.host ? previous.hp : previous.cp;

                //Snap the ghost to the new server position
                this.ghosts.server_pos_self.pos = this.pos(my_server_pos);
                var local_target = this.v_lerp(my_past_pos, my_target_pos, time_point);

                //Smoothly follow the destination position
                if(this.client_smoothing)
                {
                    this.players.self.pos = this.v_lerp( this.players.self.pos, local_target, this._pdt*this.client_smooth);
                }
                else
                {
                    this.players.self.pos = this.pos( local_target );
                }
            }*/
        //} // if other_server_pos

    } //if target && previous

}; //game_core.client_process_net_updates

game_core.prototype.client_onserverupdate_recieved = function(data)
{
    if (glog)
    console.log('## client_onserverupdate_recieved');
    //console.log(data);
    //if (data.hp.d === 0)
    //console.log('data', data);

    //Lets clarify the information we have locally. One of the players is 'hosting' and
    //the other is a joined in client, so we name these host and client for making sure
    //the positions we get from the server are mapped onto the correct local sprites
    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    var this_player = this.players.self;*/

    //Store the server time (this is offset by the latency in the network, by the time we get it)
    this.server_time = data.t;
    //Update our local offset time from the last server update
    this.client_time = this.server_time - (this.net_offset/1000);

    //One approach is to set the position directly as the server tells you.
    //This is a common mistake and causes somewhat playable results on a local LAN, for example,
    //but causes terrible lag when any ping/latency is introduced. The player can not deduce any
    //information to interpolate with so it misses positions, and packet loss destroys this approach
    //even more so. See 'the bouncing ball problem' on Wikipedia.

    /*
    if(this.naive_approach)
    {

        if(data.hp)
        {
            player_host.pos = this.pos(data.hp);
        }

        if(data.cp)
        {
            player_client.pos = this.pos(data.cp);
        }

    }
    else
    {//*/
    //Cache the data from the server,
    //and then play the timeline
    //back to the player with a small delay (net_offset), allowing
    //interpolation between the points.
    this.server_updates.push(data);

    //we limit the buffer in seconds worth of updates
    //60fps*buffer seconds = number of samples
    if(this.server_updates.length >= ( 60 * this.buffer_size ))
    {
        this.server_updates.splice(0,1);
    }

    //We can see when the last tick we know of happened.
    //If client_time gets behind this due to latency, a snap occurs
    //to the last tick. Unavoidable, and a reallly bad connection here.
    //If that happens it might be best to drop the game after a period of time.
    this.oldest_tick = this.server_updates[0].t;

    //Handle the latest positions from the server
    //and make sure to correct our local predictions, making the server have final say.
    this.client_process_net_prediction_correction();

    //} //non naive

}; //game_core.client_onserverupdate_recieved

game_core.prototype.client_update_local_position = function()
{

 if(this.client_predict)
 {
     if (glog)
     console.log('## client_update_local_position');

            //Work out the time we have since we updated the state
        var t = (this.local_time - this.players.self.state_time) / this._pdt;

            //Then store the states for clarity,
        var old_state = this.players.self.old_state.pos;
        var current_state = this.players.self.cur_state.pos;

            //Make sure the visual position matches the states we have stored
        //this.players.self.pos = this.v_add( old_state, this.v_mul_scalar( this.v_sub(current_state,old_state), t )  );
        this.players.self.pos = current_state;

            //We handle collision on client if predicting.
        this.check_collision( this.players.self );

    }  //if(this.client_predict)

}; //game_core.prototype.client_update_local_position

game_core.prototype.client_update_physics = function() {
    if (glog)
    console.log('## client_update_physics');
        //Fetch the new direction from the input buffer,
        //and apply it to the state so we can smooth it in the visual state

    if(this.client_predict) {

        this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
        var nd = this.process_input(this.players.self);
        this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.local_time;

    }

}; //game_core.client_update_physics

game_core.prototype.client_update = function() {
    if (glog)
    console.log('## client_update');
    //console.log(this.viewport);
    //Clear the screen area (just client's viewport, not world)
    //console.log(this.viewport);//.x,this.viewport.y);
    var camX = clamp(-this.players.self.pos.x + this.viewport.width/2, -(this.world.width - this.viewport.width) - 50, 50);//this.this.world.width);
    var camY = clamp(-this.players.self.pos.y + this.viewport.height/2, -(this.world.height - this.viewport.height) - 50, 50);//this.game.world.height);
    this.ctx.clearRect(-camX,-camY,this.viewport.width+100, this.viewport.height+100);//worldWidth,worldHeight);

    //draw help/information if required
    this.client_draw_info();

    // draw prerenders
    //var preprend = this.canvas2
    if (this.canvas2)
    this.ctx.drawImage(this.canvas2, 0,0);
    else console.log('no canvas');
    //this.ctx.

    //Capture inputs from the player
    this.client_handle_input();

    //Network player just gets drawn normally, with interpolation from
    //the server updates, smoothing out the positions from the past.
    //Note that if we don't have prediction enabled - this will also
    //update the actual local client position on screen as well.
    //if( !this.naive_approach )
    //{
        this.client_process_net_updates();
    //}

    //Now they should have updated, we can draw the entity
    //this.players.other.draw();

    for (var i = 0; i < this.allplayers.length; i++)
    {
        if (this.allplayers[i] != this.players.self)// && this.allplayers[i].active===true)
            this.allplayers[i].draw();
    }

    //When we are doing client side prediction, we smooth out our position
    //across frames using local input states we have stored.
    this.client_update_local_position();

    //And then we finally draw
    this.players.self.draw();

    //this.ctx.save();
    this.ctx.setTransform(1,0,0,1,0,0);//reset the transform matrix as it is cumulative
    //this.ctx.clearRect(0, 0, this.this.viewport.width, this.this.viewport.height);//clear the viewport AFTER the matrix is reset

    //Clamp the camera position to the world bounds while centering the camera around the player
    //var camX = clamp(-this.players.self.pos.x + this.viewport.width/2, -(this.world.width - this.viewport.width) - 50, 50);//this.this.world.width);
    //var camY = clamp(-this.players.self.pos.y + this.viewport.height/2, -(this.world.height - this.viewport.height) - 50, 50);//this.game.world.height);
    //console.log(camX, camY, -this.game.players.self.pos.x + this.game.viewport.width/2);
    this.ctx.translate( camX, camY );
    //console.log(camX,camY);
    //this.ctx.restore();

    //and these
    /*if(this.show_dest_pos && !this.naive_approach)
    {
        this.ghosts.pos_other.draw();
    }

        //and lastly draw these
    if(this.show_server_pos && !this.naive_approach)
    {
        this.ghosts.server_pos_self.draw();
        this.ghosts.server_pos_other.draw();
    }*/

    //Work out the fps average
    this.client_refresh_fps();

}; //game_core.update_client

game_core.prototype.create_timer = function(){
    setInterval(function(){
        this._dt = new Date().getTime() - this._dte;
        this._dte = new Date().getTime();
        this.local_time += this._dt/1000.0;
    }.bind(this), 4);
};

game_core.prototype.create_physics_simulation = function() {

    setInterval(function(){
        this._pdt = (new Date().getTime() - this._pdte)/1000.0;
        this._pdte = new Date().getTime();
        this.update_physics();
    }.bind(this), 15);

}; //game_core.client_create_physics_simulation


game_core.prototype.client_create_ping_timer = function() {
        //Set a ping timer to 1 second, to maintain the ping/latency between
        //client and server and calculated roughly how our connection is doing

    setInterval(function(){

        this.last_ping_time = new Date().getTime() - this.fake_lag;
        this.socket.send('p.' + (this.last_ping_time) );

    }.bind(this), 1000);

}; //game_core.client_create_ping_timer


game_core.prototype.client_create_configuration = function() {

    this.show_help = false;             //Whether or not to draw the help text
    this.naive_approach = false;        //Whether or not to use the naive approach
    this.show_server_pos = false;       //Whether or not to show the server position
    this.show_dest_pos = false;         //Whether or not to show the interpolation goal
    this.client_predict = true;         //Whether or not the client is predicting input
    this.input_seq = 0;                 //When predicting client inputs, we store the last input as a sequence number
    this.client_smoothing = true;       //Whether or not the client side prediction tries to smooth things out
    this.client_smooth = 25;            //amount of smoothing to apply to client update dest

    this.net_latency = 0.001;           //the latency between the client and the server (ping/2)
    this.net_ping = 0.001;              //The round trip time from here to the server,and back
    this.last_ping_time = 0.001;        //The time we last sent a ping
    this.fake_lag = 0;                //If we are simulating lag, this applies only to the input client (not others)
    this.fake_lag_time = 0;

    this.net_offset = 100;              //100 ms latency between server and client interpolation for other clients
    this.buffer_size = 2;               //The size of the server history to keep for rewinding/interpolating.
    this.target_time = 0.01;            //the time where we want to be in the server timeline
    this.oldest_tick = 0.01;            //the last time tick we have available in the buffer

    this.client_time = 0.01;            //Our local 'clock' based on server time - client interpolation(net_offset).
    this.server_time = 0.01;            //The time the server reported it was at, last we heard from it

    this.dt = 0.016;                    //The time that the last frame took to run
    this.fps = 0;                       //The current instantaneous fps (1/this.dt)
    this.fps_avg_count = 0;             //The number of samples we have taken for fps_avg
    this.fps_avg = 0;                   //The current average fps displayed in the debug UI
    this.fps_avg_acc = 0;               //The accumulation of the last avgcount fps samples

    this.lit = 0;
    this.llt = new Date().getTime();

};//game_core.client_create_configuration

game_core.prototype.client_create_debug_gui = function() {

    this.gui = new dat.GUI();

    var _playersettings = this.gui.addFolder('Your settings');

        this.colorcontrol = _playersettings.addColor(this, 'color');

            //We want to know when we change our color so we can tell
            //the server to tell the other clients for us
        this.colorcontrol.onChange(function(value) {
            this.players.self.color = value;
            localStorage.setItem('color', value);
            this.socket.send('c.' + value);
        }.bind(this));

        _playersettings.open();

    var _othersettings = this.gui.addFolder('Methods');

        _othersettings.add(this, 'naive_approach').listen();
        _othersettings.add(this, 'client_smoothing').listen();
        _othersettings.add(this, 'client_smooth').listen();
        _othersettings.add(this, 'client_predict').listen();

    var _debugsettings = this.gui.addFolder('Debug view');

        _debugsettings.add(this, 'show_help').listen();
        _debugsettings.add(this, 'fps_avg').listen();
        _debugsettings.add(this, 'show_server_pos').listen();
        _debugsettings.add(this, 'show_dest_pos').listen();
        _debugsettings.add(this, 'local_time').listen();

        _debugsettings.open();

    var _consettings = this.gui.addFolder('Connection');
        _consettings.add(this, 'net_latency').step(0.001).listen();
        _consettings.add(this, 'net_ping').step(0.001).listen();

            //When adding fake lag, we need to tell the server about it.
        var lag_control = _consettings.add(this, 'fake_lag').step(0.001).listen();
        lag_control.onChange(function(value){
            this.socket.send('l.' + value);
        }.bind(this));

        _consettings.open();

    var _netsettings = this.gui.addFolder('Networking');

        _netsettings.add(this, 'net_offset').min(0.01).step(0.001).listen();
        _netsettings.add(this, 'server_time').step(0.001).listen();
        _netsettings.add(this, 'client_time').step(0.001).listen();
        //_netsettings.add(this, 'oldest_tick').step(0.001).listen();

        _netsettings.open();

}; //game_core.client_create_debug_gui

game_core.prototype.client_reset_positions = function()
{
    console.log('## client_reset_positions');

    console.log('Am I Host?', this.players.self.host, this.allplayers.length);
    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log('pos:', this.allplayers[i].pos, this.allplayers[i].instance);
        // this.allplayers[i].pos = this.allplayers[i].pos;

        this.allplayers[i].old_state.pos = this.pos(allplayers[i].pos);
        this.allplayers[i].pos = this.pos(allplayers[i].pos);
        this.allplayers[i].cur_state.pos = this.pos(allplayers[i].pos);
    }

    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;

    //Host always spawns at the top left.
    player_host.pos = { x:20,y:20 };
    player_client.pos = { x:500, y:200 };*/

    //Make sure the local player physics is updated
    this.players.self.old_state.pos = this.pos(this.players.self.pos);
    this.players.self.pos = this.pos(this.players.self.pos);
    this.players.self.cur_state.pos = this.pos(this.players.self.pos);

    //Position all debug view items to their owners position
    /*this.ghosts.server_pos_self.pos = this.pos(this.players.self.pos);

    this.ghosts.server_pos_other.pos = this.pos(this.players.other.pos);
    this.ghosts.pos_other.pos = this.pos(this.players.other.pos);*/

}; //game_core.client_reset_positions

game_core.prototype.client_onreadygame = function(data) {
    //if (glog)
    console.log('## client_onreadygame');//, data);

    var server_time = parseFloat(data.replace('-','.'));

    // TODO: Resolve the lines below
    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    */
    this.local_time = server_time + this.net_latency;
    console.log('## server time is about ' + this.local_time);
    /*
    //Store their info colors for clarity. server is always blue
    player_host.info_color = '#2288cc';
    player_client.info_color = '#cc8822';

    //Update their information
    player_host.state = 'local_pos(hosting)';
    player_client.state = 'local_pos(joined)';
    */

    this.players.self.state = 'YOU ' + this.players.self.state;

    //Make sure colors are synced up
     this.socket.send('c.' + this.players.self.color);

}; //client_onreadygame

game_core.prototype.resizeCanvas = function()
{
    console.log('resize', this.viewport.width, this.viewport.height, window.innerWidth, window.innerHeight);
    this.viewport.width = window.innerWidth;
    this.viewport.height = window.innerHeight;
};

game_core.prototype.client_onjoingame = function(data)
{
    //if (glog)
    console.log('## client_onjoingame', data);// (player joined is not host: self.host=false)');
    console.log('len', this.allplayers.length);
    console.log('vp', this.viewport);

    // create prerenders
    this.prerenderer();


    //We are not the host
    this.players.self.host = false;
    //Update the local state
    this.players.self.state = 'connected.joined.waiting';
    this.players.self.info_color = '#00bb00';

    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log("##", this.allplayers[i]);//.mp.instance);
        //, this.allplayers[i].instance.userid);//, data);
        //if (this.allplayers[i].mp == data.mp && data.me)//.instance && this.allplayers[i].instance.userid == data)
        if (this.allplayers[i].mp == data)//'cp1')
        {
            console.log('## found player', data);
            //this.players.self.md = this.allplayers[i].md;
            //this.players.self.mis = this.allplayers[i].mis;
            //if (data.me)
            this.allplayers[i].active = true;
            this.players.self = this.allplayers[i];
        }
        else if (this.allplayers[i].mp == 'hp')
        {
            console.log('remove host', i, this.allplayers[i].host);
            this.allplayers.splice(i, 1);
        }
        // else if (this.allplayers[i].instance.hosting)
    }

    // set mp val
    // this.players.self.mp = 'cp' + this.allplayers.length;
    // this.players.self.mis = 'cis' + this.allplayers.length;
    // TODO: Remove below
    // this.players.other.mp = 'hp';
    // this.players.other.mis = 'his';

    this.resizeCanvas();
    //Make sure the positions match servers and other clients
    this.client_reset_positions();

}; //client_onjoingame

game_core.prototype.client_onhostgame = function(data) {
    //if (glog)
    console.log('## client_onhostgame: we are the HOST (self.host=true)');

    //The server sends the time when asking us to host, but it should be a new game.
    //so the value will be really small anyway (15 or 16ms)
    var server_time = parseFloat(data.replace('-','.'));

    //Get an estimate of the current time on the server
    this.local_time = server_time + this.net_latency;

    //Set the flag that we are hosting, this helps us position respawns correctly
    this.players.self.host = true;

    //Update debugging information to display state
    this.players.self.state = 'hosting.waiting for a player';
    this.players.self.info_color = '#cc0000';

    this.players.self.mp = "hp";
    this.players.self.mis = "his";

    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log("##", this.allplayers[i]);//.mp, this.allplayers[i].id);
        //if (this.allplayers[i].instance) console.log(this.allplayers[i].instance.userid);
        if (this.allplayers[i].mp == 'hp')// == data)
        {
            console.log('## found host player', i);
            this.players.self = this.allplayers[i];
            //this.allplayers.splice(i, 1);

        }
    }

    // TODO: Remove below
    // this.players.other.mp = 'cp';
    // this.players.other.mis = 'cis';

    //Make sure we start in the correct place as the host.
    this.client_reset_positions();

}; //client_onhostgame

game_core.prototype.client_onconnected = function(data) {
    //if (glog)
    console.log('## client_onconnected (self.id=' + data.id + ")");
    console.log(data);

    // for (var i = 0; i < this.allplayers.length; i++)
    // {
    //     if (!this.allplayers[i].instance) continue;
    //     console.log(this.allplayers[i].instance.userid, data.id);
    //     if (this.allplayers[i].id === data.id)
    //     {
    //         console.log('found me!');
    //         this.players.self.id = data.id;
    //         this.players.self.info_color = '#cc0000';
    //         this.players.self.state = 'connected';
    //         this.players.self.online = true;
    //     }
    // }

    //The server responded that we are now in a game,
    //this lets us store the information about ourselves and set the colors
    //to show we are now ready to be playing.
    this.players.self.id = data.id;
    this.players.self.info_color = '#cc0000';
    this.players.self.state = 'connected';
    this.players.self.online = true;

}; //client_onconnected

game_core.prototype.client_on_otherclientcolorchange = function(data) {

    //this.players.other.color = data;

}; //game_core.client_on_otherclientcolorchange

game_core.prototype.client_onping = function(data) {

    this.net_ping = new Date().getTime() - parseFloat( data );
    this.net_latency = this.net_ping/2;

}; //client_onping

game_core.prototype.client_onnetmessage = function(data) {
    if (glog) console.log('client_onnetmessage');

    var commands = data.split('.');
    var command = commands[0];
    var subcommand = commands[1] || null;
    var commanddata = commands[2] || null;

    switch(command) {
        case 's': //server message

            switch(subcommand) {

                case 'h' : //host a game requested
                    this.client_onhostgame(commanddata); break;

                case 'j' : //join a game requested
                    this.client_onjoingame(commanddata); break;

                case 'r' : //ready a game requested
                    this.client_onreadygame(commanddata); break;

                case 'e' : //end game requested
                    this.client_ondisconnect(commanddata); break;

                case 'p' : //server ping
                    this.client_onping(commanddata); break;

                case 'c' : //other player changed colors
                    this.client_on_otherclientcolorchange(commanddata); break;

            } //subcommand

        break; //'s'
    } //command

}; //client_onnetmessage

game_core.prototype.client_ondisconnect = function(data) {
    //if (glog)
    console.log('client_ondisconnect', data);

    //When we disconnect, we don't know if the other player is
    //connected or not, and since we aren't, everything goes to offline

    this.players.self.info_color = 'rgba(255,255,255,0.1)';
    this.players.self.state = 'not-connected';
    this.players.self.online = false;

    // TODO: Resolve below lines
    //this.players.other.info_color = 'rgba(255,255,255,0.1)';
    //this.players.other.state = 'not-connected';

}; //client_ondisconnect

game_core.prototype.client_connect_to_server = function()
{
    //if (glog)
    console.log('client_connect_to_server');

    //Store a local reference to our connection to the server
    this.socket = io.connect();

    //When we connect, we are not 'connected' until we have a server id
    //and are placed in a game by the server. The server sends us a message for that.
    this.socket.on('connect', function(){
        this.players.self.state = 'connecting';
    }.bind(this));

    //Sent when we are disconnected (network, server down, etc)
    this.socket.on('disconnect', this.client_ondisconnect.bind(this));
    //Sent each tick of the server simulation. This is our authoritive update
    this.socket.on('onserverupdate', this.client_onserverupdate_recieved.bind(this));
    //Handle when we connect to the server, showing state and storing id's.
    this.socket.on('onconnected', this.client_onconnected.bind(this));
    //On error we just show that we are not connected for now. Can print the data.
    this.socket.on('error', this.client_ondisconnect.bind(this));
    //On message from the server, we parse the commands and send it to the handlers
    this.socket.on('message', this.client_onnetmessage.bind(this));

}; //game_core.client_connect_to_server


game_core.prototype.client_refresh_fps = function() {

    //We store the fps for 10 frames, by adding it to this accumulator
    this.fps = 1/this.dt;
    this.fps_avg_acc += this.fps;
    this.fps_avg_count++;

    //When we reach 10 frames we work out the average fps
    if(this.fps_avg_count >= 10) {

        this.fps_avg = this.fps_avg_acc/10;
        this.fps_avg_count = 1;
        this.fps_avg_acc = this.fps;

    } //reached 10 frames

}; //game_core.client_refresh_fps


game_core.prototype.client_draw_info = function() {
    if (glog) console.log('client_draw_info');

    //We don't want this to be too distracting
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';

    //They can hide the help with the debug GUI
    if(this.show_help) {

        this.ctx.fillText('net_offset : local offset of others players and their server updates. Players are net_offset "in the past" so we can smoothly draw them interpolated.', 10 , 30);
        this.ctx.fillText('server_time : last known game time on server', 10 , 70);
        this.ctx.fillText('client_time : delayed game time on client for other players only (includes the net_offset)', 10 , 90);
        this.ctx.fillText('net_latency : Time from you to the server. ', 10 , 130);
        this.ctx.fillText('net_ping : Time from you to the server and back. ', 10 , 150);
        this.ctx.fillText('fake_lag : Add fake ping/lag for testing, applies only to your inputs (watch server_pos block!). ', 10 , 170);
        this.ctx.fillText('client_smoothing/client_smooth : When updating players information from the server, it can smooth them out.', 10 , 210);
        this.ctx.fillText(' This only applies to other clients when prediction is enabled, and applies to local player with no prediction.', 170 , 230);

    } //if this.show_help

    //Draw some information for the host
    if(this.players.self.host) {

        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.fillText('You are the host', 10 , 465);

    } //if we are the host


    //Reset the style back to full white.
    this.ctx.fillStyle = 'rgba(255,255,255,1)';

}; //game_core.client_draw_help
