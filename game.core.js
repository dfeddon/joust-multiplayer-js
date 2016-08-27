
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

console.log('game.core loaded');

var glog = false; // global console logging
var frame_time = 60/1000; // run the local game at 16ms/ 60hz
var worldWidth = 1280;//420;
var worldHeight = 1280;//720;

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

    this.bg = null;
    this.fg = null;
    this.barriers = null;

    // global delay flag for change ability input
    this.inputDelay = false;

    //Used in collision etc.
    this.world = {
        width : worldWidth,//720,
        height : worldHeight//480
    };

    this.world.gravity = 3.5;

    this.world.totalplayers = 10;//4;

    this.world.maxOrbs = 150;
    this.orbs = [];

    this.tilemap = null;
    this.tilemapData = null;

    this.cam = {};

    this.mp = null;
    this.gameid = null;

    this.allplayers = []; // client/server players store
    //this.entities = [];
    this.player_abilities_enabled = false;

    this.platforms = [];
    /*this.platforms.push({x:this.world.width/2,y:this.world.height-400,w:512,h:64});
    this.platforms.push({x:this.world.width/4,y:300,w:256,h:64});
    this.platforms.push({x:this.world.width -100,y:500,w:128,h:64});
    this.platforms.push({x:0,y:800,w:256,h:64});*/

    //We create a player set, passing them
    //the game that is running them, as well
    console.log('##-@@ is server?', this.server);

    if(this.server) // only for server, not clients (browsers)
    {
        // include modules
        var UUID            = require('node-uuid'),
        name_set            = require('./egyptian_set'),
        playerClass         = require('./class.player');
        /*collisionObject     = require('./class.collision'),
        PhysicsEntity       = require('./class.physicsEntity'),
        CollisionDetector   = require('./class.collisionDetector'),
        CollisionSolver     = require('./class.collisionSolver');*/

        //var co = collisionObject;
        // phy 2.0
        // var pe1 = new PhysicsEntity(PhysicsEntity.ELASTIC);
        // var pe2 = new PhysicsEntity(PhysicsEntity.ELASTIC);
        // this.entities = [pe1,pe2];
        // console.log('entities', this.entities.length, this.entities);
        //console.log('physent', this.collisionDetector);

        console.log("##-@@ adding server player and assigning client instance...");

        this.apiNode(); // load tilemap data

        var o;
        for (var i = 1; i < this.world.totalplayers; i++)
        {
            other = new playerClass(this, null, false);
            // other.ent = new PhysicsEntity(PhysicsEntity.ELASTIC);
            other.playerName = this.nameGenerator();
            this.allplayers.push(other);
            // this.entities.push(other);
        }
        var hp = new playerClass(this, this.instance.player_host, true);
        // hp.ent = new PhysicsEntity(PhysicsEntity.ELASTIC);
        this.allplayers.push(hp);
        // this.entities.push(hp);

        this.players = {};
        this.players.self = hp;
        this.players.hostGame = hp.game;

        // add player (host)
        console.log('len', this.allplayers.length);
        for (var j in this.allplayers)
            console.log(this.allplayers[j].mp);

        console.log('##-@@ creating orbs on server', this.orbs.length);
        var size,c,ox,oy,id;
        var colors = ['pink', 'lightblue', 'yellow', 'green', 'white', 'orange'];
        for (var k = 0; k < this.world.maxOrbs; k++)
        {
            size = Math.floor(Math.random() * 4) + 2;
            c = colors[Math.floor(Math.random() * colors.length)];
            // TODO: Avoid barriers
            ox = Math.floor(Math.random() * this.world.width) + 1;
            oy = Math.floor(Math.random() * this.world.height) + 1;
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

        // setup collision detect/solve pattern (decorator)
        // this.collisionDetector = new CollisionDetector();
        // this.collisionSolver = new CollisionSolver();

    }
    else // clients (browsers)
    {
        /*var collisionObject = require('./class.collision'),
        PhysicsEntity       = require('./class.physicsEntity'),
        CollisionDetector   = require('./class.collisionDetector'),
        CollisionSolver     = require('./class.collisionSolver');*/

        this.flashBang = 0;
        // TODO: if mobile, orientation change
        window.addEventListener('orientationChange', this.resizeCanvas, false);
        window.addEventListener('resize', this.resizeCanvas(), false);
        /*window.addEventListener('keydown', function(e)
        {
            //console.log('key event', e.keyCode);
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
            }

        }, false);*/

        // tilemap
        this.api(); // load and build tilemap

        console.log("## adding client players...", this.world.totalplayers);

        this.players = {};
        var p;
        for (var l = 1; l < this.world.totalplayers; l++)
        {
            p = new game_player(this);
            // p.ent = new physicsEntity(physicsEntity.ELASTIC);
            console.log(l, p.mp);
            p.playerName = this.nameGenerator();
            this.allplayers.push(p);//,null,false));
            // this.entities.push(p);
        }
        var chost = new game_player(this);
        chost.mp = 'hp';
        chost.mis = 'his';
        chost.host = true;
        // chost.ent = new physicsEntity(physicsEntity.ELASTIC);
        this.allplayers.push(chost);
        // this.entities.push(chost);

        this.players.self = chost;//new game_player(this);

        console.log('len', this.allplayers.length);

        for (var y in this.allplayers)
            console.log(this.allplayers[y].mp);
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
if( 'undefined' != typeof global )
{
    module.exports = global.game_core = game_core;
}

game_core.prototype.nameGenerator = function()
{
    // name generator
    var name_set;
    if (this.server)
        name_set = require('./egyptian_set');
    else name_set = egyptian_set;
    var set = new name_set().getSet();
    var rnd = Math.floor(Math.random() * set.length);
    var pname = set[rnd];
    console.log('pname', pname);

    return pname;
}
game_core.prototype.api = function()
{
    var self = this;

    console.log('## api call');//, this.players.self.instance);//.instance.game);
    xmlhttp = new XMLHttpRequest();
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
        }
    };
};

