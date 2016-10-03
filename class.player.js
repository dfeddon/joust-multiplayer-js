Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
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

    this.player_abilities_enabled = false;

    //Set up initial values for our state information
    this.pos = { x:0, y:0 };
    this.size = { x:64, y:64, hx:64, hy:64 };
    this.hitbox = {w:32,h:32};
    this.dir = 0; // 0 = right, 1 = left (derek added)

    // velocity
    this.vx = 0; // velocity (derek added)
    this.vy = 0;

    // acceleration
    this.ax = 0;
    this.ay = 0;

    // mass
    this.m = 0.1; // kg
    // angle
    this.a = 0; // -90, 0, 90
    this.thrust = 0.0625; // 0 = 0.0625, 250 = 0.125, 500 = 0.25
    this.thrustModifier = 0;

    this.flap = false; // flapped bool (derek added)
    this.landed = 1; // 0=flying, 1=stationary, 2=walking
    this.supportingPlatformId = "none"; // id of platform on which player is standing
    this.visible = true;
    this.active = false;
    this.state = 'not-connected';
    //this.color = 'rgba(255,255,255,0.1)';
    this.info_color = 'rgba(255,255,255,0.1)';
    //this.id = '';
    this.engaged = false;
    this.vuln = false;
    this.bubble = false;
    //this.stunLen = 500; // 1.5 sec

    this.isLocal = false;

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

    // assign pos and input seq properties
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
    //this.pos = { x:Math.floor((Math.random() * this.game.world.width - 64) + 64), y:128};//this.game.world.height-this.size.hy };
    this.pos = {x: 0, y: 0};
    //These are used in moving us around later
    this.old_state = {pos:this.pos};
    this.cur_state = {pos:this.pos};
    this.state_time = new Date().getTime();

    this.team = 1; // 1 = red, 2 = blue
    this.level = 1; // 1:256, 2:512, 3:1024, 5:2048, 6:4096, etc.
    this.mana = 0;
    this.pointsTotal = 0;
    //this.levels = [0,128,256,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.levels = [0,50,100,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.progression = 0;// 0, 250, 500
    this.abilities = []; // 0:none 1:burst
    this.abilities.push({label:"burst", id:1, cd: 5000, t:0});
    this.ability = 0; // abilities index (-1 means no ability available)
    this.abil = 1;
    this.buffs = [];
    this.debuffs = [];
    this.potions = [];
    this.cooldown = false;

    this.hasHelment = false;//true;
    this.hasFlag = 0; // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
    this.flagTakenAt = 0;
    this.carryingFlag = null;

    this.playerName = "";
    //this.lastNamePlate = "YOU";
} // end game_player constructor

game_player.prototype.dead = false;

// game_player.prototype.update = function()
// {
//     console.log('update');
// };

game_player.prototype.doFlap = function()
{
    //console.log('doFlap', this.dir);

    // set flap flag
    this.flap = true;

    // clear landed flag
    this.landed = 0;

    //if (vy < -6)
    this.vy = -(this.thrust + this.thrustModifier) * 5;
    this.vx = (this.thrust + this.thrustModifier);///10;
    //console.log('vx', this.vx, 'vy', this.vy);

    /*this.ax = Math.cos(this.a) * this.thrust * 10;
    this.ay = Math.cos(this.a) * this.thrust * 10;

    if (this.dir === 1)
    {
        //this.ax = -(this.ax);
        this.vx += this.ax;
    }
    else {
        this.vx += this.ax;
    }

    // increase velocity
    this.vy -= this.ay;*/
    //this.vy = -1;

    // console.log('=====================');
    // console.log('a', this.a, 'dir', this.dir);
    // console.log('ax', this.ax);
    // console.log('ay', this.ay);
    // console.log('vx', this.vx);
    // console.log('vy', this.vy);
    // console.log('=====================');

};

