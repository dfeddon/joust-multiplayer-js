/*jslint
    this
*/

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

'use strict';

var MAX_PLAYERS_PER_GAME = 30;
var MAX_GAMES_PER_SERVER = 20;

// include modules
// var WebSocket         = require('ws');
// var Primus            = require('primus');

var 
    _                   = require('./node_modules/lodash/lodash.min'),
    // UUID                = require('node-uuid'),
    core_client         = require('./core.client'),
    getUid              = require('get-uid'),
    // assert              = require('assert'),
    // duplex              = require('duplex'),
    config              = require('./class.globals'),
    getplayers          = require('./class.getplayers'),
    egyptian_set        = require('./egyptian_set'),
    game_player         = require('./class.player'),
    game_flag           = require('./class.flag'),
    platformClass       = require('./class.platform'),
    //transformClass      = require('./class.transform'),
    game_event_server   = require('./class.event'),
    game_chest          = require('./class.chest'),
    assets              = require('./singleton.assets'),
    pool                = require('typedarray-pool'),
    game_toast          = require('./class.toast');
    /*collisionObject     = require('./class.collision'),
    PhysicsEntity       = require('./class.physicsEntity'),
    CollisionDetector   = require('./class.collisionDetector'),
    CollisionSolver     = require('./class.collisionSolver');*/
    // this._                   = require('./node_modules/lodash/lodash.min');


console.log('game.core loaded');

var glog = false; // global console logging

var frame_time = 60/1000; // run the local game at 16ms/ 60hz

if('undefined' != typeof(global)) frame_time = 45; //on server we run at 45ms, 22hz

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
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
function game_core()
{
    console.log('game_core constructor');
};

game_core.prototype.init = function(game_instance)//, io)
{
    console.log('## game_core instantiated');//, game_instance);
    //Store the instance, if any
    this.instance = game_instance;
    // this.io = io;
    //Store a flag if we are the server
    this.server = this.instance !== undefined;
    
    this.config = new config();
    this.config.server = (this.server) ? true : false;

    this.getplayers = new getplayers(game_instance, MAX_PLAYERS_PER_GAME, null, this.config);

    var worldWidth = 50 * 64; // 50 tiles 3200;//420;
    var worldHeight = 37 * 64;// 37 tiles 3200;//720;

    //Used in collision etc.
    this.config.world = {
        width : worldWidth,//720,
        height : worldHeight//480
    };

    this.config.world.gravity = 0.05;//.25;//2;//3.5;

    this.config.world.totalplayers = MAX_PLAYERS_PER_GAME;//30;

    this.config.world.maxOrbs = 0;//150;

    if (!game_instance)
        this.core_client = new core_client(this, this.config);
    //console.log('getplayers', this.getplayers, this.getplayers.allplayers);

    // this.bufArr = new ArrayBuffer(768);//480);
    
    var _this = this;

    this.bg = null;
    this.fg = null;
    this.barriers = null;

    // global delay flag for change ability input
    this.inputDelay = false;

    this.orbs = [];

    this.tilemap = null;
    this.config.tilemapData = null;
    this.chestSpawnPoints = [];
    this.config.flagObjects = [];
    this.clientCooldowns = [
        {name:"redFlag", heldBy:null, timer:NaN, src:null, target:null},
        {name:"blueFlag", heldBy:null, timer:NaN, src:null, target:null},
        {name:"midFlag", heldBy:null, timer:NaN, src:null, target:null}
    ];

    // this.cam = {x:0,y:0};

    // this.mp = null;
    this.gameid = null;

    this.last_hscore = []; // last high score

    // this.getplayers.allplayers = []; // client/server players store
    //this.entities = [];
    this.player_abilities_enabled = false;

    //this.platforms = [];
    //this.platformsData = [];
    /*
    this.platformsData.push(
        {
            id:'plat1',
            x:(this.config.world.width/2) + (64 * 4),
            y:(this.config.world.height/2) - (64 * 4),
            w:256,
            h:64,
            t:1,
            s:0
        }
    );/*
    this.platformsData.push(
        {
            id:'plat2',
            x:(this.config.world.width/2) + (5 * 64),
            y:15 * 64,
            w:256,
            h:64,
            t:1,
            s:0
        }
    );
    this.platformsData.push(
        {
            id:'plat3',
            x:(this.config.world.width/2) + (12 * 64),
            y:8 * 64,
            w:64*6,
            h:64,
            t:1,
            s:0//4 = rotating
        }
    );
    //*/
    // this.platforms.push({x:this.config.world.width/4,y:300,w:256,h:64});
    // this.platforms.push({x:this.config.world.width -100,y:500,w:128,h:64});
    // this.platforms.push({x:0,y:800,w:256,h:64});*/


    this.events = [];
    this.passives = [
        {id: 'pass1', type:1, name: "acceleration", duration: 60, modifier: 50},
        {id: 'pass2', type:2, name: "bubble", duration: 45, modifier: 1}
        //{id: 'pass2', type:2, name: "blinker", duration: 30, modifier: 2},
    ];
    this.chests = [];

    //We create a player set, passing them
    //the game that is running them, as well
    console.log('##-@@ is server?', this.server);

    if(this.server) // only for server, not clients (browsers)
    {
        this.gameid = game_instance.id;

        this.config.server_time = 0;
        this.laststate = {};

        // setup socket worker
        /*this.sparkWorker = new Worker('worker.spark.js');
        var message = {player: this.players.self};
        this.sparkWorker.postMessage(message, [message.player]);
        this.sparkWorker.onmessage = evt => 
        {
            console.log('* got message from worker!', evt);    
        }*/

        console.log("##-@@ loading tilemap data...");
        // load tilemap data
        this.apiNode(); // load tilemap data

        // add typedarray-pool
        //this.serverPool = pool.malloc(768, "arraybuffer");
        //console.log('pool', this.serverPool);
        

        ///////////////////////////////////
        // orbs
        ///////////////////////////////////
        /*
        console.log('##-@@ creating orbs on server', this.orbs.length);
        var size,c,ox,oy,id;
        var colors = ['pink', 'lightblue', 'yellow', 'green', 'white', 'orange'];
        for (var k = 0; k < this.config.world.maxOrbs; k++)
        {
            size = Math.floor(Math.random() * 4) + 2;
            c = colors[Math.floor(Math.random() * colors.length)];
            // TODO: Avoid barriers
            ox = Math.floor(Math.random() * this.config.world.width) + 1;
            oy = Math.floor(Math.random() * this.config.world.height) + 1;
            id = UUID();

            // create new orb if undefined
            if (this.orbs[k]===undefined)
            {
                // console.log('new', k, this.orbs.length);
                var neworb = {id:id, x:ox, y:oy, c:c, w:size, h:size, r:false};
                this.orbs.push( neworb );
            }
        }
        console.log("##-@@ orbs built", this.orbs.length);
        //*/

        /*
        var t = 0;
        function rndInterval()
        {
            t = (Math.random()*5000) + 5000;
            console.log('rndInterval', t);
            console.log('rotate');
            plat.doRotate();
            setTimeout(rndInterval, t);
        }
        //*/
        ///////////////////////////////////
        // define platforms
        ///////////////////////////////////
        /*var plat;
        for (var m = 0; m < this.platformsData.length; m++)
        {
            plat = new platformClass(this);
            plat.id = this.platformsData[m].id,

            plat.setter(
            {
                //id:this.platformsData[m].id,
                x:this.platformsData[m].x,//(this.config.world.width/2) + (64 * 5),
                y:this.platformsData[m].y,//(this.config.world.height/2) - (64 * 5),
                w:this.platformsData[m].w,//512,
                h:this.platformsData[m].h//64
            });
            //console.log('plat',plat);
            if (this.platformsData[m].s === 4)
            {
                plat.state = 1;
                plat.status = 4;

                rndInterval();
            }
            this.platforms.push(plat);
        }*/

        ///////////////////////////////////
        // create startup events
        ///////////////////////////////////
        //*
        // create chest spawn event
        var evt = new game_event_server(this.getplayers, this.config);//this);
        evt.type = evt.TYPE_CHEST;
        evt.id = "ec"; // event chest
        //console.log('evt type', evt.type);
        evt.setRandomTriggerTime(25, 45);
        this.events.push(evt);
        //console.log('chest event',this.events);

        // create flag carried cooldown event
        evt = new game_event_server(this.getplayers, this.config);//this);
        evt.type = evt.TYPE_FLAG_CARRIED_COOLDOWN;
        evt.state = evt.STATE_STOPPED;
        evt.id = "fc"; // event flag carried
        evt.repeatable = false;
        //console.log('evt type', evt.type);
        //evt.setRandomTriggerTime(25, 45);
        this.events.push(evt);

        // create flag slotted cooldown event
        // create flag carried cooldown event
        evt = new game_event_server(this.getplayers, this.config);//this);
        evt.type = evt.TYPE_FLAG_SLOTTED_COOLDOWN;
        evt.state = evt.STATE_STOPPED;
        evt.id = "fs"; // event flag slotted
        evt.repeatable = false;
        //console.log('evt type', evt.type);
        //evt.setRandomTriggerTime(25, 45);
        this.events.push(evt);
        //console.log('startup events', this.events);
    }

    //The speed at which the clients move.
    this.playerspeed = 275;//120;

    //Set up some physics integration values
    this._pdt = 0.0001;                 //The physics update delta time
    this._pdte = new Date().getTime();  //The physics update last delta time
    //A local timer for precision on server and client
    this.local_time = 0.016;            //The local timer
    this._dt = new Date().getTime();    //The local timer delta
    this._dte = new Date().getTime();   //The local timer last frame time

    //Start a physics loop, this is separate to the rendering
    //as this happens at a fixed frequency

    //* TODO: Uncomment this when server_update is working!!!
    this.create_physics_simulation();

    //Start a fast paced timer for measuring time easier
    this.create_timer();
    //*/

    //this.config.flagObjects = this.config.flagObjects;
    //this.getplayers.allplayers = this.getplayers.allplayers;
    //this.config.world = this.config.world;
    this.config.server = (this.server) ? true : false;
    this.config.keyboard = this.keyboard;
    this.config.updateTerritory = this.updateTerritory;
    this.config.flagToScore = this.flagToScore;
    //this.config.tilemapData = this.config.tilemapData;
    this.config.players = this.players;
    this.config.events = this.events;
    this.config.clientCooldowns = this.clientCooldowns;
    this.config.chests = this.chests;
    this.config.chestSpawnPoints = this.chestSpawnPoints;
    this.config.passives = this.passives;
    this.config._ = _;
    this.config.gridToPixel = this.gridToPixel;

    return this;
    //console.log('config', config);
}; //game_core.constructor