game_core.prototype.apiNode = function()
{
    console.log('apiNode');
    var _this = this;
    var xml2js = require('xml2js');
    var fs = require('fs');
    var parser = new xml2js.Parser();
    fs.readFile( './assets/tilemaps/joust-alpha-1.tmx', function(err, data)
    {
        parser.parseString(data, function (err, result)
        {
            //console.dir(result.note.to[0]);
            //NOTE: map.layers[1] is barriers layer
            console.log(JSON.stringify(result.map.layer[1].data[0]._));
            var data = JSON.stringify(result.map.layer[1].data[0]._);
            var split = data.split('\\n');
            //split = split.shift();
            var base = [];
            console.log(split.length);
            // ignore first and last rows
            var split2;
            var len = split.length;
            for (var i = 1; i < len - 1; i++)
            {
                split2 = split[i].split(",");
                split2.pop(); // remove last item (undefined)
                base.push(split2);
            }
            console.log(base[0].length, base[0]);
            _this.tilemapData = base;
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

game_core.prototype.tilemapper = function()
{
    console.log('tilemapper');
    var canvas3 = document.createElement('canvas');
    canvas3.id = "canvas3";
    canvas3.x = 0;
    canvas3.y = 0;
    canvas3.width = this.world.width;//v.width;
    canvas3.height = this.world.height;//v.height;
    context3 = canvas3.getContext('2d');
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

        // map
        var mapNode = xmlDoc.getElementsByTagName('map');
        var tileWidth, tileHeight, tileCount, columns, renderOrder, width, height, nextObjectId;
        renderOrder = mapNode[0].getAttribute('renderorder');
        width = mapNode[0].getAttribute('width');
        height = mapNode[0].getAttribute('height');
        tileWidth = mapNode[0].getAttribute('tilewidth');
        tileHeight = mapNode[0].getAttribute('tileheight');
        nextObjectId = mapNode[0].getAttribute('nextobjectid');
        //console.log(tileWidth,tileHeight,width,height,nextObjectId,renderOrder);

        // tileset
        var tilesetNode = xmlDoc.getElementsByTagName('tileset');
        //console.log('tileset', tilesetNode.length);
        tileCount = tilesetNode[0].getAttribute('tilecount');
        columns = tilesetNode[0].getAttribute('columns');
        name = tilesetNode[0].getAttribute('name');
        //console.log(tileCount, columns, name);

        // layers
        var layerNode = xmlDoc.getElementsByTagName('layer');
        console.log('num layers', layerNode.length);
        console.log(layerNode);

        var layerData = [];
        var base = [];
        var layerName, data, encoding, dataNode;

        // iterate layers
        for (var x = 0; x < layerNode.length; x++)
        {
            console.log(layerNode[x].getAttribute('name'));
            /*console.log(layerNode[x].getElementsByTagName('data')[0]);
            console.log(layerNode[x].getElementsByTagName('data')[0].innerHTML);*/

            layerName = layerNode[x].getAttribute('name');
            dataNode = layerNode[x].getElementsByTagName('data')[0];
            data = layerNode[x].getElementsByTagName('data')[0].innerHTML;
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
            console.log(rows);
            for (var i = 0; i < rows.length; i++)
            {
                rows[i] = rows[i].split(",");
                if (i !== rows.length - 1)
                    rows[i].pop(); // last item of each row is newline (except last line)
                base.push(rows[i]);
            }
            // tilemapData tracks on the 'barrier' layer (for collision detection)
            if (layerName == "barriers")
                this.tilemapData = base;
            //console.log(base);
            layerData.push(base);

        }
        //console.log(layerData);
        //return;

        // build bitmap from tilelist image
        var source, trans, imageWidth, imageHeight;
        var imageNode = xmlDoc.getElementsByTagName('image');
        source = imageNode[0].getAttribute('source');
        trans = imageNode[0].getAttribute('trans');
        imageWidth = imageNode[0].getAttribute('width');
        imageHeight = imageNode[0].getAttribute('height');
        //console.log(source, trans, imageWidth, imageHeight);

        var layers = [];
        var image = new Image();
        image.onload = function(e)
        {
            // image loaded
            var sheet = e.target;
            //context2.drawImage(e.target, 0, 0);

            // first, create canvas the exact size of the tilemap
            //n = layerNode[y].getAttribute('name')
            //console.log(n);
            var tilemap = document.createElement('canvas');//('canvas_' + y.toString());
            self.tmCanvas = tilemap;
            tilemap.id = "tilemap";
            tilemap.width = width * tileWidth;
            tilemap.height = height * tileHeight;//v.height;
            console.log('tilemap w h', tilemap.width, tilemap.height);//, this.world.width, this.world.height);
            tmContext = tilemap.getContext('2d');

            // add tilemap to tile canvas context
            tmContext.drawImage(e.target, 0, 0);


            // iterate layers
            var n, c, cContext;//, layerCanvas;
            //var canvases = [];
            var div = document.getElementById('canvases');
            for (var y = 0; y < layerData.length; y++)
            {

                // first, create layer canvas
                n = layerNode[y].getAttribute('name')
                console.log(n);
                c = document.createElement('canvas');//('canvas_' + y.toString());
                c.style.cssText = "position:absolute;display:block;top:0;left:0";
                c.zIndex = y + 1;
                self.tmCanvas = tilemap;
                c.id = n;
                c.width = width * tileWidth;
                c.height = height * tileHeight;//v.height;
                //console.log('tilemap w h', tilemap.width, tilemap.height);//, this.world.width, this.world.height);
                cContext = c.getContext('2d');

                // add tilemap to tile canvas context
                //tmContext.drawImage(e.target, 0, 0);

                // now, let's add tiles
                var tile, t;
                var count = 0;
                var colMax = (imageWidth / tileWidth);
                var rowMax = (imageHeight / tileHeight);
                console.log(rowMax,colMax);
                var col, row;
                for (var j = 0; j < layerData[y].length; j++)
                {
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
                            cContext.putImageData(tile, (count % height) * tileHeight, Math.floor(count / width) * tileWidth);
                        }
                        count++;
                    }
                }
                //canvases.push(c);
                //console.log(c.id);
                //if (c.id == 'barriers')
                _this[c.id] = c;
                console.log('cid',this[c.id]);
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
        }; // end tilemap image loaded
        image.src = source.replace("..", "/assets");
        //console.log(image.src);

    }
};

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
        canvas2.width = this.world.width;//v.width;
        canvas2.height = this.world.height;//v.height;
        context2 = canvas2.getContext('2d');
        //max = this.world.maxOrbs;
    }
    else
    {
        //max = this.orbs.length;
        context2 = this.canvas2.getContext('2d');
        // clear existing canvas
        context2.clearRect(0,0, this.world.width, this.world.height);
    }
    //*/
    //console.log(context2);
    //var prerendCanvas = document.getElementById('prerend');
    //prerendCanvas.width = this.world.width;//v.width;
    //prerendCanvas.height = this.world.height;//v.height;
    /*context2 = this.prerendCanvas.getContext('2d');
    context2.clearRect(0,0, this.world.width, this.world.height);*/

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
        x = Math.floor(Math.random() * this.world.width) + 1;
        y = Math.floor(Math.random() * this.world.height) + 1;

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
	context2.arc(this.world.width/2,this.world.height/2,50,0*Math.PI,2*Math.PI);
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
    context2.moveTo(0, this.world.height);
    context2.lineTo(this.world.width, this.world.height);
    context2.strokeStyle = 'black';
    // top
    context2.moveTo(0, 0);
    context2.lineTo(this.world.width, 0);
    // left
    context2.moveTo(0, this.world.height);
    context2.lineTo(0, 0);
    // right
    context2.moveTo(this.world.width, this.world.height);
    context2.lineTo(this.world.width, 0);
    // styles
    context2.closePath();
    context2.lineWidth = 10;
    context2.strokeStyle = 'black';
    context2.stroke();
    //*/

    /////////////////////////////////////////
    // platforms
    /////////////////////////////////////////
    for (var j = 0; j < this.platforms.length; j++)
    {
        context2.fillStyle = 'green';
        context2.fillRect(this.platforms[j].x, this.platforms[j].y, this.platforms[j].w, this.platforms[j].h);
    }

    //context2.restore();
    //*
    if (!this.canvas2)
        this.canvas2 = canvas2;
    //*/
};

function clamp(value, min, max)
{
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
game_core.prototype.check_collision = function( player )
{
    //console.log('##+@@check_collision', player.mp);
    if (player.mp === 'hp') return;

    //console.log('g', this.players.self.getGrid());

    //Left wall. TODO:stop accel
    if(player.pos.x < player.pos_limits.x_min)
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
                // TODO: if vulnerable (stunned) then vuln user is victim

                // set both players as 'engaged'
                if (!this.server)
                {
                    if (player.isLocal)
                        player.isEngaged(10000);
                    else if (this.allplayers[i].isLocal)
                        this.allplayers[i].isEngaged(10000);
                }

                // otherwise, positioning counts
                var dif = player.pos.y - this.allplayers[i].pos.y;
                //console.log("HIT", dif);// player.mp, player.pos.y, this.allplayers[i].mp, this.allplayers[i].pos.y);
                if (dif >= -5 && dif <= 5 && player.vuln === false && this.allplayers[i].vuln === false)//player.pos.y === this.allplayers[i].pos.y)
                {
                    this.flashBang = 1;
                    //console.log("TIE!", player.mp, this.allplayers[i].mp);
                    if (player.pos.x < this.allplayers[i].pos.x)
                    {
                        player.pos.x -= 50;
                        this.allplayers[i].pos.x += 50;
                        // console.log("BUMP")
                        // player.pos = this.physics_movement_vector_from_direction(-50, 0);
                        // this.allplayers[i].pos = this.physics_movement_vector_from_direction(50,0);
                    }
                    else
                    {
                        player.pos.x += 50;
                        this.allplayers[i].pos.x -= 50;
                    }
                    // manage velocit and stop state
                    // if player and enemy are facing same direction
                    if (player.vx > 0 && player.dir !== this.allplayers[i].dir)
                    {
                        //console.log('slowing', player.vx);

                        // slow horizontal velocity
                        player.vx = 0;//-= 1;
                        // set landing flag (moving)
                        player.landed = 2; // TODO: only if on platform
                    }
                    else if (player.vx < 0 && player.dir !== this.allplayers[i].dir)
                    {
                        player.vx = 0;
                        player.landed = 2;
                    }
                    else
                    {
                        // stuck landing (no velocity)
                        player.vx = 0;
                        // set landing flag (stationary)
                        player.landed = 1; // TODO: only if on platform
                    }
                }
                else // we have a victim
                {
                    this.flashBang = 2;
                    var splatteree, waspos;
                    if (player.pos.y < this.allplayers[i].pos.y || this.allplayers[i].vuln === true)
                    {
                        //console.log(player.mp, 'WINS!', this.allplayers[i].mp);
                        waspos = this.allplayers[i].pos;
                        this.allplayers[i].pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};
                        //this.allplayers[i].visible = false;
                        splatteree = this.allplayers[i];
                        //this.allplayers[i].old_state = this.allplayers[i].pos;
                    }
                    else
                    {
                        //console.log(this.allplayers[i].mp, 'WINS!');
                        waspos = player.pos;
                        player.pos = {x:Math.floor((Math.random() * player.game.world.width - 64) + 64), y:-1000};
                        //player.visible = false;
                        splatteree = player;
                        //player.old_state = player.pos;
                    }

                    // splatter
                    //if (this.server){
                    //var UUID = require('node-uuid');
                    console.log('splatter!');

                    // get diffs
                    // var spreadX = 100;
                    // var spreadY = 100;
                    // if (this.world.height - waspos.y > spreadX)
                    //     spreadX = 100 -
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
                }

                break;
            }
            //if (player.pos.x >= this.allplayers[i].pos.x + this.allplayers[i].width && player.y == this.allplayers[i].pos.y)
                //console.log('HIT', player.mp, this.allplayers[i].mp);
        }
        //if (this.players.self.pos === this.allplayers[i].pos.x) console.log('!!!!!!!!!!!!!!!!!!!');

    }

    // platform collisions
    /*
    for (var j = 0; j < this.platforms.length; j++)
    {
        //console.log('platform', this.platforms[j]);
        // Note: hy + 10 below accounts for birds unseen legs.
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
                player.pos.y = this.platforms[j].y - player.size.hy;// - 10;// -= 1;// this.world.height-200;
                //console.log('--->',player.pos.y);
                // decelerate
                if (player.vx > 0)
                {
                    //console.log('slowing', player.vx);

                    // slow horizontal velocity
                    player.vx -= 1;
                    // set landing flag (moving)
                    player.landed = 2;
                }
                else
                {
                    // stuck landing (no velocity)
                    player.vx = 0;
                    // set landing flag (stationary)
                    player.landed = 1;
                }
            }

            break;
        }
        //else if (player.landed > 0) player.landed = 0; // if player slides off platform, fly!
    }
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
            for (var l = 0; l < this.allplayers.length; l++)
            {
                if (this.allplayers[l].instance && this.allplayers[l].mp != player.mp)
                {
                    //console.log('remote orb removal index', rid);//, this.players.self.mp);
                    this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
                }
            }

            // remove orb from view
            if (!this.server) this.prerenderer();

            // get out
            break;
        }
    }

    //if (player === this.players.self)
    //{
    var b = 10; // bounce
    var h = player.hitGrid();
    //console.log(c);
    // console.log('::', h);
    if (h !== undefined)
    {
        if (h.nw.t > 0 && h.sw.t > 0) // hit side wall
        {
            player.pos.x += 15; // bounce
            player.vx = 0; // stop accel
        }
        else if (h.ne.t > 0 && h.se.t > 0)
        {
            player.pos.x -= 15; //bounce
            player.vx = 0; // stop accel
        }
        else if (h.nw.t > 0) // collide from below
        {
            //console.log('stop nw', player.mp);
            //player.pos.x += b;
            player.pos.y += b;
            /*if (player.vuln===false)
                player.isVuln(500);*/
        }
        else if (h.ne.t > 0) // collide from below
        {
            //console.log('stop ne', player.mp);
            //player.pos.x -= b;
            player.pos.y += b;
            /*if (player.vuln===false)
                player.isVuln(500);*/
        }
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
    }
}; //game_core.check_collision

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
                // if player.landed > 0
                // bird walks to the left
                if(key == 'l') {
                    //x_dir -= 1;
                    player.dir = 1;
                    //player.pos.d = 1;
                }
                // if player.landed > 0
                // bird walks to the right
                if(key == 'r') {
                    //x_dir += 1;
                    player.dir = 0;
                    //player.pos.d = 0;
                }
                if(key == 'd')
                {
                    // delay kepresses by 200 ms
                    if (this.inputDelay === false)
                    {
                        this.inputDelay = true;
                        player.doCycleAbility();
                        setTimeout(this.timeoutInputDelay, 200);
                    }
                }
                //else player.cycle = false;
                if (key == "sp")
                {
                    //console.log('ABILITY');
                    if (player.cooldown === false)
                        player.doAbility();
                }
                if(key == 'u') { // flap
                    //TODO: up should take player direction into account
                    //console.log('flap!');

                    // set flag
                    player.flap = true;

                    // clear landed flag
                    player.landed = 0;

                    // increase y velocity
                    player.vy = -1;

                    // set y_dir for vector movement
                    y_dir -= 1;

                    // apply horizontal velocity based on direction facing
                    if (player.dir === 0) // right
                    {
                        // set x_dir for vector movement
                        x_dir += 0;

                        if (player.vx < 0 )
                            player.vx = 336;
                        else
                            player.vx +=336;
                    }
                    if (player.dir === 1) // left
                    {
                        // set x_dir for vector movement
                        x_dir -= 0;

                        if (player.vx > 0)
                            player.vx = -336;
                        else
                            player.vx -=336;
                    }
                }
                else player.flap = false;
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