game_player.prototype.doLand = function()
{
    //console.log('do land', this.vx);

    // decelerate
    if (this.vx > 0)
    {
        //console.log('slowing', this.vx);

        // slow horizontal velocity
        //this.vx -= 200;

        // set landing flag (moving)
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx -= 0.025; // friction

        if (this.vx < 0)
        {
            this.vx = 0;
            //this.vy = 25;
            this.landed = 1;
        }
    }
    else if (this.vx < 0)
    {
        //this.vx += 200;
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx += 0.025; // friction

        if (this.vx > 0) this.vx = 0;
    }
    if (this.vx === 0)
    {
        // stuck landing (no velocity)
        this.vx = 0;
        //this.vy = 25;
        // set landing flag (stationary)
        this.landed = 1;
    }
};

game_player.prototype.doWalk = function(dir)
{
    console.log('walking...', dir, this.ax, this.vx, this.a, this.vy);
    this.landed = 2; // walking

    /*if (dir === 0)
        this.a = 90;
    else this.a = -90;*/
    this.vx = this.thrust;
};

game_player.prototype.takeFlag = function(flag, flagType)
{
    // console.log('takeFlag', flag, this.team);
    // if (this.team === 1 && flagType === 2) return;
    // if (this.team === 2 && flagType === 3) return;

    console.log('player.takeFlag', flagType, flag.name, flag.sourceSlot);

    this.hasFlag = flagType;
    this.flagTakenAt = this.game.server_time;
    this.carryingFlag = flag;

    // disable bubble
    if (this.bubble) this.bubble = false;

    // speed modifier (slow down)

    // set target slot
    switch(flag.sourceSlot)
    {
        case "midSlot":
            if (this.team === 1) flag.setTargetSlot("slot6");
            else flag.setTargetSlot("slot5");
        break;

        case "slotRed":
            flag.setTargetSlot("slot1");
        break;

        case "slotBlue":
            flag.setTargetSlot("slot10");
        break;

        case "slot1":
            if (this.team === 1) flag.setTargetSlot("slotRed");
            else flag.setTargetSlot("slot2");
        break;

        case "slot2":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.setTargetSlot("slot1");
                else flag.setTargetSlot("slot3");
            }
            else // mid flag
            {
                if (this.team === 1) flag.setTargetSlot("slot3");
                else flag.setTargetSlot("slot1");
            }
        break;

        case "slot3":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.setTargetSlot("slot2");
                else flag.setTargetSlot("slot4");
            }
            else // mid flag
            {
                if (this.team === 1) flag.setTargetSlot("slot4");
                else flag.setTargetSlot("slot2");
            }
        break;

        case "slot4":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.setTargetSlot("slot3");
                else flag.setTargetSlot("slot5");
            }
            else // mid flag
            {
                if (this.team === 1) flag.setTargetSlot("slot5");
                else flag.setTargetSlot("slot3");
            }
        break;

        case "slot5":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.setTargetSlot("slot4");
                else flag.setTargetSlot("slot6");
            }
            else // mid flag
            {
                if (this.team === 1) flag.setTargetSlot("midSlot");
                else flag.setTargetSlot("slot4");
            }
        break;

        // blue territory

        case "slot6":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.setTargetSlot("slot7");
                else flag.setTargetSlot("slot5");
            }
            else // mid flag
            {
                if (this.team === 2) flag.setTargetSlot("midSlot");
                else flag.setTargetSlot("slot7");
            }
        break;

        case "slot7":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.setTargetSlot("slot8");
                else flag.setTargetSlot("slot6");
            }
            else // mid flag
            {
                if (this.team === 2) flag.setTargetSlot("slot6");
                else flag.setTargetSlot("slot8");
            }
        break;

        case "slot8":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.setTargetSlot("slot9");
                else flag.setTargetSlot("slot7");
            }
            else // mid flag
            {
                if (this.team === 2) flag.setTargetSlot("slot7");
                else flag.setTargetSlot("slot9");
            }
        break;

        case "slot9":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.setTargetSlot("slot10");
                else flag.setTargetSlot("slot8");
            }
            else // mid flag
            {
                if (this.team === 2) flag.setTargetSlot("slot8");
                else flag.setTargetSlot("slot10");
            }
        break;

        case "slot10":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.setTargetSlot("slotBlue");
                else flag.setTargetSlot("slot9");
            }
            else // mid flag
            {
                if (this.team === 2) flag.setTargetSlot("slot9");
                else flag.setTargetSlot("slotBlue");
            }
        break;
    }

    if (!this.game.server)
        new game_toast().show();
};