if( 'undefined' != typeof global )
{
    module.exports = global.game_core = game_core;
}

game_core.prototype.getKeyboard = function() { return this.core_client.keyboard; };

game_core.prototype.nameGenerator = function()
{
    // name generator
    var egyptian_set;
    //if (this.server)
        egyptian_set = require('./egyptian_set');
    //else egyptian_set = egyptian_set;
    var set = new egyptian_set().getSet();
    var rnd = Math.floor(Math.random() * set.length);
    var pname = set[rnd];
    //console.log('pname', pname);

    return pname;
};

game_core.prototype.buildPlatforms = function()
{
    console.log('building platforms');

    /*var canvasPlatforms = document.createElement('canvas');

    canvasPlatforms.id = "canvasPlatforms";
    canvasPlatforms.width = this.config.world.width;
    canvasPlatforms.height = this.config.world.height;
    //canvasPlatforms = canvasPlatforms.getContext('2d');

    this.canvasPlatforms = canvasPlatforms;*/

    /*for (var i = 0; i < this.platforms.length; i++)
    {
        console.log('drawing platform', this.platforms[i]);
        this.platforms[i].draw();
    }*/
};

game_core.prototype.addTouchHandlers = function()
{
    console.log('== addTouchHandlers ==');

    var cv = document.getElementById('viewport');
    var dirL = document.getElementById('dirL');
    var dirR = document.getElementById('dirR');
    var dirF = document.getElementById('flap');

    //*
    function handleClick(e)
    {
        e.preventDefault();

        console.log('click', e);
        //alert('click');

        switch(e.srcElement.id)
        {
            case "dirL":
                //document.externalControlAction("A");
            break;

            case "dirR":
            break;

            case "flap":
            break;
        }
    }
    function handleStart(e)
    {
        console.log('start', e);//.srcElement.id);

       // e.preventDefault();
        //alert(e.srcElement.id);
        //console.log(e.touches[0].clientX, dirL);
        //*
        switch(e)
        {
            case "dirL":
                document.externalControlAction("A");
            break;

            case "dirR":
                document.externalControlAction("D");
            break;

            case "flap":
                document.externalControlAction("u");
            break;
        }
        
        //*/

        //e.preventDefault();
    }
    function handleEnd(e)
    {
        console.log('end', e);//.srcElement.id);

        //e.preventDefault();
        switch(e)
        {
            case "dirL":
                document.externalControlAction("B");
            break;

            case "dirR":
                document.externalControlAction("E");
            break;

            case "flap":
                document.externalControlAction("x");
            break;
        }
    }
    function handleCancel(e)
    {
        console.log('cancel', e);

        e.preventDefault();
    }
    function handleMove(e)
    {
        console.log('move', e.changedTouches[0]);
        //alert('move');
        e.preventDefault();
    }

    dl.on('press', function(e)
    {
        handleStart('dirL');
    });
    dl.on('pressup', function(e)
    {
        handleEnd('dirL');
    });
    dr.on('press', function(e)
    {
        handleStart('dirR');
    });
    dr.on('pressup', function(e)
    {
        handleEnd('dirR');
    });
    flap.on('press', function(e)
    {
        handleStart('flap');
    });
    flap.on('pressup', function(e)
    {
        handleEnd('flap');
    });
}

game_core.prototype.apiNode = function()
{
    console.log('apiNode');
    var _this = this;
    var xml2js = require('xml2js');
    var fs = require('fs');
    var parser = new xml2js.Parser({explicitArray:false});
    fs.readFile( './assets/tilemaps/joust-alpha-1.tmx', function(err, data)
    {
        parser.parseString(data, function (err, result)
        {
            //console.log(result.map.layer[1].data._);
            //console.dir(result.note.to[0]);
            //NOTE: map.layers[1] is barriers layer
            //console.log(JSON.stringify(result.map.layer[1].data[0]._));
            var data = JSON.stringify(result.map.layer[1].data._);
            var split = data.split('\\n');
            //split = split.shift();
            var base = [];
            //console.log(split.length);
            // ignore first and last rows
            var split2;
            var len = split.length;
            for (var i = 1; i < len - 1; i++)
            {
                split2 = split[i].split(",");
                split2.pop(); // remove last item (undefined)
                base.push(split2);
            }
            //console.log(base[0].length, base[0]);
            //this.config.tilemapData = base;
            _this.config.tilemapData = base;

            // objectgroups
            var builder = new xml2js.Builder();
            var xml = builder.buildObject(result.map.objectgroup);
            //console.log('xml', xml);
            //console.log(result.map.objectgroup);
            /*var groups = JSON.stringify(result.map.objectgroup)
            console.log('og', groups.length, groups[0]);
            var splits = groups.split('\\n');
            console.log('spl', splits[0].length, splits[0]);*/
            var objectgroupNode = result.map.objectgroup;
            //console.log(objectgroupNode.length);//, JSON.stringify(objectgroupNode));
            var node;
            for (var j = 0; j < objectgroupNode.length; j++)
            {
                console.log('--------------');
                node = objectgroupNode[j];//JSON.stringify(objectgroupNode[j]);
                //console.log(typeof(objectgroupNode[j]));

                //console.log('::', JSON.stringify(objectgroupNode[j].$));
                //console.log('::', JSON.stringify(objectgroupNode[j].object));

                console.log(objectgroupNode[j].$.name);
                switch(objectgroupNode[j].$.name)
                {
                    case "chestSpawn":
                        if (objectgroupNode[j].object.length === undefined)
                            _this.chestSpawnPoints.push(objectgroupNode[j].object);
                        else
                        {
                            for (var k = 0; k < objectgroupNode[j].object.length; k++)
                            {
                                //console.log('->',objectgroupNode[j].object[k].$);
                                _this.chestSpawnPoints.push(objectgroupNode[j].object[k].$);
                            }
                        }
                    break;

                    case "flagObjects":
                        //console.log('flagobjs', objectgroupNode[j].object.length);
                        //var game_flag_server = require('./class.flag');
                        var flag;
                        if (objectgroupNode[j].object.length === undefined)
                        {
                            flag = new game_flag(objectgroupNode[j].object.$, null, this.getplayers, this.config);
                            //flag.setter(objectgroupNode[j].object.$);
                            //flag.id = "flg1";
                            //console.log('-flag', flag);
                            this.config.flagObjects.push(flag);
                        }
                        else
                        {
                            for (var l = 0; l < objectgroupNode[j].object.length; l++)
                            {
                                //console.log('->',objectgroupNode[j].object[l].$);
                                //this.config.flagObjects.push(objectgroupNode[j].object[l].$);

                                flag = new game_flag(objectgroupNode[j].object[l].$, null, _this.getplayers, _this.config);
                                //flag.setter(objectgroupNode[j].object[l].$);
                                flag.id = "flg" + l.toString();
                                //console.log('flag', flag);
                                _this.config.flagObjects.push(flag);
                            }
                        }
                    break;
                }
            }
            //console.log('chests:', _this.chestSpawnPoints);
            //console.log('flagObjects:', this.config.flagObjects);
        });
    });
};
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
game_core.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t), d:tv.d }; };