game_core.prototype.update_physics = function() {
    if (glog)
    console.log('##+@@ update_physics');

    // phy 2.0
    /*
    var GRAVITY_X = 1;
    var GRAVITY_Y = 1;
    var elapsed = 1;//this._pdt;//this.dt;
    var gx = GRAVITY_X * elapsed;
    var gy = GRAVITY_Y * elapsed;
    var entity;
    var entities = this.entities;
    for (var j = 0; j < entities.length; j++)
    {
        entity = entities[j];
        // console.log('entity', entity);
        switch(entity.type)
        {
            case 'dynamic'://PhysicsEntity.DYNAMIC:
            entity.vx += entity.ax * elapsed + gx;
             entity.vy += entity.ay * elapsed + gy;
             entity.x  += entity.vx * elapsed;
             entity.y  += entity.vy * elapsed;
             break;
         case 'kinematic'://PhysicsEntity.KINEMATIC:
             entity.vx += entity.ax * elapsed;
             entity.vy += entity.ay * elapsed;
             entity.x  += entity.vx * elapsed;
             entity.y  += entity.vy * elapsed;
             break;
        }
    }
    //*/
    //console.log(entities[0].x, entities[0].y);
    // this.allplayers[5].ent.x = entities[0].x;
    // this.allplayers[5].pos.y = entities[0].y;

    // gravity TODO: add (g)ravity & variable ac-/de-celeration vars, which affect y
    // also, ignore grav if player on ground/platform
    //*
    //if (this.playerspeed > 500)
        //this.playerspeed -= 1;

    ////////////////////////////////////////////////////////
    // iterate players
    ////////////////////////////////////////////////////////
    //for (var i in this.players)
    for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log(this.allplayers[i]);

        // update velocity will acceleration
        /*this.allplayers[i].vx += this.allplayers[i].ax;
        this.allplayers[i].vy += this.allplayers[i].ay;
        // update position with velocity
        this.allplayers[i].x += this.allplayers[i].vx;
        this.allplayers[i].y += this.allplayers[i].vy;*/

        ////////////////////////////////////////////////////////
        // horizontal velocity
        ////////////////////////////////////////////////////////

        if (this.allplayers[i].vx > 0)
        {
            //console.log('vx', this.allplayers[i].vx);
            this.allplayers[i].vx = (this.allplayers[i].vx-1).fixed(3);
            //console.log(this.allplayers[i].vx);
            if (this.allplayers[i].vx < 0) this.allplayers[i].vx = 0;
            this.allplayers[i].pos.x += (0.5 * 4);// this.players[i].vx;
        }
        else if (this.allplayers[i].vx < 0)
        {
            //console.log('vx', this.allplayers[i].vx);
            this.allplayers[i].vx = (this.allplayers[i].vx+1).fixed(3);
            if (this.allplayers[i].vx > 0) this.allplayers[i].vx = 0;
            this.allplayers[i].pos.x -= (0.5 * 4);// this.players[i].vx;
        }
        ////////////////////////////////////////////////////////
        // vertical velocity
        ////////////////////////////////////////////////////////
        /*if (this.allplayers[i].vy < 0)
        {
            console.log('vy', this.allplayers[i].vy);
            //console.log('v.y', this.allplayers[i].vy.fixed(3), this.allplayers[i].vx);
            this.allplayers[i].vy = (this.allplayers[i].vy + 0.025).fixed(3);
            this.allplayers[i].pos.y = (this.allplayers[i].pos.y + 0.05 + this.allplayers[i].vy).fixed(3);//this.players[i].vy;
        }*/

        ////////////////////////////////////////////////////////
        // if player not on floor, apply gravity
        ////////////////////////////////////////////////////////
        if (this.allplayers[i].pos.y !== this.allplayers[i].pos_limits.y_max)
        {
            this.allplayers[i].pos.y+=this.world.gravity;

            /*if (this.allplayers[i].vx > 0)
            {
                this.allplayers[i].vx = (this.allplayers[i].vx - 50);
                if (this.allplayers[i].vx < 0) this.allplayers[i].vx = 0;
            }
            else if (this.allplayers[i].vx < 0)
            {
                this.allplayers[i].vx = this.allplayers[i].vx + 50
                if (this.allplayers[i].vx > 0) this.allplayers[i].vx = 0;
            }*/
        }
        else // touching ground (TODO:add drag)
        {
            this.allplayers[i].vy = 0;
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
    //*/

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
        var new_dir = this.process_input(this.allplayers[i]);
        this.allplayers[i].pos = this.v_add( this.allplayers[i].old_state.pos, new_dir);

        //Keep the physics position in the world
        this.check_collision( this.allplayers[i] );

        //this.players.self.inputs = []; //we have cleared the input buffer, so remove this
        this.allplayers[i].inputs = []; //we have cleared the input buffer, so remove this
    }
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
        this.laststate[this.allplayers[i].mp] =
        {
            x:this.allplayers[i].pos.x,
            y:this.allplayers[i].pos.y,
            d:this.allplayers[i].dir,
            f:this.allplayers[i].flap,
            l:this.allplayers[i].landed,
            v:this.allplayers[i].vuln,
            a:this.allplayers[i].abil
        };
        this.laststate[this.allplayers[i].mis] = this.allplayers[i].last_input_seq;

        // reset flap on server instance
        if (this.allplayers[i].flap === true) this.allplayers[i].flap = false;
        // rest abil on server instance
        if (this.allplayers[i].abil > 0) this.allplayers[i].abil = 0;
    }

    this.laststate.t = this.server_time;
    //console.log(this.laststate);
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
    //console.log('1',client.userid);
    //console.log('2',this.players.self.instance.userid);
    if (client.userid == this.players.self.instance.userid)
        player_client = this.players.self;//.instance.userid);
    else
    {
        for (var i = 0; i < this.allplayers.length; i++)
        {
            if (this.allplayers[i].instance && this.allplayers[i].instance.userid == client.userid)
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

    if (this.players.self.vuln === true)
    {
        console.log('player is vulnerable!');
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

    if( this.keyboard.pressed('space')) {

            //y_dir = -1;
            input.push('sp');

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
     //console.log(target);
      //if (target.cp2.f == 1)
      //console.log(target.cp2);
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
                //console.log(previous[this.allplayers[j].mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this._pdt*this.client_smooth);
                this.allplayers[j].pos = this.v_lerp(this.allplayers[j].pos, ghostStub, this._pdt * this.client_smooth);

                // get direction
                //if (target[this.allplayers[j].mp])//.d == 1)
                this.allplayers[j].dir = target[this.allplayers[j].mp].d;
                this.allplayers[j].flap = target[this.allplayers[j].mp].f;
                this.allplayers[j].landed = target[this.allplayers[j].mp].l;
                this.allplayers[j].vuln = target[this.allplayers[j].mp].v;
                this.allplayers[j].abil = target[this.allplayers[j].mp].a;
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
    console.log('## client_onserverupdate_recieved', data);
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
        //console.log(current_state.d);
        this.players.self.pos = current_state;

        //We handle collision on client if predicting.
        this.check_collision( this.players.self );

    }  //if(this.client_predict)

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
        this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.local_time;

    //}

}; //game_core.client_update_physics

game_core.prototype.client_update = function()
{
    if (glog)
    console.log('## client_update');
    //console.log(this.viewport);
    if (this.players.self.mp == "hp") return;

    //////////////////////////////////////////
    // Camera
    //////////////////////////////////////////
    // Clear the screen area (just client's viewport, not world)
    // if player stopped, use last camera pos
    // TODO: lerp camera movement for extra smoothness
    if (this.players.self.landed !== 1)
    {
        var pad = 0;
        this.cam.x = clamp(-this.players.self.pos.x + this.viewport.width/2, -(this.world.width - this.viewport.width) - pad, pad);//this.this.world.width);
        this.cam.y = clamp(-this.players.self.pos.y + this.viewport.height/2, -(this.world.height - this.viewport.height) - pad, pad);//this.game.world.height);
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
        console.log('flashbang');
        this.ctx.beginPath();
        if (this.flashBang === 1)
        this.ctx.fillStyle = 'white';
        else this.ctx.fillStyle = 'red';
        this.ctx.rect(-this.cam.x,-this.cam.y,this.viewport.width+128,this.viewport.height+128);
        this.ctx.fill();
        this.ctx.closePath();
        this.flashBang = 0;
    }

    //draw help/information if required
    // this.client_draw_info();

    // draw prerenders
    //console.log(this.canvas2, this.bg, this.barriers, this.fg);
    if (this.bg)
    {
        this.ctx.drawImage(this.bg, 0, 0);
        this.ctx.drawImage(this.canvas2, 0,0);
        this.ctx.drawImage(this.barriers, 0, 0);
        this.ctx.drawImage(this.fg, 0, 0);
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
    //if (this.players.self.host === true) this.players.self.pos.y = -1000;
    /*for (var i = 0; i < this.allplayers.length; i++)
    {
        //console.log('pos:', this.allplayers[i].pos, this.allplayers[i].instance);
        // this.allplayers[i].pos = this.allplayers[i].pos;

        this.allplayers[i].old_state.pos = this.pos(this.allplayers[i].pos);
        this.allplayers[i].pos = this.pos(this.allplayers[i].pos);
        this.allplayers[i].cur_state.pos = this.pos(this.allplayers[i].pos);
    }*/

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

game_core.prototype.client_onjoingame = function(data)
{
    //if (glog)
    console.log('## client_onjoingame');//, data);// (player joined is not host: self.host=false)');

    // console.log('derek', data);

    var alldata = data.split("|");

    this.mp = alldata[0];
    this.gameid = alldata[1];
    //console.log('1',alldata[0]);
    //console.log('2',alldata[1]);
    console.log(alldata[2]);
    this.orbs = JSON.parse(alldata[2]);

    //console.log('3',alldata[2]);

    console.log('len', this.allplayers.length);
    console.log('vp', this.viewport);

    //We are not the host
    this.players.self.host = false;
    //Update the local state
    this.players.self.state = 'connected.joined.waiting';
    this.players.self.info_color = '#00bb00';

    for (var i = 0; i < this.allplayers.length; i++)
    {
        console.log("----->", this.allplayers[i].mp, this.allplayers[i].id);//.instance);
        console.log( (this.allplayers[i].instance) ? this.allplayers[i].instance.userid : 'no instance');
        //, this.allplayers[i].instance.userid);//, data);
        //if (this.allplayers[i].mp == data.mp && data.me)//.instance && this.allplayers[i].instance.userid == data)
        if (this.allplayers[i].mp == alldata[0])//'cp1')
        {
            console.log('## found player', alldata[0]);
            //console.log(this.allplayers[i].instance.userid);
            //console.log(this.allplayers[i].instance.hosting);
            //this.players.self.md = this.allplayers[i].md;
            //this.players.self.mis = this.allplayers[i].mis;
            //if (data.me)
            this.allplayers[i].active = true;
            this.allplayers[i].isLocal = true;
            this.allplayers[i].playerName = "Jouster"
            this.players.self = this.allplayers[i];
            console.log(this.players.self);
        }
        else if (this.allplayers[i].mp == 'hp')
        {
            //this.players.host = this.allplayers[i];
            console.log('remove host', i, this.allplayers[i].host);
            this.allplayers.splice(i, 1);
        }
        // else if (this.allplayers[i].instance.hosting)
    }

    // console.log('local player mp =', this.players.self.mp);
    // set mp val
    // this.players.self.mp = 'cp' + this.allplayers.length;
    // this.players.self.mis = 'cis' + this.allplayers.length;
    // TODO: Remove below
    // this.players.other.mp = 'hp';
    // this.players.other.mis = 'his';

    // get orbs
    //this.socket.send('p.' + 'derekisnew' );
    //this.socket.send('c.' + 'derekcolor');
    //console.log('instance', this.socket);//this.players.self.gameid);
    // this.api();

    // create prerenders
    this.prerenderer();

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
    //console.log('data', data);

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

                case 'c' : //other player changed colors
                    //console.log('got color', commanddata);
                    this.client_on_otherclientcolorchange(commanddata); break;
            }

            break;

            case 'o':

                switch(subcommand)
                {
                    // remove orb
                    case 'r' : this.client_on_orbremoval(commanddata); break;
                    // get orbs
                    case 'g' : this.client_on_getorbs(commanddata); break;
                }

            break;

        } //command

        //break; //'s'
    //} //command

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

    // orb removal
    //this.socket.on('orbremoval', this.client_on_orbremoval.bind(this));
    //this.socket.on('orbget', this.client_on_getorbs);

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