game_player.prototype.removeFlag = function(success, slot)
{
    console.log('removing flag from player', slot);
    if (success)
    {
        this.carryingFlag.x = slot.x - (slot.width/2);
        this.carryingFlag.y = slot.y - (slot.height/2);
        this.carryingFlag.sourceSlot = slot.name;
        // note: targetSlot will be defined when flag is taken!

        // revise territory
        if (this.game.server)
        {
            console.log('emit territory change data');
        }
        else
        {
            this.game.updateTerritory();
        }
    }

    this.carryingFlag.reset(success);//, this.game.server_time);
    this.hasFlag = 0;
    this.carryingFlag = null;
};

game_player.prototype.collision = false;
game_player.prototype.hitFrom = 0;
game_player.prototype.update = function()
{
    if (this.landed === 1)
    {
        // reset angle
        //this.a = 0;

        // get out
        return;
    }

    this.vy += this.game.world.gravity;//.fixed(2);///5;
    // 40 = slow, 30 = medium, 25 = fast
    this.vx = ((this.a/40) * Math.cos(this.thrust + this.thrustModifier));//.fixed(2);

    this.pos.y += this.vy.fixed(2);

    // /10 = slower /25 = faster /50 = fast
    this.pos.x += this.vx.fixed(2);//((this.a/25) * Math.cos(this.vx));
    //console.log('vs', this.vx, this.vy);

    //if (this.pos.x < 165) this.vx *=-1;
    //else
    if (this.collision === true)
    {
        switch(this.hitFrom)
        {
            case 0: // from the side
                this.vx *= -1;
                this.a *= -1;
                this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 1: // from below
                //this.vx *= -1;
                //this.a *= -1;
                this.vy *= -1;
                this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 0: // from the side
                this.vx *= -1;
                this.a *= -1;
                this.collision = false;
                //console.log('vx', this.vx);
            break;
        }
    }
    else this.vx *= 1;
};

game_player.prototype.setAngle = function(a)
{
    if (a === 0) // right
    {
        if (this.a > 90)
            this.a = 90;
        //else if (this.a < 0)
        else this.a+=2;
    }
    else // left
    {
        if (this.a < - 90)
            this.a = -90;
        else this.a-=2;
    }
    //console.log('a', this.a);
};

game_player.prototype.doStand = function(id)
{
    console.log('doStand', id);
    // id = platform id
    this.supportingPlatformId = id;
};

game_player.prototype.doKill = function(victor)
{
    console.log('playerKill', this.dead);

    // avoid reduncancy
    if (this.dead === true) return;
    else this.dead = true;

    // apply red flash fx
    this.game.flashBang = 2;

    // store current position
    var waspos = this.pos;
    this.pos = {x:Math.floor((Math.random() * this.game.world.width - 64) + 64), y:-1000};

    // reset landed prop
    this.landed = 0;

    // splatter "orbs of death"
    /*
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
        this.game.orbs.push( neworb );
    }
    console.log('total orbs', this.game.orbs.length);//, this.orbs);
    //*/

    // show splatter locally
    if (!this.game.server)
        this.game.prerenderer();

    // set timer to reset player dead state

};

game_player.prototype.setPassive = function(data)//type, duration, modifier)
{
    console.log('setPassive', this.mp, data);

    switch(data.t)
    {
        case 1: // speed boost
            this.updateProgression(10);
        break;

        case 2: // bubble
            this.bubble = true;
        break;
    }
};

game_player.prototype.doCycleAbility = function()
{
    // no abilities (level 1)
    if (this.ability === -1) return;

    console.log('Next Ability');
    // if last ability selected, roll over to first
    if (this.ability === this.abilities.length - 1)
        this.ability = 0;
    // otherwise, get next ability
    else this.ability++;
    //console.log(this.ability, this.abilities.length, this.abilities[this.ability]);
};