// Grid helpers
game_core.prototype.gridToPixel = function(x, y)
{
    return {x: x * 64, y: y * 64};
};
// UID
game_core.prototype.getUID = function()
{
  function s4()
  {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

/*
    The player class

        A simple class to maintain state of a player on screen,
        as well as to draw that state when required.
*/
// game_core.prototype.newPlayer = function(client)
// {
//   console.log('##-@@ proto-newplayer', client.userid);

//   //var p = new game_player(this, this.instance.player_client, false);
//   var p = new game_player(client, false);
//   p.id = client.userid;

//   return p;
// };
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
        this.core_client.client_update();
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
/*
game_core.prototype.playerKill = function(victim, victor)
{
    console.log('playerKill', victim.dead);
    if (victim.dead === true) return;
    else victim.dead = true;
    this.flashBang = 2;

    var waspos = victim.pos;
    victim.pos = {x:Math.floor((Math.random() * victim.game.world.width - 64) + 64), y:-1000};
    victim.landed = 0;

    var size, c, ox, oy, id, neworb;
    var colors = ['white'];
    for (var x = 0; x < 50; x++)
    {
        size = Math.floor(Math.random() * 8) + 3;
        c = colors[Math.floor(Math.random() * colors.length)];
        // TODO: Avoid barriers
        ox = waspos.x + Math.floor(Math.random() * 100) + 1;
        ox *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
        oy = waspos.y + Math.floor(Math.random() * 20) + 1;
        oy *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
        id = Math.floor(Math.random() * 5000) + 1;

        neworb = {id:id, x:ox, y:oy, c:c, w:size, h:size, r:false};
        this.orbs.push( neworb );
    }
    console.log('total orbs', this.orbs.length);//, this.orbs);

    // show splatter locally
    if (!this.server)
        this.prerenderer();

};
*/

game_core.prototype.pk = function(victor, victim)
{
    console.log('== pk', victor.id, victim.id, '==');

    // first, check if player has bubble...
    
    victim.active = false;

    // victor.instance.room(this.gameid).send("onplayerkill", victim.mp + '|' + victor.mp);
    //victor.instance.room(this.gameid).write({type:"pk", action: victim.mp + '|' + victor.mp});

    // victor.instance.room(victor.instance.game.id).write([5, victim.id, victor.id]);
    victor.instance.room(victor.playerPort).write([5, victim.id, victor.id]);

    // _.forEach(this.getplayers.allplayers, function(p, i)
    // {
    //     if (p.instance)// && p.mp != "hp")
    //     {
    //         console.log('sending...', p.mp);
            
    //         p.instance.send('p.k.' + victim.mp + '|' + victor.mp);
    //     }
    // });
    victim.doKill(victor);
}
game_core.prototype.check_collision = function( player )
{
    //console.log('##+@@check_collision', player.mp);
    if (player.mp == 'hp')// || player.active === false)
    {
        //console.log('standing', player.mp);
        return;
    }
    //console.log('*',player.mp);
    

    var _this = this;
    // if (this.server)
    // console.log('* id', this.instance.id, 'len', this.getplayers.allplayers.length);
    
    //console.log('g', this.players.self.getGrid());

    //Left wall. TODO:stop accel
    /*if(player.pos.x < player.pos_limits.x_min)
    {
        player.pos.x = player.pos_limits.x_min;
        player.vx = 0;
        player.landed = 1;
    }

    //Right wall TODO: stop accel
    if(player.pos.x > player.pos_limits.x_max ) {
        player.pos.x = player.pos_limits.x_max;
        player.vx = 0;
        player.landed = 1;
    }

    //Roof wall. TODO: stop accel
    if(player.pos.y < player.pos_limits.y_min) {
        player.pos.y = player.pos_limits.y_min;
    }

    //Floor wall TODO: stop gravity ( + 15 accounts for birds legs )
    //if(player.pos.y + 15 >= player.pos_limits.y_max )
    if(player.pos.y > player.pos_limits.y_max )
    {
        console.log('hit bottom');
        //player.pos.y = player.pos_limits.y_max - 15;
        player.pos.y = player.pos_limits.y_max;// - 15;
        // decelerate
        if (player.vx > 0)
        {
            //console.log('-->slowing', player.vx);

            // slow horizontal velocity
            player.vx -= 10;
            // set landing flag (moving)
            player.landed = 2;

            if (player.vx < 0) player.vx = 0;
        }
        else if (player.vx < 0)
        {
            player.vx += 10;
            player.landed = 2;

            if (player.vx > 0) player.vx = 0;
        }
        else
        {
            // stuck landing (no velocity)
            player.vx = 0;
            // set landing flag (stationary)
            player.landed = 1;
        }
        //console.log(player.landed);
    }
    else player.landed = 0;
    */
    //Fixed point helps be more deterministic
    //player.pos.x = player.pos.x.fixed(4);
    //player.pos.y = player.pos.y.fixed(4);

        // player collision (server managed)
        //for (var i = 0; i < this.getplayers.allplayers.length; i++)
    if (this.config.server)
    {
        var other;
        // _.forEach(_this.getplayers.allplayers, function(other)
        var room = this.getplayers.fromRoom(player.playerPort);
        for (var i = room.length - 1; i >= 0; i--)
        {
            other = room[i];//this.getplayers.allplayers[i];
            //console.log('->', other.team, player.team);
            //other.pos.x = other.pos.x.fixed(4);
            //other.pos.y = other.pos.y.fixed(4);
            //if (!other.active) return false;

            if (other.mp != player.mp && other.team != player.team && other.active)
            {
                //console.log( (player.pos.x + (player.size.hx / 2)), (other.pos.x + (other.size.hx / 2)) );
                if ( 
                    player.pos.x + (player.size.hx/4) < other.pos.x + (other.size.hx - other.size.hx/4) 
                    && player.pos.x + (player.size.hx - player.size.hx/4) > other.pos.x + (other.size.hx/4) 
                    && player.pos.y + (player.size.hy/4) < other.pos.y + (other.size.hy - other.size.hy/4) 
                    && player.pos.y + (player.size.hy - player.size.hy/4) > other.pos.y + (other.size.hy/4)
                )
                {
                    console.log('HIT!', player.mp, player.team, other.mp, other.team);
                    
                    // TODO: if vulnerable (stunned) then vuln user is victim

                    // set both players as 'engaged'
                    /*if (!this.server)
                    {
                        if (player.isLocal)
                            player.isEngaged(10000);
                        else if (other.isLocal)
                            other.isEngaged(10000);
                    }*/

                    // otherwise, positioning counts
                    var dif = player.pos.y - other.pos.y;
                    //console.log("HIT", dif);// player.mp, player.pos.y, other.mp, other.pos.y);
                    if ((dif >= -15 && dif <= 15 && player.vuln === false && other.vuln === false) || player.vuln === true && other.vuln === true)//player.pos.y === other.pos.y)
                    {
                        _this.flashBang = 1;
                        console.log("TIE!", player.mp, player.pos, other.mp, other.pos);
                        //player.vx *= -1;
                        /*if (player.pos.x < other.pos.x)
                        {
                            //player.pos.x -= 50;
                            player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                            player.collision = true;

                            //other.pos.x += 50;
                            other.hitFrom = 0;
                            //other.vx = player.vx / 2;
                            other.collision = true;
                            console.log("BUMP", player.pos, other.pos);
                            // player.pos = _this.physics_movement_vector_from_direction(-50, 0);
                            // other.pos = _this.physics_movement_vector_from_direction(50,0);
                            // player.a *= -1;
                            // player.vx *= -1;
                            // if (player.landed !== 0)
                            //     player.landed = 2;
                            // if (other.landed !== 0)
                            //     other.landed = 2;
                        }
                        else
                        {*/
                            var bump = 100;
                            //(player.pos.x > other.pos.x) ? player.pos.x += bump : player.pos.x -= bump;
                            player.hitFrom = 3; // 0 = side, 1 = below, 2 = above;
                            player.collision = true;
                            player.target = other;
                            //player.update();

                            //(other.pos.x > player.pos.x) ? other.pos.x += bump : other.pos.x -= bump;
                            other.hitFrom = 3; // 0 = side, 1 = below, 2 = above;
                            other.collision = true;
                            other.target = player;
                            //other.update();

                            // if (player.landed !== 0)
                            //     player.landed = 2;
                            // if (other.landed !== 0)
                            //     other.landed = 2;
                        //}

                        // manage velocit and stop state
                        // if player and enemy are facing same direction
                        /*if (player.vx > 0 && player.dir !== other.dir)
                        {
                            //console.log('slowing', player.vx);

                            // slow horizontal velocity
                            //player.vx = 0;//-= 1;
                            //player.vx *= -1;
                            // set landing flag (moving)
                            //if (player.landed !== 0)
                                //player.landed = 2; // TODO: only if on platform
                        }
                        else if (player.vx < 0 && player.dir !== other.dir)
                        {
                            //player.vx = 0;
                            //player.vx *= -1;
                            if (player.landed !== 0)
                                player.landed = 2;
                        }
                        else
                        {
                            // stuck landing (no velocity)
                            player.vx = 0;
                            // set landing flag (stationary)
                            if (player.landed !== 0)
                                player.landed = 1; // TODO: only if on platform
                        }*/
                    }
                    else // we have a victim
                    {
                        console.log('determining VICTIM...');//, player.mp);
                        
                        //this.flashBang = 2;
                        //var splatteree, waspos;
                        if (player.pos.y < other.pos.y || other.vuln === true)
                        {
                            //this.playerKill(other, player);
                            //console.log('player', player.mp, 'killed', other.mp);
                            if (!other.dead)
                            {
                                //other.doKill(player);
                                //if (player.vuln === false)
                                    _this.pk(player, other);
                                // else
                                // {

                                // }
                                //console.log(other.mp, 'WINS!', player.mp);
                            }
                            // waspos = other.pos;
                            // other.pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};
                            // //other.visible = false;
                            // splatteree = other;
                            //other.old_state = other.pos;
                        }
                        else
                        {
                            //this.playerKill(player, other);
                            //console.log('other', other.mp, 'killed player', player.mp);
                            if (!player.dead)
                            {
                                //player.doKill(other);
                                // if (other.vuln === false)
                                    _this.pk(other, player);
                                // else
                                // {

                                // }
                                //console.log(player.mp, 'WINS!', other.mp);
                            }
                            // waspos = player.pos;
                            // player.pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};
                            // //player.visible = false;
                            // splatteree = player;
                            //player.old_state = player.pos;
                        }

                        // splatter
                        //if (this.server){
                        //var UUID = require('node-uuid');
                        // console.log('splatter!');

                        // get diffs
                        // var spreadX = 100;
                        // var spreadY = 100;
                        // if (this.config.world.height - waspos.y > spreadX)
                        //     spreadX = 100 -
                        // var size, c, ox, oy, id, neworb;
                        // var colors = ['white'];
                        // for (var x = 0; x < 50; x++)
                        // {
                        //     size = Math.floor(Math.random() * 8) + 3;
                        //     c = colors[Math.floor(Math.random() * colors.length)];
                        //     // TODO: Avoid barriers
                        //     ox = waspos.x + Math.floor(Math.random() * 100) + 1;
                        //     ox *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
                        //     oy = waspos.y + Math.floor(Math.random() * 20) + 1;
                        //     oy *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
                        //     id = Math.floor(Math.random() * 5000) + 1;
                        //
                        //     neworb = {id:id, x:ox, y:oy, c:c, w:size, h:size, r:false};
                        //     this.orbs.push( neworb );
                        // }
                        // console.log('total orbs', this.orbs.length);//, this.orbs);
                        //
                        // // show splatter locally
                        // if (!this.server)
                        //     this.prerenderer();
                    }

                    break;//return false;//break;
                }
                //if (player.pos.x >= other.pos.x + other.width && player.y == other.pos.y)
                    //console.log('HIT', player.mp, other.mp);
            }
            //if (this.players.self.pos === other.pos.x) console.log('!!!!!!!!!!!!!!!!!!!');

        }
    }

    // base gate collisions
    // platform collisions
    /*
    //for (var j = 0; j < this.platforms.length; j++)
    _.forEach(this.platforms, function(platform)
    {
        //console.log('collision().platform:state', platform.state);
        // Note: hy + 10 below accounts for birds unseen legs.
        if (
            player.pos.x < (platform.x + platform.w) &&
            (player.pos.x + player.size.hx) > platform.x &&
            player.pos.y < (platform.y + platform.h) &&
            (player.pos.y + player.size.hy) > platform.y
        )
        {
            //console.log('hit platform!');
            if (player.pos.y > (platform.y))// + platform.h))//this.config.world.height - 200)
            {
                // bounce off
                player.pos.y = platform.y + platform.h + 5;

                if (platform.state === platform.STATE_INTACT) // platform intact, not moving
                {
                    console.log('from bottom', player.hasHelment);
                    // if player has helment and platform status is intact
                    if (player.hasHelment)// && platform.state === platform.STATE_INTACT)
                    {
                        console.log('platform will FALL!', player.mp, platform.id);
                        platform.doShake(platform.STATE_FALLING, player.mp);
                    }
                }
                else if (platform.state === platform.STATE_FALLING) // platform falling
                {
                    console.log('platform HIT player!', player.mp, player.landed);
                    //player.pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};

                    // if standing or walking, victim
                    // if (player.landed > 0 )
                    // {
                        //console.log('splatter!');
                        //player.pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};
                    // }

                    // TODO: push player down
                    // player.pos.y += 5;

                    // TODO: if player landed = 1, dead!
                    //this.flashbang = 2;
                }
                else
                {
                    player.pos.y += 5;
                }
            } // end player hit from below
            else //if (player.pos.y + player.size.hx > this.platforms.y) // from top (TODO: add friction)
            {
                player.pos.y = platform.y - player.size.hy;// - 10;// -= 1;// this.config.world.height-200;
                //console.log('--->',player.pos.y);
                // decelerate
                if (player.vx > 0)
                {
                    //console.log('slowing', player.vx);

                    // slow horizontal velocity
                    player.vx -= 200;

                    // set landing flag (moving)
                    player.landed = 2;

                    if (player.vx < 0)
                    {
                        player.vx = 0;
                        player.landed = 1;
                    }
                }
                else if (player.vx < 0)
                {
                    player.vx += 200;
                    player.landed = 2;

                    if (player.vx > 0) player.vx = 0;
                }
                if (player.vx === 0)
                {
                    // stuck landing (no velocity)
                    player.vx = 0;
                    // set landing flag (stationary)
                    player.landed = 1;
                }

                // set platform id on which player is standing
                player.doStand(platform.id);

            } // end player hit from above

            return false;//break;
        } // end collision

        //else if (player.landed > 0) player.landed = 0; // if player slides off platform, fly!
    });
    //*/
    //if (player.mp == "cp2")
    //console.log(player.mp, this.orbs.length);

    // orbs
    for (var k = 0; k < this.orbs.length; k++)
    {
        //console.log(player.mp);
        /*if (this.orbs[k].r===true)// == undefined)
        {
            console.log('skip undefined');
            continue;
        }*/
        //console.log('platform', this.platforms[j]);
        if (
            player.pos.x < (this.orbs[k].x + this.orbs[k].w) &&
            (player.pos.x + player.size.hx) > this.orbs[k].x &&
            player.pos.y < (this.orbs[k].y + this.orbs[k].h) &&
            (player.pos.y + player.size.hy) > this.orbs[k].y
        )
        {
            //console.log('orb hit!', this.orbs[k]);//this.orbs[k].id, this.server);
            var rid = this.orbs[k].id;
            //console.log('by player', player.mp, this.server);//this.players.self.mp);

            //if (player.mp == this.players.self.mp)
                //player.updateMana(this.orbs[k].w);

            //console.log('ids', player.id, this.players.self.id);

            // add orb to player mana store
            //console.log('::player', player);
            player.updateMana(this.orbs[k].w);

            // remove it (from server only)
            //if (this.server)
            this.orbs.splice(k, 1);

            //console.log('=>',this.server,player.mp,this.mp,this.players.self.mp);
            for (var l = 0; l < this.getplayers.allplayers.length; l++)
            {
                if (this.getplayers.allplayers[l].instance && this.getplayers.allplayers[l].mp != player.mp)
                {
                    //console.log('remote orb removal index', rid);//, this.players.self.mp);
                    this.getplayers.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
                }
            }

            // remove orb from view
            /*if (!this.server) this.prerenderer();*/

            // get out
            break;
        }
    }

    //console.log('chests', this.chests.length, player.mp);
    // _.forEach(this.chests, function(chest)
    if (this.config.server)
    {
        var chest;
        for (var j = this.chests.length - 1; j >= 0; j--)
        {
            chest = this.chests[j];
            //console.log('collision().chests', chest);
            // Note: hy + 10 below accounts for birds unseen legs.
            if (
                chest && chest.taken===false && player.pos.x < (chest.x + chest.width) &&
                (player.pos.x + player.size.hx) > chest.x &&
                player.pos.y < (chest.y + chest.height) &&
                (player.pos.y + player.size.hy) > chest.y
            )
            {
                console.log('chest hit');
                chest.doTake(player);//, _this.chests);
                //_.pull(_this.chests, chest);
            }
        }
    }

    // flagObjects (flags and slots)
    if (this.config.server)
    {
        // _.forEach(this.config.flagObjects, function(fo)
        var fo;
        for (var k = this.config.flagObjects.length - 1; k >= 0; k--)
        {
            fo = this.config.flagObjects[k];
            if (
                //fo.isHeld === false && fo.isActive && player.hasFlag === 0 &&
                player.pos.x < (fo.x + (fo.width/2)) &&
                (player.pos.x + (player.size.hx/2)) > fo.x &&
                player.pos.y < (fo.y + (fo.height/2)) &&
                (player.pos.y + (player.size.hy/2)) > fo.y
            )
            {
                //console.log('hit flag obj', fo.name, fo.isHeld, fo.isActive, player.hasFlag);

                // player takes flag?
                //console.log('fo.doTake', fo.type, fo.name, fo.isHeld, fo.isActive, player.hasFlag);
                if (fo.type == "flag" && fo.isHeld === false && fo.isActive && player.hasFlag === 0)
                {
                    fo.doTake(player);
                }
                // player with flag slots it?
                else if (player.hasFlag > 0)
                {
                    fo.slotFlag(player);
                }
            }
        }
    }

    // tilemap
    var b = 10; // bounce
    var gatepush = 128;
    var h = player.hitGrid();
    //console.log(c);
    // console.log('::', h);
    if (h !== undefined)
    {
        //if (player.landed === 1) return;
        // console.log('tiles', h.nw.t, h.sw.t, h.ne.t, h.se.t, h.n.t, h.s.t, h.e.t, h.w.t);
        

        //////////////////////////////
        // collide from below (full)
        //////////////////////////////
        if (h.ne.t > 0 && h.nw.t > 0) // collide from below
        {
            console.log('stop ne,nw', player.mp, h.ne.t, h.nw.t, player.team);
            // blue gate across
            if (h.ne.t === 122 && h.nw.t === 122 && player.team === 2) 
            {
                player.pos.y -= gatepush;
            }
            else
            {
                //player.pos.x -= b;
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
                /*if (player.vuln===false)
                    player.isVuln(500);*/
            }
        }
        //////////////////////////////
        // land (full)
        //////////////////////////////
        else if (h.sw.t > 0 && h.se.t > 0) // land
        {
            //console.log(h.sw.t,h.se.t);
            
            // red gate across
            if (h.sw.t === 121 && h.se.t === 121 && player.team === 1) 
            {
                player.pos.y += gatepush;
            }
            else
            {
                //console.log('stop sw', player.mp);//, h.sw.y * 64, player.pos.y + player.size.hy);
                //player.pos.x += b;
                //player.pos.y -= b;

                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                //player.hitFrom = 2;

                // process landing
                //if (this.server)
                player.doLand();
                //if (!this.server) this.client_process_net_prediction_correction2();
            }
        }
        //////////////////////////////
        // side collision (full, left)
        //////////////////////////////
        else if (h.nw.t > 0 && h.sw.t > 0) // hit side wall
        {
            //console.log('hit w wall', h.nw.t, h.sw.t, player.team);
            // blue gate down
            if (h.nw.t === 74 && h.sw.t === 74 && player.team === 2) 
            {
                player.pos.x -= gatepush;
            }
            else
            {
                player.pos.x += 15; // bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            //player.vx *= -1; // stop accel
            //console.log('vx', player.vx);
        }
        //////////////////////////////
        // side collision (full, right)
        //////////////////////////////
        else if (h.ne.t > 0 && h.se.t > 0)
        {
            // red gate down
            if (h.ne.t === 73 && h.se.t === 73 && player.team === 1) 
            {
                player.pos.x += gatepush;
            }
            else
            {
                player.pos.x -= 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
                //player.vx = 0; // stop accel
            }
        }
        //////////////////////////////
        // side collision (full, right)
        //////////////////////////////
        else if (h.ne.t > 0 && h.se.t > 0)
        {
            player.pos.x -= 15; //bounce
            player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
            player.collision = true;
            //player.vx = 0; // stop accel
        }
        //////////////////////////////
        // slid off platform
        //////////////////////////////
        else if (player.standing === 2)
        {
            console.log('player slid off barrier...');
        }
        //////////////////////////////
        // edge cases
        //////////////////////////////
        else if (h.ne.t > 0 || h.se.t > 0) // hit from left
        {
            //console.log('* edge left', h.n.t, h.s.t, h.e.t);
            if (h.e.t > 0) // east (side collision)
            {
                player.pos.x -= 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else if (h.n.t > 0) // north (from below)
            {
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else // south (landing), determine direction
            {
                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                // process landing
                //if (this.server)
                player.doLand();
            }
            //console.log(player.n, player.s, player.e, player.w);
        }
        else if (h.nw.t > 0 || h.sw.t > 0) // hit from left
        {
            //console.log('* edge right', h.n.t, h.s.t, h.w.t);
            if (h.w.t > 0) // east (side collision)
            {
                player.pos.x += 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else if (h.n.t > 0) // north (from below)
            {
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else // south (landing), determine direction
            {
                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                // process landing
                //if (this.server)
                player.doLand();
            }
            //console.log(player.n, player.s, player.e, player.w);
        }
    }
}; //game_core.check_collision

game_core.prototype.process_input = function( player )
{
    // console.log('##+@@process_input', player.mp);
    //if (!this.config.server) console.log('client input', player.mp);
    
    //It's possible to have recieved multiple inputs by now,
    //so we process each one
    //console.log('player', player);
    var _this = this;
    var x_dir = 0;
    var y_dir = 0;
    //var delay = false;
    var ic = player.inputs.length;
    //console.log('ic:', ic);
    if(ic)
    {
        for(var j = (ic - 1); j >= 0; --j)
        {
            //don't process ones we already have simulated locally
            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = c - 1; i >= 0; --i)
            {
                var key = input[i];
                // console.log('key', key, ic);

                /////////////////////////
                // move left
                /////////////////////////
                if(key == 'l')
                {
                    player.dir = 1;

                    if (player.landed === 1)
                        player.doWalk(player.dir);
                    else player.setAngle(1);
                    //player.pos.d = 1;
                }

                /////////////////////////
                // move right
                /////////////////////////
                else if(key == 'r')
                {
                    //x_dir += 1;
                    player.dir = 0;

                    if (player.landed === 1)
                        player.doWalk(player.dir);
                    else player.setAngle(0);
                    //player.pos.d = 0;
                }
                else if(key == 'd')
                {
                    // delay kepresses by 200 ms
                    if (this.inputDelay === false)
                    {
                        /*this.inputDelay = true;
                        player.doCycleAbility();
                        setTimeout(this.timeoutInputDelay, 200);*/
                    }
                }
                //else player.cycle = false;
                else if (key == "sp")
                {
                    //console.log('ABILITY');
                    if (player.cooldown === false)
                        player.doAbility();
                }
                // else
                // {
                // }
                if(key == 'u') { // flap
                    //TODO: up should take player direction into account
                    // console.log('flap!', player.mp, player.pos);

                    player.doFlap();
                    //document.externalControlAction('x');
                    // // set flag
                    // player.flap = true;
                    //
                    // // clear landed flag
                    // player.landed = 0;
                    //
                    // // increase y velocity
                    // player.vy = -1;
                    //
                    // set y_dir for vector movement
                    y_dir = player.vy;//0.5;//1;
                    x_dir = player.vx;

                    // apply horizontal velocity based on direction facing
                    if (player.dir === 0) // right
                    {
                        // set x_dir for vector movement
                        //x_dir += 0;

                        /*if (player.vx < 0 )
                            player.vx = 0;
                        else
                            player.vx +=336;*/
                    }
                    if (player.dir === 1) // left
                    {
                        // set x_dir for vector movement
                        //x_dir -= 0;

                        /*if (player.vx > 0)
                            player.vx = 0;
                        else
                            player.vx -=336;*/
                    }
                }
                // else player.flap = false;
                //if (key !== 'u') player.flap = false;
                if(key == 'x') 
                {
                    // console.log('x: flap=false');
                    
                    player.flap = false;
                }
                //     y_dir -= 10;
                // }
            } //for all input values

        } //for each input commandd
    } //if we have inputs
    else // we have NO INPUT
    {
        //console.log('* no input...');
        
        //player.inputs.push({seq:"0",time:this.config.server_time);
        //player.last_input_time = this.config.server_time;
        // if (player.landed === 1)
        //     player.doWalk(player.dir);
        // if (player.landed === 1)
        //     this.a = 0;
        // else 
        //console.log('no input...');
        //this.players.self.old_state.pos = this.pos(this.players.self.pos);
        /*
        if (this.config.server && player.active)
        {
            //console.log('* updating', player.mp);
            
            player.update();
        }
        //*/
        //this.client_update();
        
        //this.players.self.cur_state.pos = this.pos(this.players.self.pos);
        //var input = player.inputs[j].inputs;
        //var c = input.length;
        //console.log('len', player.inputs.length);
            
        //if (player.mp == "cp1")// && !this.server)
        //{
        //console.log('difX', player.active, player.mp, player.pos.x - player.lpos.x,'difY', player.active, player.mp, player.pos.y - player.lpos.y);

        //this.players.self.old_state.pos = this.pos(this.players.self.pos);
        //this.players.self.pos = this.pos(this.players.self.pos);
        //this.players.self.cur_state.pos = this.pos(this.players.self.pos);
        //console.log(player.old_state.pos, player.new_state);

        // x_dir = (player.pos.x - player.lpos.x)*this._pdt;//player.vx;
        //
        // y_dir = (player.pos.y - player.lpos.y)*this._pdt;//player.vy;

        // x_dir = ((player.a/40) * Math.cos(player.thrust + player.thrustModifier));
        // y_dir = player.vy;

        // x_dir = player.vx;

        // if (player.lpos.x)
        // x_dir = player.pos.x - player.lpos.x;//player.vx;
        // if (player.lpos.y)
        // y_dir = player.pos.y - player.lpos.y;//player.vy;

        // store last pos
        //player.lpos = player.pos;
        // if (player.mp == "cp1")
        // {
        //     console.log(':', player.lpos.x - player.pos.x, player.lpos.y - player.pos.y);
        // }
        
        //console.log(x_dir, y_dir, this._pdt);
    }
    if (!this.server)
        this.core_client.players.self.cur_state.pos = this.pos(this.core_client.players.self.pos);
    //x_dir = (player.vx > 0) ? 1 : -1;//ax;
    //y_dir = (player.vy < 0) ? -1 : 1;
    /*if (player.mp == "cp1")
    {
        //var tmp_vx = ((player.a/40) * Math.cos(player.thrust + player.thrustModifier));//.fixed(2);

        //console.log(':', x_dir, y_dir, player.vx, player.vy, tmp_vx);
    }*/
    
    //we have a direction vector now, so apply the same physics as the client
    var resulting_vector = this.physics_movement_vector_from_direction(x_dir,y_dir);
    //console.log('resulting_vector', resulting_vector);
    // if (resulting_vector.x > 0 || resulting_vector.y > 0)
    //     console.log('vector', resulting_vector);
    if(player.inputs.length) {
        //we can now clear the array since these have been processed

        player.last_input_time = player.inputs[ic-1].time;
        player.last_input_seq = player.inputs[ic-1].seq;
    }

    player.lpos = player.pos;

        //give it back
    return resulting_vector;

}; //game_core.process_input

game_core.prototype.timeoutInputDelay = function()
{
    this.inputDelay = false;
};
game_core.prototype.physics_movement_vector_from_direction = function(x,y) {
    //console.log('##+@@ physics_movement_vector_from_direction');
    //Must be fixed step, at physics sync speed.
    //console.log(':', x, y);
    return {
        x : (x * (this.playerspeed * 0.015)).fixed(3),
        y : (y * (this.playerspeed * 0.015)).fixed(3)
    };

}; //game_core.physics_movement_vector_from_direction

game_core.prototype.update_physics = function()
{
    if (glog)
    console.log('##+@@ update_physics');
    //if (!this.config.server) return;

    var _this = this;

    ////////////////////////////////////////////////////////
    // iterate players
    ////////////////////////////////////////////////////////
    // _.forEach(this.getplayers.allplayers, function(player)
    var player, room;
    if (this.server)
    {
        var allrooms = Object.keys(this.getplayers.fromAllRooms());
        for (var h = allrooms.length - 1; h >= 0; h--)
        {
            room = this.getplayers.fromRoom(allrooms[h]);
            for (var i = room.length - 1; i >= 0; i--)
            {
                player = room[i];
                if (player.active)
                    player.update();

                // degrade player angle
                if (player.a > 0)
                    player.a-=0.5;
                else if (player.a < 0)
                    player.a+=0.5;
            }
        }
    }
    else
    {
        // console.log('client_xport:', this.core_client.xport);
        
        room = this.getplayers.fromRoom(this.core_client.xport.toString());
        if (room === undefined) room = []; // <-- TODO: stub
        for (var j = room.length - 1; j >= 0; j--)
        {
            player = room[j];
            //if (_this.players.self)
            //console.log('p:', player.mp, player.active);
            
            if (player.active)
                player.update();

            // degrade player angle
            if (player.a > 0)
                player.a-=0.5;
            else if (player.a < 0)
                player.a+=0.5;
        }
    }

    ////////////////////////////////////////////////////////
    // iterate platforms
    ////////////////////////////////////////////////////////
    /*var jlen = this.platforms.length;
    for (var j = 0; j < jlen; j++)
    {
        //console.log(this.platforms[j].state);
        if (this.platforms[j].state !== this.platforms[j].STATE_INTACT && this.platforms[j].state !== this.platforms[j].STATE_REMOVED)
        {
            this.platforms[j].update();
        }
    }*/

    if(this.server) this.server_update_physics();
    else this.core_client.client_update_physics();

}; //game_core.prototype.update_physics

/*

 Server side functions

    These functions below are specific to the server side only,
    and usually start with server_* to make things clearer.

*/

//Updated at 15ms , simulates the world state
game_core.prototype.server_update_physics = function() {
    //if (glog)
    //console.log('##-@@ server_update_physics');

    // var _this = this;

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

    // player collisions
    //for (var i = 0; i < this.getplayers.allplayers.length; i++)
    var new_dir;
    // _.forEach(this.getplayers.allplayers, function(ply)
    var ply, room;
    // var room = this.getplayers.fromRoom(player.playerPort);
    // for (var i = room.length - 1; i >= 0; i--)
    var allrooms = Object.keys(this.getplayers.fromAllRooms());
    for (var h = allrooms.length - 1; h >= 0; h--)
    {
        room = this.getplayers.fromRoom(allrooms[h]);
        for (var i = room.length - 1; i >= 0; i--)
        {
            ply = room[i];
            //if (ply.mp != "hp")//_this.players.self.mp)
            //{
            ply.old_state.pos = this.pos( ply.pos );
            new_dir = this.process_input(ply);
            ply.pos = this.v_add( ply.old_state.pos, new_dir);

            //ply.update();

            //Keep the physics position in the world
            
            this.check_collision( ply );
            

            //this.players.self.inputs = []; //we have cleared the input buffer, so remove this
            ply.inputs = []; //we have cleared the input buffer, so remove this
            //}//else console.log("HIHIHIHIHIHIH", ply.mp);
        }
    }

    // platform collisions (minus player)
    /*for (var j = 0; j < this.platforms.length; j++)
    {
        //if (this.platforms[j].state !== this.platforms[j].STATE_INTACT)
        //{
            this.platforms[j].check_collision();
        //}
    }*/
    /*_.forEach(this.chests, function(chest)
    {
        chest.check_collision();
    });*/
    //console.log(this.players.self.mp);
    // phy 2.0
    // var collisions = this.collider.detectCollisions(
    //     this.player,
    //     this.collidables
    // );
    //var collisions = this.collisionDetector.collideRect(this.players.self.ent, this.entities[5].ent);

    // if (collisions != null) {
    //     this.solver.resolve(this.player, collisions);
    // }
    //console.log(collisions);
    // if (collisions != null)
    //     this.collisionSolver.resolveElastic(this.players.self.ent, this.entities[5].ent);
}; //game_core.server_update_physics

//Makes sure things run smoothly and notifies clients of changes
//on the server side
//this.bufArr = new ArrayBuffer(768);
//this.bufView = new Int16Array
game_core.prototype.server_update = function()
{
    if (glog)
    console.log('##-@@ server_update');//, this.getplayers.allplayers.length);//this.players.self.instance.userid, this.players.self.instance.hosting, this.players.self.host);

    // var _this = this;
    //Update the state of our local clock to match the timer
    this.config.server_time = this.local_time;

    //var host;
    //var others = [];

    /////////////////////////////////
    // process players
    /////////////////////////////////
    var laststate = new Object();
    //for (var i = 0; i < this.getplayers.allplayers.length; i++)
    // add a, ax, ay, vx, vy
    //console.log('::',8*this.getplayers.allplayers.length);
    
    // var bufArr = new ArrayBuffer(768);//16 * this.getplayers.allplayers.length); // 16 * numplayers
    //var bufView;
    //console.log('=====================');
    //var bufArr = new ArrayBuffer(768);
    // _.forEach(_this.getplayers.allplayers, function(player, index)
    var room, player;
    var allrooms = Object.keys(this.getplayers.fromAllRooms());
    var roomsArray = [];
    for (var h = allrooms.length - 1; h >= 0; h--)
    {
        room = this.getplayers.fromRoom(allrooms[h]);
        // create object for *each* room to hold players
        laststate[allrooms[h]] = {};
        for (var i = room.length - 1; i >= 0; i--)
        {
            player = room[i];
            // console.log('================\n' + player.playerName);//player.playerName);
            var bufView = [];
            if (!player.instance) continue;//return;
            //inst = player.instance;
            //console.log(_this.getplayers.allplayers.length);
            // set player's bufferIndex
            //player.bufferIndex = index;
            //var bufArr = new ArrayBuffer(768);//16 * this.getplayers.allplayers.length); // 16 * numplayers
            //var bufArr = new ArrayBuffer(16 * _this.getplayers.allplayers.length);
            //var bufView = new Int16Array(bufArr, (index * 16), 16);
            //console.log(_this.serverPool);
            
            //_this.serverPool[index].prototype.byteLength = 768;

            /*var buffer = pool.malloc(768, "arraybuffer");
            var bufView = new Int16Array(buffer, (i * 16), 16);*/
            
            //var bufView = _this.serverPool;//(_this.bufArr, (index * 16), 16);
            // bufView.buffer = _this.bufArr;
            // bufView.byteOffset = index * 16;
            // bufView.length = 16;
            //*
            if (player.pos.x === 0 && player.pos.y === 0) continue;//return;
            // bufView = player.bufferWrite(bufView, i);

            bufView.length = 0;
            //*
            bufView[0] = player.pos.x.fixed(0);
            bufView[1] = player.pos.y.fixed(0);//.fixed(2);
            bufView[2] = player.dir;
            bufView[3] = (player.flap) ? 1 : 0;
            bufView[4] = player.landed;
            bufView[5] = (player.vuln) ? 1 : 0;
            bufView[6] = player.a;//.fixed(2);
            bufView[7] = player.vx;//.fixed(2);//.fixed(2);
            bufView[8] = player.vy;//.fixed(2);//.fixed(2);
            bufView[9] = player.hasFlag; // 0=none, 1=midflag, 2=redflag, 3=blueflag
            bufView[10] = (player.bubble) ? 1 : 0;
            bufView[11] = (player.visible) ? 1 : 0;//killedPlayer;
            bufView[12] = i; // player's bufferIndex
            bufView[13] = player.score;//(player.dead) ? 1 : 0;//player.team;
            bufView[14] = (player.active) ? 1 : 0;
            bufView[15] = 16; // open item
            //*/
            //bufView[11] = new Date();
            // if (player.mp == "cp2")
            //     console.log('->', bufView, 'x:', player.pos.x.toFixed(2));
            //if (bufView[11] > 0) console.log('IAMDEADIAMDEADIAMDEAD!!!!');
            // console.log('bufView', player.mp, bufView);
            
            // laststate[player.instance.userid] = bufView;//_this.serverPool;//bufArr;
            laststate[allrooms[h]][player.instance.userid] = bufView;
            
            // console.log('buffer', laststate);
            
            //pool.free(buffer);
            // if (player.mp == "cp1")
            // console.log(player.playerName, player.instance.userid, _this.instance.id, bufView);
            
            //*/
            /*
            _this.laststate[player.mp] = 
            {
                x:player.pos.x,
                y:player.pos.y,
                //pos:player.pos,
                d:player.dir,
                f:player.flap,
                l:player.landed,
                v:player.vuln,
                a:player.a,//player.abil,
                vx:player.vx,
                vy:player.vy,
                g:player.hasFlag,
                b:player.bubble
            };//*/
            // console.log('*', player.last_input_seq);
            /* {cis1: '3991'} */
            laststate[allrooms[h]][player.mis] = player.last_input_seq;

            // reset flap on server instance
            if (player.flap === true) player.flap = false;
            // rest abil on server instance
            if (player.abil > 0) player.abil = 0;
            // reset killedBy
            //if (player.killedBy > 0) player.killedBy = 0;
            ///console.log(':::', player.pos);
        }
    }

    if (!player) return;
    // pool.free(this.serverPool);

    /////////////////////////////////
    // process platforms
    /////////////////////////////////
    //this.lastPlatformState = {};
    //for (var k = 0; k < this.platforms.length; k++)
    /*_.forEach(this.platforms, function(plat)
    {
        //if (plat.state !== plat.STATE_INTACT) // 1 is fixed/dormant
        //{
            // send: id, state, status, x, y, r(rotation?)
            //if (plat.id == undefined) console.log("HIHIHIHIHIIHIHHIIHI", plat);
            _this.laststate[plat.id] =
            {
                x: plat.x,
                y: plat.y,
                r: plat.r,
                s: plat.state,
                t: plat.type,
                p: plat.triggerer
            };
        //}
    });*/

    // process events
    //for (var l = 0; l < this.events.length; l++)

    var evt;
    // _.forEach(this.events, function(evt)
    for (var j = this.events.length - 1; j >= 0; j--)
    {
        evt = this.events[j];
        if (evt.state !== evt.STATE_STOPPED)
        {
            if (evt.update() === true)
            {
                //console.log('add event to socket!', evt.type);
                switch(evt.type)
                {
                    case evt.TYPE_CHEST:
                        var id = getUid();//_this.getUID();
                        console.log('adding chest', id);//, evt.spawn, 'with passive', evt.passive);
                        /*{ i: '3148931d-c911-814d-9f2d-03b53537d658',
                            x: '1152',
                            y: '576',
                            t: 1,
                            d: 60,
                            m: 50 }*/
                        if (evt.id == 'ec') // chest event
                            this.addChest(
                                {
                                    i:id,
                                    x:evt.spawn.x,
                                    y:evt.spawn.y,
                                    t:evt.passive.type,
                                    d:evt.passive.duration,
                                    m:evt.passive.modifier
                                });
                        laststate[evt.id] =
                        {
                            i: id,
                            x: evt.spawn.x,
                            y: evt.spawn.y,
                            t: evt.passive.type,
                            d: evt.passive.duration,
                            m: evt.passive.modifier
                        };
                    break;

                    case evt.TYPE_FLAG_CARRIED_COOLDOWN:

                        console.log('evt active carried cooldown...', evt.id, evt.timer, evt.flag.name, evt.flag.heldBy);
                        // fc: { t: 6, f: 'midFlag', p: 'cp1' } }
                        laststate[evt.id] =
                        {
                            t: evt.timer,
                            f: evt.flag.name,
                            p: evt.flag.heldBy
                        };
                    break;

                    case evt.TYPE_FLAG_SLOTTED_COOLDOWN:

                        console.log('evt active slotted cooldown', evt.id, evt.timer);
                        // fc: { t: 6, f: 'midFlag' } }
                        laststate[evt.id] =
                        {
                            t: evt.timer,
                            f: evt.flag.name
                        };
                        break;
                }
            }
        }
    }
    // process flags
    /*
    _.forEach(this.config.flagObjects, function(flag)
    {
        //if (flag.isHeld)
        if (flag.type=="flag")
        {
            //console.log('flags', flag);
            _this.laststate[flag.id] =
            {
                //x: flag.x,
                //y: flag.y,
                //t: flag.type,
                //h: flag.isHeld,
                //p: flag.isPlanted,
                b: flag.carrier, // mp
                s: flag.slot, // num (int)
                //v: flag.visible,
                a: flag.active, // bool
                c: flag.cooldown // int (if active is false)
                //c: JSON.stringify(flag.carryingFlag)
            };
        }
        //else console.log(flag);
    });
    //*/
    // console.log('laststate', laststate, this.gameid);
    //if (Object.keys(laststate).length === 0) return;
    
    // console.log(laststate);
    // var view = new Int16Array(this.laststate.cp1, 0, 16);
    // console.log('view', view);
    //console.log('bufview', bufView);
    
    
    //console.log('len', this.getplayers.allplayers.length);
    //for (var j = 0; j < this.getplayers.allplayers.length; j++)
    // console.log('ls', laststate);
    // var ply;
    // _.forEach(this.getplayers.allplayers, function(ply)
    //console.log(player);
    if (player.instance)
    {
        for (var x in laststate)
        {
            // console.log(x, laststate[x]);
            laststate[x].t = this.config.server_time;        
            player.instance.room(x).write(laststate[x]);
        }
    }
        // player.instance.room(this.gameid).write(laststate);
    // else console.log('no io');
    
    // if (inst)
    // {
    //     console.log('emit');
        
    // inst.emit('onserverupdate', laststate);
    // }
    /*
    for (var k = 0; k < this.getplayers.allplayers.length; k++)
    {
        ply = this.getplayers.allplayers[k];
        if (ply.instance)// && this.getplayers.allplayers[j].instance != "host")
        {
            //console.log('inst', laststate['cp1']);//.userid);
            ply.instance.emit('onserverupdate', laststate);
            
            // clear socket's send buffer
            if (ply.instance.sendBuffer)
                ply.instance.sendBuffer.length = 0;
        }
    }
    //*/

    // clear laststate
    //console.log('pre', laststate);
    // pool.free(this.serverPool);
    for (var k in laststate) 
    {
        delete laststate[k];
    }
    //console.log('post', laststate);
    laststate = null;
    
    /*for (var l in bufArr)
    {
        delete bufArr[l];
    }*/
    //console.log(typeof(bufView));
    /*
    bufView.forEach (function(item, i, arr)
    {
        console.log('#',item, i, arr);
        for (var m in arr)//.length = 0;
            console.log(typeof arr[m], arr[m]);
    });
    //*/
    //delete bufView[m];
    //bufArr.length = 0;
    //bufView = null;//.length = 0;
    //console.log('laststate', laststate, bufArr, bufView);

    //Make a snapshot of the current state, for updating the clients
    // this.laststate = {
    //     hp  : this.players.self.pos,                //'host position', the game creators position
    //     cp  : this.players.other.pos,               //'client position', the person that joined, their position
    //     his : this.players.self.last_input_seq,     //'host input sequence', the last input we processed for the host
    //     cis : this.players.other.last_input_seq,    //'client input sequence', the last input we processed for the client
    //     t   : this.config.server_time                      // our current local time on the server
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
    if (this.server)
    {
        var player, room;
        room = this.getplayers.fromRoom(client.playerPort);

        for (var h = room.length - 1; h >= 0; h--)
        {
            player = room[h];
            
            if (player.instance && player.instance.userid == client.userid)
            {
                //Store the input on the player instance for processing in the physics loop
                player.inputs.push({inputs:input, time:input_time, seq:input_seq});
                break;
            }
        }
    }
    if (!this.server && client.userid == this.players.self.instance.userid)
    {
        player_client = this.players.self;//.instance.userid);
        // console.log('self', this.players.self.instance);
    }
}; //game_core.handle_server_input


/*

 Client side functions

    These functions below are specific to the client side only,
    and usually start with client_* to make things clearer.

*/
/*
if (!this.server)
{
document.externalControlAction = function(data)
{
    var game = document.getElementById('viewport').ownerDocument.defaultView.game_core;
    console.log('* keyboard', game.config.keyboard);
    
    //console.log('ext', document.getElementById('viewport').ownerDocument.defaultView);
    
    //if (!this.keyboard)
    //this.keyboard = new THREEx.KeyboardState();
    switch(data)
    {
        case "A": // left down
            this.config.keyboard._onKeyChange({keyCode:37}, true);
        break;

        case "B": // left up
            this.config.keyboard._onKeyChange({keyCode:37}, false);
        break;

        case "D": // right down
            this.config.keyboard._onKeyChange({keyCode:39}, true);
        break;

        case "E": // right up
            this.config.keyboard._onKeyChange({keyCode:39}, false);
        break;

        case "u": // flap down
            this.config.keyboard._onKeyChange({keyCode:38}, true);
        break;

        case "x": // flap up
            game.config.keyboard._onKeyChange({keyCode:38}, false);
        break;
    }
};
}
//*/
//document.externalControlAction("u");
//console.log('docExtCtrl', document.externalControlAction, document.getElementById('viewport').ownerDocument.defaultView.game);

/*game_core.prototype.getTimePoint = function()
{
    if (!this.server_updates) return 0;
    //Find the position in the timeline of updates we stored.
    var current_time = this.client_time;
    var count = this.server_updates.length-1;
    var target = null;
    var previous = null;

    var time_point = 0;


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
     //console.log(target);
      //if (target.cp2.f == 1)
      //console.log(target.cp2);
     if(target && previous)
     {

        this.target_time = target.t;

        var difference = this.target_time - current_time;
        var max_difference = (target.t - previous.t).fixed(3);
        time_point = (difference/max_difference).fixed(3);

        //Because we use the same target and previous in extreme cases
        //It is possible to get incorrect values due to division by 0 difference
        //and such. This is a safe guard and should probably not be here. lol.
        if( isNaN(time_point) ) time_point = 0;
        if(time_point == -Infinity) time_point = 0;
        if(time_point == Infinity) time_point = 0;
    }

    return time_point;
};*/
game_core.prototype.wipe = function(obj)
{
    for (var p in obj)
    {
        if (obj.hasOwnProperty(p))
            delete obj[p];
    }
};

game_core.prototype.addChest = function(chest)
{
    //console.log('adding chest...', chest);

    if (this.server)
    {
        // var game_chest_server = require('./class.chest');
        this.chests.push(new game_chest(chest, false, this.getplayers, this.config));
        //console.log('newChest id', newChest.id);

        // _.forEach(this.getplayers.allplayers, function(ply)
        // {
        //     if (ply.instance)
        //     {
        //         ply.instance.send('c.a.', newChest.id)
        //     }
        // });

    }
    else this.chests.push(new game_chest(chest, true, this.getplayers, this.config));
    //console.log(this.chests);
};
game_core.prototype.timerFnc = function()
{
    this._dt = new Date().getTime() - this._dte;
    this._dte = new Date().getTime();
    this.local_time += this._dt/1000.0;
};
game_core.prototype.create_timer = function(){
    setInterval(
    //     function(){
    //     this._dt = new Date().getTime() - this._dte;
    //     this._dte = new Date().getTime();
    //     this.local_time += this._dt/1000.0;
    // }
    this.timerFnc
    .bind(this), 4);
};

game_core.prototype.phySimFunc = function()
{
    this._pdt = (new Date().getTime() - this._pdte)/1000.0;
    this._pdte = new Date().getTime();
    // TODO: *** By default this fnc is run by both server AND client
    //if (this.server)
    this.update_physics();
}
game_core.prototype.create_physics_simulation = function() {

    setInterval(
    //     function(){
    //     this._pdt = (new Date().getTime() - this._pdte)/1000.0;
    //     this._pdte = new Date().getTime();
    //     // TODO: *** By default this fnc is run by both server AND client
    //     //if (this.server)
    //     this.update_physics();
    // }
    this.phySimFunc
    .bind(this), 15);

}; //game_core.client_create_physics_simulation

