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

var MAX_PLAYERS_PER_GAME = 40;
var MAX_GAMES_PER_SERVER = 10;

// include modules
// var WebSocket         = require('ws');
// var Primus            = require('primus');

var 
    _                   = require('./node_modules/lodash/lodash.min'),
    // moment              = require('moment'),
    // UUID                = require('node-uuid'),
    core_client         = require('./core.client'),
    core_server         = require('./core.server'),
    // getUid              = require('get-uid'),
    // assert              = require('assert'),
    // duplex              = require('duplex'),
    config              = require('./class.globals'),
    getplayers          = require('./class.getplayers'),
    egyptian_set        = require('./egyptian_set'),
    // game_player         = require('./class.player'),
    game_flag           = require('./class.flag'),
    // platformClass       = require('./class.platform'),
    //transformClass      = require('./class.transform'),
    // game_event_server   = require('./class.event'),
    game_consumable     = require('./class.consumable');
    // assets              = require('./singleton.assets'),
    // pool                = require('typedarray-pool'),
    // game_toast          = require('./class.toast');
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
function game_core(from)
{
    console.log('# game_core constructor', from);
    if (from === 1) console.log('* from server');
    else if (from === 2) console.log("* from client");
}

game_core.prototype.init = function(game_instance)//, io)
{
    console.log('== game_core.init()');//, game_instance);
    //Store the instance, if any
    this.instance = game_instance;
    // this.io = io;
    //Store a flag if we are the server
    this.server = this.instance !== undefined;
    
    this.config = new config();
    this.config.server = (this.server) ? true : false;

    // init moment.js
    // moment().format();
    // moment().locale('en');

    //if (this.server)
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
    {
        // is server controlling client?
        this.server_control = false;

        // load core code
        this.core_client = new core_client(this, this.config);
        this.config.client = this.core_client;
        // this.core_client.getplayers = new getplayers(null, this.config.world.totalplayers, core, config);
        this.chests = [];
    }
    else
    {
        this.core_server = new core_server(this, this.config);
    }
    //console.log('getplayers', this.getplayers, this.getplayers.allplayers);

    // this.bufArr = new ArrayBuffer(768);//480);
    
    // var _this = this;

    this.bg = null;
    this.fg = null;
    this.barriers = null;

    // global delay flag for change ability input
    this.inputDelay = false;

    // orbs
    this.orbs = [];

    // tilemap
    this.tilemap = null;
    this.config.tilemapData = null;

    // chests
    this.chestSpawnPoints = [];
    // chest rewards
    // this.passives = [
    //     {id: 'pass1', type:1, name: "acceleration", duration: 60, modifier: 50},
    //     {id: 'pass2', type:2, name: "bubble", duration: 45, modifier: 1}
    //     //{id: 'pass2', type:2, name: "blinker", duration: 30, modifier: 2},
    // ];

    // flags
    this.config.flagObjects = [];

    if (game_instance)
    {
        // this.getplayers
    }
    else // client
    {
        this.clientCooldowns = [
            {name:"redFlag", heldBy:null, timer:NaN, src:null, target:null},
            {name:"blueFlag", heldBy:null, timer:NaN, src:null, target:null},
            {name:"midFlag", heldBy:null, timer:NaN, src:null, target:null}
        ];
    }

    // events (includes chests [spawn] and flags [cooldowns])
    this.events = [];

    this.gameid = null;
    this.last_hscore = []; // last high score

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

    this.phyPlayer, this.phyRoom, this.phyAllRooms;
    //We create a player set, passing them
    //the game that is running them, as well
    console.log('##-@@ is server?', this.server);

    if(this.server) // only for server, not clients (browsers)
    {
        this.gameid = game_instance.id;

        this.config.server_time = 0;


        // // set round end time
        // this.roundEndTime = this.config.server_time + (10 * 60);//.floor(roundEnd.getTime() / 1000);
        // console.log('roundEndTime:', this.roundEndTime);
        


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
        // create startup events (moved to getplayers class)
        ///////////////////////////////////
        /*
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
        */
    }
    // else this.players.self =

    //The base speed at which the clients move.
    this.playerspeed = 275;//120;
    this.hitBase = 15; // 15 pixels
    this.hitDiff = 0; // y diff on pvp collision

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
    this.config.players = {};//this.players;
    this.config.events = this.events;
    this.config.clientCooldowns = this.clientCooldowns;
    this.config.chests = this.chests;
    this.config.chestSpawnPoints = this.chestSpawnPoints;
    // this.config.passives = this.passives;
    this.config._ = _;
    this.config.gridToPixel = this.gridToPixel;
    this.config.hitBase = this.hitBase;

    return this;
    //console.log('config', config);
}; //game_core.constructor