game_player.prototype.doAbility = function()
{
    console.log('doAbility', this.mp);
    // first ensure player is not vulnerable, has no abilities, or on global cooldown
    console.log(this.vuln, this.ability, this.cooldown);
    if (this.vuln === true || this.ability === -1 || this.cooldown === true) return;

    // check for ability cooldown
    //console.log(new Date(this.abilities[this.ability].t).getTime(), new Date().getTime());//.getSeconds());
    if (this.abilities[this.ability].t !== 0 && new Date(this.abilities[this.ability].t).getTime() > new Date().getTime())
    {
        console.log('ability on cooldown...');//, this.abilities[this.ability].t, new Date().getSeconds());
        return;
    }

    var _this = this;

    // next, check for active buffs/debuffs
    //console.log(this.abilities);
    //console.log(this.ability);
    console.log('Fire Ability', this.abilities[this.ability]);

    // engage player
    if (this.engaged === false && this.isLocal)
        this.isEngaged(5000);

    // set ability index
    this.abil = this.abilities[this.ability].id;

    // activate ability
    switch(this.abilities[this.ability].label)
    {
        case "burst":
            //this.abil = 1;
            console.log('bursting!!', this.x_dir, this.mp, this.game.playerspeed);
            //if (this.dir === 0)
                //this.x_dir += 500;//this.pos.x += this.size.hx + 150;
            //else this.ax -= 100;//this.pos.x -= 150;
            this.vx += 500;
            console.log('post!!', this.x_dir, this.mp, this.game.playerspeed);

            //if (this.isLocal) this.game.players.self.pos.x = this.pos.x;
            // start cooldown
        break;

        case "blink":
            //console.log('blinking', this.dir);
            //this.abil = 2;
            // start cooldown
            if (this.dir === 0)
                this.pos.x += 150;
            else this.pos.x -= 150;
        break;

        case "grapple":
        break;

        case "anchor":
        break;

        case "frost":
        break;

        case "cinder":
        break;

        case "confusion":
        break;

        default:
            console.log('ERROR: unknown ability!');
    }

    // start 3 second global cooldown (for non-channelling abilities)
    if (this.abilities[this.ability].cd >= 1000)
    {
        this.cooldown = true;
        setTimeout(_this.timeoutGlobalCooldown, 3000);
    }

    // start ability cooldown
    var d = new Date();
    // if cooldown in seconds, else milliseconds
    if (this.abilities[this.ability].cd >= 1000)
        this.abilities[this.ability].t = d.setSeconds(d.getSeconds() + (this.abilities[this.ability].cd / 1000));
    else this.abilities[this.ability].t = d.setSeconds(0, d.getSeconds() + this.abilities[this.ability].cd);
    //console.log('cd', this.abilities[this.ability].cd, this.abilities[this.ability].t);
};

game_player.prototype.timeoutGlobalCooldown = function()
{
    console.log('off global cooldown');
    this.cooldown = false;
};

game_player.prototype.updateProgression = function(val)
{
    console.log('updating progression', this.progression, val);

    if (val > 0)
    {
        this.progression += val;
        this.pointsTotal += val;

        this.thrustModifier = this.progression * 0.00025;
    }
    else
    {
        this.progression -= val;
    }
};

