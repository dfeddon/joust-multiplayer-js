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

// include modules
var 
    _                   = require('./node_modules/lodash/lodash.min'),
    UUID                = require('node-uuid'),
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

var game_core = function(game_instance)
{
    console.log('## game_core instantiated');
    //Store the instance, if any
    this.instance = game_instance;
    //Store a flag if we are the server
    this.server = this.instance !== undefined;
    
    this.getplayers = new getplayers();
    this.config = new config();
    this.config.server = (this.server) ? true : false;
    //console.log('getplayers', this.getplayers, this.getplayers.allplayers);
    

    var _this = this;

    this.bg = null;
    this.fg = null;
    this.barriers = null;

    // global delay flag for change ability input
    this.inputDelay = false;

    var worldWidth = 50*64;//3200;//420;
    var worldHeight = 37*64;//3200;//720;

    //Used in collision etc.
    this.config.world = {
        width : worldWidth,//720,
        height : worldHeight//480
    };

    this.config.world.gravity = 0.05;//.25;//2;//3.5;

    this.config.world.totalplayers = 30;//40;//4;

    this.config.world.maxOrbs = 0;//150;
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

    this.cam = {x:0,y:0};

    this.mp = null;
    this.gameid = null;

    this.getplayers.allplayers = []; // client/server players store
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

    this.spritesheets = [];
    this.spritesheetsData = [];
    //this.spritesheetsData.push({type:'animate-torches', x:258, y:400, w:64, h:64, frames:4});

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
        // // include modules
        // var UUID            = require('node-uuid'),
        // egyptian_set            = require('./egyptian_set'),
        // game_player         = require('./class.player'),
        // platformClass       = require('./class.platform'),
        // //transformClass      = require('./class.transform'),
        // game_event_server   = require('./class.event'),
        // game_chest          = require('./class.chest');
        // /*collisionObject     = require('./class.collision'),
        // PhysicsEntity       = require('./class.physicsEntity'),
        // CollisionDetector   = require('./class.collisionDetector'),
        // CollisionSolver     = require('./class.collisionSolver');*/
        // this._                   = require('./node_modules/lodash/lodash.min');

        //var co = collisionObject;
        // phy 2.0
        // var pe1 = new PhysicsEntity(PhysicsEntity.ELASTIC);
        // var pe2 = new PhysicsEntity(PhysicsEntity.ELASTIC);
        // this.entities = [pe1,pe2];
        // console.log('entities', this.entities.length, this.entities);
        //console.log('physent', this.collisionDetector);

        console.log("##-@@ adding server player and assigning client instance...");

        this.apiNode(); // load tilemap data

        var other;
        for (var i = 1; i < this.config.world.totalplayers; i++)
        {
            other = new game_player(null, false, this.getplayers.allplayers.length+1, this.config);
            other.pos = this.gridToPixel(i, 0);
            other.playerName = this.nameGenerator();// + " [" + other.mp + "]";            
            // other.ent = new PhysicsEntity(PhysicsEntity.ELASTIC);
            //other.playerName = this.nameGenerator();
            //if (other.mp != "cp1") other.isBot = true;
            this.getplayers.allplayers.push(other);
            // this.entities.push(other);
        }
        var hp = new game_player(this.instance.player_host, true, NaN, this.config);
        console.log('server host player (hp)', this.instance.player_host.userid);
        
        // hp.ent = new PhysicsEntity(PhysicsEntity.ELASTIC);
        this.getplayers.allplayers.push(hp);
        // this.entities.push(hp);

        this.players = {};
        this.players.self = hp;
        //this.players.hostGame = hp.game;

        // add player (host)
        console.log('len', this.getplayers.allplayers.length);
        for (var j in this.getplayers.allplayers)
            console.log(this.getplayers.allplayers[j].mp, this.getplayers.allplayers[j].pos);

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

        // setup collision detect/solve pattern (decorator)
        // this.collisionDetector = new CollisionDetector();
        // this.collisionSolver = new CollisionSolver();
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
    else // clients (browsers)
    {
        //var assets = 
        //this._ = _;

        /*var collisionObject = require('./class.collision'),
        PhysicsEntity       = require('./class.physicsEntity'),
        CollisionDetector   = require('./class.collisionDetector'),
        CollisionSolver     = require('./class.collisionSolver');*/
        //var SpriteAnim = require('sprite-anim');
        // define(['animation/sprite-anim'], function(anim)
        // {
        //     log('animation2', anim);
        // });
        /*this.SpriteAnim = window.anim;
        console.log('animation sprite', this.SpriteAnim);*/

        //this.canvasPlatforms = null;
        this.flashBang = 0;
        // TODO: if mobile, orientation change
        //window.addEventListener('orientationChange', this.resizeCanvas, false);
        /*
        window.addEventListener('resize', this.resizeCanvas(), false);
        */
        /*
        window.addEventListener('keydown', function(e)
        {
            console.log('key event', e);//, this);// this.game.players.self.mp);
            console.log('keyb', e.view.game.keyboard);
            //this.derek();
            //return;
            switch(e.keyCode)
            {
                case 40: // down button
                case 83: // s
                    e.view.game.players.self.doCycleAbility();
                //     e.view.game.players.self.inputs.push("d");
                //     e.view.game.process_input(e.view.game.players.self);
                break;

                case 32: // spacebar
                    e.view.game.players.self.doAbility();
                break;

                case 38: // up
                    console.log('up!');
                    //e.view.game.keyboard.press('up');
                    //e.view.game.client_handle_input();
                break;
            }

        }, false);
        //*/

        // tilemap
        this.api(); // load and build tilemap

        console.log("## adding client players...", this.config.world.totalplayers);

        this.players = {};
        var p;
        for (var l = 1; l < this.config.world.totalplayers; l++)
        {
            p = new game_player(null, false, this.getplayers.allplayers.length+1, this.config);
            // p.ent = new physicsEntity(physicsEntity.ELASTIC);
            console.log(l, p.mp);
            p.pos = this.gridToPixel(l, 0);
            //p.playerName = this.nameGenerator() + " [" + p.mp + "/" + p.team + "]";
            this.getplayers.allplayers.push(p);//,null,false));
            // this.entities.push(p);
        }
        var chost = new game_player(null, false, NaN, this.config);//, true);
        chost.mp = 'hp';
        chost.mis = 'his';
        chost.host = true;
        // chost.ent = new physicsEntity(physicsEntity.ELASTIC);
        this.getplayers.allplayers.push(chost);
        // this.entities.push(chost);

        this.players.self = chost;//new game_player(this);

        console.log('len', this.getplayers.allplayers.length);

        for (var y in this.getplayers.allplayers)
            console.log(this.getplayers.allplayers[y].mp);

        // define platforms
        /*
        var canvasPlatforms = document.createElement('canvas');

        canvasPlatforms.id = "canvasPlatforms";
        canvasPlatforms.width = this.config.world.width;
        canvasPlatforms.height = this.config.world.height;
        //canvasPlatforms = canvasPlatforms.getContext('2d');

        this.canvasPlatforms = canvasPlatforms;

        // build them
        var cplat;
        for (var n = 0; n < this.platformsData.length; n++)
        {
            cplat = new game_platform(this, true);
            cplat.id = this.platformsData[n].id;

            cplat.setter(
            {
                //id:this.platformsData[n].id,
                x:this.platformsData[n].x,//(this.config.world.width/2) + (64 * 5),
                y:this.platformsData[n].y,//(this.config.world.height/2) - (64 * 5),
                w:this.platformsData[n].w,//512,
                h:this.platformsData[n].h//64
            });
            //console.log('cplat',cplat);
            this.platforms.push(cplat);
        }
        //*/
    }

    //The speed at which the clients move.
    this.playerspeed = 500;//120;

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
    if(!this.server)
    {
        //Create a keyboard handler
        this.keyboard = new THREEx.KeyboardState();
        console.log("* this.keyboard", this.keyboard);
        this.config.keyboard = new THREEx.KeyboardState();

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


    }
    else
    { //if !server

        this.config.server_time = 0;
        this.laststate = {};

    }

    // assign global refs to config singleton pattern
    if (!this.server)
    {
        var v = document.getElementById("viewport");
        this.config.ctx = v.getContext('2d');
    }
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

    //console.log('config', config);
    

}; //game_core.constructor

//server side we set the 'game_core' class to a global type, so that it can use it anywhere.
if( 'undefined' != typeof global )
{
    module.exports = global.game_core = game_core;
}