if( 'undefined' != typeof global )
{
    module.exports = global.game_core = game_core;
}

Date.prototype.addMinutes = function(minutes)
{
    return new Date(this.getTime() + minutes * 60000);
};

Date.prototype.epochToDate = function(seconds)
{
    var t = new Date(1970, 0, 1); // epoch
    return t.setSeconds(seconds);
};

Date.prototype.dateToEpoch = function(date)
{
    // return Date.UTC(date);
    return Math.floor(date.getTime() / 1000);
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

// game_core.prototype.addTouchHandlers = function()
// {
//     console.log('== addTouchHandlers ==');

//     var cv = document.getElementById('viewport');
//     var dirL = document.getElementById('dirL');
//     var dirR = document.getElementById('dirR');
//     var dirF = document.getElementById('flap');

//     //*
//     function handleClick(e)
//     {
//         e.preventDefault();

//         console.log('click', e);
//         //alert('click');

//         switch(e.srcElement.id)
//         {
//             case "dirL":
//                 //document.externalControlAction("A");
//             break;

//             case "dirR":
//             break;

//             case "flap":
//             break;
//         }
//     }
//     function handleStart(e)
//     {
//         console.log('start', e);//.srcElement.id);

//        // e.preventDefault();
//         //alert(e.srcElement.id);
//         //console.log(e.touches[0].clientX, dirL);
//         //*
//         switch(e)
//         {
//             case "dirL":
//                 document.externalControlAction("A");
//             break;

//             case "dirR":
//                 document.externalControlAction("D");
//             break;

//             case "flap":
//                 document.externalControlAction("u");
//             break;
//         }
        
//         //*/

//         //e.preventDefault();
//     }
//     function handleEnd(e)
//     {
//         console.log('end', e);//.srcElement.id);

//         //e.preventDefault();
//         switch(e)
//         {
//             case "dirL":
//                 document.externalControlAction("B");
//             break;

//             case "dirR":
//                 document.externalControlAction("E");
//             break;

//             case "flap":
//                 document.externalControlAction("x");
//             break;
//         }
//     }
//     function handleCancel(e)
//     {
//         console.log('cancel', e);

//         e.preventDefault();
//     }
//     function handleMove(e)
//     {
//         console.log('move', e.changedTouches[0]);
//         //alert('move');
//         e.preventDefault();
//     }

//     dl.on('press', function(e)
//     {
//         handleStart('dirL');
//     });
//     dl.on('pressup', function(e)
//     {
//         handleEnd('dirL');
//     });
//     dr.on('press', function(e)
//     {
//         handleStart('dirR');
//     });
//     dr.on('pressup', function(e)
//     {
//         handleEnd('dirR');
//     });
//     flap.on('press', function(e)
//     {
//         handleStart('flap');
//     });
//     flap.on('pressup', function(e)
//     {
//         handleEnd('flap');
//     });
// }

game_core.prototype.apiNodePost = function(flags)
{
    console.log('== apiNodePost ==');
    // store default flag object in getplayers for cloning into rooms
    // this.getplayers.flagsDefault = _.cloneDeep(this.config.flagObjects);
    // var flags = _.cloneDeep(this.config.flagObjects);
    // add flags to active room
    var allrooms = Object.keys(this.getplayers.fromAllRooms());
    for (var f = allrooms.length - 1; f >= 0; f--)
    {
        console.log('room', allrooms[f], 'adding flags', this.config.flagObjects.length);
        
        this.getplayers.addToRoom(flags, allrooms[f], 3);
    }
    // add flags to roomFlags[port]
    // roomFlags = _this.getplayers.fromRoom(allrooms[h], 3);
    // _.forEach(_this.getplayers.flagsDefault, function(flag)
    // {
    //     // assign home port to flag
    //     flag.port = allrooms[h];
    //     console.log('flag port:', flag.port);
        
    //     roomFlags.push(flag);
    // });
    // console.log('flagsDefault', _this.getplayers.flagsDefault);
    // clone this.chestSpawnPoints to each room's ec event
    var roomEvents, roomFlags;//, chest;
    // var allrooms = Object.keys(_this.getplayers.fromAllRooms());
    for (var h = allrooms.length - 1; h >= 0; h--)
    {
        // first, ensure room total is less than maximum chests
        // if total reached, continue to next room (return false to cancel?)
        roomEvents = this.getplayers.fromRoom(allrooms[h], 1); // <-- 1 denotes object type 'events'
        for (var j = 0; j < roomEvents.length; j++)
        {
            if (roomEvents[j].id == "ec")
            {
                roomEvents[j].chestSpawnPoints = this.config._.clone(this.chestSpawnPoints);
                // console.log('* chestSpawnPoints', roomEvents[j]);
            }
        }
        // _this.getplayers.inRoomFlags[allrooms[h]] = _this.getplayers.flagsDefaut;
        // console.log('* roomFlags', roomFlags);                
    }
};

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
            var flagsArray = [];
            // var spawnArray = [];
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
                    // chest spawn locations (global)
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

                    // flag starting positions
                    case "flagObjects":
                        //console.log('flagobjs', objectgroupNode[j].object.length);
                        //var game_flag_server = require('./class.flag');
                        var flag;
                        if (objectgroupNode[j].object.length === undefined)
                        {
                            flagsArray.push(objectgroupNode[j].object.$);
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
                                flagsArray.push(objectgroupNode[j].object[l].$);
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
            _this.apiNodePost(flagsArray);
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
    console.log('== gridToPixel', x, y, '==');
    
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
        this.core_server.server_update();
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

game_core.prototype.pk = function(victor, victim, dmg)
{
    console.log('== pk', victor.id, victim.id, dmg, '==');

    // first, check if player has bubble...
    
    // victim.active = false;

    // victor.instance.room(this.gameid).send("onplayerkill", victim.mp + '|' + victor.mp);
    //victor.instance.room(this.gameid).write({type:"pk", action: victim.mp + '|' + victor.mp});

    // victor.instance.room(victor.instance.game.id).write([5, victim.id, victor.id]);
    // victor.instance.room(victor.playerPort).write([5, victim.id, victor.id, dmg]);

    // victim.doHit(victor, dmg);
    // victim.doKill(victor);
}
game_core.prototype.check_collision = function( player, i )
{
    //console.log('##+@@check_collision', player.mp);
    // TODO: May need to remove hp check below (and elsewhere)
    if (player.mp == 'hp' || !player.active)// || player.dead)
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
    if (this.config.server || player.isLocal && !player.dead)
    {
        var other, room;
        // _.forEach(_this.getplayers.allplayers, function(other)
        if (this.config.server)
            room = this.getplayers.fromRoom(player.playerPort);
        else room = this.getplayers.allplayers;

        var c = 0; 
        if (this.config.server) // collision optimization and avoids double-hits!
            c = i + 1;

        // for (var i = room.length - 1; i >= 0; i--)
        for (var j = c; j < room.length; j++)
        {
            other = room[j];//room[i];//this.getplayers.allplayers[i];
            //console.log('->', other.team, player.team);
            //other.pos.x = other.pos.x.fixed(4);
            //other.pos.y = other.pos.y.fixed(4);
            //if (!other.active) return false;

            if (other.mp != player.mp && other.team != player.team && other.active)
            {
                //console.log( (player.pos.x + (player.size.hx / 2)), (other.pos.x + (other.size.hx / 2)) );
                if (Math.sqrt( (player.pos.x - other.pos.x) * (player.pos.x - other.pos.x) + (player.pos.y - other.pos.y) * (player.pos.y - other.pos.y) ) < 32)
                // console.log("+", dist, '<', '128');
                // if ( 
                //     player.pos.x + (player.size.hx/4) < other.pos.x + (other.size.hx - other.size.hx/4) 
                //     && player.pos.x + (player.size.hx - player.size.hx/4) > other.pos.x + (other.size.hx/4) 
                //     && player.pos.y + (player.size.hy/4) < other.pos.y + (other.size.hy - other.size.hy/4) 
                //     && player.pos.y + (player.size.hy - player.size.hy/4) > other.pos.y + (other.size.hy/4)
                // )
                {
                    console.log('HIT!', player.active, player.playerName, player.team, other.active, other.playerName, other.team);
                    
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
                    // TODO: adjust for precision/recover/bubble buffs
                    // player y - player attackBonus - player bonusTotal / player y - recover bonus 
                    // (pos.y - attackBonus - bonusTotal) - (pos.y - defenseBonus - bonusTotal)
                    this.hitDiff = (player.pos.y - player.attackBonus - player.bonusTotal) - (other.pos.y - other.defenseBonus - other.bonusTotal);
                    console.log("* HIT DIFF", this.hitDiff, this.hitBase);// player.mp, player.pos.y, other.mp, other.pos.y);

                    if ((this.hitDiff >= -this.hitBase && this.hitDiff <= this.hitBase && player.vuln === false && other.vuln === false) || player.vuln === true && other.vuln === true)//player.pos.y === other.pos.y)
                    {
                        _this.flashBang = 1;
                        console.log("TIE!", player.mp, player.pos, other.mp, other.pos);
                        // if (this.config.server)
                        player.doHitServer(other, false);
                    }
                    else // we (might?) have a victim
                    {
                        console.log('determining VICTIM...');//, player.mp);
                        
                        //this.flashBang = 2;
                        if (player.pos.y < other.pos.y || other.vuln === true)
                        {
                            //console.log('player', player.mp, 'killed', other.mp);
                            if (!other.dead)
                            {
                                // _this.pk(player, other, 15);
                                // if (this.config.server)
                                other.doHitServer(player, true);
                            }
                        }
                        else
                        {
                            if (!player.dead)
                            {
                                // if (this.config.server)
                                player.doHitServer(other, true);
                            }
                        }
                    }

                    break;//return false;//break;
                }
            }
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

    //console.log('chests', this.chests.length, player.mp);
    // _.forEach(this.chests, function(chest)
    if (this.config.server && !player.dead && !player.vuln)
    {
        var consumable;
        room = this.getplayers.fromRoom(player.playerPort, 2);
        // console.log('@ chests len', room.length);//, player.userid);
        
        for (i = room.length - 1; i >= 0; i--)
        {
            consumable = room[i];
            // console.log('collision().chests', chest.taken);
            // Note: hy + 10 below accounts for birds unseen legs.
            // if (
            //     player.pos.x < (consumable.x + consumable.width) &&
            //     (player.pos.x + player.size.hx) > consumable.x &&
            //     player.pos.y < (consumable.y + consumable.height) &&
            //     (player.pos.y + player.size.hy) > consumable.y
            // )
            if (Math.sqrt( (player.pos.x - consumable.x) * (player.pos.x - consumable.x) + (player.pos.y - consumable.y) * (player.pos.y - consumable.y) ) < 32)
            
            {
                // console.log('consumable hit');
                if (!consumable.taken)
                {
                    // TODO: if consumable is health pot and player's health is max, don't take!
                    console.log('*', consumable.type, player.health, player.healthMax);
                    if (consumable.type === 2 && player.health === player.healthMax)
                    {
                        console.log("healthy player cannot take health pot!");
                    }
                    else consumable.doTake(player);
                    // only 1 consumable is available at once, so vamos!
                    break;
                }
            }
        }
    }

    // flagObjects (flags and slots)
    if (this.config.server && !player.dead)
    {
        // _.forEach(this.config.flagObjects, function(fo)
        // var fo;
        room = this.getplayers.fromRoom(player.playerPort, 3);
        // for (var k = this.config.flagObjects.length - 1; k >= 0; k--)
        // console.log('flags! len', roomFlags.length);
        for (i = room.length - 1; i >= 0; i--)
        {
            // fo = room[i];//this.config.flagObjects[k];
            // console.log('======= flag ======\n', room[i].id, room[i].name, room[i].x, room[i].y, '\n=======');
            if (Math.sqrt( (player.pos.x - room[i].x) * (player.pos.x - room[i].x) + (player.pos.y - room[i].y) * (player.pos.y - room[i].y) ) < 32)
            // if (
            //     //room[i].isHeld === false && room[i].isActive && player.hasFlag === 0 &&
            //     player.pos.x < (room[i].x + (room[i].width/2)) &&
            //     (player.pos.x + (player.size.hx/2)) > room[i].x &&
            //     player.pos.y < (room[i].y + (room[i].height/2)) &&
            //     (player.pos.y + (player.size.hy/2)) > room[i].y
            // )
            {
                //console.log('hit flag obj', room[i].name, room[i].isHeld, room[i].isActive, player.hasFlag);

                // player takes flag?
                //console.log('room[i].doTake', room[i].type, room[i].name, room[i].isHeld, room[i].isActive, player.hasFlag);
                if (room[i].type == "flag" && room[i].isHeld === false && room[i].isActive && player.hasFlag === 0)
                {
                    room[i].doTake(player);
                }
                // player with flag slots it?
                else if (player.hasFlag > 0)
                {
                    room[i].slotFlag(player);
                }
            }
        }
    }

    // tilemap
    var b = 5; // bounce
    var gatepush = 128;
    var h = player.hitGrid();
    // if (this.config.server)
    // console.log("@@@", this.getplayers.fromRoom(player.playerPort, 5).stage, player.playerPort);
    // else console.log("***", this.core_client.config.round.stage);
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
                // only if round is active
                if ( (this.config.server && this.getplayers.fromRoom(player.playerPort, 5).stage===1) || (!this.config.server && this.config.round.stage===1) )
                    player.pos.y -= gatepush;
                else
                {
                    player.pos.y += b;
                    player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                    player.collision = true;
                }
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
            
            // red gate across (tile id is 121)
            if (h.sw.t === 121 && h.se.t === 121 && player.team === 1) 
            {
                // only if round is active
                if ( (this.config.server && this.getplayers.fromRoom(player.playerPort, 5).stage===1) || (!this.config.server && this.config.round.stage===1) )
                    player.pos.y += gatepush;
                else
                {
                    player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                    player.doLand();
                }
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
            console.log('=+=+=+=+=+ HIT w wall', player.pos.x, player.pos.y);
            // blue gate down
            if (h.nw.t === 74 && h.sw.t === 74 && player.team === 2)
            {
                // only if round is active
                if ( (this.config.server && this.getplayers.fromRoom(player.playerPort, 5).stage===1) || (!this.config.server && this.config.round.stage===1) )
                    player.pos.x -= gatepush;
                else
                {
                    player.pos.x += b; // bounce
                    player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                    player.collision = true;
                }
            }
            else
            {
                player.pos.x += b; // bounce
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
            console.log('=+=+=+=+=+ HIT e wall', player.pos.x, player.pos.y);//h.nw.t, h.sw.t, player.team);
            // red gate down
            if (h.ne.t === 73 && h.se.t === 73 && player.team === 1) 
            {
                // only if round is active
                if ( (this.config.server && this.getplayers.fromRoom(player.playerPort, 5).stage===1) || (!this.config.server && this.config.round.stage===1) )
                    player.pos.x += gatepush;
                else
                {
                    player.pos.x -= b; //bounce
                    player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                    player.collision = true;
                }
            }
            else
            {
                player.pos.x -= b; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
                //player.vx = 0; // stop accel
            }
        }
        //////////////////////////////
        // side collision (full, right)
        //////////////////////////////
        /*else if (h.ne.t > 0 && h.se.t > 0)
        {
            player.pos.x -= 15; //bounce
            player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
            player.collision = true;
            //player.vx = 0; // stop accel
        }*/
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
                player.pos.x -= b; //bounce
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
                player.pos.x += b; //bounce
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
    // player.pos.x = player.pos.x.fixed(4);
    // player.pos.y = player.pos.y.fixed(4);
}; //game_core.check_collision

game_core.prototype.process_input = function( player )
{
    // console.log('##+@@process_input', player.mp);
    //if (!this.config.server) console.log('client input', player.mp);
    
    //It's possible to have recieved multiple inputs by now,
    //so we process each one
    //console.log('player', player);
    // var _this = this;
    var x_dir = 0;
    var y_dir = 0;
    //var delay = false;
    var ic = player.inputs.length;
    //console.log('ic:', ic);
    if(ic)
    {
        // this.server_control = false;
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
                /*else if (key == "sp")
                {
                    //console.log('ABILITY');
                    if (player.cooldown === false)
                        player.doAbility();
                }*/
                // else
                // {
                // }
                if(key == 'u') 
                { // flap
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
                if (key == '1')
                    {
                        console.log("* key 1 pressed");
                    }
                //     y_dir -= 10;
                // }
            } //for all input values

        } //for each input commandd
    } //if we have inputs
    else // we have NO INPUT
    {
        // if (!this.server)console.log('* no input...');
        // this.server_control = true;
        
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
        if (!this.config.server && player.active)
        {
            console.log('* updating', this.core_client.players.self.mp);
            
            this.core_client.players.self.update();
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

    // if (resulting_vector.x !== 0 || resulting_vector.y !== 0)
    // console.log('resulting_vector', resulting_vector);
    // if (resulting_vector.x > 0 || resulting_vector.y > 0)
    //     console.log('vector', resulting_vector);
    if (player.inputs.length) 
    {
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
game_core.prototype.physics_movement_vector_from_direction = function(x,y) 
{
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

    // var _this = this;

    ////////////////////////////////////////////////////////
    // iterate players
    ////////////////////////////////////////////////////////
    // _.forEach(this.getplayers.allplayers, function(player)
    // var player, room;
    if (this.server)
    {
        this.phyAllRooms = Object.keys(this.getplayers.fromAllRooms());
        for (var h = this.phyAllRooms.length - 1; h >= 0; h--)
        {
            this.phyRoom = this.getplayers.fromRoom(this.phyAllRooms[h]);
            for (var i = this.phyRoom.length - 1; i >= 0; i--)
            {
                this.phyPlayer = this.phyRoom[i];
                if (this.phyPlayer.active)
                    this.phyPlayer.update();

                // degrade player angle
                if (this.phyPlayer.a > 0)
                    this.phyPlayer.a-=0.5;
                else if (this.phyPlayer.a < 0)
                    this.phyPlayer.a+=0.5;
            }
        }
    }
    else // client
    {
        // console.log('client_xport:', this.core_client.xport);
        if (this.core_client.players.self.active)
        {
            this.core_client.players.self.update();
            if (this.core_client.players.self.a > 0)
                this.core_client.players.self.a -= 0.5;
            else if (this.core_client.players.self.a < 0)
                this.core_client.players.self.a += 0.5;
        }
        /*this.phyRoom = this.getplayers.allplayers;//fromRoom(this.core_client.xport.toString());
        if (this.phyRoom === undefined) this.phyRoom = []; // <-- TODO: stub
        for (var j = this.phyRoom.length - 1; j >= 0; j--)
        {
            this.phyPlayer = this.phyRoom[j];
            //if (_this.players.self)
            //console.log('p:', player.mp, player.active);
            
            if (this.phyPlayer.active)
                this.phyPlayer.update();

            // degrade player angle
            if (this.phyPlayer.a > 0)
                this.phyPlayer.a-=0.5;
            else if (this.phyPlayer.a < 0)
                this.phyPlayer.a+=0.5;
        }*/
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

    if(this.server) this.core_server.server_update_physics();
    else this.core_client.client_update_physics();

}; //game_core.prototype.update_physics

/*

 Server side functions

    These functions below are specific to the server side only,
    and usually start with server_* to make things clearer.

*/

// //Updated at 15ms , simulates the world state
// game_core.prototype.server_update_physics = function() 
// {
//     //if (glog)
//     //console.log('##-@@ server_update_physics');

//     // var _this = this;

//     /*
//     //Handle player one
//     this.players.self.old_state.pos = this.pos( this.players.self.pos );
//     var new_dir = this.process_input(this.players.self);
//     this.players.self.pos = this.v_add( this.players.self.old_state.pos, new_dir );

//     //Handle player two (other players)
//     this.players.other.old_state.pos = this.pos( this.players.other.pos );
//     var other_new_dir = this.process_input(this.players.other);
//     this.players.other.pos = this.v_add( this.players.other.old_state.pos, other_new_dir);

//     //Keep the physics position in the world
//     this.check_collision( this.players.self );
//     this.check_collision( this.players.other );

//     this.players.self.inputs = []; //we have cleared the input buffer, so remove this
//     this.players.other.inputs = []; //we have cleared the input buffer, so remove this
//     */

//     // player collisions
//     //for (var i = 0; i < this.getplayers.allplayers.length; i++)
//     // var new_dir;
//     // _.forEach(this.getplayers.allplayers, function(ply)
//     // var ply, room;
//     // var room = this.getplayers.fromRoom(player.playerPort);
//     // for (var i = room.length - 1; i >= 0; i--)
//     this.phyAllRooms = Object.keys(this.getplayers.fromAllRooms());
//     for (var h = this.phyAllRooms.length - 1; h >= 0; h--)
//     {
//         this.phyRoom = this.getplayers.fromRoom(this.phyAllRooms[h]);
//         for (var i = this.phyRoom.length - 1; i >= 0; i--)
//         {
//             this.phyPlayer = this.phyRoom[i];
//             //if (ply.mp != "hp")//_this.players.self.mp)
//             //{
//             this.phyPlayer.old_state.pos = this.pos( this.phyPlayer.pos );
//             // new_dir = this.process_input(ply);
//             this.phyPlayer.pos = this.v_add( this.phyPlayer.old_state.pos, this.process_input(this.phyPlayer));//new_dir);

//             //ply.update();

//             //Keep the physics position in the world            
//             this.check_collision( this.phyPlayer, i );
            

//             //this.players.self.inputs = []; //we have cleared the input buffer, so remove this
//             this.phyPlayer.inputs = []; //we have cleared the input buffer, so remove this
//             //}//else console.log("HIHIHIHIHIHIH", ply.mp);
//         }
//     }

//     // platform collisions (minus player)
//     /*for (var j = 0; j < this.platforms.length; j++)
//     {
//         //if (this.platforms[j].state !== this.platforms[j].STATE_INTACT)
//         //{
//             this.platforms[j].check_collision();
//         //}
//     }*/
//     /*_.forEach(this.chests, function(chest)
//     {
//         chest.check_collision();
//     });*/
//     //console.log(this.players.self.mp);
//     // phy 2.0
//     // var collisions = this.collider.detectCollisions(
//     //     this.player,
//     //     this.collidables
//     // );
//     //var collisions = this.collisionDetector.collideRect(this.players.self.ent, this.entities[5].ent);

//     // if (collisions != null) {
//     //     this.solver.resolve(this.player, collisions);
//     // }
//     //console.log(collisions);
//     // if (collisions != null)
//     //     this.collisionSolver.resolveElastic(this.players.self.ent, this.entities[5].ent);
// }; //game_core.server_update_physics

//Makes sure things run smoothly and notifies clients of changes
//on the server side
//this.bufArr = new ArrayBuffer(768);
//this.bufView = new Int16Array

game_core.prototype.roundComplete = function(port, round)
{
    console.log('== roundComplete ==', port, round);

    if (round.stage === 1) // game round complete
    {
        console.log('Game Round Complete');
        
        // set round for bonus stage
        round.stage = 2;
        round.endtime = ~~(this.config.server_time + round.bonusDuration);//(round.duration * 60);

        // clear flag events
        /*var evts = this.getplayers.fromRoom(port, 1);
        for (var e = evts.length - 1; e >= 0; e--)
        {
            // if flag carried events, clear cooldown event (evt.state = 5)
            console.log("* events", evts[e].type);
            if (evts[e].type === evts[e].TYPE_FLAG_CARRIED_COOLDOWN)// || evts[e].type === evts[e].TYPE_FLAG_SLOTTED_COOLDOWN)
                evts[e].doStop(); // stop it
        }*/
 
        // pick winners (player.score - player.lastscore = round score)
        var p = this.getplayers.fromRoom(port, 0);
        for (var z = p.length - 1; z >= 0; z--)
        {
            // reset roundscore of inactive players
            if (p[z].active === false)
                p[z].roundscore = 0;
            else p[z].roundscore = p[z].score - p[z].lastscore;
            console.log('* roundScore', p[z].roundscore);

            // clear all server buffs and bonuses
            p[z].purgeBuffsAndBonuses();
            // remove flags from flagholders
            if (p[z].hasFlag > 0)
            {
                console.log("* removing flag from player");
                // p[z].hasFlag = 0;
                p[z].dropFlag();
                /*var flags = this.getplayers.fromRoom(p[z].playerPort, 3);
                for (var a = flags.length -1; a >= 0; a--)
                {
                    if (flags[a].heldBy === p[z].userid)
                    {
                        console.log("* resetting flag");
                        flags[a].reset(false);
                    }
                }*/
            }

            // p[z].deactivateBuff(p[z].bonusSlot);
            // p[z].bonusSlot = 0;
            // reset instanced players position to team base
            if (p[z].instance)
                p[z].respawn();
        }
        var ordered = _.orderBy(p, ['roundscore'], ['desc']);
        // reduce to top 10
        ordered.splice(9, ordered.length - 10);
        console.log('ordered:', ordered.length);
        
        // remove 3 users from 4 - 10
        var rng;
        for (var x = 0; x < 4; x++)
        {
            rng = ~~((Math.random() * ordered.length) + 4);
            console.log('splicing', rng - 1);
            
            ordered.splice(rng - 1, 1);
        }
        console.log("top10:", ordered.length);
        var buffs = ["bubble","alacrity","precision","recover","blink","reveal","bruise","plate"];
        var top10 = [];
        for (var y = ordered.length - 1; y >= 0; y--)
        {
            // index, userid, buff
            // console.log('ordered', Math.floor(Math.random() * (buffs.length - 1)));// ordered[y]);
            if (!Boolean(ordered[y].userid))
                ordered[y].userid = 0;
            top10.push([y+1, ordered[y].userid, Math.floor(Math.random() * (buffs.length))]);
        }
        console.log('* top10:', top10.length, top10);

        // add bonusSlot to players (with real userid numbers)
        var player;
        for (var a = 0; a < top10.length; a++)
        {
            console.log('top10 userid', top10[a][1]);
            
            if (top10[a][1])
            {
                // get player by userid
                player = this.config._.find(p, {userid:top10[a][1]});
                // send bonusSlot
                player.bonusSlot = top10[a][2] + 1;
                player.activateBuff(player.bonusSlot);
                console.log('* assigned bonusSlot', player.bonusSlot, 'to player', player.playerName);
                
            }
        }
        
        // top 3

        // rng top 4 - 10

        // deactivate players
        for (var i = 0; i < p.length; i++)
        {
            p[i].active = false;
            if (p[i].instance && p[i].dead !== true)
            {
                // notify client
                //p[i].instance.room(port).write([30, top10]);
                p[i].instance.write([30, top10]);
            }
        }
    }
    else if (round.stage === 2) // Bonus Round complete
    {
        console.log('@@ Bonus Round Complete', round);
        
        // set round for game
        round.stage = 1;
        round.endtime = Math.floor(this.config.server_time + round.duration);//(round.duration * 60);
        round.total++;

        // deactivate players
        p = this.getplayers.fromRoom(port, 0);
        for (i = 0; i < p.length; i++)
        {
            if (p[i].instance)
            {
                // notify client
                p[i].active = true; // reactivate player
                p[i].instance.write([31, round]);
            }
        }        
    }

    // lastly, reactivate round
    console.log("@ reactivating round", round);
    round.active = true;
    // force players to move
}

// game_core.prototype.handle_server_input_orig = function(client, input, input_time, input_seq)
// {
//     //if (glog)
//     //console.log('##-@@ handle_server_input');
//     if (this.server)
//     {
//         var player, room;
//         room = this.getplayers.fromRoom(client.playerPort, 0);
//         if (!room) return;
//         for (var h = room.length - 1; h >= 0; h--)
//         {
//             player = room[h];
            
//             if (player.instance && player.instance.userid == client.userid)
//             {
//                 //Store the input on the player instance for processing in the physics loop
//                 player.inputs.push({inputs:input, time:input_time, seq:input_seq});
//                 break;
//             }
//         }
//     }
//     if (!this.server && client.userid == this.players.self.instance.userid)
//     {
//         // player_client = this.players.self;//.instance.userid);
//         // console.log('self', this.players.self.instance);
//     }
// }; //game_core.handle_server_input


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

game_core.prototype.addChest = function(chest, room)
{
    console.log('== addChest', chest.i, room, '==');

    //     i:id,
    //     x:evt.spawn.x,
    //     y:evt.spawn.y,
    //     t:evt.passive.type, * category
    //     c:evt.passive.buff,
    //     d:evt.passive.discipline,
    //     h:evt.passive.health

    if (this.server)
    {
        // var room = this.getplayers.fromRoom(room, 2);
        // add data from chest.consumableData to consumable
        
        // this.getplayers.addToRoom(new game_consumable(chest, false, this.getplayers, this.config), room, 2);

        // this.chests.push(new game_chest(chest, false, this.getplayers, this.config));

        //console.log('newChest id', newChest.id);
        // _.forEach(this.getplayers.allplayers, function(ply)
        // {
        //     if (ply.instance)
        //     {
        //         ply.instance.send('c.a.', newChest.id)
        //     }
        // });

    }
    else
    { 
        console.log('# total chests:', this.chests.length + 1);
        console.log('adding chest to client', chest.i);
        
        
        // this.getplayers.addToRoom(new game_chest(chest, true, this.getplayers, this.config), room, 2);
        this.chests.push(new game_consumable(chest, true, this.getplayers, this.config));
    }
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