game_player.prototype.updateMana = function(val)
{
    //console.log('update mana', val);

    // does user have mana booster?

    if (val > 0)
    {
        this.mana += val;
        this.pointsTotal += val;
    }
    else
    {
        this.mana -= val;
        this.progression = this.mana;
        return;
    }
    // calculate level, progression and mana stores
    if (this.pointsTotal < this.levels[1])
    {
        this.level = 1;
        this.progression = this.mana;
    }
    else if (this.level === 1 && this.pointsTotal > this.levels[1])
    {
        console.log('** level up 2!');
        this.level = 2;
        this.abilities.push({label:"burst", id:1, cd: 5000, t:0});
        this.ability = 0; // set default to 'burst'

        //this.ability = 0;
        // this.abilities.push({label:"burst"});
        // cd = cooldown, gc = global cooldown, t = time last used (for cd)
        this.abilities.push({label:"frost", id:2, cd: 250, gc:false, t:0});
        this.abilities.push({label:"blink", id:3, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"grapple", id:4, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"anchor", id:5, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"cinder", id:6, cd: 250, gc:false, t:0});
        this.abilities.push({label:"confusion", id:7, cd: 60000, gc:true, t:0});

        // update progression
        this.progression = this.mana;
    }
    else if (this.level === 2 && this.pointsTotal > this.levels[2])
    {
        console.log('** level up 3!');
        this.level = 3;
        // this.abilities.push({label:"frost"});
        // this.abilities.push({label:"blink"});
        // this.abilities.push({label:"grapple"});
        // this.abilities.push({label:"anchor"});
        // this.abilities.push({label:"cinder"});
        // this.abilities.push({label:"confusion"});
    }
    else if (this.level === 3 && this.pointsTotal > this.levels[3])
        this.level = 4;
    else if (this.level === 4 && this.pointsTotal > this.levels[4])
        this.level = 5;
    else if (this.level === 5 && this.pointsTotal > this.levels[5])
        this.level = 6;
    else if (this.level === 6 && this.pointsTotal > this.levels[6])
        this.level = 7;
    else if (this.level === 7 && this.pointsTotal > this.levels[7])
        this.level = 8;
    else if (this.level === 8 && this.pointsTotal > this.levels[8])
        this.level = 9;
    else if (this.level === 9 && this.pointsTotal > this.levels[9])
        this.level = 10;
    else if (this.level === 10 && this.pointsTotal > this.levels[10])
        this.level = 11;

    //this.level = Math.ceil(this.mana / 256);
    //console.log(this.level, this.mana);
};

game_player.prototype.isEngaged = function(len)
{
    console.log(this.mp, 'isEngaged');

    var _this = this;
    this.engaged = true;

    // timer 10 sec
    setTimeout(_this.timeoutEngaged, len);
};

game_player.prototype.timeoutEngaged = function()
{
    //console.log(self.mp, 'no longer engaged!');
    this.engaged = false;
};

game_player.prototype.isVuln = function(len)
{
    console.log('Im vulnerable!');
    var _this = this;

    this.vuln = true;

    // also set to engaged
    if (this.isLocal)
        this.isEngaged(len);

    var stun = setTimeout(this.timeoutVuln, len);
};

game_player.prototype.timeoutVuln = function()
{
    this.vuln = false;
    console.log('...no longer vulnerable');
}

game_player.prototype.getGrid = function()
{
    return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};

