function game_player( game_instance, player_instance, isHost )
{
    console.log('game_player', game_instance, player_instance);
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
    this.v = { x:0, y:0 }; // velocity (derek added)

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
    }

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

}; //game_player.constructor

game_player.prototype.draw = function()
{
    // player nametags (temp)
    //console.log(this.pos);
    for(var i=0; i < this.game.allplayers.length; i++)
    {
        //console.log(i, this.host);//this.game.allplayers[i].mp, this.mp);
        if (this.game.players.self.mp != this.game.allplayers[i].mp && this.game.allplayers[i].visible)// != this.mp)
        {
            game.ctx.fillStyle = 'red';
            game.ctx.fillText(this.game.allplayers[i].mp, this.game.allplayers[i].pos.x, this.game.allplayers[i].pos.y - 20);
        }
        else if (this.game.players.self.visible);// && this.game.players.self.landed !== 1)
        {
            game.ctx.fillStyle = 'white';
            //if (this.game.players.self.landed === 1) console.log(this.game.players.self.pos.y);
            game.ctx.fillText(this.game.players.self.mp + " " + this.game.fps.fixed(1), this.game.players.self.pos.x.fixed(1), this.game.players.self.pos.y.fixed(1) - 20);
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
    // game.ctx.fillText(this.game.players.self.pos.x + "/" + this.game.players.self.pos.y, this.game.players.self.pos.x, this.game.players.self.pos.y - 40);
    //game.ctx.translate(camX,camY);
    //game.ctx.restore();

}; //game_player.draw
//console.log('dtf',this.parent.server);
if (typeof module != 'undefined')
module.exports = game_player;
else console.log('running client');
