function game_player( game_instance, player_instance, isHost )
{
    console.log('game_player');//, game_instance, player_instance);
    //Store the instance, if any
    // ## NOTE: only server sends instance, not clients!!
    if (player_instance) console.log('** server added player (with instance)');
    else console.log('** added player (without instance)');
    //if (isGhost) console.log('** ^ player is ghost, adding to ghost store');

    var self = this;

    this.instance = player_instance;
    this.game = game_instance;

    //Set up initial values for our state information
    this.pos = { x:0, y:0 };
    this.size = { x:64, y:64, hx:64, hy:64 };
    this.dir = 0; // 0 = right, 1 = left (derek added)

    // velocity
    this.vx = 0; // velocity (derek added)
    this.vy = 0;

    // acceleration
    this.ax = 0;
    this.ay = 0;

    this.flap = false; // flapped bool (derek added)
    this.landed = 0; // 0=flying, 1=stationary, 2=walking
    this.visible = true;
    this.active = false;
    this.state = 'not-connected';
    //this.color = 'rgba(255,255,255,0.1)';
    this.info_color = 'rgba(255,255,255,0.1)';
    //this.id = '';

    this.isLocal = false;

    // assign pos and input seq properties
    if (isHost && player_instance)// && player_instance.host)
    {
        console.log('WE GOT SERVER HOST!');
        this.mp = 'hp';
        this.mis = 'his';
    }
    else {
        this.mp = 'cp' + (this.game.allplayers.length + 1);
        this.mis = 'cis' + (this.game.allplayers.length + 1);
    }

    //Our local history of inputs
    this.inputs = [];

    //The world bounds we are confined to
    this.pos_limits = {
        x_min: 0,//this.size.hx,
        x_max: this.game.world.width - this.size.hx,
        y_min: 0,//this.size.hy,
        y_max: this.game.world.height - this.size.hy
    };

    //The 'host' of a game gets created with a player instance since
    //the server already knows who they are. If the server starts a game
    //with only a host, the other player is set up in the 'else' below
    this.pos = { x:Math.floor((Math.random() * this.game.world.width - 64) + 64), y:128};//this.game.world.height-this.size.hy };

    //These are used in moving us around later
    this.old_state = {pos:this.pos};
    this.cur_state = {pos:this.pos};
    this.state_time = new Date().getTime();

    this.level = 1; // 1:256, 2:512, 3:1024, 5:2048, 6:4096, etc.
    this.mana = 0;
    this.pointsTotal = 0;
    this.levels = [0,128,256,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.progression = 0;
    this.numStores = 0;

    this.playerName = "Ze Bot";
    //this.lastNamePlate = "YOU";

    this.updateMana = function(val)
    {
        console.log('update mana', val);
        if (val > 0)
        {
            this.mana += val;
            this.pointsTotal += val;
        }
        else
        {
            this.mana -= val;
        }
        // calculate level, progression and mana stores
        if (this.pointsTotal < this.levels[0])
        {
            this.level = 1;
            this.progression = this.mana;
            this.numStores = 0;
        }
        else if (this.pointsTotal < this.levels[1])
            this.level = 2;
        else if (this.pointsTotal < this.levels[2])
            this.level = 3;
        else if (this.pointsTotal < this.levels[3])
            this.level = 4;
        else if (this.pointsTotal < this.levels[4])
            this.level = 5;
        else if (this.pointsTotal < this.levels[5])
            this.level = 6;
        else if (this.pointsTotal < this.levels[6])
            this.level = 7;
        else if (this.pointsTotal < this.levels[7])
            this.level = 8;
        else if (this.pointsTotal < this.levels[8])
            this.level = 9;
        else if (this.pointsTotal < this.levels[9])
            this.level = 10;
        else if (this.pointsTotal < this.levels[10])
            this.level = 11;

        this.level = Math.ceil(this.mana / 256);
        console.log(this.level, this.mana);
    };

    this.stunned = false;

    var stunLen = 1500; // 1.5 sec
    this.isStunned = function()
    {
        console.log('Im stunned!');

        self.stunned = true;

        var stun = setInterval(function()
        {
            self.stunned = false;
            console.log('No longer stunned...');
            clearInterval(stun);
        }, stunLen);
        // setInterval (3 sec)
    };

    this.getGrid = function()
    {
        return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
    };

    this.getCoord = function()
    {
        // direction-dependent, account for
        var nw = { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
        var ne = { x: Math.floor((this.pos.x + this.size.hx) / 64),y: Math.floor(this.pos.y / 64) };
        var sw = { x: Math.floor(this.pos.x / 64), y: Math.floor((this.pos.y + this.size.hy) / 64) };
        var se = { x: Math.floor((this.pos.x + this.size.hx) / 64), y: Math.floor((this.pos.y + this.size.hy) / 64) };
        return { nw:nw, ne:ne, sw:sw, se:se };
        //return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
    };
    this.hitGrid = function()
    {
        //if (this.game.server) console.log(this.tilemapData);
        if (this.game.tilemapData == undefined) return;
        var tmd = this.game.tilemapData;

        var c = this.getCoord();
        //console.log(c);
        //console.log('nw', tmd.length);
        return {
            nw: (tmd[c.nw.y] && tmd[c.nw.y][c.nw.x]) ? {t:parseInt(tmd[c.nw.y][c.nw.x]),x:c.nw.x,y:c.nw.y} : 0,
            ne: (tmd[c.ne.y] && tmd[c.ne.y][c.ne.x]) ? {t:parseInt(tmd[c.ne.y][c.ne.x]),x:c.ne.x,y:c.ne.y} : 0,
            sw: (tmd[c.sw.y] && tmd[c.sw.y][c.sw.x]) ? {t:parseInt(tmd[c.sw.y][c.sw.x]),x:c.sw.x,y:c.sw.y} : 0,
            se: (tmd[c.se.y] && tmd[c.se.y][c.se.x]) ? {t:parseInt(tmd[c.se.y][c.se.x]),x:c.se.x,y:c.se.y} : 0
        };
    };

    // new physics properties begin

    // new physics properies end

} //game_player.constructor

game_player.prototype.draw = function()
{
    // player nametags (temp)
    // mana bar bg
    var txtOffset = 10;
    if (this.isLocal === true)
    {
        game.ctx.beginPath();
        game.ctx.strokeStyle = 'gray';
        game.ctx.moveTo(this.pos.x + 14, this.pos.y-10);
        game.ctx.lineTo(this.pos.x + 14 + this.size.hx - 28, this.pos.y-10);
        game.ctx.stroke();

        // mana progress
        game.ctx.beginPath();
        game.ctx.strokeStyle = 'green';
        game.ctx.moveTo(this.pos.x + 14 + (64/4), this.pos.y-10);
        game.ctx.lineTo(this.pos.x + 14 + this.size.hx - 28, this.pos.y-10);
        game.ctx.stroke();

        // mana stores
        game.ctx.fillStyle = 'green';
        game.ctx.beginPath();
        game.ctx.arc(this.pos.x + 14, this.pos.y-20, 2,0,2*Math.PI);
        game.ctx.fill();

        // nameplate color
        game.ctx.fillStyle = 'white';
        game.ctx.font = "small-caps lighter 12px arial";

        txtOffset = 30;
    }
    else
    {
        // nameplate color
        game.ctx.fillStyle = '#f73a07';
        game.ctx.font = "small-caps lighter 12px arial";
    }
    // game.ctx.strokeRect(
    //     this.pos.x,
    //     this.pos.y-10,
    //     this.size.hx,
    //     5);

    // nameplate
    game.ctx.font = "small-caps lighter 12px arial";
    game.ctx.textAlign = 'center';
    game.ctx.fillText(
        this.playerName + " (" + this.mp + ") " + this.mana.toString(),// + this.game.fps.fixed(1),
        this.pos.x + (this.size.hx/2),//.fixed(1),
        this.pos.y - txtOffset
        //100
    );

    // player bitamps
    var img, imgW, imgH;
    //if (this.pos.d == 1)
    //if (this.landed > 0) console.log(this.landed, this.mp);
    if (this.stunned === true)
    {
        if (this.dir === 1)
            img = document.getElementById("p1stun-l");
        else img = document.getElementById("p1stun-r");

        imgW = 64;//40;
        imgH = 64;//40;
    }
    else if (this.flap === true)
    {
        // reset flap on client
        this.flap = false;
        if (this.dir === 1) img = document.getElementById("p1l");
        else img = document.getElementById("p1r");

        imgW = 64;//40;
        imgH = 64;//40;
    }
    else if (this.landed === 1) // standing
    {
        //console.log('standing', this.landed, this.mp);
        if (this.dir === 1)
            img = document.getElementById("p1stand-l");
        else img = document.getElementById("p1stand-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else if (this.landed === 2) // walking/skidding
    {
        if (this.dir === 1)
            img = document.getElementById("p1skid-l");
        else img = document.getElementById("p1skid-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else // gliding
    {
        if (this.dir === 1)
            img = document.getElementById("p2l");
        else img = document.getElementById("p2r");

        imgW = 64;//40;
        imgH = 64;//40;
    }
    //game.ctx.beginPath();
    if(String(window.location).indexOf('debug') == -1 && this.visible===true)
        game.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);

    // player x y
    // game.ctx.fillText(this.pos.x + "/" + this.pos.y, this.pos.x, this.pos.y - 40);
    //game.ctx.translate(camX,camY);
    //game.ctx.restore();

}; //game_player.draw
//console.log('dtf',this.parent.server);
//if (typeof module != 'undefined')
if('undefined' != typeof global)
    module.exports = game_player;
else console.log('running client');