game_core.prototype.getKeyboard = function() { return this.keyboard };
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
    console.log('pname', pname);

    return pname;
};
game_core.prototype.api = function()
{
    var self = this;

    console.log('## api call');//, this.players.self.instance);//.instance.game);
    var xmlhttp = new XMLHttpRequest();
    //var url = "http://localhost:4004/api/orbs/";
    var url = "./assets/tilemaps/joust-alpha-1.tmx";
    xmlhttp.open("GET", url, true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.setRequestHeader("X-Parse-Application-Id", "VnxVYV8ndyp6hE7FlPxBdXdhxTCmxX1111111");
    xmlhttp.setRequestHeader("X-Parse-REST-API-Key","6QzJ0FRSPIhXbEziFFPs7JvH1l11111111");

    xmlhttp.send('');//{gameId:this.players.self.});

    xmlhttp.onreadystatechange = function ()
    { //Call a function when the state changes.
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
        {
            //alert(xmlhttp.responseText);
            //console.log('data', xmlhttp.responseText);
            //return xmlhttp.responseText;
            self.tilemap = xmlhttp.responseText;
            self.tilemapper();
            self.prerenderer();
            //self.buildPlatforms();
        }
    };
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
    //var cv = document.getElementById('viewport');
    
    //var dirL = document.getElementById('dirL');
    //var dirR = document.getElementById('dirR');

    //*
    //var mc = new Hammer(cv);
    var dl = new Hammer(dirL);
    var dr = new Hammer(dirR);
    var flap = new Hammer(dirF);
    // mc.on('swipe', function(e)
    // {
    //     console.log('swipe', e.direction);
    // });
    /*
    mc.on('press', function(e)
    {
        console.log('press',e.changedPointers[0].clientX);
        if (e.changedPointers[0].clientX < 150)
            handleStart('dirL');
        else if (e.changedPointers[0].clientX > 350  && (e.changedPointers[0].clientX < 550))
            handleStart('dirR');
        else handleStart('flap');
    });
    mc.on('pressup', function(e)
    {
        console.log('pressup');
        console.log('press',e.changedPointers[0].clientX);
        if (e.changedPointers[0].clientX < 150)
            handleEnd('dirL');
        else if (e.changedPointers[0].clientX > 350 && (e.changedPointers[0].clientX < 550))
            handleEnd('dirR');
        else handleEnd('flap');
    });
    //*/
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
    //*/

    
    // dirL.addEventListener('mousedown', handleStart, false);
    // dirL.addEventListener('mouseup', handleEnd, false);
    // dirR.addEventListener('mousedown', handleStart, false);
    // dirR.addEventListener('mouseup', handleEnd, false);

    /*
    cv.addEventListener('touchstart', handleStart, false);
    cv.addEventListener('touchend', handleEnd, false);
    cv.addEventListener('touchcancel', handleCancel, false);
    cv.addEventListener('touchmove', handleMove, false);
    //*/
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

game_core.prototype.updateTerritory = function()
{
    console.log('== game_core.updateTerrotiroy', this.bg, this.config.flagObjects.length, "==");

    if (this.config.bg == null)
    //if (this.bg == null)
    {
        console.log('bg is null, creating...', this);
        
        this.bg = document.createElement('canvas');
        this.bg.id = "bg";
        this.bg.x = 0;
        this.bg.y = 0;
        this.bg.width = this.config.world.width;//v.width;
        this.bg.height = this.config.world.height;//v.height;
        //context3 = this.bg.getContext('2d');
        this.config.bg = this.bg;
    }
    //console.log('pre', this.config.ctx);
    
    //if (!this.config.ctx) this.config.ctx = this.config.bg.getContext('2d');
    console.log('ctx', this.config.ctx);
    console.log('bg', this.config.bg);

    var ctx = this.bg.getContext('2d');
    
    
    //var ctx = this.bg.getContext('2d');

    // build bricks
    var brickWidth = 30;
    var brickHeight = 15;
    var brickPadding = 1;
    var brickOffsetTop = 0;//30;
    var brickOffsetLeft = 0;//30;

    var brickColumnCount = this.config.world.width / (brickWidth + brickPadding);
    var brickRowCount = this.config.world.height / (brickHeight + brickPadding);

    var bricks = [];
    for(var c = 0; c<brickColumnCount; c++)
    {
        bricks[c] = [];
        for(r=0; r<brickRowCount; r++)
        {
            bricks[c][r] = { x: 0, y: 0 };
        }
    }

    function pixelToBrick(x)
    {
        return Math.floor(x / (brickWidth + brickPadding));
    }
    /*function brickToPixel(col)
    {

    }*/

    // flags
    var red = _.find(this.config.flagObjects, {'name':'redFlag'});
    var mid = _.find(this.config.flagObjects, {'name':'midFlag'});
    var blue = _.find(this.config.flagObjects, {'name':'blueFlag'});
    //console.log(red, mid, blue);
    //console.log('territory', red, mid.x, blue.x);
    var redflagX = pixelToBrick( (red.x + (red.width/2)) );
    var midflagX = pixelToBrick( (mid.x + (mid.width/2)) );
    var blueflagX = pixelToBrick( (blue.x + (blue.width/2)) );
    console.log('xs2', redflagX, midflagX, blueflagX);
    console.log('brickColumns', brickColumnCount, "rows", brickRowCount);

    // draw bricks
    var brickX, brickY;
    for(var c=0; c<brickColumnCount; c++)
    {
        for(var r=0; r<brickRowCount; r++)
        {
            brickX = (c*(brickWidth+brickPadding))+brickOffsetLeft;
            brickY = (r*(brickHeight+brickPadding))+brickOffsetTop;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;

            //console.log('c', c, brickX, brickY);
            if (
                (redflagX > 0 && c <= redflagX) ||
                (c > midflagX && c < blueflagX)
            )
            {
                ctx.beginPath();
                ctx.fillStyle = "#04293c";
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fill();
                ctx.closePath();
            }
            else
            {
                ctx.beginPath();
                ctx.fillStyle = "#340404";
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    // update score
    // first, get flag source slots...
    var redSrc = red.sourceSlot;
    var midSrc = mid.sourceSlot;
    var blueSrc = blue.sourceSlot;
    // now, adjust scores based on flag type
    var score = {red:0, blue:0};

    var score2 = this.flagToScore(red.name, redSrc);
    var score3 = this.flagToScore(mid.name, midSrc);
    var score4 = this.flagToScore(blue.name, blueSrc);

    console.log('flagToScore', score2, score3, score4);
    var redRaw = score2.red + score3.red + score4.red;
    var blueRaw = score2.blue + score3.blue + score4.blue;

    var redTotal = Math.abs(score2.red) + Math.abs(score3.red) + Math.abs(score4.red);
    var blueTotal = Math.abs(score2.blue) + Math.abs(score3.blue) + Math.abs(score4.blue);
    
    var pointsAllocated = 10;//12;//redTotal + blueTotal;
    console.log('redTotal', redTotal);
    console.log('blueTotal', blueTotal);
    console.log('pointsAllocated', pointsAllocated);
    
    var redScore = parseInt(redTotal / pointsAllocated * 100);
    var blueScore = parseInt(blueTotal / pointsAllocated * 100);

    if (redRaw < 0)
        redScore = -redScore;
    else if (blueRaw < 0)
        blueScore = -blueScore;

    blueScore = blueScore + 50;
    redScore = redScore + 50;

    console.log('red score', redScore);
    console.log('blue score', blueScore);

    var redTxt = document.getElementById('txtScoreRed');
    var blueTxt = document.getElementById('txtScoreBlue');
    
    redTxt.innerHTML = redScore + "%";
    blueTxt.innerHTML = blueScore + "%";
};

game_core.prototype.flagToScore = function(flag, slot)
{
    var red = 0;
    var blue = 0;

    switch(slot)
    {
        case "slotRed":

            if (flag == "redFlag")
            {
                red = 0;
                blue = 0;
            }
            else if (flag == "blueFlag")
            {
                // not possible
            }
            else if (flag == "midFlag")
            {
                // not possible
            }

        break;

        case "slotBlue":

            if (flag == "redFlag")
            {
                // not possible
            }
            else if (flag == "blueFlag")
            {
                red = 0;
                blue = 0;
            }
            else if (flag == "midFlag")
            {
                // not possible
            }

        break;
        
        case "midSlot":

            if (flag == "redFlag")
            {
                red = -5;
                blue = 5;
            }
            else if (flag == "blueFlag")
            {
                red = 5;
                blue = -5;
            }
            else if (flag == "midFlag")
            {
                red = 5;
                blue = 5;
            }

        break;
        
        case "slot1":

            if (flag == "redFlag")
            {
                red = -1;
                blue = 1;
            }
            else if (flag == "blueFlag")
            {
                // not possible
            }
            else if (flag == "midFlag")
            {
                red = -4;
                blue = 4;
            }

        break;
        
        case "slot2":

            if (flag == "redFlag")
            {
                red = -2;
                blue = 2;
            }
            else if (flag == "blueFlag")
            {
                red = 11;
                blue = -11;
            }
            else if (flag == "midFlag")
            {
                red = -4;
                blue = 4;
            }

        break;
        
        case "slot3":

            if (flag == "redFlag")
            {
                red = -3;
                blue = 3;
            }
            else if (flag == "blueFlag")
            {
                red = 10;
                blue = -10;
            }
            else if (flag == "midFlag")
            {
                red = -3;
                blue = 3;
            }

        break;
        
        case "slot4":

            if (flag == "redFlag")
            {
                red = -3;
                blue = 3;
            }
            else if (flag == "blueFlag")
            {
                red = 9;
                blue = -9;
            }
            else if (flag == "midFlag")
            {
                red = -2;
                blue = 2;
            }

        break;
        
        case "slot5":

            if (flag == "redFlag")
            {
                red = -3;
                blue = 3;
            }
            else if (flag == "blueFlag")
            {
                red = 8;
                blue = -8;
            }
            else if (flag == "midFlag")
            {
                red = -1;
                blue = 1;
            }

        break;
        
        case "slot6":

            if (flag == "redFlag")
            {
                red = -7;
                blue = 7;
            }
            else if (flag == "blueFlag")
            {
                red = 5;
                blue = -5;
            }
            else if (flag == "midFlag")
            {
                red = 1;
                blue = -1;
            }

        break;
        
        case "slot7":

            if (flag == "redFlag")
            {
                red = -8;
                blue = 8;
            }
            else if (flag == "blueFlag")
            {
                red = 4;
                blue = -4;
            }
            else if (flag == "midFlag")
            {
                red = 2;
                blue = -2;
            }

        break;
        
        case "slot8":

            if (flag == "redFlag")
            {
                red = -9;
                blue = 9;
            }
            else if (flag == "blueFlag")
            {
                red = 3;
                blue = -3;
            }
            else if (flag == "midFlag")
            {
                red = 3;
                blue = -3;
            }

        break;
        
        case "slot9":

            if (flag == "redFlag")
            {
                red = -10;
                blue = 10;
            }
            else if (flag == "blueFlag")
            {
                red = 2;
                blue = -2;
            }
            else if (flag == "midFlag")
            {
                red = 4;
                blue = -4;
            }

        break;
        
        case "slot10":

            if (flag == "redFlag")
            {
                // not possible
            }
            else if (flag == "blueFlag")
            {
                red = 1;
                blue = -1;
            }
            else if (flag == "midFlag")
            {
                red = 5;
                blue = -5;
            }

        break;
        
    }

    return {red: red, blue:blue};
};

game_core.prototype.tilemapper = function()
{
    console.log('tilemapper');
    var canvas3 = document.createElement('canvas');
    canvas3.id = "canvas3";
    canvas3.x = 0;
    canvas3.y = 0;
    canvas3.width = this.config.world.width;//v.width;
    canvas3.height = this.config.world.height;//v.height;
    var context3 = canvas3.getContext('2d');
    /////////////////////////////////////////
    // Tilemap
    /////////////////////////////////////////
    if (this.tilemap)// && this.tmCanvas == undefined)
    {
        var _this = this;
        // parse xml
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(this.tilemap, "text/xml");
        console.log('xml', xmlDoc);

        ///////////////////////////////////
        // map
        ///////////////////////////////////
        var mapNode = xmlDoc.getElementsByTagName('map');
        var tileWidth, tileHeight, tileCount, columns, renderOrder, width, height, nextObjectId;
        renderOrder = mapNode[0].getAttribute('renderorder');
        width = mapNode[0].getAttribute('width');
        height = mapNode[0].getAttribute('height');
        tileWidth = mapNode[0].getAttribute('tilewidth');
        tileHeight = mapNode[0].getAttribute('tileheight');
        nextObjectId = mapNode[0].getAttribute('nextobjectid');
        //console.log(tileWidth,tileHeight,width,height,nextObjectId,renderOrder);

        ///////////////////////////////////
        // tileset
        ///////////////////////////////////
        var tilesetNode = xmlDoc.getElementsByTagName('tileset');
        //console.log('tileset', tilesetNode.length);
        tileCount = tilesetNode[0].getAttribute('tilecount');
        columns = tilesetNode[0].getAttribute('columns');
        name = tilesetNode[0].getAttribute('name');
        //console.log(tileCount, columns, name);

        ///////////////////////////////////
        // objects
        ///////////////////////////////////
        var objectgroupNode = xmlDoc.getElementsByTagName('objectgroup');
        var flagArray = [];
        //console.log('objectgroups', objectgroupNode.length);
        for (var og = 0; og < objectgroupNode.length; og++)
        {
            var ogName = objectgroupNode[og].getAttribute('name');
            console.log('group name', ogName);//, objectgroupNode[og]);
            var ogInner = objectgroupNode[og].innerHTML;
            var ogRows = ogInner.split("\n");
            ogRows.shift(); ogRows.pop();
            //console.log(ogRows);
            var parser = new DOMParser();
            var xml, atts, s;
            var nodes = [];
            for (var d = 0; d < ogRows.length; d++)
            {
                // parse to xml
                xml = parser.parseFromString(ogRows[d], "text/xml");
                // get attributes (via NamedNodeMap)
                atts = xml.childNodes[0].attributes;
                nodes.push(atts);
                //console.log('atts', atts);
            }
            switch(ogName)
            {
                case "chestSpawn":
                    // assign attribues to chest obj
                    /*for (var e = 0; e < nodes.length; e++)
                    {
                        var chestSpawnObj = {};
                        Array.prototype.slice.call(nodes[e]).forEach(function(item)
                        {
                            chestSpawnObj[item.name] = item.value
                        });
                        //console.log('chestSpawn', chestSpawnObj);
                        _this.chestSpawnPoints.push(chestSpawnObj);
                    }*/
                break;

                case "flagObjects":
                // assign attribues to chest obj
                var flg;
                //for (var e = 0; e < nodes.length; e++)
                var flagObjectsObj;
                //var objsArray = [];
                _.forEach(nodes, function(e)
                {
                    flagObjectsObj = {};
                    Array.prototype.slice.call(e).forEach(function(item)
                    {
                        flagObjectsObj[item.name] = item.value;
                    });
                    console.log('flag obj', flagObjectsObj);
                    flagArray.push(flagObjectsObj);
                    //clone = _.cloneDeep(flagObjectsObj);
                    // note, we set all flag objects to viewport context,
                    // however, further down we'll reassociate slot flag objects
                    // with _this.fg canvas context
                    //if (flagObjectsObj.type == "flag")
                    //{
                        //flg = new game_flag(flagObjectsObj.type, _this.viewport.getContext('2d'));
                        //this.config.flagObjects.push(new game_flag(flagObjectsObj, _this.viewport.getContext('2d')));
                        //flg.setter(flagObjectsObj);
                    //}
                    //else {
                    //    flg = new game_flag(flagObjectsObj.type, null);
                        //flg.setter(flagObjectsObj);
                    //}
                    //this.config.flagObjects.push(flg);
                });
                for (var k in flagObjectsObj)
                    delete flagObjectsObj[k];

                /*_.forEach(objsArray, function(i)
                {
                    //console.log(i);
                    this.config.flagObjects.push(new game_flag(i, _this.viewport.getContext('2d')));
                });*/
                break;
            }
        }
        //console.log('chests', this.chestSpawnPoints);
        //console.log('players', this.config.flagObjects);

        ///////////////////////////////////
        // layers
        ///////////////////////////////////
        var layerNode = xmlDoc.getElementsByTagName('layer');
        console.log('num layers', layerNode.length);
        console.log(layerNode);

        var layerData = [];
        var base = [];
        var layerName, data, encoding, dataNode, layerWidth, layerHeight;

        ///////////////////////////////////
        // iterate layers
        ///////////////////////////////////
        var layersStored = [];
        for (var x = 0; x < layerNode.length; x++)
        {
            // is visible?
            var vis = layerNode[x].getAttribute('visible');
            console.log('is visible', vis);
            if (vis == 0)
            {
                console.log('skipping layer...', layerNode[x].getAttribute('name'));
                continue;
            }

            console.log(layerNode[x].getAttribute('name'));
            /*console.log(layerNode[x].getElementsByTagName('data')[0]);
            console.log(layerNode[x].getElementsByTagName('data')[0].innerHTML);*/

            layerName = layerNode[x].getAttribute('name');
            layerWidth = layerNode[x].getAttribute('width');
            layerHeight = layerNode[x].getAttribute('height');
            dataNode = layerNode[x].getElementsByTagName('data')[0];
            data = layerNode[x].getElementsByTagName('data')[0].innerHTML;

            layersStored.push(layerName);
            //continue;

            // data
            //var data, encoding;
            /*dataNode = xmlDoc.getElementsByTagName('data');
            encoding = dataNode[0].getAttribute('encoding');
            data = dataNode[0].innerHTML;*/
            // console.log(dataNode[0]);
            //console.log(data);

            // build 2d array of row data
            // clear base array
            base = [];
            var rows = data.split("\n");
            rows.shift(); // first item is newline
            rows.pop(); // last item is newline
            //console.log(rows);
            for (var i = 0; i < rows.length; i++)
            {
                rows[i] = rows[i].split(",");
                if (i !== rows.length - 1)
                    rows[i].pop(); // last item of each row is newline (except last line)
                base.push(rows[i]);
            }
            // tilemapData tracks on the 'barrier' layer (for collision detection)
            console.log('layerName', layerName);
            if (layerName == "barriers")
            {
                this.config.tilemapData = base;
                //this.config.tilemapData = base;
            }
            //console.log(base);
            layerData.push(base);

        }
        //console.log(layerData);
        //return;

        ///////////////////////////////////
        // build bitmap from tilelist image
        ///////////////////////////////////
        var source, trans, imageWidth, imageHeight;
        var imageNode = xmlDoc.getElementsByTagName('image');
        source = imageNode[0].getAttribute('source');
        trans = imageNode[0].getAttribute('trans');
        imageWidth = imageNode[0].getAttribute('width');
        imageHeight = imageNode[0].getAttribute('height');
        //console.log(source, trans, imageWidth, imageHeight);

        var layers = [];
        var image = assets.skin1_tileset;
        //var image = new Image();
        //image.onload = function(e)
        //{
            // image loaded
            var sheet = image;//e.target;
            //context2.drawImage(e.target, 0, 0);

            // first, create canvas the exact size of the tilemap
            //n = layerNode[y].getAttribute('name')
            //console.log(n);
            var tilemap = document.createElement('canvas');//('canvas_' + y.toString());
            self.tmCanvas = tilemap;
            tilemap.id = "tilemap";
            tilemap.width = width * tileWidth;
            tilemap.height = height * tileHeight;//v.height;
            console.log('tilemap w h', tilemap.width, tilemap.height);//, this.config.world.width, this.config.world.height);
            var tmContext = tilemap.getContext('2d');

            ///////////////////////////////////
            // add tilemap to tile canvas context
            ///////////////////////////////////
            tmContext.drawImage(image, 0, 0);


            ///////////////////////////////////
            // iterate layers
            ///////////////////////////////////
            var n, c, cContext;//, layerCanvas;
            //var canvases = [];
            //var div = document.getElementById('canvases');
            console.log('layerData len', layerData.length);
            for (var y = 0; y < layerData.length; y++)
            {

                // first, create layer canvas
                n = layersStored[y];//layerNode[y].getAttribute('name')
                console.log(n);
                c = document.createElement('canvas');//('canvas_' + y.toString());
                c.style.cssText = "position:absolute;display:block;top:0;left:0";
                c.zIndex = y + 1;
                self.tmCanvas = tilemap;
                c.id = n;
                c.width = width * tileWidth;
                c.height = height * tileHeight;//v.height;
                //console.log('tilemap w h', tilemap.width, tilemap.height);//, this.config.world.width, this.config.world.height);
                cContext = c.getContext('2d');

                // add tilemap to tile canvas context
                //tmContext.drawImage(e.target, 0, 0);

                // now, let's add tiles
                var tile, t;
                var count = 0;
                var colMax = (imageWidth / tileWidth);
                var rowMax = (imageHeight / tileHeight);
                //console.log(rowMax,colMax);
                //console.log('layerData H', layerData[y].length);
                //console.log('layerData W', layerData[y][0].length);
                var col, row;
                for (var j = 0; j < layerData[y].length; j++)
                {
                    //console.log(layerData[y][j].length);
                    for (var k = 0; k < layerData[y][j].length; k++)
                    {
                        t = parseInt(layerData[y][j][k] - 1);
                        if (t > -1) // ignore 0 tiles
                        {
                            //console.log(':',count, t, Math.floor(t / rowMax), t % colMax);
                            //console.log(((t % colMax)) * tileWidth, (Math.floor(t / rowMax)) * tileHeight);
                            //console.log(j, k, t, ':', t%colMax, '/', Math.floor(t/rowMax));
                            col = (t % colMax) | 0;
                            tile = tmContext.getImageData
                            (
                                col * tileWidth,// tileHeight, // x
                                (Math.floor(t / colMax)) * tileWidth, // y
                                tileWidth, // w
                                tileHeight // h
                            );
                            //context3.putImageData(tile, (count % height) * tileHeight, Math.floor(count / width) * tileWidth);
                            cContext.putImageData(tile, (count % width) * tileHeight, Math.floor(count / width) * tileWidth);
                        }
                        count++;
                    }
                }
                //canvases.push(c);
                //console.log(c.id);
                //if (c.id == 'barriers')
                _this[c.id] = c;
                //console.log('cid',this[c.id]);
                //div.appendChild(c);

                // _this.canvas3 = canvas3;
                //document.body.appendChild(tilemap);
            }
            /*console.log('canvases', canvases);
            var div = document.getElementById('canvases');
            console.log(div.children.length);
            for (var z = canvases.length - 1; z >= 0; z--)
                div.appendChild(canvases[z]);
            console.log(div.children.length);
            if (canvases[0].canvas == canvases[1].canvas) console.log('HIDEREK');*/

            //_this.canvas3 = canvas3;
            tilemap = null;
            self.tmCanvas = null;

            _this.addSpriteSheets();

            // reassign ctx for slot objects
            //console.log("_", _.forEach());
            //console.log('flagArray', flagArray);
            var pre = {midFlag: undefined, redFlag: undefined, blueFlag: undefined};
            if (_this.config.preflags)
            {
                for (var x = 0; x < _this.config.preflags.length; x++)
                {
                    pre[_this.config.preflags[x].name] = _this.config.preflags[x];//.visible;
                }
            }
            //console.log('preflags', pre);
            
            _.forEach(flagArray, function(fo)
            {
                //console.log('fog', fo);
                if (fo.type == "flag")
                {
                    var flag = new game_flag(fo, _this.viewport.getContext('2d'), _this.getplayers, _this.config);
                    //console.log('vis name', vis[fo.name]);
                    if (_this.config.preflags)
                    {
                        flag.visible = pre[fo.name].visible; // set default visibility
                        flag.x = pre[fo.name].x;
                        flag.y = pre[fo.name].y;
                    }
                    _this.config.flagObjects.push(flag);//new game_flag(fo, _this.viewport.getContext('2d')));
                }
                else if (fo.type == "slot")
                {
                    var slot = new game_flag(fo, _this.fg.getContext('2d'), _this.getplayers, _this.config);
                    //slot.setter(fo);
                    _this.config.flagObjects.push(slot);
                    slot.draw();

                    /*console.log('revising ctx');
                    //fo.setCtx(_this.fg.getContext('2d'));
                    this.config.flagObjects.push(new game_flag(fo, _this.fg.getContext('2d')));*/
                    //fo.draw();
                }
                //else fo.draw();
            });

            // declare territory
            _this.updateTerritory();
        //}; // end tilemap image loaded

        // path: ../tilesets/skin1-tileset.png
        /*
        console.log('* tileset image source', source);
        
        var split = source.split("/");
        var filename = split[2];
        //image.src = source.replace("..", "/assets");
        image.src = "http://s3.amazonaws.com/com.dfeddon.wingdom/" + filename;
        console.log('* imgsrc', image.src);
        */

    }
};
game_core.prototype.addSpriteSheets = function()
{
    console.log('adding spritesheets');
    // build animations
    var csprite;
    for (var p = 0; p < this.spritesheetsData.length; p++)
    {
        csprite = new game_spritesheet(this.ctx);
        csprite.id = this.spritesheetsData[p].id;

        csprite.setter(
        {
            //id:this.platformsData[n].id,
            type:this.spritesheetsData[p].type,
            x:this.spritesheetsData[p].x,
            y:this.spritesheetsData[p].y,
            w:this.spritesheetsData[p].w,
            h:this.spritesheetsData[p].h,
            frames:this.spritesheetsData[p].frames
        });

        this.spritesheets.push(csprite);
    }
}

game_core.prototype.prerenderer = function()
{
    //console.log('## preprenderer', this.orbs.length);
    var self = this;
    var context2, max, canvas2;
    //*
    if (!this.canvas2)
    {
        console.log('creating canvas2');
        //var v = document.getElementById("viewport");
        canvas2 = document.createElement('canvas');
        canvas2.id = "canvas2";
        canvas2.width = this.config.world.width;//v.width;
        canvas2.height = this.config.world.height;//v.height;
        context2 = canvas2.getContext('2d');
        //max = this.config.world.maxOrbs;
    }
    else
    {
        //max = this.orbs.length;
        context2 = this.canvas2.getContext('2d');
        // clear existing canvas
        context2.clearRect(0,0, this.config.world.width, this.config.world.height);
    }
    //*/
    //console.log(context2);
    //var prerendCanvas = document.getElementById('prerend');
    //prerendCanvas.width = this.config.world.width;//v.width;
    //prerendCanvas.height = this.config.world.height;//v.height;
    /*context2 = this.prerendCanvas.getContext('2d');
    context2.clearRect(0,0, this.config.world.width, this.config.world.height);*/

    /////////////////////////////////////////
    // Orbs
    /////////////////////////////////////////
    var colors = ['pink', 'lightblue', 'yellow', 'green', 'white', 'orange'];
    var c, gradient, x, y, size;

    // so we do not apply styles to all contexts!
    context2.save();
    context2.translate(x,y);

    //for (var k = 0; k < max; k++)
    var orbs = this.orbs;
    //console.log('orbz',orbs.length);//, this.orbs);
    for (var k = 0; k < this.orbs.length; k++)
    {
        size = Math.floor(Math.random() * 4) + 2;
        c = colors[Math.floor(Math.random() * colors.length)];
        // TODO: Avoid foreground tiles
        x = Math.floor(Math.random() * this.config.world.width) + 1;
        y = Math.floor(Math.random() * this.config.world.height) + 1;

        // create new orb if undefined
        /*if (orbs[k]===undefined)
        {
            // console.log('new', k, orbs.length);
            var neworb = {x:x, y:y, c:c, w:size, h:size, r:false};
            orbs.push( neworb );
        }*/
        // reset r if not null
        /*if (orbs[k].r === true)
        {
            console.log('removed!, adding...');
            orbs[k].x = -100;
            orbs[k].y = -100;
            continue;
        }*/

        context2.beginPath();

        gradient = context2.createRadialGradient(this.orbs[k].x, this.orbs[k].y, 0, this.orbs[k].x, this.orbs[k].y, this.orbs[k].w);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, orbs[k].c);
        context2.fillStyle = gradient;//c;
        context2.arc(
            orbs[k].x,
            orbs[k].y,
            orbs[k].w,
            0 * Math.PI,
            2 * Math.PI
        );
        context2.shadowBlur = 10;
        context2.shadowColor = 'white';
        //context2.shadowOffsetX = 0;
        //context2.shadowOffsetY = 0;
    	context2.fill();

        context2.closePath();
    }
    // so we do not apply styles to all contexts!
    context2.restore();

    /////////////////////////////////////////
    // center circle
    /////////////////////////////////////////
    /*context2.beginPath();
	context2.arc(this.config.world.width/2,this.config.world.height/2,50,0*Math.PI,2*Math.PI);
    context2.fillStyle = "red";
    //context2.shadowBlur = 10;
    //context2.shadowColor = 'red';
	context2.closePath();
	context2.fill();*/

    /////////////////////////////////////////
    // draw borders
    /////////////////////////////////////////
    /*
    context2.beginPath();
    // bottom
    context2.moveTo(0, this.config.world.height);
    context2.lineTo(this.config.world.width, this.config.world.height);
    context2.strokeStyle = 'black';
    // top
    context2.moveTo(0, 0);
    context2.lineTo(this.config.world.width, 0);
    // left
    context2.moveTo(0, this.config.world.height);
    context2.lineTo(0, 0);
    // right
    context2.moveTo(this.config.world.width, this.config.world.height);
    context2.lineTo(this.config.world.width, 0);
    // styles
    context2.closePath();
    context2.lineWidth = 10;
    context2.strokeStyle = 'black';
    context2.stroke();
    //*/

    /////////////////////////////////////////
    // platforms
    /////////////////////////////////////////
    /*
    for (var j = 0; j < this.platforms.length; j++)
    {
        // // left side
        // game.ctx.drawImage(
        //     document.getElementById("plat-l"),
        //     this.platforms[j].x,
        //     this.platforms[j].y,
        //     64,
        //     64
        // );
        //
        // // right side
        // game.ctx.drawImage(
        //     document.getElementById("plat-r"),
        //     this.platforms[j].x + this.platforms[j].w,
        //     this.platforms[j].y,
        //     64,
        //     64
        // );
        //
        // //var rest = this.platforms[j]
        //
        // // middle
        context2.fillStyle = 'green';
        context2.fillRect(this.platforms[j].x, this.platforms[j].y, this.platforms[j].w, this.platforms[j].h);
    }
    //*/

    //context2.restore();
    //*

    if (!this.canvas2)
        this.canvas2 = canvas2;
    //*/
};

function clamp(value, min, max)
{
    //console.log(Math.max(min, Math.min(value, max)));
    return Math.max(min, Math.min(value, max));
    //console.log(value);//, min, max);
    /*
    //console.log(value, min, max);
    if(value < min) return min;
    else if(value > max) return max;

    return value;
    //*/
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
    console.log('== pk', victor.mp, victim.mp, '==');

    // first, check if player has bubble...
    
    victim.active = false;

    _.forEach(this.getplayers.allplayers, function(p, i)
    {
        if (p.instance)// && p.mp != "hp")
        {
            console.log('sending...', p.mp);
            
            p.instance.send('p.k.' + victim.mp + '|' + victor.mp);
        }
    });
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
        _.forEach(this.getplayers.allplayers, function(other)
        {
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
                    if ((dif >= -5 && dif <= 5 && player.vuln === false && other.vuln === false) || player.vuln === true && other.vuln === true)//player.pos.y === other.pos.y)
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

                    return false;//break;
                }
                //if (player.pos.x >= other.pos.x + other.width && player.y == other.pos.y)
                    //console.log('HIT', player.mp, other.mp);
            }
            //if (this.players.self.pos === other.pos.x) console.log('!!!!!!!!!!!!!!!!!!!');

        });
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
    _.forEach(this.chests, function(chest)
    {
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
    });

    // flagObjects (flags and slots)
    if (this.config.server)
    {
        _.forEach(this.config.flagObjects, function(fo)
        {
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
        });
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
        /*
        else if (h.sw.t > 0) // landing
        {
            //console.log('stop sw', player.mp);//, h.sw.y * 64, player.pos.y + player.size.hy);
            //player.pos.x += b;
            //player.pos.y -= b;
            player.pos.y = parseInt((h.sw.y * 64) - 64);

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
        }
        else if (h.se.t > 0) // landing
        {
            //console.log('stop se', player.mp);// h.sw.y * 64, player.pos.y + player.size.hy);
            //player.pos.x -= b;
            //player.pos.y -= b;
            player.pos.y = parseInt((h.se.y * 64) - 64);
            // decelerate
            if (player.vx > 0 && player.vuln !== true)
            {
                //console.log('slowing', player.vx);

                // slow horizontal velocity
                player.vx = (player.vx + 200).fixed(3);
                // set landing flag (moving)
                player.landed = 2;

                if (player.vx > 0)
                {
                    player.vx = 0;
                    player.landed = 1;
                }
            }
            else if (player.vx < 0 && player.vuln !== true)
            {
                player.vx = (player.vx + 200).fixed(3);
                player.landed = 2;

                if (player.vx > 0)
                {
                    player.vx = 0;
                    player.landed = 1;
                }
            }
            else
            {
                // stuck landing (no velocity)
                player.vx = 0;
                // set landing flag (stationary)
                player.landed = 1;
            }
        }
        //*/
    }
}; //game_core.check_collision

// game_core.prototype.client_on_chestadd = function(data)
// {
//     console.log('=== client_on_chestadd', data, '===');

// };

game_core.prototype.client_on_chesttake = function(data)
{
    console.log('client_on_chesttake', data);
    var split = data.split("|");
    var id = split[0];
    var player = split[1];
    _.forEach(this.chests, function(chest)
    {
        console.log('chest id', chest.id);
        if (chest.id == id)
        {
            // chest is opened
            chest.opening = true;
        }
    });
};
game_core.prototype.client_on_chestremove = function(data)
{
    console.log('=== client_on_chestremove', data, '===');
    var _this = this;

    var split = data.split("|");
    var id = split[0];
    var player = split[1];

    _.forEach(this.chests, function(chest)
    {
        //console.log('chest id', chest.id);
        if (chest.id == id)
        {
            // chest is opened
            _.remove(_this.chests, {id: chest.id});
            console.log('* chest removed', id, _this.chests);
            return false; // break
        }
    });
};

// slot flag in placque
game_core.prototype.client_onflagadd = function(data)
{
    console.log('client_onflagadd', data);

    var _this = this;

    //data: player.mp|flag.name
    var split = data.split("|");
    var mp = split[0];
    var slotName = split[1];
    var flagName = split[2];
    var playerSource, slotUsed;

    /////////////////////////////////////
    // get source player
    /////////////////////////////////////
    _.forEach(this.getplayers.allplayers, function(ply)
    {
        if (ply.mp == mp)
        {
            playerSource = ply;
            return false; // break
        }
    });
    console.log('source player', playerSource);
    playerSource.hasFlag = 0;

    /////////////////////////////////////
    // show flag in slot
    /////////////////////////////////////
    var targetSlot, flagSlotted;
    _.forEach(this.config.flagObjects, function(fo)
    {
        //console.log(fo.name, slotName);
        if (fo.name == slotName)
        {
            targetSlot = fo;
            //targetSlot.targetSlot = flag.getTargetSlot(parseInt(playerSource.team), fo.sourceSlot);
            console.log('tslot', fo);//flagTaken.targetSlot);
            //return false; // break
        }
        else if (fo.name == flagName)
        {
            flagSlotted = fo;
            console.log('tflag', fo);
        }
    });
    flagSlotted.x = targetSlot.x - (targetSlot.width/2);
    flagSlotted.y = targetSlot.y - (targetSlot.height/2);
    flagSlotted.sourceSlot = targetSlot.name;
    flagSlotted.visible = true;
    flagSlotted.isActive = false;
    flagSlotted.isPlanted = true;
    flagSlotted.isHeld = false;
    flagSlotted.onCooldown = true;

    /////////////////////////////////////
    // show toast
    /////////////////////////////////////
    if (playerSource.mp != this.players.self.mp)
    {
        var msg =
        {
            action: "slotFlag",
            playerName: playerSource.playerName,//"Jouster",
            playerTeam: playerSource.team,//0,
            flagName: flagSlotted.name,//"Mid Flag",
            targetSlot: flagSlotted.targetSlot//"Placque #3"
        };
        new game_toast().show(msg);
    }
    /////////////////////////////////////
    // update territory
    /////////////////////////////////////
    this.updateTerritory();
};
// take flag from placque
game_core.prototype.client_onflagremove = function(data)
{
    console.log('client_onflagremove', data);

    var _this = this;

    //data: player.mp|flag.name
    var split = data.split("|");
    var mp = split[0];
    var flagName = split[1];
    var flagTakenAt = split[2];
    var playerSource, flagTaken;

    /////////////////////////////////////
    // get source player
    /////////////////////////////////////
    _.forEach(this.getplayers.allplayers, function(ply)
    {
        if (ply.mp == mp)
        {
            playerSource = ply;
            return false; // break
        }
    });
    console.log('source player', playerSource);

    /////////////////////////////////////
    // hide flag taken
    /////////////////////////////////////
    var targetSlot;
    _.forEach(this.config.flagObjects, function(flag)
    {
        console.log(flag.name, flagName);
        if (flag.name == flagName)
        {
            flagTaken = flag;
            flagTaken.targetSlot = flag.getTargetSlot(parseInt(playerSource.team), flag.sourceSlot);
            console.log('tslot', flagTaken.targetSlot);
            return false; // break
        }
    });
    console.log('flag taken', flagTaken);
    // disable taken flag
    flagTaken.visible = false;
    flagTaken.isHeld = true;
    flagTaken.isActive = false;
    flagTaken.heldBy = playerSource.mp;

    // set player's has flag attribute // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
    if (flagTaken.name == "midFlag")
        playerSource.hasFlag = 1;
    else if (flagTaken.name == "redFlag")
        playerSource.hasFlag = 2;
    else if (flagTaken.name == "blueFlag")
        playerSource.hasFlag = 3;

    console.log('playerSource hasFlag', playerSource.hasFlag);


    /////////////////////////////////////
    // show toast
    /////////////////////////////////////
    //if (playerSource.mp != this.players.self.mp)
    //{
        var msg =
        {
            action: "takeFlag",
            playerName: playerSource.playerName,//"Jouster",
            playerTeam: playerSource.team,//0,
            flagName: flagTaken.name,//"Mid Flag",
            targetSlot: flagTaken.targetSlot//"Placque #3"
        };
        new game_toast().show(msg);
    //}
};

// take flag from placque
game_core.prototype.client_onflagchange = function(data)
{
    console.log('client_onflagchange', data);
    var split = data.split("|");
    var flagName = split[0];
    var flagVisible = (split[1] == 'true');
    var toastMsg = JSON.parse(split[2]);
    var flagObj = this.config._.find(this.config.flagObjects, {"name":flagName});//this.name});
    flagObj.visible = flagVisible;
    //console.log('flagName', flagName, flagVisible, flagVisible, flagObj);

    console.log('toastMsg', toastMsg);
    
    if (toastMsg)
    {
        new game_toast().show(toastMsg);
    }
}


game_core.prototype.client_on_orbremoval = function(data)
{
    // data = orb id | player mp
    var split = data.split("|");
    var id = split[0];
    var mp = split[1];
    var isLocal = false;
    var orbFound = false;
    //if (this.players.self.mp == mp)
        //isLocal = true;
    //console.log('## orbRemoval', id, mp);//, isLocal);//, this.orbs[index]);

    // if player got orb, already removed
    /*if (mp === this.players.self.mp)
    {
        this.prerenderer();
        return;
    }*/
    //this.orbs.splice(index, 1);
    for (var i = 0; i < this.orbs.length; i++)
    {
        if (this.orbs[i].id == id)
        {
            orbFound = true;
            this.orbs[i].x = -100;
            this.orbs[i].y = -100;
            this.orbs[i].r = true;
            //console.log('## removed orb', mp, this.orbs[i].id);
            this.orbs.splice(i, 1);

            // local player got orb
            //if (this.players.self.isLocal === true)
                //this.players.self.updateMana(this.orbs[i].w);
            break;
        }
    }
    if (orbFound === true)
        this.prerenderer();
    //else console.log('orb id', id, 'not found!');
};


game_core.prototype.process_input = function( player )
{
    //console.log('##+@@process_input');
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
        for(var j = 0; j < ic; ++j)
        {
            //don't process ones we already have simulated locally
            if(player.inputs[j].seq <= player.last_input_seq) continue;

            var input = player.inputs[j].inputs;
            var c = input.length;
            for(var i = 0; i < c; ++i)
            {
                var key = input[i];
                //console.log('key', key, ic);

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
                    //console.log('flap!');

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
                else player.flap = false;
                //if (key !== 'u') player.flap = false;
                // if(key == 'x') {
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
        this.players.self.cur_state.pos = this.pos(this.players.self.pos);
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
    _.forEach(this.getplayers.allplayers, function(player)
    {
        //if (_this.players.self)
        player.update();

        // degrade player angle
        if (player.a > 0)
            player.a-=0.5;
        else if (player.a < 0)
            player.a+=0.5;
    });

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
    else this.client_update_physics();

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

    var _this = this;

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
    _.forEach(this.getplayers.allplayers, function(ply)
    {
        //if (ply.mp != "hp")//_this.players.self.mp)
        //{
        ply.old_state.pos = _this.pos( ply.pos );
        new_dir = _this.process_input(ply);
        ply.pos = _this.v_add( ply.old_state.pos, new_dir);

        //ply.update();

        //Keep the physics position in the world
        _this.check_collision( ply );
        

        //this.players.self.inputs = []; //we have cleared the input buffer, so remove this
        ply.inputs = []; //we have cleared the input buffer, so remove this
        //}//else console.log("HIHIHIHIHIHIH", ply.mp);
    });

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
    console.log('##-@@ server_update', this.getplayers.allplayers.length);//this.players.self.instance.userid, this.players.self.instance.hosting, this.players.self.host);

    var _this = this;
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
    _.forEach(this.getplayers.allplayers, function(player, index)
    {
        //console.log(index * 16);
        // set player's bufferIndex
        //player.bufferIndex = index;
        var bufArr = new ArrayBuffer(768);//16 * this.getplayers.allplayers.length); // 16 * numplayers
        var bufView = new Int16Array(bufArr, (index * 16), 16);
        //, 0, Math.floor(bufArr.byteLength/2));
        //*
        if (player.pos.x === 0 && player.pos.y === 0) return;
        //player.pos.x = player.pox.x.toFixed(2);
        bufView[0] = player.pos.x;//.fixed(2);
        bufView[1] = player.pos.y;//.fixed(2);
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
        bufView[12] = index; // player's bufferIndex
        //bufView[13] = (player.dead) ? 1 : 0;//player.team;
        //bufView[11] = new Date();
        // if (player.mp == "cp2")
        //     console.log('->', bufView, 'x:', player.pos.x.toFixed(2));
        //if (bufView[11] > 0) console.log('IAMDEADIAMDEADIAMDEAD!!!!');
        //console.log('bufView', bufView);
        
        laststate[player.mp] = bufArr;
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
        laststate[player.mis] = player.last_input_seq;

        // reset flap on server instance
        if (player.flap === true) player.flap = false;
        // rest abil on server instance
        if (player.abil > 0) player.abil = 0;
        // reset killedBy
        //if (player.killedBy > 0) player.killedBy = 0;
        ///console.log(':::', player.pos);
    });
    

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
    _.forEach(this.events, function(evt)
    {
        if (evt.state !== evt.STATE_STOPPED)
        {
            if (evt.update() === true)
            {
                //console.log('add event to socket!', evt.type);
                switch(evt.type)
                {
                    case evt.TYPE_CHEST:
                        var id = _this.getUID();
                        console.log('adding chest', id);//, evt.spawn, 'with passive', evt.passive);
                        if (evt.id == 'ec') // chest event
                            _this.addChest(
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
                        laststate[evt.id] =
                        {
                            t: evt.timer,
                            f: evt.flag.name,
                            p: evt.flag.heldBy
                        };
                    break;

                    case evt.TYPE_FLAG_SLOTTED_COOLDOWN:

                        console.log('evt active slotted cooldown', evt.id, evt.timer);
                        laststate[evt.id] =
                        {
                            t: evt.timer,
                            f: evt.flag.name
                        };
                        break;
                }
            }
        }
    });

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

    laststate.t = this.config.server_time;
    //console.log(this.laststate.cp1);
    // var view = new Int16Array(this.laststate.cp1, 0, 16);
    // console.log('view', view);
    //console.log('bufview', bufView);
    
    
    //console.log('len', this.getplayers.allplayers.length);
    //for (var j = 0; j < this.getplayers.allplayers.length; j++)
    _.forEach(this.getplayers.allplayers, function(ply)
    {
        if (ply.instance)// && this.getplayers.allplayers[j].instance != "host")
        {
            //console.log('inst', ply.instance);//.userid);
            ply.instance.emit('onserverupdate', laststate);
            
            // clear socket's send buffer
            if (ply.instance && ply.instance.sendBuffer)
                ply.instance.sendBuffer.length = 0;
        }
    });

    // clear laststate
    //console.log('pre', laststate);
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
    //Fetch which client this refers to out of the two
    /*var player_client =
        (client.userid == this.players.self.instance.userid) ?
            this.players.self : this.players.other;*/
    // set default
    //var player_client;
    //console.log('1',client.userid);
    //console.log('2',this.players.self.instance.userid);
    if (!this.server && client.userid == this.players.self.instance.userid)
        player_client = this.players.self;//.instance.userid);
    else
    {
        //for (var i = 0; i < this.getplayers.allplayers.length; i++)
        _.forEach(this.getplayers.allplayers, function(player)
        {
            if (player.instance && player.instance.userid == client.userid)
            {
                //player_client = player;
                //Store the input on the player instance for processing in the physics loop
                player.inputs.push({inputs:input, time:input_time, seq:input_seq});
                return false;//break;
            }
        });
    }

    //Store the input on the player instance for processing in the physics loop
    //player_client.inputs.push({inputs:input, time:input_time, seq:input_seq});

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

game_core.prototype.client_handle_input = function(key){
    //if (glog)
    //console.log('## client_handle_input', this.keyboard.pressed('up'));

    if (this.players.self.vuln === true || this.players.self.active === false)
    {
        //console.log('player is vulnerable!');
        return;
    }
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
        this.keyboard.pressed('left') || key=='A') {

            //x_dir = -1;
            // y_dir = this.players.self.vy;//0.5;//1;
            // x_dir = this.players.self.vx;
            input.push('l');
                //alert('dirl start');

        } //left

    if( this.keyboard.pressed('D') ||
        this.keyboard.pressed('right') || key=='D') {

            //x_dir = 1;
            // y_dir = this.players.self.vy;//0.5;//1;
            // x_dir = this.players.self.vx;
            input.push('r');

        } //right

    if( this.keyboard.pressed('S') ||
        this.keyboard.pressed('down')) {

            //y_dir = 1;
            input.push('d');

        } //down

    if( this.keyboard.pressed('W') ||
        this.keyboard.pressed('up') || key=='u') {

            //y_dir = -1;
            //console.log('pressed u');
            // y_dir = this.players.self.vy;//0.5;//1;
            // x_dir = this.players.self.vx;
            input.push('u');

        } //up

    if( this.keyboard.pressed('space')) {

            //y_dir = -1;
            input.push('sp');

        } //up
    
    // we are 'faking' input to ensure player is *always* updated
    //if (input.length === 0) input.push('0');

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

        // release
        server_packet = null;

            //Return the direction if needed
            y_dir = this.players.self.vy;//0.5;//1;
            x_dir = this.players.self.vx;
        return this.physics_movement_vector_from_direction( x_dir, y_dir );

    } else {

        //return {x:0,y:0};
        return this.physics_movement_vector_from_direction( x_dir, y_dir );

    }

}; //game_core.client_handle_input

game_core.prototype.client_process_net_prediction_correction2 = function()
{
    //if (glog)
    console.log('## client_process_net_prediction_correction2', this.players.self.mp);
    //No updates...
    if(!this.server_updates.length) return;

    //The most recent server update
    var latest_server_data = this.server_updates[this.server_updates.length-1];

    //Our latest server position
    //var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;
    //console.log('bufferIndex', this.players.self.bufferIndex);
    
    var self_sp = new Int16Array(latest_server_data[this.players.self.mp], (this.players.self.bufferIndex * 16), 16);
    //console.log('self_sp', self_sp);
    
    var my_server_pos = {x:self_sp[0], y:self_sp[1]};
    //var my_server_pos = latest_server_data[this.players.self.mp];

    //console.log(this.players.self.cur_state.pos, my_server_pos);
    //console.log(this.players.self.pos, my_server_pos);
    if (_.isEqual(this.players.self.old_state.pos, this.players.self.cur_state.pos) !== true)
    {
    //else console.log('kkkk');
    
    //if (my_server_pos == this.players.self.cur_state.pos) return;
    //if (this.players.self.landed === 1) return;
            this.players.self.cur_state.pos = this.pos(my_server_pos);
            //this.players.self.last_input_seq = lastinputseq_index;
            //Now we reapply all the inputs that we have locally that
            //the server hasn't yet confirmed. This will 'keep' our position the same,
            //but also confirm the server position at the same time.
            this.client_update_physics();
            this.client_update_local_position();
    }

    self_sp = null;
    /*return;    

    //Update the debug server position block TODO: removed line below
    //this.ghosts.server_pos_self.pos = this.pos(my_server_pos);

    //here we handle our local input prediction ,
    //by correcting it with the server and reconciling its differences
    //var my_last_input_on_server = this.players.self.host ? latest_server_data.his : latest_server_data.cis;
    var my_last_input_on_server = latest_server_data[this.players.self.mis];
    //console.log('lastinputsrvr', my_last_input_on_server, latest_server_data[this.players.self.mis],my_server_pos);
    //console.log(this.players.self.inputs);
    
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
    //*/

}; //game_core.client_process_net_prediction_correction

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
    //console.log('bufferIndex', this.players.self.bufferIndex);
    
    var self_sp = new Int16Array(latest_server_data[this.players.self.mp], (this.players.self.bufferIndex * 16), 16);
    //console.log('self_sp', self_sp);
    
    var my_server_pos = {x:self_sp[0], y:self_sp[1]};
    //var my_server_pos = latest_server_data[this.players.self.mp];

    //Update the debug server position block TODO: removed line below
    //this.ghosts.server_pos_self.pos = this.pos(my_server_pos);

    //here we handle our local input prediction ,
    //by correcting it with the server and reconciling its differences
    //var my_last_input_on_server = this.players.self.host ? latest_server_data.his : latest_server_data.cis;
    var my_last_input_on_server = latest_server_data[this.players.self.mis];
    if(my_last_input_on_server)
    {
        //console.log('mylastinputonserver');
        
        //The last input sequence index in my local input list
        var lastinputseq_index = -1;
        //Find this input in the list, and store the index
        for(var i = 0; i < this.players.self.inputs.length; ++i)
        {
            if(this.players.self.inputs[i].seq == my_last_input_on_server)
            {
                lastinputseq_index = i;
                //console.log('lastinputseq_index', lastinputseq_index);
                
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

        //*
        else
        {
            if (_.isEqual(this.players.self.old_state.pos, this.players.self.cur_state.pos) !== true)
            {
            //console.log('kkkk');
            
            //if (my_server_pos == this.players.self.cur_state.pos) return;
            //if (this.players.self.landed === 1) return;
                //if (this.players.self.landed===2)
                //{
                    //console.log('landed...');
                    //console.log('dif', this.players.self.cur_state.pos.x - my_server_pos.x, this.players.self.cur_state.pos.y - my_server_pos.y);
                    
                    
                    //this.players.self.cur_state.pos = this.pos(my_server_pos);

                    this.players.self.cur_state.pos = 
                        this.v_lerp(this.players.self.pos, this.pos(my_server_pos), this._pdt * this.client_smooth);
                    //this.players.self.last_input_seq = lastinputseq_index;
                    //Now we reapply all the inputs that we have locally that
                    //the server hasn't yet confirmed. This will 'keep' our position the same,
                    //but also confirm the server position at the same time.
                    this.client_update_physics();
                    this.client_update_local_position();
                //}
            }
            
        }
        //*/

    } //if my_last_input_on_server

    self_sp = null;

}; //game_core.client_process_net_prediction_correction

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

game_core.prototype.client_process_net_updates = function()
{
    if (glog)
    console.log('## client_process_net_updates');//, this.client_predict);
    // for (var i = 0; i < this.getplayers.allplayers.length; i++)
    // {
    //     console.log('::', this.getplayers.allplayers[i].host, this.getplayers.allplayers[i].id);
    // }

    //No updates...
    if(!this.server_updates.length) return;

    var _this = this;

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
    //console.log(':', this.server_updates);
    

    //With no target we store the last known
    //server position and move to that instead
    //console.log('sup', this.server_updates.length);
    //console.log('targ', target);
    
    
    if(!target)
    {
        target = this.server_updates[0];
        previous = this.server_updates[0];
    }
    //console.log('target', typeof(target), target);
    //console.log('previous', previous);
    //Now that we have a target and a previous destination,
    //We can interpolate between then based on 'how far in between' we are.
    //This is simple percentage maths, value/target = [0,1] range of numbers.
    //lerp requires the 0,1 value to lerp to? thats the one.
     //console.log(target);
      //if (target.cp2.f == 1)
      //var test = new Int16Array(target.cp1, 0, Math.floor(target.cp1.byteLength/2));
    //   var len = target.cp1.byteLength;
    //   console.log('len',len);
      
      //console.log(target.cp1, 24, 1);
      //console.log('len', target.cp1.byteLength);
    //   for (var x=0; x < target.cp1.byteLength; x++)
    //     console.log(':', target.cp1[x]);
        
      
    //   var view = new Int16Array(target.cp1, 0, 12);//target.cp1.byteLength);//, len);//, Math.floor(target.cp1.byteLength/2));
    //   console.log(view);
      //console.log(view.getInt16(1, false));
      
    //   console.log(view.getUint16(1));//.getInt16(1));//typeof(target.cp1), target.cp1.length);//.getInt16(1));
     if(target && previous)
     {

        this.target_time = target.t;

        var difference = this.target_time - current_time;
        var max_difference = (target.t - previous.t).fixed(3);
        var time_point = (difference/max_difference).fixed(3);

        //Because we use the same target and previous in extreme cases
        //It is possible to get incorrect values due to division by 0 difference
        //and such. This is a safe guard and should probably not be here. lol.
        // if( isNaN(time_point) ) time_point = 0;
        // if(time_point == -Infinity) time_point = 0;
        // if(time_point == Infinity) time_point = 0;

        if (Number.isNaN(time_point) || Math.abs(time_point) === Number.POSITIVE_INFINITY)
            time_point = 0;

        // store globally
        this.time_point = time_point;

        //console.log(time_point);

        //The most recent server update
        var latest_server_data = this.server_updates[ this.server_updates.length-1 ];

        //These are the exact server positions from this tick, but only for the ghost
        // var other_server_pos = this.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        //var other_server_pos2 = [];
        //var other_target_pos2 = [];
        //var other_past_pos2 = [];
        //*
        var ghostStub;
        //console.log('->:', target.cp1[0], this.players.self.x);
        
        //console.log('len', this.getplayers.allplayers.length, this.players.self.mp);
        //for (var j = 0; j < this.getplayers.allplayers.length; j++)
        var vt; // view target
        var vp; // view previous
        var lerp_t={x:NaN,y:NaN};// = {x:0, y:0};
        var lerp_p={x:NaN,y:NaN};// = {x:0, y:0};
        var self_pp;
        var self_tp;
        _.forEach(this.getplayers.allplayers, function(player, index)
        {
            if (player != _this.players.self)// && previous[player.mp])
            {
                //console.log('**', target[player.mp]);
                // check for bad objects
                if (target[player.mp] == undefined || previous[player.mp] == undefined) return false;
                //try{
                vt = new Int16Array(target[player.mp], (index * 16), 16);//, len);//, Math.floor(target.cp1.byteLength/2));
                //}catch(err){console.log(err, index, target[player.mp]);}
                vp = new Int16Array(previous[player.mp], (index * 16), 16);
                  //console.log(vt);
                  //console.log(vp);

                  // check for invalid values (bad socket?)
                  //if (!(vt[0]>0)) return;
                  
                //   console.log(view.getUint16(1));//.getInt16(1));//typeof(target.cp1), target.cp1.length);//.getInt16(1));

                // other_server_pos2=latest_server_data[player.mp];
                // other_target_pos2=latest_server_data[player.mp];
                // other_past_pos2=latest_server_data[player.mp];
                // console.log('*', previous[player.mp]);
                var p = {}; // temp player obj
                p.pos = {}; // temp pos
                
                p.pos.x = parseInt(vt[0]);//target[player.mp].x;
                p.pos.y = parseInt(vt[1]);//target[player.mp].y;

                lerp_t.x = parseInt(vt[0]);
                lerp_t.y = parseInt(vt[1]);

                lerp_p.x = parseInt(vp[0]);
                lerp_p.y = parseInt(vp[1]);

                ghostStub = _this.v_lerp(
                    lerp_p,
                    lerp_t,
                    time_point
                );
                //console.log(player.mp, player.pos);
                
                /*ghostStub = _this.v_lerp(
                    previous[player.mp],
                    target[player.mp],
                    time_point
                );*/
                //console.log('pos', player.pos);
                
                //console.log(previous[player.mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this._pdt*this.client_smooth);
                //console.log(p.pos);

                //if (ghostStub.x > 0 && ghostStub.y > 0)
                //if (p.pos.x > 0 && p.pos.y > 0)
                    //player.pos = p.pos;
                    player.pos = _this.v_lerp(p.pos, ghostStub, _this._pdt * _this.client_smooth);
                //else
                //{ 
                    //window.alert(p.pos);
                    //return;
                //}
                //player.pos = _this.v_lerp(p.pos, ghostStub, _this._pdt * _this.client_smooth);

                player.dir = vt[2];
                player.flap = (vt[3] === 1) ? true : false;
                player.landed = vt[4];
                player.vuln = (vt[5] === 1) ? true : false;
                player.a = vt[6];
                player.vx = vt[7];
                player.vy = vt[8];
                player.hasFlag = vt[9];
                player.bubble = (vt[10] === 1) ? true : false;
                player.visible = (vt[11] === 1) ? true : false;
                player.bufferIndex = index;// -> vt[12]
                //player.dead = (vt[13] == 1) ? true : false;
                //console.log(Boolean(player.flap));
                //console.log('set playerIndex', vt[11]);

                // if (player.killedBy > 0)
                // {
                //     console.log('**** killing player', vt[11]);
                    
                //     //player.doKill();
                // }

                /*
                // get direction
                //if (target[player.mp])//.d == 1)
                player.dir = target[player.mp].d;
                player.flap = target[player.mp].f;
                player.landed = target[player.mp].l;
                player.vuln = target[player.mp].v;
                //player.abil = target[player.mp].a;
                player.hasFlag = target[player.mp].g;
                player.vx = target[player.mp].vx;
                player.vy = target[player.mp].vy;
                player.bubble = target[player.mp].b;
                //*/
                //console.log(this.getplayers.allplayers[j].pos);
            }
            else
            {
                var self_vt = new Int16Array(target[player.mp], (index * 16), 16);//, len);//, Math.floor(target.cp1.byteLength/2));
                var self_vp = new Int16Array(previous[player.mp], (index * 16), 16);
                //console.log('vt.len', self_vt, self_vp);

                self_tp = {x:parseInt(self_vt[0]), y:parseInt(self_vt[1])};
                self_pp = {x:parseInt(self_vp[0]), y:parseInt(self_vp[1])};
                player.bufferIndex = index;
                //console.log('vt', self_vt);
                

                //*
                //player.dir = vt[2];
                //player.flap = (vt[3] === 1) ? true : false;
                //if (this.players){
                // _this.players.self.landed = self_vt[4];
                _this.players.self.vuln = (self_vt[5] === 1) ? true : false;
                //player.a = vt[6];
                //player.vx = vt[7];
                //player.vy = vt[8];
                _this.players.self.hasFlag = self_vt[9];
                _this.players.self.bubble = (self_vt[10] === 1) ? true : false;
                _this.players.self.visible = (self_vt[11] === 1) ? true : false;
                _this.players.self.bufferIndex = index;// -> vt[12]
                //_this.players.self.team = self_vt[13];
                //}
                //*/

                // check for invalid values (bad socket?)
                // if (!(self_vt[0] > 0)) 
                // {
                //     self_tp.x = _this.players.self.pos.x;
                //     self_tp.y = _this.players.self.pos.y;
                //     self_pp.x = self_tp.x;
                //     self_pp.y = self_tp.y;
                // }

                //player.pos.x = self_vt[0];//target[player.mp].x;
                //player.pos.y = self_vt[1];//target[player.mp].y;
                //console.log('MEMEMEMEMEMEME', self_pp);
            }

            // for (var k in vt) 
            // {
            //     vt[k] = null;
            // }

            /*
            vt = null;
            vp = null;
            self_vt = null;
            self_vp = null;
            */
        });
        
        // console.log(other_server_pos2);
        //*/
        //var pos;
        //for (var k = 0; k < this.platforms.length; k++)
        /*_.forEach(this.platforms, function(plat)
        {
            // if provided, omit local player (triggerer: .p/.mp) who 'triggered' the effect;
            // we'll manage the platform physics locally
            if (target[plat.id] && (target[plat.id].p != _this.players.self.mp))
            {
                //console.log('NET UPDATE', target[plat.id], this.players.self.mp);
                // if (previous[plat.id] === undefined)
                // {
                //     console.log('cont!', target, previous);//target[plat.id]);
                //     console.log(previous['undefined']);
                //     previous[plat.id] = previous[undefined]
                //     //continue;
                // }
                ghostStub = _this.v_lerp(
                    previous[plat.id],//other_past_pos2,
                    target[plat.id],//other_target_pos2,
                    time_point
                );
                //console.log(previous[this.getplayers.allplayers[j].mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this._pdt*this.client_smooth);
                pos = _this.v_lerp({x:plat.x,y:plat.y}, ghostStub, _this._pdt * _this.client_smooth);
                //console.log(target[plat.id]);
                plat.x = pos.x;// target[plat.id].x;
                plat.y = pos.y;//target[plat.id].y;
                plat.r = target[plat.id].r;
                plat.setState(target[plat.id].s);
                plat.type = target[plat.id].t;
                plat.triggerer = target[plat.id].p;
            }
        });*/

        // process flags
        /*
        _.forEach(this.config.flagObjects, function(flag)
        {
            //console.log(target);
            if (target[flag.id])// && (target[plat.id].p != _this.players.self.mp))
            {
                /*
                //console.log(flag.x,flag.y);
                ghostStub = _this.v_lerp(
                    previous[flag.id],
                    target[flag.id],
                    time_point
                );
                //console.log(previous[this.getplayers.allplayers[j].mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this._pdt*this.client_smooth);
                pos = _this.v_lerp({x:flag.x,y:flag.y}, ghostStub, _this._pdt * _this.client_smooth);
                *//*
                console.log(target[flag.id]);
                flag.x = pos.x;// target[flag.id].x;
                flag.y = pos.y;//target[flag.id].y;
                flag.type = target[flag.id].t;
                flag.isHeld = target[flag.id].h;
                flag.isPlanted = target[flag.id].p;
                flag.heldBy = target[flag.id].b;
                flag.visible = target[flag.id].v;
                //flag.carryingFlag = JSON.parse(target[flag.id].c);
                console.log('::', flag.type, flag.x);//, flag.y);
            }
        });
        //*/

        // process events
        //console.log('got evt flag', _.has(target, 'fc'), this.events.length);
        // first, check for chest events (dynamic)
        if (_.has(target, 'ec'))
        {
            // avoid reduncancy
            if (!target.ec) return false;

            //console.log('got chest event', this.events, target.ec);
            _this.addChest(target.ec);
            // clear it to avoid duplicate reads
            target.ec = null;
        }
        if (_.has(target, 'fc'))
        {
            //console.log('* fc evt', target.fc);

            // get client flag (clientCooldown)
            var cflag = _.find(_this.clientCooldowns, {'name':target.fc.f});
            cflag.heldBy = target.fc.p;
            cflag.timer = target.fc.t;

            // get flag obj
            var flag = _.find(this.config.flagObjects, {'name':target.fc.f});

            // set client flag target slot
            cflag.target = flag.targetSlot;
            cflag.src = flag.sourceSlot;
            //console.log(":::", cflag);
            //console.log('flag', flag);
            //cflag.

            // get player
            var ply = _.find(this.getplayers.allplayers, {"mp":target.fc.p});
            if (ply)
            {
                if (cflag.name == "midFlag") ply.hasFlag = 1; // mid
                else if (cflag.name == "redFlag") ply.hasFlag = 2; // red
                else if (cflag.name == "blueFlag") ply.hasFlag = 3; // blue

                //console.log('ply hasFlag', ply.hasFlag);

                //console.log('* flg', flag);
                //console.log('* player', ply);
            }
            else console.warn("unable to retrieve player by flag held", target.fc);
            //if (player)
            //player.carryingFlag.timer = target.fc.t;
        }
        if (_.has(target, 'fs'))
        {
            //console.log('has flagslotted cd evt');
            console.log('* fs evt', target.fs);
            // get client flag (clientCooldown)
            /*var cflag = _.find(_this.clientCooldowns, {'name':target.fs.f});
            cflag.timer = target.fs.t;
            console.log('cflag', cflag);*/
            var flg = _.find(this.config.flagObjects, {'name':target.fs.f});
            flg.timer = target.fs.t;//cflag.timer;

            // add flg.isActive check to ensure it runs only once
            if (target.fs.t === 0 && flg.isActive === false)
            {
                console.log('* fs evt = 0!');

                flg.isActive = true;
                flg.onCooldown = false;
                //this.isHeld = false;
            }
            //console.log('flag', flg);
            //cflag.heldBy = target.fc.p;

            // if (flag.timer === 0)
            // {
            //     flag.timer = NaN
            // }
        }
        /*_.forEach(this.events, function(evt)
        {
            console.log('targ', target[evt.id]);
            if (target[evt.id] == evt.id)
            {
                console.log('* got event', evt);
            }
        });*/

        // smoothly follow client's destination position
        //console.log('self', this.players.self.pos);
        
        // check for invalid values (bad socket?)
        // if (!(self_tp.x > 0))
        //     this.players.self.playerName = "x: " + self_tp.x;
        // else if (!(self_tp.y > 0))
        //     this.players.self.playerName = "y: " + self_tp.y;
        //console.log(self_tp);
        
        //if (self_tp.x > 0 && self_tp.y > 0 && self_pp.x > 0 && self_pp.y > 0)//!= undefined && self_pp[0] != undefined) 
        //{
            // TODO: bug below - "self_pp" is undefined
            if (self_pp && self_tp)// && self_tp.x > 0 && self_tp.y > 0 && self_pp.x > 0 && self_pp.y > 0)
            {
            this.players.self.pos =
                this.v_lerp(this.players.self.pos,
                this.v_lerp(self_pp, self_tp, this._pdt*this.client_smooth),
                this._pdt*this.client_smooth
            );
            }
        //}
        //else this.players.self.pos = this.players.self.old_state;
        //console.log('self2', this.players.self.pos);
        
        /*
        this.players.self.pos =
            this.v_lerp(this.players.self.pos,
            this.v_lerp(previous[this.players.self.mp], target[this.players.self.mp], this._pdt*this.client_smooth),
            this._pdt*this.client_smooth
        );
        */

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

game_core.prototype.addChest = function(chest)
{
    //console.log('adding chest...', chest);

    if (this.server)
    {
        var game_chest_server = require('./class.chest');
        this.chests.push(new game_chest_server(chest, false, this.getplayers, this.config));
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

game_core.prototype.client_onserverupdate_recieved = function(data)
{
    //if (glog)
    //console.log('## client_onserverupdate_recieved', data);
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
    this.config.server_time = data.t;
    //Update our local offset time from the last server update
    this.client_time = this.config.server_time - (this.net_offset/1000);

    //One approach is to set the position directly as the server tells you.
    //This is a common mistake and causes somewhat playable results on a local LAN, for example,
    //but causes terrible lag when any ping/latency is introduced. The player can not deduce any
    //information to interpolate with so it misses positions, and packet loss destroys this approach
    //even more so. See 'the bouncing ball problem' on Wikipedia.

    // if (data[this.players.self.mp])
    // {
    //     console.log('me:', data[this.players.self.mp]);
        
    // }
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

 //if(this.client_predict)
 //{
     if (glog)
     console.log('## client_update_local_position');

        //Work out the time we have since we updated the state
        var t = (this.local_time - this.players.self.state_time) / this._pdt;

        //Then store the states for clarity,
        var old_state = this.players.self.old_state.pos;
        //if ()
        var current_state = this.players.self.cur_state.pos;
        //console.log("old", old_state, "current", current_state);
        //Make sure the visual position matches the states we have stored
        //this.players.self.pos = this.v_add( old_state, this.v_mul_scalar( this.v_sub(current_state,old_state), t )  );
        //console.log(current_state.d);

        // TODO: Uncomment below if client pos mismatch
        /*
        this.players.self.pos = current_state;
        //*/

        //We handle collision on client if predicting.
        //if (this.players.self.landed === 1)
        this.check_collision( this.players.self );

    //}  //if(this.client_predict)

}; //game_core.prototype.client_update_local_position

game_core.prototype.client_update_physics = function()
{
    if (glog)
    console.log('## client_update_physics');
    //Fetch the new direction from the input buffer,
    //and apply it to the state so we can smooth it in the visual state

    //if(this.client_predict)
    //{

        this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
        var nd = this.process_input(this.players.self);
        //if (nd.x === 0 && nd.y == 0)
            //this.players.self.update();
        //else 
        this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.local_time;
        
        //console.log('nd', nd);
        
        //this.players.self.update();

    //}

    // platform collisions (minus player)
    //for (var j = 0; j < this.platforms.length; j++)
    /*_.forEach(this.platforms, function(plat)
    {
        //if (this.platforms[j].state !== this.platforms[j].STATE_INTACT)
        //{
            plat.check_collision();
        //}
    });*/
}; //game_core.client_update_physics

game_core.prototype.client_update = function()
{
    if (glog)
    console.log('## client_update');
    //console.log(this.viewport);
    if (this.players.self.mp == "hp") return;

    var _this = this;

    //////////////////////////////////////////
    // Camera
    //////////////////////////////////////////
    // Clear the screen area (just client's viewport, not world)
    // if player stopped, use last camera pos
    // TODO: lerp camera movement for extra smoothness
    if (this.players.self.landed !== 1)// && this.players.self.pos.x > 0)
    {
        var pad = 0;
        this.cam.x = clamp(-this.players.self.pos.x + this.viewport.width/2, -(this.config.world.width - this.viewport.width) - pad, pad);//this.this.config.world.width);
        this.cam.y = clamp(-this.players.self.pos.y + this.viewport.height/2, -(this.config.world.height - this.viewport.height) - pad, pad);//this.game.world.height);
        //this.cam.x = parseInt(camX);
        //this.cam.y = parseInt(camY);
    }
    /*if (this.barriers)
    {
        var bctx = this.barriers.getContext('2d');
        bctx.save();
        bctx.translate(-this.cam.x, -this.cam.y);
        bctx.restore();
    }*/
    //console.log(this.cam.x,this.cam.y);
    // +100 accounts for -50 padding offset along the edge of world
    //console.log(this.players.self.pos.x, (this.viewport.width/2));
    this.ctx.clearRect(-this.cam.x,-this.cam.y,this.viewport.width+128, this.viewport.height+128);//worldWidth,worldHeight);

    // flash bang
    if (this.flashBang > 0)
    {
        // TODO: break this up into smaller rects
        console.log('flashbang');
        //*
        this.ctx.beginPath();
        if (this.flashBang === 1)
        this.ctx.fillStyle = 'white';
        else this.ctx.fillStyle = 'red';
        this.ctx.rect(-this.cam.x,-this.cam.y,this.viewport.width+128,this.viewport.height+128);
        this.ctx.fill();
        this.ctx.closePath();
        //*/
        this.flashBang = 0;
    }

    //draw help/information if required
    // this.client_draw_info();

    // draw prerenders
    //console.log(this.canvas2, this.bg, this.barriers, this.fg);
    if (this.bg)
    {
        this.ctx.drawImage(this.bg, 0, 0); // tiled bg layer
    }
    if (this.fg)
    {
    //this.ctx.drawImage(this.canvas2, 0,0); // orbs
    this.ctx.drawImage(this.barriers, 0, 0); // tiled barriers layer
    this.ctx.drawImage(this.fg, 0, 0); // tiled fg layer
    //this.ctx.drawImage(this.canvasPlatforms, 0, 0); // platforms
    }

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

    //////////////////////////////////////////
    // Draw Players
    //////////////////////////////////////////
    //Now they should have updated, we can draw the entity
    //this.players.other.draw();
    //for (var i = 0; i < this.getplayers.allplayers.length; i++)
    // TODO: Only draw 'onscreen' players
    // console.log('p', this.players.self.pos);
    
    //console.log('cam', this.players.self.mp, this.cam.y, this.viewport.height);
    //console.log(':',this.players.self.pos.x + this.cam.x, (this.players.self.pos.x + this.cam.x)*2);//, this.players.self.pos.y)
    _.forEach(this.getplayers.allplayers, function(ply)
    {
        if (ply != _this.players.self)// && this.getplayers.allplayers[i].active===true)
        {
            // console.log(ply.pos);
            //ply.draw();
            if 
            (
                // ply is *above* local player
                (ply.pos.y + _this.cam.y + ply.size.hy > 0)
                &&
                // ply is *below* local player
                (ply.pos.y + _this.cam.y - ply.size.hy) <= _this.viewport.height//(_this.players.self.pos.y + _this.cam.y) * 2
                /* || 
                (
                    _this.players.self.pos.y + _this.cam.y <= 
                    ((_this.players.self.pos.y + _this.cam.y) * 2) 
                    && 
                    (_this.players.self.pos.y + _this.cam.y) > 0
                ) */
                &&
                // ply is visible left of local player
                (ply.pos.x + _this.cam.x - ply.size.hx) <= _this.viewport.width
                //ply.pos.x + (Math.abs(_this.cam.x) * 2) < _this.players.self.pos.x
                &&
                // ply is visible right of local player
                (ply.pos.x + _this.cam.x + ply.size.hx > 0)
            )//<= _this.players.self.pos.y + _this.cam.y)
            {
                ply.draw();
                //if (ply.mp == "cp1")console.log(ply.pos.x, _this.cam.x, _this.players.self.pos.x, _this.viewport.width);
            }
            //else if (ply.mp == "cp1")console.log('not drawing', ply.pos.x, _this.cam.x, _this.players.self.pos.x);//, _this.cam.y, _this.players.self.pos.y);
        }
    });

    //When we are doing client side prediction, we smooth out our position
    //across frames using local input states we have stored.
    this.client_update_local_position();

    //And then we finally draw
    this.players.self.draw();

    // platforms
    //for (var j = 0; j < this.platforms.length; j++)
    /*_.forEach(this.platforms, function(plat)
    {
        if (plat.state !== plat.STATE_INTACT)
            plat.draw();
    });*/

    // spritesheets
    //for (var k = 0; k < this.spritesheets.length; k++)
    _.forEach(this.spritesheets, function(ss)
    {
        //if (this.spritesheets[k].state !== this.spritesheets[k].STATE_INTACT)
        ss.update();
    });

    // chests
    _.forEach(this.chests, function(chest)
    {
        chest.draw();
    });

    // flags
    _.forEach(this.config.flagObjects, function(flagObj)
    {
        //console.log('fobj', flagObj.type, flagObj.name, flagObj.x, flagObj.y);
        if (flagObj.type == "flag")
            flagObj.draw();
    });


    //this.ctx.save();
    this.ctx.setTransform(1,0,0,1,0,0);//reset the transform matrix as it is cumulative
    //this.ctx.clearRect(0, 0, this.this.viewport.width, this.this.viewport.height);//clear the viewport AFTER the matrix is reset

    //Clamp the camera position to the world bounds while centering the camera around the player
    //var camX = clamp(-this.players.self.pos.x + this.viewport.width/2, -(this.config.world.width - this.viewport.width) - 50, 50);//this.this.config.world.width);
    //var camY = clamp(-this.players.self.pos.y + this.viewport.height/2, -(this.config.world.height - this.viewport.height) - 50, 50);//this.game.world.height);
    //console.log(camX, camY, -this.game.players.self.pos.x + this.game.viewport.width/2);
    this.ctx.translate( this.cam.x, this.cam.y );
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
        // TODO: *** By default this fnc is run by both server AND client
        //if (this.server)
            this.update_physics();
    }.bind(this), 15);

}; //game_core.client_create_physics_simulation


game_core.prototype.client_create_ping_timer = function() {
        //Set a ping timer to 1 second, to maintain the ping/latency between
        //client and server and calculated roughly how our connection is doing

    setInterval(function(){

        this.last_ping_time = new Date().getTime() - this.fake_lag;
        this.socket.send('p.' + (this.last_ping_time) );

    }.bind(this), 250);

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
    this.config.server_time = 0.01;            //The time the server reported it was at, last we heard from it

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

    console.log('Am I Host?', this.players.self.mp, this.players.self.host, this.getplayers.allplayers.length);
    //if (this.players.self.host === true) this.players.self.pos.y = -1000;
    //*
    for (var i = 0; i < this.getplayers.allplayers.length; i++)
    {
        //console.log('pos:', this.getplayers.allplayers[i].pos, this.getplayers.allplayers[i].instance);
        // this.getplayers.allplayers[i].pos = this.getplayers.allplayers[i].pos;

        this.getplayers.allplayers[i].old_state.pos = this.pos(this.getplayers.allplayers[i].pos);
        this.getplayers.allplayers[i].pos = this.pos(this.getplayers.allplayers[i].pos);
        this.getplayers.allplayers[i].cur_state.pos = this.pos(this.getplayers.allplayers[i].pos);
        this.getplayers.allplayers[i].draw();
    }
    //*/

    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;

    //Host always spawns at the top left.
    player_host.pos = { x:20,y:20 };
    player_client.pos = { x:500, y:200 };*/
    console.log(this.players.self.pos);
    /*if (this.players.self.pos.x === 0 && this.players.self.pos.y === 0)
    {
        // spawn
        console.log('player spawned!');
        // position based on team
        if (this.players.self.team == 'blue')
        {

        }
        else
        {
            console.log('pspawn!');
            this.players.self.old_state.pos = this.pos(this.players.self.pos);
            this.players.self.pos = this.gridToPixel(2, 31);
            this.players.self.cur_state.pos = this.pos(this.players.self.pos);
        }
    }
    else
    {*/
        //Make sure the local player physics is updated
        this.players.self.old_state.pos = this.pos(this.players.self.pos);
        this.players.self.pos = this.pos(this.players.self.pos);
        this.players.self.cur_state.pos = this.pos(this.players.self.pos);
        this.players.self.draw();
    /*}
    console.log(this.players.self.pos);*/

    //Position all debug view items to their owners position
    /*this.ghosts.server_pos_self.pos = this.pos(this.players.self.pos);

    this.ghosts.server_pos_other.pos = this.pos(this.players.other.pos);
    this.ghosts.pos_other.pos = this.pos(this.players.other.pos);*/

}; //game_core.client_reset_positions

game_core.prototype.client_onreadygame = function(data) {
    //if (glog)
    console.log('## client_onreadygame', data);

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

    //this.players.self.state = 'YOU ' + this.players.self.state;
    //this.players.self.draw();
    //console.log(this.players.self.game.orbs);

    //Make sure colors are synced up
     //this.socket.send('c.' + this.players.self.color);

}; //client_onreadygame

game_core.prototype.resizeCanvas = function()
{
    // http://stackoverflow.com/questions/33515707/scaling-a-javascript-canvas-game-properly
    // https://jsfiddle.net/blindman67/fdjqoj04/
    if (this.viewport == undefined) return;
    console.log('resizeCanvas', this.viewport.width, this.viewport.height, window.innerWidth, window.innerHeight);

    // finally query the various pixel ratios
    var ratio = window.devicePixelRatio;

    //var ctx = this.viewport.getContext('2d');
    //ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // var devicePixelRatio, backingStoreRatio,ratio;
    // devicePixelRatio = window.devicePixelRatio || 1,
    // backingStoreRatio = context.webkitBackingStorePixelRatio ||
    //                     context.mozBackingStorePixelRatio ||
    //                     context.msBackingStorePixelRatio ||
    //                     context.oBackingStorePixelRatio ||
    //                     context.backingStorePixelRatio || 1,
    //
    // ratio = devicePixelRatio / backingStoreRatio;

    var winWidth = window.innerWidth;
    var winHeight = window.innerHeight;
    /*
    var w2hRatio = winWidth / winHeight;
    var newWidth2Height = winWidth / winHeight;

    var widthToHeight = 4 / 3;

    if (newWidth2Height > widthToHeight)
    {
        winWidth = winHeight * widthToHeight;
    }
    else winHeight = winWidth / widthToHeight;
    //*/

    this.viewport.width = winWidth;// * ratio;
    this.viewport.height = winHeight;// * ratio;
    this.viewport.style.width = this.viewport.width;
    this.viewport.style.height = this.viewport.height;
};

game_core.prototype.client_onplayernames = function(data)
{
    var data = JSON.parse(data);
    console.log("== client_onplayernames", data, "==");
    // console.log('len', data.length);

    var p;
    // if object, we are updating other clients of new player
    if (!Array.isArray(data))
    {
        console.log('updating extant clients...');
        
        p = _.find(this.getplayers.allplayers, {'mp':data.mp});
        if (p.playername)
            p.playerName = data.name;
        if (data.skin)
            p.setSkin(data.skin);
    }
    else // otherwise, array will update new client about *all* existing players
    {

        for (var i = 0; i < data.length; i++)
        {
            p = _.find(this.getplayers.allplayers, {'mp':data[i].mp});
            if (p)
            {
                console.log('* settings player', data[i].name, data[i].team, data[i].skin);
                if (data[i].name != undefined)
                    p.playerName = data[i].name;
                if (data[i].team > 0 && p.team === 0)
                    p.team = parseInt(data[i].team);
                if (data[i].skin != "")
                    p.setSkin(data[i].skin);
            }
            console.log('p', p);
        }

        // activate player
        this.players.self.active = true;
        this.players.self.visible = true;
        this.players.self.vuln = false;
        console.log("* my player name", assets.playerName);
        if (assets.playerName !== undefined)
            this.players.self.playerName = assets.playerName;
        else console.log("* player name is undefined", this.players.self.playerName);
        if (assets.playerSkin)
            this.players.self.setSkin(assets.playerSkin);
        // set playerName here
    }
};

game_core.prototype.client_onjoingame = function(data)
{
    //if (glog)
    console.log('## client_onjoingame', data);// (player joined is not host: self.host=false)');

    var _this = this;

    // console.log('derek', data);

    var alldata = data.split("|");

    this.mp = alldata[0];
    this.gameid = alldata[1];
    //console.log('1',alldata[0]);
    //console.log('2',alldata[1]);
    console.log(alldata[2]);
    //this.orbs = JSON.parse(alldata[2]);
    var chests = JSON.parse(alldata[2]);
    //console.log('chestz',this.chests);

    var team = parseInt(alldata[3]);
    var playerName = alldata[4];
    //console.log('playerName', playerName);
    
    //assets.playerName = playerName;
    var flags = JSON.parse(alldata[5]);
    //console.log('# startpos', startpos);

    //console.log('3',alldata[2]);

    console.log('len', this.getplayers.allplayers.length);
    //console.log('vp', this.viewport);

    //We are not the host
    // this.players.self.host = false;
    // //Update the local state
    // this.players.self.state = 'connected.joined.waiting';
    // this.players.self.info_color = '#00bb00';

    for (var i = 0; i < this.getplayers.allplayers.length; i++)
    {
        console.log("----->", this.getplayers.allplayers[i].mp, this.getplayers.allplayers[i].team);//.instance);
        console.log( (this.getplayers.allplayers[i].instance) ? this.getplayers.allplayers[i].instance.userid : 'no instance');
        //, this.getplayers.allplayers[i].instance.userid);//, data);
        //if (this.getplayers.allplayers[i].mp == data.mp && data.me)//.instance && this.getplayers.allplayers[i].instance.userid == data)
        if (this.getplayers.allplayers[i].mp == alldata[0])//'cp1')
        {
            console.log('## found player', alldata[0], this.getplayers.allplayers[i]);
            //console.log(this.getplayers.allplayers[i].instance.userid);
            //console.log(this.getplayers.allplayers[i].instance.hosting);
            //this.players.self.md = this.getplayers.allplayers[i].md;
            //this.players.self.mis = this.getplayers.allplayers[i].mis;
            //if (team > 0)
            this.getplayers.allplayers[i].team = team;
            if (playerName && playerName.length > 2)
                this.getplayers.allplayers[i].playerName = playerName;
            /*/ set start position
            if (team == 1)
                this.getplayers.allplayers[i].pos = this.gridToPixel(2, 2);
            else this.getplayers.allplayers[i].pos = this.gridToPixel(47, 25);
            */
            this.getplayers.allplayers[i].active = true;
            //this.getplayers.allplayers[i].playerName = "Jouster";
            // if self.mp == "hp", player is the NEW player!
            if (this.players.self.mp == "hp")
            {
                console.log("assinging new client to players.self", this.players.self.mp)
                // this.getplayers.allplayers[i].isLocal = true;
                // this.players.self = this.getplayers.allplayers[i];
                // this.players.self.active = false;
                // this.players.self.visible = true;
                // this.players.self.dead = false;
                // this.players.self.vuln = false;
                // this.players.self.landed = 0;
                // get other players' names
                //this.socket.emit('message', {data:"n.hello!"});
                // this.socket.emit('message', 'n.' + this.players.self.mp + '.' + this.gameid);
                /*
                var url = "http://localhost:4004/api/playernames/";
                console.log('* api call');//, this.players.self.instance);//.instance.game);
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", url, true);
                xmlhttp.setRequestHeader("Content-type", "application/json");
                //xmlhttp.setRequestHeader("X-Parse-Application-Id", "VnxVYV8ndyp6hE7FlPxBdXdhxTCmxX1111111");
                //xmlhttp.setRequestHeader("X-Parse-REST-API-Key","6QzJ0FRSPIhXbEziFFPs7JvH1l11111111");
                xmlhttp.send('');//{gameId:this.players.self.});

                xmlhttp.onreadystatechange = function ()
                { //Call a function when the state changes.
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
                    {
                        //alert(xmlhttp.responseText);
                        //console.log('data', xmlhttp.responseText);
                        //return xmlhttp.responseText;
                        self.tilemap = xmlhttp.responseText;
                        self.tilemapper();
                        self.prerenderer();
                        //self.buildPlatforms();
                    }
                };
                
                //*/
                //console.log(this.players.self);
            }
            //else console.log("SELF:", this.players.self);
        }
        else if (this.getplayers.allplayers[i].mp == 'hp')
        {
            //this.players.host = this.getplayers.allplayers[i];
            console.log('remove host client', i, this.getplayers.allplayers[i].host);
            this.getplayers.allplayers.splice(i, 1);
        }
        // else if (this.getplayers.allplayers[i].instance.hosting)
    }

    _.forEach(chests, function(chest)
    {
        _this.chests.push(new game_chest(chest, true, _this.getplayers, _this.config));
    });

    var cflag;
    //console.log('flags', flags, this.config.flagObjects);
    this.config.preflags = [];
    _.forEach(flags, function(flag)
    {
        cflag = _.find(_this.config.flagObjects, {'name': flag.name});
        //console.log('cflag', cflag);
        if (cflag)
            cflag.visible = flag.visible;
        else _this.config.preflags.push(flag);
    });

    // console.log('local player mp =', this.players.self.mp);
    // set mp val
    // this.players.self.mp = 'cp' + this.getplayers.allplayers.length;
    // this.players.self.mis = 'cis' + this.getplayers.allplayers.length;
    // TODO: Remove below
    // this.players.other.mp = 'hp';
    // this.players.other.mis = 'his';

    // get orbs
    //this.socket.send('p.' + 'derekisnew' );
    //this.socket.send('c.' + 'derekcolor');
    //console.log('instance', this.socket);//this.players.self.gameid);
    // this.api();

    // create prerenders
    //this.prerenderer();

    //this.resizeCanvas();
    //Make sure the positions match servers and other clients
    //this.client_reset_positions();
}; //client_onjoingame

game_core.prototype.client_onhostgame = function(data) 
{
    console.log('## client_onhostgame', data);// (player joined is not host: self.host=false)');
    var _this = this;

    // console.log('derek', data);

    var alldata = data.split("|");

    this.mp = alldata[0];
    this.gameid = alldata[1];
    //console.log('1',alldata[0]);
    //console.log('2',alldata[1]);
    console.log(alldata[2]);
    //this.orbs = JSON.parse(alldata[2]);
    var chests = JSON.parse(alldata[2]);
    //console.log('chestz',this.chests);

    var team = parseInt(alldata[3]);
    var playerName = alldata[4];
    var flags = JSON.parse(alldata[5]);
    //console.log('# startpos', startpos);

    //console.log('3',alldata[2]);

    console.log('len', this.getplayers.allplayers.length);
    //console.log('vp', this.viewport);

    //We are not the host
    this.players.self.host = false;
    //Update the local state
    this.players.self.state = 'connected.joined.waiting';
    this.players.self.info_color = '#00bb00';

    for (var i = 0; i < this.getplayers.allplayers.length; i++)
    {
        console.log("----->", this.getplayers.allplayers[i].mp, this.getplayers.allplayers[i].team);//.instance);
        console.log( (this.getplayers.allplayers[i].instance) ? this.getplayers.allplayers[i].instance.userid : 'no instance');
        //, this.getplayers.allplayers[i].instance.userid);//, data);
        //if (this.getplayers.allplayers[i].mp == data.mp && data.me)//.instance && this.getplayers.allplayers[i].instance.userid == data)
        if (this.getplayers.allplayers[i].mp == alldata[0])//'cp1')
        {
            console.log('## found player', alldata[0], this.getplayers.allplayers[i]);
            //console.log(this.getplayers.allplayers[i].instance.userid);
            //console.log(this.getplayers.allplayers[i].instance.hosting);
            //this.players.self.md = this.getplayers.allplayers[i].md;
            //this.players.self.mis = this.getplayers.allplayers[i].mis;
            //if (team > 0)
            this.getplayers.allplayers[i].team = team;
            this.getplayers.allplayers[i].playerName = playerName;
            /*/ set start position
            if (team == 1)
                this.getplayers.allplayers[i].pos = this.gridToPixel(2, 2);
            else this.getplayers.allplayers[i].pos = this.gridToPixel(47, 25);
            */
            this.getplayers.allplayers[i].active = true;
            //this.getplayers.allplayers[i].playerName = "Jouster";
            // if self.mp == "hp", player is the NEW player!
            if (this.players.self.mp == "hp")
            {
                console.log("assigning new client to players.self", this.players.self.mp)
                this.getplayers.allplayers[i].isLocal = true;
                this.players.self = this.getplayers.allplayers[i];
                this.players.self.active = false;
                this.players.self.visible = true;
                this.players.self.dead = false;
                this.players.self.vuln = false;
                this.players.self.landed = 0;
                // get other players' names
                //this.socket.emit('message', {data:"n.hello!"});
                this.socket.emit('message', 'n.' + this.players.self.mp + '.' + this.gameid + '.' + assets.playerName + '|' + assets.playerSkin);
                /*
                var url = "http://localhost:4004/api/playernames/";
                console.log('* api call');//, this.players.self.instance);//.instance.game);
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("GET", url, true);
                xmlhttp.setRequestHeader("Content-type", "application/json");
                //xmlhttp.setRequestHeader("X-Parse-Application-Id", "VnxVYV8ndyp6hE7FlPxBdXdhxTCmxX1111111");
                //xmlhttp.setRequestHeader("X-Parse-REST-API-Key","6QzJ0FRSPIhXbEziFFPs7JvH1l11111111");
                xmlhttp.send('');//{gameId:this.players.self.});

                xmlhttp.onreadystatechange = function ()
                { //Call a function when the state changes.
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200)
                    {
                        //alert(xmlhttp.responseText);
                        //console.log('data', xmlhttp.responseText);
                        //return xmlhttp.responseText;
                        self.tilemap = xmlhttp.responseText;
                        self.tilemapper();
                        self.prerenderer();
                        //self.buildPlatforms();
                    }
                };
                
                //*/
                //console.log(this.players.self);
            }
            //else console.log("SELF:", this.players.self);
        }
        else if (this.getplayers.allplayers[i].mp == 'hp')
        {
            //this.players.host = this.getplayers.allplayers[i];
            console.log('remove host client', i, this.getplayers.allplayers[i].host);
            this.getplayers.allplayers.splice(i, 1);
        }
        // else if (this.getplayers.allplayers[i].instance.hosting)
    }

    _.forEach(chests, function(chest)
    {
        _this.chests.push(new game_chest(chest, true, _this.getplayers, _this.config));
    });

    var cflag;
    console.log('flags', flags);//, this.config.flagObjects);
    this.config.preflags = [];
    _.forEach(flags, function(flag)
    {
        cflag = _.find(_this.config.flagObjects, {'name': flag.name});
        console.log('* cflag', cflag);
        if (cflag)
        {
            cflag.visible = flag.visible;
            cflag.x = flag.x;
            cflag.y = flag.y;
            cflag.sourceSlot = flag.sourceSlot;
            cflag.isActive = flag.isActive;
        }
        else _this.config.preflags.push(flag);
    });

    this.updateTerritory();
}

game_core.prototype.client_onhostgame_orig = function(data) {
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

    for (var i = 0; i < this.getplayers.allplayers.length; i++)
    {
        //console.log("##", this.getplayers.allplayers[i]);//.mp, this.getplayers.allplayers[i].id);
        //if (this.getplayers.allplayers[i].instance) console.log(this.getplayers.allplayers[i].instance.userid);
        if (this.getplayers.allplayers[i].mp == 'hp')// == data)
        {
            console.log('## found host player', i);
            this.players.self = this.getplayers.allplayers[i];
            //this.getplayers.allplayers.splice(i, 1);

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
    console.log('## client_onconnected', data, '(self.id=' + data.id + ") ##");
    //console.log('data', data);

    // for (var i = 0; i < this.getplayers.allplayers.length; i++)
    // {
    //     if (!this.getplayers.allplayers[i].instance) continue;
    //     console.log(this.getplayers.allplayers[i].instance.userid, data.id);
    //     if (this.getplayers.allplayers[i].id === data.id)
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
    //this.players.self.info_color = '#cc0000';
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
    if (glog)
    console.log('client_onnetmessage', data);

    var commands = data.split('.');
    var command = commands[0];
    var subcommand = commands[1] || null;
    var commanddata = commands[2] || null;

    switch(command)
    {
        case 's': //server message

            switch(subcommand)
            {
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

                case 'n' : // get player names
                    this.client_onplayernames(commanddata); break;

                // case 'c' : //other player changed colors
                //     //console.log('got color', commanddata);
                //     this.client_on_otherclientcolorchange(commanddata); break;
            }

            break;

            case 'o': // orbs

                switch(subcommand)
                {
                    // remove orb
                    case 'r' : this.client_on_orbremoval(commanddata); break;
                    // get orbs
                    case 'g' : this.client_on_getorbs(commanddata); break;
                }

            break;

            case 'c': // chests

                switch(subcommand)
                {
                    // take
                    case 't' : this.client_on_chesttake(commanddata); break;
                    // remove
                    case 'r' : this.client_on_chestremove(commanddata); break;
                }

            break;

            case 'f': // flags

                switch(subcommand)
                {
                    // add
                    case 'a' : this.client_onflagadd(commanddata); break;
                    // remove
                    case 'r' : this.client_onflagremove(commanddata); break;
                    // change
                    case 'c' : this.client_onflagchange(commanddata); break;
                }

            break;

            case 'p': // players

                switch(subcommand)
                {
                    // killed
                    case 'k' : this.client_onplayerkilled(commanddata); break;
                }

        } //command

        //break; //'s'
    //} //command

}; //client_onnetmessage

game_core.prototype.client_onplayerkilled = function(data)
{
    console.log('client player killed', data);
    var split = data.split("|");
    var victim = _.find(this.getplayers.allplayers, {'mp':split[0]});
    var victor = _.find(this.getplayers.allplayers, {'mp':split[1]});
    console.log('victim', victim.mp);
    if (victor)
    {
        console.log('victor', victor.mp);
        victim.doKill(victor);
    }
    else victim.doKill();
}

game_core.prototype.client_ondisconnect = function(data) {
    //if (glog)
    console.log('client_ondisconnect', data);

    // remove player from client (data is disconnected player.mp)
    for (var i = 0; i < this.getplayers.allplayers.length; i++)
    {
        //console.log(this.getplayers.allplayers[i]);
        if (this.getplayers.allplayers[i].mp == data)
        {
            console.log('* removing player', this.getplayers.allplayers[i].mp, data);
            this.getplayers.allplayers[i].disconnected = true;
            this.getplayers.allplayers[i].doKill();//active = false;
            //this.getplayers.allplayers[i].visible = false;
            //this.getplayers.allplayers[i].pos = {x:0, y:0};
            //this.getplayers.allplayers.splice(i, 1);
            //break;
        }
    }

    //When we disconnect, we don't know if the other player is
    //connected or not, and since we aren't, everything goes to offline
    /*
    this.players.self.info_color = 'rgba(255,255,255,0.1)';
    this.players.self.state = 'not-connected';
    this.players.self.online = false;
    */

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

    // orb removal
    //this.socket.on('orbremoval', this.client_on_orbremoval.bind(this));
    //this.socket.on('orbget', this.client_on_getorbs);

    // takechest
    //this.socket.on('addchest', this.client_onchestadd.bind(this));
    // removechest
    //this.socket.on('removechest', this.client_onchestremove.bind(this));

    // addflag
    this.socket.on('addflag', this.client_onflagadd.bind(this));
    // removeflag
    this.socket.on('removeflag', this.client_onflagremove.bind(this));

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
