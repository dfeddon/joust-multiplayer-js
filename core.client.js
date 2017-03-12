

var _                   = require('lodash'), 
    assets              = require('./singleton.assets'),
    game_player         = require('./class.player'),
    game_flag           = require('./class.flag'),
    game_chest          = require('./class.chest'),
    game_toast          = require('./class.toast'),
    getplayers          = require('./class.getplayers'),
    pool                = require('typedarray-pool');


function core_client(core, config)
{
    console.log('core_client constructor');

    this.viewport = document.getElementById("viewport");
    this.ctx = this.viewport.getContext('2d');
    this.cam = {x:0,y:0};

    this.core = core;
    this.config = config;

    // this.core.getplayers = new getplayers(null, this.config.world.totalplayers, core, config);
    this.playerPort = null;
    this.core.chests = [];

    // this.clientCooldowns = [
    //     {name:"redFlag", heldBy:null, timer:NaN, src:null, target:null},
    //     {name:"blueFlag", heldBy:null, timer:NaN, src:null, target:null},
    //     {name:"midFlag", heldBy:null, timer:NaN, src:null, target:null}
    // ];

    // workers
    /*if (window.Worker)
    {
        this.clientWorker_tileCollision = new Worker("worker.client.tileCollision.js");
    }
    else this.clientWorker_tileCollision = null;
    */
    
    //var assets = 
    //this._ = _;
    this.players = {};
    this.players.self = {};
    this.players.self.pos = {x:0,y:0};
    this.players.self.old_state = {};
    this.players.self.old_state.pos = {x:0,y:0};
    this.players.self.cur_state = {};
    this.players.self.cur_state.pos = {x:0,y:0};
    this.players.self.inputs = [];
    // this.players.self.last
    this.players.self.mp = "hp";
    console.log('self', this.players.self);

    // assign self to core's config obj
    console.log('setself:', this.core.config);
    this.core.config.players = this.players;
    this.config.players = this.players;
    console.log('setself2:', this.core.config);
    
    //this.canvasPlatforms = null;
    this.flashBang = 0;

    // tilemap
    this.api(); // load and build tilemap

    // console.log("## adding client players...", this.config.world.totalplayers);

    // this.players = {};
    /*var p;
    for (var l = 1; l < this.config.world.totalplayers; l++)
    {
        p = new game_player(null, false, this.core.getplayers.allplayers.length+1, this.config);
        // p.ent = new physicsEntity(physicsEntity.ELASTIC);
        console.log(l, p.mp);
        p.pos = this.core.gridToPixel(l, 0);
        //p.playerName = this.nameGenerator() + " [" + p.mp + "/" + p.team + "]";
        this.core.getplayers.allplayers.push(p);//,null,false));
        // this.entities.push(p);
    }*/
    
    /*this.clientPool = pool.malloc(16, "int16");
    console.log('pool', this.clientPool);*/

    this.spritesheets = [];
    this.spritesheetsData = [];
    //this.spritesheetsData.push({type:'animate-torches', x:258, y:400, w:64, h:64, frames:4});

    //The speed at which the clients move.

    //Create a keyboard handler
    this.keyboard = new THREEx.KeyboardState();
    // console.log("* this.keyboard", this.keyboard);
    this.config.keyboard = new THREEx.KeyboardState();

    //Create the default configuration settings
    this.client_create_configuration();

    //A list of recent server updates we interpolate across
    //This is the buffer that is the driving factor for our networking
    this.server_updates = [];

    //Connect to the socket.io server!
    this.client_connect_to_server();

    //We start pinging the server to determine latency
    // TODO: Replaced ping timer with this.socket.primus.latency
    //this.client_create_ping_timer();

    //Set their colors from the storage or locally
    // this.color = localStorage.getItem('color') || '#cc8822' ;
    // localStorage.setItem('color', this.color);
    // this.players.self.color = this.color;

    //Make this only if requested
    // if(String(window.location).indexOf('debug') != -1) {
    //     this.client_create_debug_gui();
    //}

    var v = document.getElementById("viewport");
    this.config.ctx = v.getContext('2d');

    this.config.round = {};
    this.config.round.active = true;



} // end constructor

Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };

// TODO: we could call the below helper methods via 'this.core' ref
//copies a 2d vector like object from one to another
core_client.prototype.pos = function(a) { return {x:a.x,y:a.y}; };
//Add a 2d vector with another one and return the resulting vector
core_client.prototype.v_add = function(a,b) { return { x:(a.x+b.x).fixed(), y:(a.y+b.y).fixed() }; };
//Subtract a 2d vector with another one and return the resulting vector
core_client.prototype.v_sub = function(a,b) { return { x:(a.x-b.x).fixed(),y:(a.y-b.y).fixed() }; };
//Multiply a 2d vector with a scalar value and return the resulting vector
core_client.prototype.v_mul_scalar = function(a,b) { return {x: (a.x*b).fixed() , y:(a.y*b).fixed() }; };
//For the server, we need to cancel the setTimeout that the polyfill creates
core_client.prototype.stop_update = function() {  window.cancelAnimationFrame( this.updateid );  };
//Simple linear interpolation
core_client.prototype.lerp = function(p, n, t) { var _t = Number(t); _t = (Math.max(0, Math.min(1, _t))).fixed(); return (p + _t * (n - p)).fixed(); };
//Simple linear interpolation between 2 vectors
core_client.prototype.v_lerp = function(v,tv,t) { return { x: this.lerp(v.x, tv.x, t), y:this.lerp(v.y, tv.y, t), d:tv.d }; };

core_client.prototype.api = function()
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
            //self.prerenderer();
            //self.buildPlatforms();
        }
    };
};

core_client.prototype.pingFnc = function()
{
    this.last_ping_time = new Date().getTime() - this.fake_lag;
    this.socket.emit('p.' + (this.last_ping_time) );
}

core_client.prototype.client_create_ping_timer = function() {
    var _this = this;
        //Set a ping timer to 1 second, to maintain the ping/latency between
        //client and server and calculated roughly how our connection is doing

    setInterval(
    //     function(){
    //     this.last_ping_time = new Date().getTime() - this.fake_lag;
    //     this.socket.send('p.' + (this.last_ping_time) );

    // }
    this.pingFnc
    .bind(this), 1000);
}; //game_core.client_create_ping_timer

core_client.prototype.client_create_configuration = function() {

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

    this.ping_avg = 0;
    this.ping_avg_acc = 0;
    this.ping_count = 0;

    this.lit = 0;
    this.llt = new Date().getTime();

};//game_core.client_create_configuration