game_player.prototype.getCoord = function()
{
    // direction-dependent, account for
    var nw = { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
    var ne = { x: Math.floor((this.pos.x + this.size.hx) / 64),y: Math.floor(this.pos.y / 64) };
    var sw = { x: Math.floor(this.pos.x / 64), y: Math.floor((this.pos.y + this.size.hy) / 64) };
    var se = { x: Math.floor((this.pos.x + this.size.hx) / 64), y: Math.floor((this.pos.y + this.size.hy) / 64) };
    return { nw:nw, ne:ne, sw:sw, se:se };
    //return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};
game_player.prototype.hitGrid = function()
{
    // don't proceed unless tilemapData is loaded
    //if (this.game.tilemapData == undefined) return;
    var tmd = this.game.tilemapData;
    if (tmd == null) return;

    var c = this.getCoord();

    return {
        nw: (tmd[c.nw.y] && tmd[c.nw.y][c.nw.x]) ? {t:parseInt(tmd[c.nw.y][c.nw.x]),x:c.nw.x,y:c.nw.y} : 0,
        ne: (tmd[c.ne.y] && tmd[c.ne.y][c.ne.x]) ? {t:parseInt(tmd[c.ne.y][c.ne.x]),x:c.ne.x,y:c.ne.y} : 0,
        sw: (tmd[c.sw.y] && tmd[c.sw.y][c.sw.x]) ? {t:parseInt(tmd[c.sw.y][c.sw.x]),x:c.sw.x,y:c.sw.y} : 0,
        se: (tmd[c.se.y] && tmd[c.se.y][c.se.x]) ? {t:parseInt(tmd[c.se.y][c.se.x]),x:c.se.x,y:c.se.y} : 0
    };
};

// new physics properties begin

// new physics properies end

//} //game_player.constructor

game_player.prototype.drawAbilities = function()
{
    //console.log('drawAbil', this.engaged);
    if (this.engaged === false)
    {
        game.ctx.beginPath();
        game.ctx.strokeStyle = 'gray';
        game.ctx.moveTo(this.pos.x, this.pos.y-10);
        game.ctx.lineTo(this.pos.x + this.size.hx, this.pos.y-10);
        game.ctx.lineWidth = 3;
        game.ctx.stroke();
        game.ctx.closePath();

        // mana progression
        // calculate
        //var progressPercent = (this.mana / this.levels[this.level]);
        var progressPercent = (this.progression / 500);
        // 64 is the width of the progression bar
        var progressVal = ((progressPercent / 100) * 64) * 100;
        // draw it
        game.ctx.beginPath();
        game.ctx.strokeStyle = 'yellow';
        // game.ctx.moveTo(this.pos.x + 14 + (val), this.pos.y-10);
        // game.ctx.lineTo(this.pos.x + 14 + this.size.hx - 28, this.pos.y-10);
        game.ctx.moveTo(this.pos.x, this.pos.y-10);
        game.ctx.lineTo(this.pos.x + progressVal, this.pos.y-10);
        game.ctx.lineWidth = 3;
        game.ctx.stroke();
        game.ctx.closePath();

        // buffs, potions, and boosters
        //console.log(this.pos.x, this.pos.y);
        /*
        game.ctx.drawImage(document.getElementById("potion-1"), this.pos.x, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-shield"), this.pos.x + 13, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-alacrity"), this.pos.x + 26, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-shield"), this.pos.x + 39, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("debuff-weakened"), this.pos.x + 52, this.pos.y - 15, 10, 10);
        //*/
        /*game.ctx.fillStyle = 'yellow';
        game.ctx.beginPath();
        game.ctx.arc(this.pos.x + 14, this.pos.y-20, 2,0,2*Math.PI);
        game.ctx.fill();*/
        // TODO: if not buffs, debuffs or boosters
        // then txtOffset = 20;
        //txtOffset = 30;
    } // end isEngaged
};

game_player.prototype.draw = function()
{
    //console.log(this.pos.x, this.pos.y);
    //this.pos.x = this.pos.x.fixed(1);
    //this.pos.y = this.pos.y.fixed(1);
    // player nametags (temp)
    // mana bar bg
    var txtOffset = 20;
    //var abil;
    if (this.isLocal === true)
    {
        // nameplate color
        // game.ctx.fillStyle = '#526869';
        // game.ctx.font = "small-caps lighter 15px serif";

        // draw progression
        this.drawAbilities();
    } // end isLocal
    // else
    // {
    // nameplate color
    if (this.team === 1) // 0 = red, 1 = blue
        game.ctx.fillStyle = '#FF6961';
    else game.ctx.fillStyle = '#6ebee6';
    game.ctx.font = "small-caps 15px serif";
    // }
    // game.ctx.strokeRect(
    //     this.pos.x,
    //     this.pos.y-10,
    //     this.size.hx,
    //     5);

    // nameplate
    game.ctx.font = "16px Mirza";
    game.ctx.textAlign = 'center';
    //var txt = "[" + this.level + "] " + this.playerName;//+ "(" + this.mana.toString() + ")";
    var txt = this.playerName;//+ "(" + this.mana.toString() + ")";
    game.ctx.fillText(
        txt,// + " (" + this.level + ") " + this.mana.toString(),// + this.game.fps.fixed(1),
        this.pos.x + (this.size.hx/2),//.fixed(1),
        this.pos.y - txtOffset
        //100
    );
    if (this.player_abilities_enabled && this.isLocal && this.ability !== -1)
    {
        game.ctx.drawImage(document.getElementById("ability-" + this.abilities[this.ability].label),
            //this.pos.x - 15,
            this.pos.x + (this.size.hx/2) - (game.ctx.measureText(txt).width/2) - 20, // 20 = img width (15) - 5 pxl padding
            //this.pos.x + (this.size.hx/2) - 30,
            this.pos.y - txtOffset - 12,
            15, 15);
    }


    // ability
    /*
    if (this.abil > 0)
    {
        //console.log('** doDraw ABILITY', this.abil, 'active!', this.mp);

        switch(this.abil)
        {
            case 1: // burst
            this.abil = 0; // reset
            game.ctx.fillRect(this.pos.x, this.pos.y, 64, 64);
            //game.ctx.drawImage(document.getElementById("ability-" + this.abilities[this.ability].label), this.pos.x - 15, this.pos.y - txtOffset - 12, 15, 15);
            break;

            case 2: // frost
            break;

            case 2: // frost
            break;

            case 3: // blink
            break;

            case 4: // grapple
            break;

            case 5: // anchor
            break;

            case 6: // cinder
            break;

            case 7: // confusion
            break;

            default:
                console.log('ERROR: invalid abil value');
        }
    }
    //*/

    // player bitamps
    var img, imgW, imgH;
    //if (this.pos.d == 1)
    //if (this.landed > 0) console.log(this.landed, this.mp);
    // if (this.abil > 0)
    // {
    //     console.log('abil!', this.abil, this.mp);
    // }
    if (this.vuln === true)
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

    // draw flag?
    if (this.hasFlag > 0)
    {
        //console.log('taken at', this.flagTakenAt, 'time left', Math.floor(this.game.server_time - this.flagTakenAt));
        var ct = Math.floor(this.game.server_time - this.flagTakenAt);
        ct = 60 - ct;
        //console.log('carrying flag', this.carryingFlag.name);
        if (ct === 0)
        {
            console.log('reset', this.hasFlag);
            // reset flag
            for (var f = 0; f < this.game.flagObjects.length; f++)
            {
                if (this.game.flagObjects[f].name == "midFlag" && this.hasFlag === 1)
                    this.game.flagObjects[f].reset();
                else if (this.game.flagObjects[f].name == "redFlag" && this.hasFlag === 2)
                    this.game.flagObjects[f].reset();
                else if (this.game.flagObjects[f].name == "blueFlag" && this.hasFlag === 3)
                    this.game.flagObjects[f].reset();
            }
            //console.log('resetting flag', this.flagType);
            //console.log('flags', this.game.flagObjects);

            this.hasFlag = 0;
            // get out
            return;
        }
        var flagImg;
        switch(this.hasFlag)
        {
            case 1: // mid
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-mid-r');
                else flagImg = document.getElementById('flag-mid-l');
            break;

            case 2: // red
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-red-r');
                else flagImg = document.getElementById('flag-red-l');
            break;

            case 3: // blue
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-blue-r');
                else flagImg = document.getElementById('flag-blue-l');
            break;
        }
        // draw flag
        //game.ctx.save();
        game.ctx.drawImage(flagImg, (this.dir === 0) ? this.pos.x - (this.size.hx/2) : this.pos.x + (this.size.hx/2), this.pos.y - (this.size.hx/2), 64, 64);
        // draw timer
        game.ctx.font = "18px Mirza";
        game.ctx.fillStyle = (this.hasFlag === 1) ? "#000" : "#fff";
        game.ctx.textAlign = 'center';
        game.ctx.fillText(
            ct,// + " (" + this.level + ") " + this.mana.toString(),// + this.game.fps.fixed(1),
            (this.dir === 0) ? this.pos.x - 5 : this.pos.x + this.size.hx + 5,//.fixed(1),
            this.pos.y - 5//txtOffset
            //100
        );
        //game.ctx.restore();

    }

    //game.ctx.beginPath();
    if(String(window.location).indexOf('debug') == -1 && this.visible===true)
        game.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);

    if (this.bubble === true)
        game.ctx.drawImage(document.getElementById("ability-bubble"), this.pos.x - 8, this.pos.y - 8, 76, 76);



    // player x y
    // game.ctx.fillText(this.pos.x + "/" + this.pos.y, this.pos.x, this.pos.y - 40);
    //game.ctx.translate(camX,camY);
    //game.ctx.restore();

}; //game_player.draw
//console.log('dtf',this.parent.server);
//if (typeof module != 'undefined')
if('undefined' != typeof global)
module.exports = game_player;
//else console.log('running client');