core_client.prototype.client_create_debug_gui = function() 
{

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

core_client.prototype.client_reset_positions = function()
{
    console.log('## client_reset_positions');

    // console.log('Am I Host?', this.players.self.mp, this.players.self.host, this.core.getplayers.allplayers.length);
    //if (this.players.self.host === true) this.players.self.pos.y = -1000;
    //*
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    for (var i = room.length - 1; i >= 0 ; i--)
    {
        //console.log('pos:', room[i].pos, room[i].instance);
        // room[i].pos = room[i].pos;

        room[i].old_state.pos = this.pos(room[i].pos);
        room[i].pos = this.pos(room[i].pos);
        room[i].cur_state.pos = this.pos(room[i].pos);
        room[i].draw();
    }
    //*/

    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;

    //Host always spawns at the top left.
    player_host.pos = { x:20,y:20 };
    player_client.pos = { x:500, y:200 };*/
    // console.log(this.players.self.pos);
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
        console.log('pre', this.players.self.pos);
        //Make sure the local player physics is updated
        this.players.self.old_state.pos = this.pos(this.players.self.pos);
        this.players.self.pos = this.pos(this.players.self.pos);
        this.players.self.cur_state.pos = this.pos(this.players.self.pos);
        this.players.self.draw();
    /*}
    console.log(this.players.self.pos);*/
    console.log('post', this.players.self.pos);
    

    //Position all debug view items to their owners position
    /*this.ghosts.server_pos_self.pos = this.pos(this.players.self.pos);

    this.ghosts.server_pos_other.pos = this.pos(this.players.other.pos);
    this.ghosts.pos_other.pos = this.pos(this.players.other.pos);*/

}; //game_core.client_reset_positions

core_client.prototype.client_onreadygame = function(data) {
    //if (glog)
    console.log('## client_onreadygame', data);

    var server_time = parseFloat(data.replace('-','.'));

    // TODO: Resolve the lines below
    /*var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    */
    this.core.local_time = server_time + this.socket.latency;//this.net_latency;
    console.log('## server time is about ' + this.core.local_time);
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

core_client.prototype.resizeCanvas = function()
{
    // http://stackoverflow.com/questions/33515707/scaling-a-javascript-canvas-game-properly
    // https://jsfiddle.net/blindman67/fdjqoj04/
    // console.log('vp:', this.viewport);
    
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

core_client.prototype.client_onplayernames = function(data)
{
    var data = JSON.parse(data);
    console.log("== client_onplayernames", data, "==");
    // console.log('len', data.length);

    var p;
    // if object, we are updating other clients of new player
    if (!Array.isArray(data))
    {
        console.log('updating extant clients...', data.name, data.skin);
        
        p = _.find(this.core.getplayers.allplayers, {'mp':data.mp});
        if (data.name && data.name !== "undefined")
            p.setPlayerName(data.name);
        if (data.skin)
            p.setSkin(data.skin);
    }
    else // otherwise, array will update new client about *all* existing players
    {

        for (var i = data.length - 1; i >= 0; i--)
        {
            p = _.find(this.core.getplayers.allplayers, {'mp':data[i].mp});
            if (p)
            {
                console.log('* settings player', data[i].name, data[i].team, data[i].skin);
                if (data[i].name != undefined)
                    p.setPlayerName(data[i].name);
                if (data[i].team > 0 && p.team === 0)
                    p.team = parseInt(data[i].team);
                if (data[i].skin != "")
                    p.setSkin(data[i].skin);
                
                // activate player
                p.active = true;
                p.visible = true;
            }
            console.log('p', p);
        }

        // activate player
        this.players.self.active = true;
        this.players.self.visible = true;
        this.players.self.vuln = false;
        console.log("* my player name", assets.playerName);
        if (assets.playerName !== undefined)
            this.players.self.setPlayerName(assets.playerName);
        else console.log("* player name is undefined", this.players.self.playerName);
        if (assets.playerSkin)
            this.players.self.setSkin(assets.playerSkin);
        // set playerName here
    }
};

core_client.prototype.client_onjoingame = function(data)
{
    //if (glog)
    console.log('## client_onjoingame', data);// (player joined is not host: self.host=false)');

    var _this = this;

    var playerId = data[1];
    var gameid = data[2];
    var chests = data[3];
    var team = data[4];
    var playerName = data[5];
    var flags = data[6];
    var playerMp = data[7];
    var playerSkin = data[8];

    // var alldata = data.split("|");

    // this.mp = alldata[0];
    /*
    this.gameid = data[2];
    //console.log('1',alldata[0]);
    //console.log('2',alldata[1]);
    // console.log(alldata[2]);
    //this.orbs = JSON.parse(alldata[2]);
    var chests = JSON.parse(alldata[2]);
    //console.log('chestz',this.core.chests);

    var team = parseInt(alldata[3]);
    var playerName = alldata[4];
    //console.log('playerName', playerName);
    
    //assets.playerName = playerName;
    var flags = JSON.parse(alldata[5]);
    //console.log('# startpos', startpos);

    var userid = alldata[6];

    //console.log('3',alldata[2]);

    console.log('len', this.core.getplayers.allplayers.length);
    //console.log('vp', this.viewport);
    */

    //We are not the host
    // this.players.self.host = false;
    // //Update the local state
    // this.players.self.state = 'connected.joined.waiting';
    // this.players.self.info_color = '#00bb00';
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    for (var i = room.length - 1; i >= 0; i--)
    {
        console.log("----->", room[i].id, playerId);//room[i].team);//.instance);
        if (room[i].mp == playerMp)//alldata[0])//'cp1')
        {
            console.log('## found player', room[i], room[i].playerName);
            
            room[i].team = team;
            room[i].userid = playerId;
            room[i].id = playerId;
            room[i].setPlayerName(playerName);
            room[i].setSkin(playerSkin);
            room[i].active = true;
            room[i].visible = true;
            // room[i].pos = {x:0, y:0};
        }
    }

    _.forEach(chests, function(chest)
    {
        console.log('adding chest to game!');
        
        _this.core.chests.push(new game_chest(chest, true, _this.core.getplayers, _this.config));
    });

    var cflag;
    //console.log('flags', flags, this.core.config.flagObjects);
    this.config.preflags = [];
    _.forEach(flags, function(flag)
    {
        cflag = _.find(_this.core.config.flagObjects, {'name': flag.name});
        //console.log('cflag', cflag);
        if (cflag)
            cflag.visible = flag.visible;
        else _this.config.preflags.push(flag);
    });

    // console.log('local player mp =', this.players.self.mp);
    // set mp val
    // this.players.self.mp = 'cp' + this.core.getplayers.allplayers.length;
    // this.players.self.mis = 'cis' + this.core.getplayers.allplayers.length;
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

core_client.prototype.client_onhostgame = function(data, callback)
{
    console.log('## client_onhostgame', data);// (player joined is not host: self.host=false)');
    var _this = this;

    // console.log('derek', data);

    var playerMp = data[0];
    var gameId = data[1];
    var chests = data[2];
    var team = data[3];
    var playerName = data[4];
    var flags = data[5];
    var playerId = data[6];
    var others = data[7];
    var playerSkin = data[8];
    var round = data[9];

    this.config.round = round;

    console.log('round', round, this.config.server_time);//, (roundEndTime - now));
    
    /*
    var alldata = data;//.split("|");

    this.mp = alldata[0];
    this.gameid = alldata[1];
    console.log('* game id', this.gameid);
    
    //console.log('1',alldata[0]);
    //console.log('2',alldata[1]);
    console.log(alldata[2]);
    //this.orbs = JSON.parse(alldata[2]);
    var chests = alldata[2];
    //console.log('chestz',this.core.chests);

    var team = parseInt(alldata[3]);
    var playerName = alldata[4];
    var flags = alldata[5];
    var userid = alldata[6];
    var others = alldata[7];
    console.log('others', others);
    */
    
    //console.log('# startpos', startpos);

    //console.log('3',alldata[2]);

    console.log('len', this.core.getplayers.allplayers);//fromRoom(this.xport).length);
    //console.log('vp', this.viewport);

    //We are not the host
    this.players.self.host = false;
    //Update the local state
    this.players.self.state = 'connected.joined.waiting';
    this.players.self.info_color = '#00bb00';

    var p = this.core.getplayers.allplayers;//fromRoom(this.playerPort);
    for (var i = p.length - 1; i >= 0; i--)
    {
        console.log("----->", p[i].mp, p[i].team);//.instance);
        console.log( (p[i].instance) ? p[i].instance.userid : 'no instance');
        //, room[i].instance.userid);//, data);
        //if (room[i].mp == data.mp && data.me)//.instance && room[i].instance.userid == data)
        if (p[i].mp == playerMp)//'cp1')
        {
            console.log('## found "self" player', p[i]);
            //console.log(room[i].instance.userid);
            //console.log(room[i].instance.hosting);
            //this.players.self.md = room[i].md;
            //this.players.self.mis = room[i].mis;
            //if (team > 0)
            p[i].team = team;
            p[i].userid = playerId;
            p[i].id = playerId;
            // if (playerName && playerName.length > 2)
            //     p[i].playerName = playerName;
            // p[i].skin = assets.playerSkin;
            /*/ set start position
            if (team == 1)
                p[i].pos = this.gridToPixel(2, 2);
            else p[i].pos = this.gridToPixel(47, 25);
            */
            p[i].active = true;
            p[i].visible = true;
            p[i].setPlayerName(playerName);
            p[i].setSkin(playerSkin);
            //p[i].playerName = "Jouster";
            // if self.mp == "hp", player is the NEW player!
            // if (this.players.self.mp == "hp")
            // {
            console.log("assigning new client to players.self", this.players.self.mp, this.players.self.playerName, this.players.self.skin);
            p[i].isLocal = true;
            //this.players.self = null;
            this.players.self = p[i];
            
            this.players.self.active = true;
            this.players.self.visible = true;
            this.players.self.dead = false;
            this.players.self.vuln = false;
            this.players.self.landed = 0;
            this.players.self.pos = {x:0,y:0};
            this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
        }
        else if (!p[i].userid)
        {
            console.log('* found "other" player instance', p[i]);
            
            _.forEach(others, function(other)
            {
                console.log('->', other.mp, p[i].mp);
                if (other.mp == p[i].mp)
                {
                    console.log('* assigning userid to other player...', other);
                    
                    p[i].userid = other.userid;
                    p[i].id = other.userid;
                    p[i].active = true;
                    p[i].visible = true;
                    // if (other.playerName != 'undefined')
                    p[i].team = other.team;
                    p[i].setPlayerName(other.playerName);
                    p[i].setSkin(other.skin);
                    
                }
            });
        }
    }

    _.forEach(chests, function(chest)
    {
        _this.core.chests.push(new game_chest(chest, true, _this.core.getplayers, _this.config));
    });

    var cflag;
    console.log('flags', flags);//, this.core.config.flagObjects);
    this.config.preflags = [];
    _.forEach(flags, function(flag)
    {
        cflag = _.find(_this.core.config.flagObjects, {'name': flag.name});
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

core_client.prototype.client_onhostgame_orig = function(data) {
    //if (glog)
    console.log('## client_onhostgame: we are the HOST (self.host=true)');

    //The server sends the time when asking us to host, but it should be a new game.
    //so the value will be really small anyway (15 or 16ms)
    var server_time = parseFloat(data.replace('-','.'));

    //Get an estimate of the current time on the server
    this.core.local_time = server_time + this.socket.latency;//this.net_latency;

    //Set the flag that we are hosting, this helps us position respawns correctly
    this.players.self.host = true;

    //Update debugging information to display state
    this.players.self.state = 'hosting.waiting for a player';
    this.players.self.info_color = '#cc0000';

    this.players.self.mp = "hp";
    this.players.self.mis = "his";
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    for (var i = room.length - 1; i >= 0; i--)
    {
        //console.log("##", room[i]);//.mp, room[i].id);
        //if (room[i].instance) console.log(room[i].instance.userid);
        if (room[i].mp == 'hp')// == data)
        {
            console.log('## found host player', i);
            this.players.self = room[i];
            //this.core.getplayers.allplayers.splice(i, 1);

        }
    }

    // TODO: Remove below
    // this.players.other.mp = 'cp';
    // this.players.other.mis = 'cis';

    //Make sure we start in the correct place as the host.
    this.client_reset_positions();

}; //client_onhostgame

core_client.prototype.client_onconnected = function(data) {
    //if (glog)
    console.log('## client_onconnected')
    console.log(data, '(self.id=' + data[0] + ") ##");
    //console.log('data', data);

    this.players.self.id = data[0];
    this.players.self.userid = data[0];
    if (data[1] !== 0)
        this.players.self.setPlayerName(data[1]);
    this.players.self.skin = "skin" + data[2].toString();
    
    /*var playerdata = data.playerdata.split("|");

    this.players.self.id = data.id;
    this.players.self.userid = data.id;
    if (playerdata[0] !== "undefined" && playerdata[0].length > 2)
        this.players.self.playerName = playerdata[0];
    this.players.self.skin = playerdata[1];*/
    
    //this.players.self.playerName = client
    this.players.self.info_color = '#cc0000';
    this.players.self.state = 'connected';
    this.players.self.online = true;
    console.log('self:', this.players.self);
    

    // for (var i = 0; i < this.core.getplayers.allplayers.length; i++)
    // {
    //     if (!room[i].instance) continue;
    //     console.log(room[i].instance.userid, data.id);
    //     if (room[i].userid === data.id)
    //     {
    //         console.log('found me!');
    //         this.players.self.id = data.id;
    //         //this.players.self.playerName = client
    //         this.players.self.info_color = '#cc0000';
    //         this.players.self.state = 'connected';
    //         this.players.self.online = true;
    //     }
    // }

    //The server responded that we are now in a game,
    //this lets us store the information about ourselves and set the colors
    //to show we are now ready to be playing.
    // this.players.self.id = data.id;
    // this.players.self.userid = data.id;
    // //this.players.self.info_color = '#cc0000';
    // this.players.self.state = 'connected';
    // this.players.self.online = true;

}; //client_onconnected

core_client.prototype.client_on_otherclientcolorchange = function(data) {

    //this.players.other.color = data;

}; //game_core.client_on_otherclientcolorchange

core_client.prototype.client_onping = function(data) {

    this.net_ping = new Date().getTime() - parseFloat( data );
    this.net_latency = this.net_ping/2;

}; //client_onping

core_client.prototype.client_onnetmessage = function(data) {
    //if (glog)
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
                // case 'h' : //host a game requested
                //     this.client_onhostgame(commanddata); break;

                // case 'j' : //join a game requested
                //     this.client_onjoingame(commanddata); break;

                // case 'r' : //ready a game requested
                //     this.client_onreadygame(commanddata); break;

                // case 'e' : //end game requested
                //     this.client_ondisconnect(commanddata); break;

                case 'p' : //server ping
                    this.client_onping(commanddata); break;

                // case 'n' : // get player names
                //     this.client_onplayernames(commanddata); break;

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
                    // case 't' : this.client_on_chesttake(commanddata); break;
                    // remove
                    // case 'r' : this.client_on_chestremove(commanddata); break;
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
                    // case 'k' : this.client_onplayerkilled(commanddata); break;
                }

        } //command

        //break; //'s'
    //} //command

}; //client_onnetmessage

core_client.prototype.client_onplayerkilled = function(victim_id, victor_id)
{
    console.log('client player killed', victim_id, victor_id);

    var victim, victor;
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    for (var i = 0; i < room.length; i++)
    {
        console.log('id', room[i].id);
        if (room[i].id == victim_id)
            victim = room[i];
        else if (room[i].id == victor_id)
            victor = room[i];
    }

    // var _this = this;
    // var split = data.split("|");
    // var victim = _.find(_this.core.getplayers.allplayers, 'id', victim);
    // var victor = _.find(_this.core.getplayers.allplayers, {'id':victor});
    console.log('victim', victim);
    if (victor)
    {
        console.log('victor', victor.mp);
        victim.doKill(victor);
    }
    else victim.doKill();
}

core_client.prototype.client_ondisconnect = function(userid) {
    //if (glog)
    console.log('client_ondisconnect', userid);

    // remove player from client (data is disconnected player.mp)
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    for (var i = room.length - 1; i >= 0; i--)
    {
        console.log(room[i]);
        if (room[i].userid == userid)
        {
            console.log('* removing player', room[i].mp);//, data);
            room[i].disconnected = true;
            room[i].doKill();//active = false;
            //room[i].visible = false;
            //room[i].pos = {x:0, y:0};
            //this.core.getplayers.allplayers.splice(i, 1);
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

core_client.prototype.client_connect_to_server = function(data)
{
    //if (glog)
    console.log('client_connect_to_server', data);

    var _this = this;

    //Store a local reference to our connection to the server
    // this.socket = io.connect("http://192.168.86.106:4004", 
    /*
    var primus = new Primus(server, { transformer: 'websockets' });
    this.Socket = primus.Socket;
    this.socket = new Socket('ws://localhost:3000/?playerdata=' + assets.playerName + "|" + assets.playerSkin);//,
    */

    /*
    this.socket = new WebSocket('ws://localhost:3000/?playerdata=' + assets.playerName + "|" + assets.playerSkin,
    {
        perMessageDeflate: false            
    });
    //*/
    //*
    // var url = "ws://192.168.86.112:3000";///?playerdata=" + assets.playerName + "|" + assets.playerSkin;
    // url = "ws://localhost:3000";
    // var x_port = document.getElementById('portCall');
    // console.log('x_port:', x_port);
    console.log('xport', xport);

    this.xport = xport.toString();
    // this.core.chests = this.core.getplayers.fromRoom()
    
    this.core.getplayers.addRoom(this.xport.toString());
    
    console.log('server port', location.port, location.hostname, location.host);
    console.log('request header', navigator.userAgent, document.referer);
    console.log('cookie', document.cookie);
    console.log('header', location);
    console.log('nav', navigator);
    console.log('doc', document);
    
    
    var socketPort = "3000";
    // switch(parseInt(location.port))
    // {
    //     case 4004:
    //         socketPort = "3000";
    //         break;

    //     case 4005:
    //         socketPort = "3000";
    //         break;
    // }

    var hostname = location.hostname;
    // if (hostname == "192.168.86.108");
    //     hostname = 'localhost';
    // dynamic, server/port-based endpoint
    var dynamicEndpoint = "ws://" + hostname + ":" + xport;
    this.playerPort = xport;

    // static, single-instanced based endpoint
    var staticEndpoint = "ws://" + hostname + ":" + socketPort;

    var url = staticEndpoint;

    console.log("socket url:", url);//, location.port, location);
    this.socket = Primus.connect(url, 
    {
        parser: 'binary',
        reconnect: 
        {
            max: Infinity, // Number: The max delay before we try to reconnect.
            min: 500, // Number: The minimum delay before we try reconnect.
            retries: 3 // Number: How many times we should try to reconnect.
        }
    });
    this.socket.write({cc: assets.playerName + "|" + assets.playerSkin + "|" + xport});

    console.log('primus', this.socket);

    //When we connect, we are not 'connected' until we have a server id
    //and are placed in a game by the server. The server sends us a message for that.
    this.socket.on('open', function open()
    {
        console.log('== client_connect_to_server ==');
        
        this.players.self.state = 'connecting';
        // console.log(this.socket.primus.latency);

    }.bind(this));

    this.socket.on('data', function message(data)
    {
        // console.log('* Received @data message from server', this.socket.latency, data);

        switch(data[0])
        {
            // case "onconnected": _this.client_onconnected(data);//.bind(this);
            // break;
            
            // player killed
            // 1: victim id, 2: victor id
            case 5: _this.client_onplayerkilled(data[1], data[2]); break;

            // join game
            case 10: _this.client_onjoingame(data); break;

            // take chest
            case 15: _this.client_on_chesttake(data[1], data[2]); break;

            // chest removed
            case 16: _this.client_on_chestremove(data[1], data[2]); break;

            // flag slotted in plaque (player)
            case 20: _this.client_onflagadd(data[1], data[2], data[3]); break;

            // flag taken from plaque (player)
            case 21: _this.client_onflagremove(data[1], data[2], data[3]); break;

            // flag visibility changed (map)
            case 22: _this.client_onflagchange(data[1], data[2], data[3]); break;

            // disconnect
            case 25: _this.client_ondisconnect(data[1]); break;

            case 30: _this.client_onroundcomplete(); break;

            // onserverupdate (streaming)
            default: _this.client_onserverupdate_recieved(data); break;
            
        }
    });

    this.socket.on('error', function error(err)
    {
        console.log('* primus error', err.stack);
    });

    this.socket.on('reconnect', function error(opts)
    {
        console.log('* primus attempting reconnect...', opts);
    });

    this.socket.on('end', function end()
    {
        console.log('* Connection closed!');
    });

    this.socket.emits('event', function parser(next, structure) 
    {
        console.log('socket.emits');
        
        next(undefined, structure.data);
    });
    //There are cases where it is necessary to retrieve the spark.id 
    // from the client. To make this easier, we added a primus.id() method 
    // that takes a callback function to which the id will be passed.
    this.socket.id(function (id) 
    {
        console.log('* requesting socket id', id);
    });
    // this.socket.on('onconnected', function(data)
    // {
    //     console.log('ONconnected!', data);
        
    // })
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

    this.socket.on('onhostgame', this.client_onhostgame.bind(this));
    // this.socket.on('onjoingame', this.client_onjoingame.bind(this));
    this.socket.on('onreadygame', this.client_onreadygame.bind(this));
    this.socket.on('onplayerkill', this.client_onplayerkilled.bind(this));
    this.socket.on('ondisconnect', this.client_ondisconnect.bind(this));
    this.socket.on('onplayernames', this.client_onplayernames.bind(this));

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


core_client.prototype.client_refresh_fps = function() 
{
    //We store the fps for 10 frames, by adding it to this accumulator
    this.fps = 1 / this.core.dt;
    this.fps_avg_acc += this.fps;
    this.fps_avg_count++;

    //When we reach 10 frames we work out the average fps
    if(this.fps_avg_count >= 10) {

        this.fps_avg = this.fps_avg_acc/10;
        this.fps_avg_count = 1;
        this.fps_avg_acc = this.fps;

    } //reached 10 frames
}; //game_core.client_refresh_fps

core_client.prototype.client_draw_info = function() 
{
    //if (glog) console.log('client_draw_info');
    var _this = this;

    /////////////////////////////////
    // ping
    /////////////////////////////////
    //When we reach 10 frames we work out the average fps
    // this.ping_avg_acc = this.net_ping;
    // this.ping_count++;
    // if(this.ping_count % 10) 
    // {
    //     this.ping_avg = this.ping_avg_acc/this.ping_count;
    //     //this.fps_avg_count = 1;
    //     //this.fps_avg_acc = this.fps;
    //     var pingTxt = document.getElementById('txtPing');
    //     pingTxt.innerHTML = this.ping_avg;//net_ping;// + "/" + this.last_ping_time;
    // } //reached 10 frames
    // console.log('latency', this.socket.latency, );
    if (this.socket && document.getElementById('txtPing') != this.socket.latency)
    {
        document.getElementById('txtPing').innerHTML = this.socket.latency;//net_ping;// + "/" + this.last_ping_time;
    }
    /////////////////////////////////
    // fps
    /////////////////////////////////
    if (document.getElementById('txtFPS') != this.fps_avg)
    {
        document.getElementById('txtFPS').innerHTML = Math.ceil(this.fps_avg);
    }

    /////////////////////////////////
    // score
    /////////////////////////////////
    if (document.getElementById('txtScore') != this.players.self.score)
        document.getElementById('txtScore').innerHTML = this.players.self.score;

    /////////////////////////////////
    // round time
    /////////////////////////////////
    // if (document.getElementById('txtRoundTimer').innerHTML != )
    var s = this.config.round.endtime - Math.floor(this.config.server_time);
    // var s = this.core.getplayers.fromRoom(this.xport, 5);
    // console.log("s:", s);
    // var min = Math.floor(total / 60);
    // var sec = total - min * 60;
    // console.log('round ends', (s-(s%=60))/60+(9<s?':':':0')+s);
    var roundTimerTxt = document.getElementById('txtRoundTimer');
    if (s > 0)
        roundTimerTxt.innerHTML = (s-(s%=60))/60+(9<s?':':':0')+s;
    else roundTimerTxt.innerHTML = "--:--";
    
    /////////////////////////////////
    // leaderboard
    /////////////////////////////////
    var hscore = [];
    // _.forEach(_this.core.getplayers.fromRoom(this.xport), function(p)
    // _.forEach(_this.core.getplayers.allplayers, function(p)
    var p;
    for (var j = _this.core.getplayers.allplayers.length - 1; j >= 0; j--)
    {
        p = _this.core.getplayers.allplayers[j];
        if (p.active)
            hscore.push({ name: p.playerName, score: p.score, team: p.team, visible: p.visible });
        // if respawning, auto-set score to 0
        if (!p.visible)// || !p.active)
            p.score = 0;
    }
    // sort it
    hscore = _.orderBy(hscore, ['score'], ['desc']);

    // if more than 10 players, take the top 10
    if (hscore.length > 10)
    {
        hscore = hscore.slice(hscore, 0, 10);
    }
    // don't update if redundant
    if (hscore == this.last_hscore) return;
    else this.last_hscore = hscore;
    
    // update DOM #scoreboard items
    var tbl = document.getElementById('scoreslist');
    var color;
    // _.forEach(hscore, function(p, i)
    //var p;
    for (var i = hscore.length - 1; i >= 0; i--)
    {
        p = hscore[i];
        tbl.rows[i].cells.namedItem("index_" + (i+1).toString()).innerHTML = (i + 1).toString() + ". ";
        tbl.rows[i].cells.namedItem("p" + (i+1).toString() + "_name").innerHTML = p.name;
        tbl.rows[i].cells.namedItem("p" + (i+1).toString() + "_score").innerHTML = p.score;
        // set color
        if (!p.visible)// || !p.active)
            color = "lightgray";
        else if (p.team == 1) color = "#FF6961";
        else color = "#6ebee6";
        tbl.rows[i].style.color = color;
    }
    // console.log('score post: ', JSON.stringify(hscore));

    /*
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
    */
}; //game_core.client_draw_help

// core_client.prototype.client_on_chestadd = function(data)
// {
//     console.log('=== client_on_chestadd', data, '===');

// };

core_client.prototype.client_on_chesttake = function(id, player)
{
    console.log('client_on_chesttake', id, player);
    // var split = data.split("|");
    // var id = split[0];
    // var player = split[1];
    // _.forEach(this.core.chests, function(chest)
    var chest;
    for (var i = this.core.chests.length - 1; i >= 0; i--)
    {
        chest = this.core.chests[i];
        console.log('chest id', chest.id, id);
        if (chest.id == id)
        {
            // chest is opened
            chest.opening = true;
            break;
        }
    }
};

core_client.prototype.client_on_chestremove = function(id, player)
{
    console.log('=== client_on_chestremove ===');
    var _this = this;

    // var split = data.split("|");
    // var id = split[0];
    // var player = split[1];

    _.forEach(this.core.chests, function(chest)
    {
        //console.log('chest id', chest.id);
        if (chest.id == id)
        {
            // chest is opened
            _.remove(_this.core.chests, {id: chest.id});
            console.log('* chest removed', id, _this.core.chests);
            return false; // break
        }
    });
};

// slot flag in placque
core_client.prototype.client_onflagadd = function(userid, slotName, flagName)
{
    console.log('client_onflagadd', userid, slotName, flagName);

    var _this = this;

    //data: player.mp|flag.name
    // var split = data.split("|");
    // var userid = player_id;//split[0];
    // var slotName = split[1];
    // var flagName = split[2];
    // var playerSource, slotUsed;

    /////////////////////////////////////
    // get source player
    /////////////////////////////////////
    // var room = this.core.getplayers.getRoomNameByUserId(userid);
    // _.forEach(this.core.getplayers.fromRoom(room), function(ply)
    _.forEach(this.core.getplayers.allplayers, function(ply)
    {
        if (ply.userid == userid)
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
    _.forEach(this.core.config.flagObjects, function(fo)
    {
        console.log('*', fo.name, slotName, flagName);
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
    if (playerSource.userid != this.players.self.userid)
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
core_client.prototype.client_onflagremove = function(player_id, flagName, flagTakenAt)
{
    console.log('client_onflagremove', player_id, flagName, flagTakenAt);

    var _this = this;

    //data: player.mp|flag.name
    /*
    var split = data.split("|");
    var mp = split[0];
    var flagName = split[1];
    var flagTakenAt = split[2];
    */
    var playerSource, flagTaken;

    /////////////////////////////////////
    // get source player
    /////////////////////////////////////
    var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
    _.forEach(room, function(ply)
    {
        if (ply.id == player_id)
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
    _.forEach(this.core.config.flagObjects, function(flag)
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
    flagTaken.heldBy = playerSource.userid;//mp;

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
// TODO: Remove flag if toastMsg.action=="carrierStunned" from toastMsg.flagholder
// toastMsg params: action, flagName, userid, ame, flagVisible, toastMsg
// remove playerName, playerTeam and otherTeam, get these vals from userid
core_client.prototype.client_onflagchange = function(flagName, flagVisible, toastMsg)//Raw)
{
    console.log('client_onflagchange', flagName, flagVisible, toastMsg);
    // var split = data.split("|");
    // var flagName = split[0];
    // var flagVisible = (split[1] == 'true');
    // var toastMsg = JSON.parse(toastMsgRaw);
    var flagObj = this.config._.find(this.core.config.flagObjects, {"name":flagName});//this.name});
    flagObj.visible = flagVisible;
    //console.log('flagName', flagName, flagVisible, flagVisible, flagObj);

    console.log('toastMsg', toastMsg);
    
    if (toastMsg)
    {
        new game_toast().show(toastMsg);
    }
};

core_client.prototype.client_onroundcomplete = function()
{
    console.log('== client_onroundcomplete ==');

    var _this = this;

    // update timer text
    document.getElementById('txtRoundTimer').innerHTML = "--:--";

    // disable player(s)
    this.players.self.active = false;

    // stop game loop and inputs
    this.config.round.active = false;

    // callout
    var callout = document.getElementById('roundCompleteCallout');
    callout.innerHTML = "Round " + this.config.round.total.toString() + " Complete!";
    callout.style.display = "block";
    callout.style.animationPlayState = 'running';

    // delay round winners UI
    setTimeout(function()
    {
        callout.style.display = "none";
        _this.roundWinnersView(); 
    }, 5000);
}

core_client.prototype.client_on_orbremoval = function(data)
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

core_client.prototype.client_handle_input = function(key)
{
    //if (glog)
    // console.log('## client_handle_input', this.players.self.active);//this.keyboard);//this.keyboard.pressed('up'));

    if (this.players.self.vuln === true || this.players.self.active === false)
    {
        console.log('input disabled');
        return;
    }
    //if(this.lit > this.core.local_time) return;
    //this.lit = this.core.local_time+0.5; //one second delay

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
            // console.log('pressed u');
            // y_dir = this.players.self.vy;//0.5;//1;
            // x_dir = this.players.self.vx;
            input.push('u');
            // this.flapUp = true;

        } //up
    
    // TODO: Forcing input every milisecond HACK
    // if (this.keyboard.pressed('x'))// || (!this.keyboard.pressed('up')))
    // {
    //     // if (this.flapUp == true)
    //         input.push('x');
    //     // this.flapUp = false;
    // }

    if( this.keyboard.pressed('space')) {

            //y_dir = -1;
            input.push('sp');

        } //up
    
    // TODO: we are 'faking' input to ensure player is *always* updated
    if (input.length === 0 && this.players.self.landed !== 1) input.push('0');

    if(input.length) 
    {
        // this.core.server_control = false;
        
            //Update what sequence we are on now
        this.input_seq += 1;

            //Store the input state as a snapshot of what happened.
        this.players.self.inputs.push({
            inputs : input,
            time : this.core.local_time.fixed(3),
            seq : this.input_seq
        });

            //Send the packet of information to the server.
            //The input packets are labelled with an 'i' in front.
        var server_packet = 'i.';
        // var server_packet = '';
            server_packet += input.join('-') + '.';
            server_packet += this.core.local_time.toFixed(3).replace('.','-') + '.';
            server_packet += this.input_seq;

            //Go
            // console.log('socket.server_packet', server_packet);
            
        this.socket.write({is: server_packet});

        // release
        server_packet = null;

            //Return the direction if needed
            y_dir = this.players.self.vy;//0.5;//1;
            x_dir = this.players.self.vx;
        return this.core.physics_movement_vector_from_direction( x_dir, y_dir );

    } else {
        // this.core.server_control = true;
        //return {x:0,y:0};
        return this.core.physics_movement_vector_from_direction( x_dir, y_dir );

    }

}; //game_core.client_handle_input

core_client.prototype.client_process_net_prediction_correction = function()
{
    //if (glog)
    // console.log('## client_process_net_prediction_correction', this.server_updates);
    //No updates...
    if(!this.server_updates.length) return;

    //The most recent server update
    var latest_server_data = this.server_updates[this.server_updates.length-1];

    //Our latest server position
    //var my_server_pos = this.players.self.host ? latest_server_data.hp : latest_server_data.cp;
    //console.log('bufferIndex', this.players.self.bufferIndex);
    // console.log('*', this.clientPool, latest_server_data[this.players.self.mp], this.players.self.bufferIndex);

    // console.log('userid', this.players.self.userid, latest_server_data);
    
    if (Object.keys(latest_server_data).length === 0) return;
    
    var self_sp = latest_server_data[this.players.self.userid];  
    // var self_sp = new Int16Array(latest_server_data[this.players.self.userid], (this.players.self.bufferIndex * 16), 16);

    // if (this.players.self.bufferIndex)
    // var self_sp = this.clientPool.set(latest_server_data[this.players.self.mp], (this.players.self.bufferIndex * 16), 16);
    if (self_sp === undefined) return;
    // console.log('len:', self_sp);
    
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
        for(var i = this.players.self.inputs.length - 1; i >= 0; --i)
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
            // console.log("##############");
            //so we have now gotten an acknowledgement from the server that our inputs here have been accepted
            //and that we can predict from this known position instead

            //remove the rest of the inputs we have confirmed on the server
            var number_to_clear = Math.abs(lastinputseq_index - (-1));
            this.players.self.inputs.splice(0, number_to_clear);
            //The player is now located at the new server position, authoritive server
            this.players.self.cur_state.pos = this.pos(my_server_pos);
            /*
            this.players.self.cur_state.pos = 
                        this.v_lerp(this.players.self.pos, this.pos(my_server_pos), this.core._pdt * this.client_smooth);
            //*/
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
            // console.log('kkkk');
            
            //if (my_server_pos == this.players.self.cur_state.pos) return;
            //if (this.players.self.landed === 1) return;
                //if (this.players.self.landed===2)
                //{
                    //console.log('landed...');
                    //console.log('dif', this.players.self.cur_state.pos.x - my_server_pos.x, this.players.self.cur_state.pos.y - my_server_pos.y);
                    
                    
                    //this.players.self.cur_state.pos = this.pos(my_server_pos);

                    this.players.self.cur_state.pos = 
                        this.v_lerp(this.players.self.pos, this.pos(my_server_pos), this.core._pdt * this.client_smooth);
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

core_client.prototype.client_process_net_updates = function()
{
    //if (glog)
    //console.log('## client_process_net_updates');//, this.client_predict);
    // for (var i = 0; i < this.core.getplayers.allplayers.length; i++)
    // {
    //     console.log('::', room[i].host, room[i].id);
    // }

    //No updates...
    // console.log('server_updates', this.server_updates.length);
    
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
    for(var i = count - 1; i >= 0; --i)
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
    //console.log('target', target, 'previous', previous);
    
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
    //   console.log('* target', target);
    //   console.log('* previous', previous);
      
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
        // console.log('lsd', latest_server_data);
        

        //These are the exact server positions from this tick, but only for the ghost
        // var other_server_pos = this.players.self.host ? latest_server_data.cp : latest_server_data.hp;

        //var other_server_pos2 = [];
        //var other_target_pos2 = [];
        //var other_past_pos2 = [];
        //*
        var ghostStub;
        //console.log('->:', target.cp1[0], this.players.self.x);
        
        //console.log('len', this.core.getplayers.allplayers.length, this.players.self.mp);
        //for (var j = 0; j < this.core.getplayers.allplayers.length; j++)
        var vt; // view target
        var vp; // view previous
        var lerp_t={x:NaN,y:NaN};// = {x:0, y:0};
        var lerp_p={x:NaN,y:NaN};// = {x:0, y:0};
        var self_pp;
        var self_tp;
        //console.log('len', this.core.getplayers.allplayers[0]);//.length);
        
        // _.forEach(_this.core.getplayers.allplayers, function(player, index)
        var player;
        var room = this.core.getplayers.allplayers;//fromRoom(this.xport);
        // console.log('room', room);
        for (var j = room.length - 1; j >= 0; j--)
        {
            player = room[j];//this.core.getplayers.allplayers[j];
            //console.log('=', player.mp, _this.players.self.mp);
            // console.log('i', player.name, player.userid, player.isLocal);
            
            if (!player.userid) continue;//return;
            // else console.log('#', player.userid, _this.players.self.userid);
            
            // "other" player, not local player "self"
            if (!player.isLocal)//userid != _this.players.self.userid)// && previous[player.mp])
            {
                // console.log('**', target[player.mp]);
                // check for bad objects
                if (target[player.userid] === undefined)
                {
                    //console.log('** bad target', previous[player.mp]);
                    if (previous[player.userid])// || previous[player.mp] === undefined) 
                        target[player.userid] = previous[player.userid];
                    else break;//return;
                }
                else if (previous[player.userid] === undefined)
                {
                    //console.log('** bad previous', target[player.mp]);
                    if (target[player.userid]) 
                        previous[player.userid] = target[player.userid];
                    else break;//return;
                }
                vt = target[player.userid];
                vp = previous[player.userid];
                /*vt = new Int16Array(target[player.userid], (j * 16), 16);//, len);//, Math.floor(target.cp1.byteLength/2));
                vp = new Int16Array(previous[player.userid], (j * 16), 16);*/
                // vp = _this.clientPool.set(previous[player.mp], (index * 16), 16);
                // console.log('vt', vt);
                // console.log('vp', vp);

                  // check for invalid values (bad socket?)
                  //if (!(vt[0]>0)) return;
                  
                //   console.log(view.getUint16(1));//.getInt16(1));//typeof(target.cp1), target.cp1.length);//.getInt16(1));

                // other_server_pos2=latest_server_data[player.mp];
                // other_target_pos2=latest_server_data[player.mp];
                // other_past_pos2=latest_server_data[player.mp];
                // console.log('*', previous[player.mp]);
                
                var p = {}; // temp player obj
                // for (var prop in p)
                // {
                //     if (p.hasOwnProperty(prop))
                //         delete p[prop];
                // }
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
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this.core._pdt*this.client_smooth);
                //console.log(p.pos);

                //if (ghostStub.x > 0 && ghostStub.y > 0)
                //if (p.pos.x > 0 && p.pos.y > 0)
                    //player.pos = p.pos;
                player.pos = _this.v_lerp(p.pos, ghostStub, _this.core._pdt * _this.client_smooth);
                //else
                //{ 
                    //window.alert(p.pos);
                    //return;
                //}
                //player.pos = _this.v_lerp(p.pos, ghostStub, _this.core._pdt * _this.client_smooth);
                // console.log('vt', vt);
                
                player.setFromBuffer(vt);
                /*
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
                player.bufferIndex = j;// -> vt[12]
                player.score = vt[13];
                player.active = (vt[14] === 1) ? true : false;
                */
                //player.dead = (vt[13] == 1) ? true : false;
                // console.log(player.mp, player.active, player.visible);
                //if (player.mp == "cp1")
                    // console.log('#', player.mp, vt);

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
                // console.log('* p', player.pos);
                
                // console.log(this.core.getplayers.allplayers[j]);
            }
            else // local player
            {
                // console.log('local player');
                
                var self_vt = target[player.userid];
                var self_vp = target[player.userid];

                if (self_vt === undefined) return;

                /*var self_vt = new Int16Array(target[player.userid], (j * 16), 16);//, len);//, Math.floor(target.cp1.byteLength/2));
                var self_vp = new Int16Array(previous[player.userid], (j * 16), 16);*/
                
                // var self_vt = _this.clientPool(target[player.mp], (index * 16), 16);//, len);//, Math.floor(target.cp1.byteLength/2));
                // var self_vp = _this.clientPool(previous[player.mp], (index * 16), 16);
                // console.log('vt', target[player.userid]);
                // console.log('vp', self_vp);

                self_tp = {x:parseInt(self_vt[0]), y:parseInt(self_vt[1])};
                self_pp = {x:parseInt(self_vp[0]), y:parseInt(self_vp[1])};
                player.bufferIndex = j;
                // console.log('vt', self_vt);
                
                _this.players.self.setFromBuffer(self_vt);
                // console.log('svrtime', this.config.server_time);
                
                /*
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
                _this.players.self.bufferIndex = j;// -> vt[12]
                _this.players.self.score = self_vt[13];
                _this.players.self.active = (self_vt[14] === 1) ? true : false;
                //_this.players.self.team = self_vt[13];
                //}
                //*/
                // console.log('@', _this.players.self.mp, _this.players.self.active, _this.players.self.visible);
                

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
                // console.log('Me', _this.players.self.pos, self_vt);
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
        } // end forEach
        
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
                //console.log(previous[this.core.getplayers.allplayers[j].mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this.core._pdt*this.client_smooth);
                pos = _this.v_lerp({x:plat.x,y:plat.y}, ghostStub, _this.core._pdt * _this.client_smooth);
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
        _.forEach(this.core.config.flagObjects, function(flag)
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
                //console.log(previous[this.core.getplayers.allplayers[j].mp]);
                //this.players.other.pos = this.v_lerp( this.players.other.pos2, ghostStub, this.core._pdt*this.client_smooth);
                pos = _this.v_lerp({x:flag.x,y:flag.y}, ghostStub, _this.core._pdt * _this.client_smooth);
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
        // console.log(target);
        // console.log('got evt flag', _.has(target, 'fc'), this.events.length);
        // first, check for chest events (dynamic)
        if (_.has(target, 'ec'))
        {
            // avoid reduncancy
            if (!target.ec) return false; // break

            console.log('got chest event', target.ec.i);
            _this.core.addChest(target.ec, this.xport);
            // clear it to avoid duplicate reads
            target.ec = null;
        }
        if (_.has(target, 'fc'))
        {
            console.log('* fc evt', target.fc);

            // get client flag (clientCooldown)
            var cflag = _.find(_this.core.clientCooldowns, {'name':target.fc.f});
            cflag.heldBy = target.fc.p;
            cflag.timer = target.fc.t;

            // get flag obj
            var flag = _.find(_this.core.config.flagObjects, {'name':target.fc.f});

            // set client flag target slot
            cflag.target = flag.targetSlot;
            cflag.src = flag.sourceSlot;
            // console.log(":::", cflag);
            //console.log('flag', flag);

            // get player
            var ply = _.find(this.core.getplayers.allplayers, {"userid":target.fc.p});
            // var ply = this.core.getplayers.getPlayerByUserId(target.fc.p);
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
            var flg = _.find(this.core.config.flagObjects, {'name':target.fs.f});
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
                    this.v_lerp(self_pp, self_tp, time_point),//this.core._pdt*this.client_smooth),
                    this.core._pdt*this.client_smooth
                );
            }

            
        //}
        //else this.players.self.pos = this.players.self.old_state;
        
        /*
        this.players.self.pos =
            this.v_lerp(this.players.self.pos,
            this.v_lerp(previous[this.players.self.mp], target[this.players.self.mp], this.core._pdt*this.client_smooth),
            this.core._pdt*this.client_smooth
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
                //this.players.other.pos = this.v_lerp( this.players.other.pos, this.ghosts.pos_other.pos, this.core._pdt*this.client_smooth);
                // TODO: remove check below
                //if (other_server_pos)
                // this.players.other.pos = this.v_lerp( this.players.other.pos, ghostStub, this.core._pdt*this.client_smooth);
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
                    this.players.self.pos = this.v_lerp( this.players.self.pos, local_target, this.core._pdt*this.client_smooth);
                }
                else
                {
                    this.players.self.pos = this.pos( local_target );
                }
            }*/
        //} // if other_server_pos

    } //if target && previous
    //else console.log('target/previoius', target, previous);
    

}; //game_core.client_process_net_updates

core_client.prototype.client_onserverupdate_recieved = function(data)
{
    // if (glog)
    // console.log('## client_onserverupdate_recieved', data);
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

core_client.prototype.client_update_local_position = function()
{

 //if(this.client_predict)
 //{
     //if (glog)
     //console.log('## client_update_local_position');

        //Work out the time we have since we updated the state
        var t = (this.core.local_time - this.players.self.state_time) / this.core._pdt;

        //Then store the states for clarity,
        var old_state = this.players.self.old_state.pos;
        //if ()
        var current_state = this.players.self.cur_state.pos;
        //console.log("old", old_state, "current", current_state);
        //Make sure the visual position matches the states we have stored
        //this.players.self.pos = this.v_add( old_state, this.v_mul_scalar( this.v_sub(current_state,old_state), t )  );
        //console.log(current_state.d);

        // TODO: !!! Uncomment below if client pos mismatch !!!
        //*
        // console.log(this.core.server_control);
        
        if (!this.core.server_control)
            this.players.self.pos = current_state;
        //*/

        //We handle collision on client if predicting.
        //if (this.players.self.landed === 1)
        //this.check_collision( this.players.self );
        /*
        if (this.clientWorker_tileCollision)
        {
            var message = {player: this.players.self};
            this.clientWorker_tileCollision.postMessage(message, [message.player]);
            this.clientWorker_tileCollision.onmessage = evt => 
            {
                console.log('* got message from worker!', evt);    
            }
        }
        else//*/ 
        this.core.check_collision(this.players.self);

    //}  //if(this.client_predict)

}; //core_client.prototype.client_update_local_position

core_client.prototype.client_update_physics = function()
{
    //if (glog)
    // console.log('## client_update_physics');
    //Fetch the new direction from the input buffer,
    //and apply it to the state so we can smooth it in the visual state

    //if(this.client_predict)
    //{
        //if (!this.players.self.old_state) return;
        this.players.self.old_state.pos = this.pos( this.players.self.cur_state.pos );
        //if (this.players.self.mp != "hp")
        //{
        var nd = this.core.process_input(this.players.self);
        // if (nd.x==0&&nd.y==0) this.core.server_control=true;
        // else this.core.server_control = false;
        // console.log('nd:', nd);
        
        //if (nd.x === 0 && nd.y == 0)
            //this.players.self.update();
        //else 
        this.players.self.cur_state.pos = this.v_add( this.players.self.old_state.pos, nd);
        this.players.self.state_time = this.core.local_time;
        //}
        
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

core_client.prototype.client_update = function()
{
    //if (glog)
    //console.log('## client_update');
    //console.log(this.viewport);
    // console.log('1', this.players);
    // console.log('2', this.players.self);
    // console.log('self::', this.players.self.mp, this.viewport.width);
    // console.log('**', this.players.self.active, this.players.self.landed, this.players.self.pos);
    
    
    
    if (this.players.self.mp == "hp" || !this.config.round.active) return;

    // var _this = this;

    //////////////////////////////////////////
    // Camera
    //////////////////////////////////////////
    // Clear the screen area (just client's viewport, not world)
    // if player stopped, use last camera pos
    // TODO: lerp camera movement for extra smoothness
    if (this.players.self.landed !== 1)// && this.players.self.pos.x > 0)
    {
        var pad = 0;
        // clamp(value, min, max)
        // return Math.max(min, Math.min(value, max));
        // console.log('lpos', this.players.self.campos.x, this.players.self.pos.x);
        this.cam.pos = //this.players.self.pos;
        this.v_lerp(this.players.self.pos, this.players.self.campos, this.core._pdt * this.client_smooth);
        // console.log('lpos', this.cam.pos, this.players.self.pos);
        this.cam.x = clamp(-this.cam.pos.x + this.viewport.width * 0.5, -(this.config.world.width - this.viewport.width) - pad, pad);//this.this.config.world.width);
        this.cam.y = clamp(-this.cam.pos.y + this.viewport.height*0.5, -(this.config.world.height - this.viewport.height) - pad, pad);//this.game.world.height);
        //this.cam.x = parseInt(camX);
        //this.cam.y = parseInt(camY);

        this.players.self.campos = this.players.self.pos;
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
    /*if (this.flashBang > 0)
    {
        // TODO: break this up into smaller rects
        console.log('flashbang');
        this.ctx.beginPath();
        if (this.flashBang === 1)
        this.ctx.fillStyle = 'white';
        else this.ctx.fillStyle = 'red';
        this.ctx.rect(-this.cam.x,-this.cam.y,this.viewport.width+128,this.viewport.height+128);
        this.ctx.fill();
        this.ctx.closePath();
        this.flashBang = 0;
    }*/

    //draw help/information if required
    // console.log(this.config.server_time);
    // if (this.config.server_time % 1 === 0)
    this.client_draw_info();

    // draw prerenders
    //console.log(this.canvas2, this.bg, this.barriers, this.fg);
    if (this.bg)
    {
        this.ctx.drawImage(this.bg, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height); // tiled bg layer
    }
    if (this.fg)
    {
        //this.ctx.drawImage(this.canvas2, 0,0); // orbs
        // this.ctx.drawImage(this.barriers, 0, 0);
        //console.log('this.cam', this.cam);
        // tiled barriers layer
        this.ctx.drawImage(this.barriers, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height);
        // tiled fg layer
        this.ctx.drawImage(this.fg, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height, Math.abs(this.cam.x), Math.abs(this.cam.y), this.viewport.width, this.viewport.height);
        //this.ctx.drawImage(this.fg, 0, 0); // tiled fg layer
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
    //for (var i = 0; i < this.core.getplayers.allplayers.length; i++)
    // TODO: Only draw 'onscreen' players
    // console.log('p', this.players.self.pos);
    
    //console.log('cam', this.players.self.mp, this.cam.y, this.viewport.height);
    //console.log(':',this.players.self.pos.x + this.cam.x, (this.players.self.pos.x + this.cam.x)*2);//, this.players.self.pos.y)
    // console.log("# players", this.core.getplayers.fromRoom(this.xport));
    // _.forEach(this.core.getplayers.fromRoom(_this.xport), function(ply)
    // _.forEach(this.core.getplayers.allplayers, function(ply)
    var ply;
    for (var j = this.core.getplayers.allplayers.length - 1; j >= 0; j--)
    {
        // console.log('ply', ply);
        ply = this.core.getplayers.allplayers[j];
        if (ply.active && !ply.isLocal)//ply != _this.players.self)// && room[i].active===true)
        {
            // console.log('#p', ply.pos);
            //ply.draw();
            if 
            (
                // ply is *above* local player
                (ply.pos.y + this.cam.y + ply.size.hy > 0)
                &&
                // ply is *below* local player
                (ply.pos.y + this.cam.y - ply.size.hy) <= this.viewport.height//(_this.players.self.pos.y + _this.cam.y) * 2
                /* || 
                (
                    _this.players.self.pos.y + _this.cam.y <= 
                    ((_this.players.self.pos.y + _this.cam.y) * 2) 
                    && 
                    (_this.players.self.pos.y + _this.cam.y) > 0
                ) */
                &&
                // ply is visible left of local player
                (ply.pos.x + this.cam.x - ply.size.hx) <= this.viewport.width
                //ply.pos.x + (Math.abs(_this.cam.x) * 2) < _this.players.self.pos.x
                &&
                // ply is visible right of local player
                (ply.pos.x + this.cam.x + ply.size.hx > 0)
            )//<= _this.players.self.pos.y + _this.cam.y)
            {
                ply.draw();
                //if (ply.mp == "cp1")console.log(ply.pos.x, _this.cam.x, _this.players.self.pos.x, _this.viewport.width);
            }
            //else if (ply.mp == "cp1")console.log('not drawing', ply.pos.x, _this.cam.x, _this.players.self.pos.x);//, _this.cam.y, _this.players.self.pos.y);
        }
    }

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
    // _.forEach(this.spritesheets, function(ss)
    for (j = this.spritesheets.length - 1; j >= 0; j--)
    {
        //if (this.spritesheets[k].state !== this.spritesheets[k].STATE_INTACT)
        this.spritesheets[j].update();
    }

    // chests
    // _.forEach(this.core.getplayers.fromRoom(this.xport, 2), function(chest)
    // _.forEach(_this.core.chests, function(chest)
    for (j = this.core.chests.length - 1; j >= 0; j--)
    {
        // console.log("chest.draw()", chest);
        this.core.chests[j].draw();
    }

    // flags
    // _.forEach(this.core.config.flagObjects, function(flagObj)
    for (j = this.core.config.flagObjects.length - 1; j >= 0; j--)
    {
        //console.log('fobj', flagObj.type, flagObj.name, flagObj.x, flagObj.y);
        if (this.core.config.flagObjects[j].type == "flag")
            this.core.config.flagObjects[j].draw();
    }


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

core_client.prototype.tilemapper = function()
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
        var flagObjectsObj;
        //console.log('objectgroups', objectgroupNode.length);
        //for (var og = 0; og < objectgroupNode.length; og++)
        _.forEach(objectgroupNode, function(ogn)
        {
            var ogName = ogn.getAttribute('name');
            console.log('group name', ogName);//, ogn);
            var ogInner = ogn.innerHTML;
            var ogRows = ogInner.split("\n");
            ogRows.shift(); ogRows.pop();
            //console.log(ogRows);
            var parser = new DOMParser();
            var xml, atts, s;
            var nodes = [];
            //for (var d = 0; d < ogRows.length; d++)
            _.forEach(ogRows, function(ogr)
            {
                // parse to xml
                xml = parser.parseFromString(ogr, "text/xml");
                // get attributes (via NamedNodeMap)
                atts = xml.childNodes[0].attributes;
                nodes.push(atts);
                //console.log('atts', atts);
            });
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
                        _this.core.chestspawnPoints.push(chestSpawnObj);
                    }*/
                break;

                case "flagObjects":
                // assign attribues to chest obj
                var flg;
                //for (var e = 0; e < nodes.length; e++)
                //var flagObjectsObj;
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
                        //this.core.config.flagObjects.push(new game_flag(flagObjectsObj, _this.viewport.getContext('2d')));
                        //flg.setter(flagObjectsObj);
                    //}
                    //else {
                    //    flg = new game_flag(flagObjectsObj.type, null);
                        //flg.setter(flagObjectsObj);
                    //}
                    //this.core.config.flagObjects.push(flg);
                });
                // for (var k in flagObjectsObj)
                //     delete flagObjectsObj[k];

                /*
                _.forEach(objsArray, function(i)
                {
                    //console.log(i);
                    this.core.config.flagObjects.push(new game_flag(i, _this.viewport.getContext('2d')));
                });*/
                break;
            } // switch
        }); // forEach

        // for (var k in flagObjectsObj)
        //     delete flagObjectsObj[k];
        //console.log('chests', this.core.chestspawnPoints);
        //console.log('players', this.core.config.flagObjects);

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
            console.log('flagArray', flagArray);
            
            _.forEach(flagArray, function(fo)
            {
                //console.log('fog', fo);
                if (fo.type == "flag")
                {
                    var flag = new game_flag(fo, _this.config.ctx, _this.core.getplayers, _this.config);
                    //console.log('vis name', vis[fo.name]);
                    if (_this.config.preflags)
                    {
                        flag.visible = pre[fo.name].visible; // set default visibility
                        flag.x = pre[fo.name].x;
                        flag.y = pre[fo.name].y;
                    }
                    _this.core.config.flagObjects.push(flag);//new game_flag(fo, _this.viewport.getContext('2d')));
                }
                else if (fo.type == "slot")
                {
                    var slot = new game_flag(fo, _this.fg.getContext('2d'), _this.core.getplayers, _this.config);
                    //slot.setter(fo);
                    _this.core.config.flagObjects.push(slot);
                    slot.draw();

                    /*console.log('revising ctx');
                    //fo.setCtx(_this.fg.getContext('2d'));
                    this.core.config.flagObjects.push(new game_flag(fo, _this.fg.getContext('2d')));*/
                    //fo.draw();
                }
                //else fo.draw();
            });
            console.log('flagObjects:', _this.core.config.flagObjects);
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
    // TODO: housecleaning
    if (flagObjectsObj)
    {
        console.log('* removing flag objects...');
        
        for (var k in flagObjectsObj)
            delete flagObjectsObj[k];
    }
};
core_client.prototype.addSpriteSheets = function()
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

core_client.prototype.prerenderer = function()
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
    // console.log(Math.max(min, Math.min(value, max)));
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

core_client.prototype.updateTerritory = function()
{
    console.log('== game_core.updateTerrotiroy', this.bg, this.core.config.flagObjects.length, "==");

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
    console.log('flagobjects', this.core.config.flagObjects);
    
    var red = _.find(this.core.config.flagObjects, {'name':'redFlag'});
    var mid = _.find(this.core.config.flagObjects, {'name':'midFlag'});
    var blue = _.find(this.core.config.flagObjects, {'name':'blueFlag'});
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
        ctx.beginPath();
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
                //ctx.beginPath();
                ctx.fillStyle = "#04293c";
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                //ctx.fill();
                //ctx.closePath();
            }
            else
            {
                //ctx.beginPath();
                ctx.fillStyle = "#340404";
                ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                //ctx.fill();
                //ctx.closePath();
            }
        }
        ctx.closePath();
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


core_client.prototype.flagToScore = function(flag, slot)
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

core_client.prototype.roundWinnersView = function()
{
    console.log('== roundWinnersView ==');

    var _this = this;

    // show winners ui
    document.getElementById('roundWinnersView').style.display = "flex";

    // hide game ui
    document.getElementById('viewport').style.display = "none";
    document.getElementById('uiInfoBar').style.display = "none";
    document.getElementById('uiTopBar').style.display = "none";
    document.getElementById('uiInfoBarBottom').style.display = "none";
    document.getElementById('scoreboard').style.display = "none";
    document.getElementById('mobile-controls-r').style.display = "none";
    document.getElementById('mobile-controls-l').style.display = "none";

    // document.getElementById('winnersRow').style.display = "none";

    // assign card face to winners cards
    var cardsArray = ["bubble","alacrity","precision","recover","blink","reveal","bruise","plate"]; // ordered abilities
    // winners: 1 = index / 2 = userid / 3 = ability
    var winners = 
    [
        {i:1,u:1,a:6},
        {i:2,u:2,a:2},
        {i:3,u:3,a:5},
        {i:4,u:4,a:7},
        {i:5,u:5,a:2},
        {i:6,u:6,a:4}
    ]; // ordered userid's
    console.log('allplayers', this.core.getplayers.allplayers);
    
    // show bonus round text
    var bonusText = function()
    {
        var callout = document.getElementById('roundCompleteCallout');
        callout.innerHTML = "BONUS ROUND<br>Your team's <b>TOP 3 Round</b> " + _this.config.round.total.toString() + " Scorers";
        callout.style.display = "block";
        callout.style.animationPlayState = 'running';

        setTimeout(function()
        {
            showWinners(false);
        }, 1500);
    };
    bonusText();

    // show players
    var showWinners = function(isTop10)
    {
        var ele, url, winner,pname,pskin;
        for (var i = 0; i < 3; i++)
        {
            winner = winners[i];
            ele = "front" + (i + 1).toString();
            url = './assets/card_' + cardsArray[winner.a-1] + '.png';
            pname = "winner" + (i + 1).toString() + "label";
            
            document.getElementById(ele).style.backgroundImage = "url('" + url + "')";
            document.getElementById(pname).innerHTML = winner.u.toString();
        }
        document.getElementById("winner1").style.opacity = "1";
        var pcount = 1;
        var showPlayers = setInterval(function()
        {
            console.log('pcount', pcount);
            
            if (pcount < 4)
                document.getElementById("winner" + pcount.toString()).style.opacity = "1";
            else 
            {
                clearInterval(showPlayers);
                if (isTop10)
                    flipper(true);
                else dropper();
            }
            pcount++;

        }, 1500);
    };
    
    // card drop
    var dropper = function()
    {
        document.getElementById('roundCompleteCallout').style.display = "none";

        var container1 = document.getElementById('card1Container');
        var container2 = document.getElementById('card2Container');
        var container3 = document.getElementById('card3Container');
        var ccard = container1;
        var ccount = 1;
        var carddrop = setInterval(function()
        {
            // console.log('dropping card', ccount);
            if (ccount===2) ccard = container2;
            else if (ccount===3) ccard = container3;
            // console.log('cardContainer:', ccard);
            
            // card.className = 'flipped';
            ccard.style.visibility = 'visible';
            ccard.style.animationPlayState = 'running';
            // card.classList.add('flipped');
            ccount++;
            if (ccount > 3)
            {
                clearInterval(carddrop);
                flipper(false);
            }
        }, 1000);
    };

    var flipper = function(isTop10)
    {
        var card1 = document.getElementById('card1');
        var card2 = document.getElementById('card2');
        var card3 = document.getElementById('card3');
        var count = 1;
        var card = card1;
        var cardflipper = setInterval(function()
        {
            console.log('flipping card', count);
            if (count===2) card = card2;
            else if (count===3) card = card3;
            else if (count > 3) // we're done
            {
                cardsReset();
                clearInterval(cardflipper);
            }
            // console.log('card:', card);
            
            // card.className = 'flipped';
            card.classList.remove('cardContainer');
            card.classList.add('flipped');
            count++;
        }, 1500);
    }

    var cardsReset = function()
    {
        setTimeout(function()
        {
            document.getElementById('winner1').style.opacity = 0;
            document.getElementById('winner2').style.opacity = 0;
            document.getElementById('winner3').style.opacity = 0;

            card1.classList.add('flippedBack');
            card1.classList.remove('flipped');
            card2.classList.add('flippedBack');
            card2.classList.remove('flipped');
            card3.classList.add('flippedBack');
            card3.classList.remove('flipped');
            
            var callout = document.getElementById('roundCompleteCallout');
            callout.innerHTML = "Your <b>TOP 10</b> Round " + _this.config.round.total.toString() + " Scorers<br><i>(Selected at Random)</i>";
            callout.style.display = "block";
            // callout.style.animationPlayState = 'running';

            setTimeout(function()
            {
                callout.style.display = "none";
                showWinners(true);
            }, 3000);
        }, 2000);
    }
};

module.exports = core_client;