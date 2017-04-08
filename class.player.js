"use strict";

//var config = require('./class.globals');
var assets = require('./singleton.assets');
var game_spritesheet = require('./class.spritesheet');
var game_buffs = require('./class.buffs');

const SPEED_VAL_MAX = 50; // this is the slowest value
const SPEED_VAL_MIN = 30; // this is the fastest value

Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
function game_player(player_instance, isHost, pindex, config)
{
    // console.log('== game_player.constructor');//, player_instance);//, game_instance, player_instance);
    //Store the instance, if any
    // ## NOTE: only server sends instance, not clients!!
    // if (player_instance) console.log('** server added player (with instance)');
    // else console.log('** added player (without instance)');
    //if (isGhost) console.log('** ^ player is ghost, adding to ghost store');

    // var _this = this;

    this.instance = player_instance;
    this.config = config;
    this.game_buffs = new game_buffs();
    this.playerPort = null;
    // if (this.instance)
    //     this.game = this.instance.game;
    this.isBot = false;

    this.player_abilities_enabled = false;

    //Set up initial values for our state information
    this.pos = { x:0, y:0 };

    this.lpos = this.pos;
    this.size = { x:48, y:48, hx:48, hy:48, offset:16 };//{ x:64/2, y:64/2, hx:64/2, hy:64/2 }
    
    this.campos = this.pos;
    //this.hitbox = {w:64/2,h:64/2};
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
    this.thrustModifier = 40; // we start at half-health

    this.flap = false; // flapped bool (derek added)
    this.landed = 1; // 0=flying, 1=stationary, 2=walking
    this.supportingPlatformId = "none"; // id of platform on which player is standing
    this.tmd = null;
    this.nw = 0;
    this.sw = 0;
    this.ne = 0;
    this.se = 0;
    this.e = 0;
    this.w = 0;
    this.n =0;
    this.s = 0;
    this.c = 0;
    this.visible = false;
    this.active = false;
    this.state = 'not-connected';
    this.isHit = 0;
    //this.color = 'rgba(255,255,255,0.1)';
    this.info_color = 'rgba(255,255,255,0.1)';
    //this.id = '';
    // i = index / a: active / b: buff id (0 = none) / d: cooldown (end time)

    this.slotDispatch = null; // server only
    this.consumeDispatch = null // server only
    this.bonusDispatch = null;
    
    this.slots = [{i:1, a:1, b:0, c:0}, {i:2, a:0, b:0, c:0}, {i:3, a:0, b:0, c:0}];
    this.bonusSlot = 0;

    this.bubbleRespawnTime = 15; // 2 stacks: 10 seconds, 3 stacks: 5 seconds
    this.bubbleRespawn = 0;

    this.teamBonus = 0;
    this.playerBonus = 0;
    this.potionBonuses = []; // {v:0, c:0} / v = bonus value, c = cooldown (server_time)
    this.potionBonus = 0;
    this.bonusTotal = 0; // team bonus + player level bonuses + yellow potion bonuses

    this.protection = false;
    this.stunned = false;
    this.dazed = false;
    // this.roundSlotImage = null;
    // this.slot1Image = null;
    // this.slot2Image = null;
    // this.slot3Image = null;

    // buff stub
    // this.slots[0].b = 1; this.slots[0].c = 100; this.slots[0].a = 1;

    this.bubble = false; // bubble
    this.blinking = false; // blink
    this.unblinker = false; // reveal
    this.defenseBonus = 0; // recover / base - (25% of 15) * Bonus
    this.attackBonus = 0; // precision / base + (25% of 15) * Bonus
    this.damageBonus = 0; // bruise
    this.damageReduce = 0; // plate
    this.speedBonus = 0; // alacrity
    
    this.health = 50; // start at half-health
    this.healthMax = 100;
    this.healthbarColor = 'lime';
    this.engaged = false;
    this.vuln = false;
    this.dying = false;
    this.score = 0;//Math.floor(Math.random() * 101);
    this.oldscore = 0
    this.lastscore = 0;
    this.roundscore = 0;
    this.level = 1;
    this.levels = [0,2500,7500,15000,25000];

    this.textFloater = null;
    this.drawAbility = 0; // 0 = none / 1 = blink (unseen yet exposed, or isLocal)

    this.hitData = {by:0, at:0};

    // this.slotFlagDispatch = null;

    this.team = 0; // 1 = red, 2 = blue
    this.level = 1; // 1:256, 2:512, 3:1024, 5:2048, 6:4096, etc.
    this.mana = 0;
    this.pointsTotal = 0;
    //this.levels = [0,128,256,512,1024,2048,4096,8196,16392,32784,65568,131136];
    // this.levels = [0,50,100,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.progression = 0;// 0, 250, 500
    // this.abilities = []; // 0:none 1:burst
    // this.abilities.push({label:"burst", id:1, cd: 5000, t:0});
    // this.ability = 0; // abilities index (-1 means no ability available)
    // this.abil = 1;
    // this.buffs = [];
    // this.debuffs = [];
    this.potions = [];
    // this.cooldown = false;

    this.hasHelment = false;//true;
    this.hasFlag = 0; // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
    this.flagTakenAt = 0;
    this.disconnected = false;
    //this.carryingFlag = null;

    // TODO: default to invisible skin
    this.skin = "skin1";
    this.bufferView = new Int16Array(16);
    if (!config.server)
    {
        this.id = 1;
        this.sprite = new game_spritesheet(assets.skins[this.skin]);
        this.buffer = new ArrayBuffer(16);
        this.bufferView = new Int16Array(this.buffer, 16);
    }
    else
    { 
        if (this.instance) this.id = this.instance.userid;
        // this.getplayers = this.instance.game.gamecore.getplayers;
    }

    //this.stunLen = 500; // 1.5 sec

    this.isLocal = false;
    this.bufferIndex = undefined;//0;

    this.mp = 'cp' + pindex;//(getplayers.allplayers.length + 1);
    this.mis = 'cis' + pindex;//(getplayers.allplayers.length + 1);

    // assign pos and input seq properties
    //Our local history of inputs
    this.inputs = [];

    //The world bounds we are confined to
    this.pos_limits = {
        x_min: 0,//this.size.hx,
        x_max: this.config.world.width - this.size.hx,
        y_min: 0,//this.size.hy,
        y_max: this.config.world.height - this.size.hy
    };

    //These are used in moving us around later
    this.old_state = {pos:this.pos};
    this.cur_state = {pos:this.pos};
    this.state_time = new Date().getTime();

    this.playerName = "";
    this.playerNameImage = null;
    this.playerSprite = "roundRooster";
} // end game_player constructor

// game_player.prototype.pos = { x: 0, y: 0 };
// game_player.prototype.pos.x = 0;
// game_player.prototype.pos.y = 0;
game_player.prototype.dead = false;
// game_player.prototype.setFlag = function(int) // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
// {
//     console.log('player.setFlag', int);
//     this.hasFlag = int;
// };

game_player.prototype.bufferWrite = function(view, i)
{
    // if (!view)
    //     view = this.bufferView;
    
    view[0] = this.pos.x.fixed(0);
    view[1] = this.pos.y.fixed(0);
    view[2] = this.dir;
    view[3] = (this.flap) ? 1 : 0;
    view[4] = this.landed;
    view[5] = (this.vuln) ? 1 : 0;
    view[6] = this.a;
    view[7] = this.vx;
    view[8] = this.vy;
    view[9] = this.hasFlag; // 0=none, 1=midflag, 2=redflag, 3=blueflag
    view[10] = (this.bubble) ? 1 : 0;
    view[11] = (this.visible) ? 1 : 0;
    view[12] = i; // player's bufferIndex
    view[13] = this.score;
    view[14] = (this.active) ? 1 : 0;
    view[15] = 16; // open item

    return view;
};
game_player.prototype.bufferRead = function()
{
    return this.buffer;
}
game_player.prototype.setFromBuffer = function(data)
{
    this.dir = data[2];
    this.flap = (data[3] === 1) ? true : false;
    this.landed = data[4];
    this.vuln = (data[5] === 1) ? true : false;
    // add/remove buff
    if (data[6])
    {
        console.log("* add/remove buff", data[6]);
        // < 100 = addBuff / > 100 = removeBuff
        if (data[6] < 100)
            this.addBuff(data[6]);
        else if (data[6] < 200)
            this.removeBuff(data[6] - 100);
        else this.miscBuff(data[6]);
    }
    // bonus slot is data[7]
    // score
    if (Boolean(data[8]))
    {
        this.score = data[8];
        this.addToScore();
    }
    // bonus update
    if (data[9])
        this.updateBonusesClient(data[9]);//this.addHealthConsumable(data[9]);
    // this.active = (data[8] === 1) ? true : false;
    if (data[10])
        this.drawAbility = data[10];
    else this.drawAbility = 0;
};

game_player.prototype.buffIdsToSlots = function(ids)
{
    console.log('== buffIdsToSlots ==', ids);
    
    // slot order is *not* important!
    for (var i = 0; i < ids.length; i++)
    {
        this.slots[i].b = ids[i];
    }

    console.log('* assigned slots', this.slots);
};

game_player.prototype.setBubble = function(bool)
{
    console.log("== player.setBubble ==", bool);
    // set bubble on 15/10/5 sec cooldown (if cd doesn't expire first)
    // TODO: also check for round slot bubble buff
    if (bool == true && this.bubble === false) 
    {
        this.bubble = true;
        this.slotDispatch = 301; // client restore bubble
    }
    else if (bool === false && this.bubble)
    {
        this.bubble = false;
        this.slotDispatch = 300; // client remove bubble

        for (var i = this.slots.length - 1; i >= 0; i--)
        {
            if (this.slots[i].b === this.game_buffs.BUFFS_BUBBLE)
            {
                // if bubble expires < this.bubbleRespawnTime (10 seconds), get out
                if (this.slots[i].c - this.config.server_time <= this.bubbleRespawnTime)
                    break;
                // otherwise, add respawn flag in 10 sec.
                else
                {
                    this.bubbleRespawn = Math.floor(this.config.server_time + this.bubbleRespawnTime);
                    console.log("* bubble respawn set to", this.bubbleRespawn);
                }
            }
        }
    }
};

game_player.prototype.purgeBuffsAndBonuses = function()
{
    // deactive bonus slot buff
    if (this.bonusSlot)
    {
        this.deactivateBuff(this.bonusSlot);
    }
    this.bonusSlot = 0;

    // deactivate all buffs and bonuses
    // first up, buffs
    for (var d = this.slots.length - 1; d >= 0; d--)
    {
        if (this.slots[d].b !== 0)
           this.removeBuff(this.slots[d].b);
    }
    // next, bonus potions
    while (this.potionBonuses.length > 0)
        this.potionBonuses.pop();//.splice(0, 1);
    // revise bonus totals
    if (this.config.server)
        this.updateBonuses();
    else
    {
        this.potionBonus = 0;
        this.updateBonusesClient([this.teamBonus, this.playerBonus, this.potionBonus]);
    }
}

game_player.prototype.addHealthConsumable = function(consumable)
{
    console.log('== addHealthConsumable ==', consumable);
};

game_player.prototype.addConsumable = function(consumable)
{
    console.log('== addConsumable ==', consumable);
    
    switch(consumable.c) // category
    {
        case 1: // buff
        break;

        case 2: // health potion
            this.updateHealth(consumable.v);
            // if (this.health + consumable.v >= this.healthMax)
            //     this.health = this.healthMax;
            // else this.health += consumable.v;

            this.setTextFloater(consumable.c, consumable.v, 1);
        break;

        case 3: // focus potion
            this.setTextFloater(consumable.c, consumable.v, 1);
        break;
    }
};

game_player.prototype.updateHealth = function(val)
{
    console.log('== player.updateHealth ==', val);
    console.log('health now', this.health);
    var healthVal = val;
    // do not exceed max health
    if (val > 0)
    {
        console.log('val > 0', val);
        if (this.health + val >= this.healthMax)
        {
            this.health = this.healthMax;
            healthVal = this.healthMax - this.health;
        }
        else this.health += val;
    }
    else // ...nor zero
    {
        console.log('val < 0', val);
        if (this.health + val < 0)
        {
            this.health = 0;
            healthVal = this.health;
        }
        else this.health += val;
    }

    console.log('* revised health', this.health);
    if (this.health === 0)
    {
        console.log('*', this.playerName, 'is dead!');        
    }

    // adjust player speed (50 slow, 40 medium, 30 fast)
    // get percentage of health relative to healthMax
    // this.health / this.healthMax;
    var perc = this.health / this.healthMax;
    // take % between range (30 - 50)
    var newval = ((perc * (SPEED_VAL_MAX - SPEED_VAL_MIN) / 100) * 100) + SPEED_VAL_MIN;
    // finally, reverse the value / val = ((percent * (max - min) / 100) + min
    this.thrustModifier = this.reverseVal(newval, SPEED_VAL_MIN, SPEED_VAL_MAX);
    console.log("* thrustModifier", this.thrustModifier, newval, perc);
    // this.thrustModifier += healthVal;//val;//this.health;

    if (this.health < 20)
        this.healthbarColor = '#f93822';
    else if (this.health < 50)
        this.healthbarColor = 'orange';
    else this.healthbarColor = 'lime';
};

game_player.prototype.reverseVal = function(val, min, max)
{
    return (max + min) - val;
};

game_player.prototype.hasBuff = function(buffType)
{
    console.log('== player.hasBuff ==', buffType);

    for (var i = this.slots.length - 1; i >= 0; i--)
    {
        if (this.slots[i].b === buffType)
            return true;
    }
    return false;
    
};

game_player.prototype.addBuff = function(buff)
{
    console.log('== addBuff ==', buff);

    // this.slots = [{i:1, a:1, b:0, c:0}];

    // if player is self, add buff to slot
    // order array ascending
    this.slots.sort(function(a, b){return a.i-b.i;});
    console.log('my ordered slots', this.slots);

    // determine cooldown (base is 60 seconds, subject to modifiers)
    var cooldown = this.config.server_time + 60;

    // get image
    var buffImage = this.game_buffs.getImageById(buff);

    if (this.slots[0].b === 0 || this.slots[1].a === 0)
    {
        console.log('* added buff', buff, 'to slot 1...');

        // remove extant buff
        if (this.slots[0].b > 0)
        {
            console.log('* replacing existing buff, remove it it appropriately...');
            this.removeBuff(this.slots[0].b);
        }
        this.slots[0].b = buff;
        this.slots[0].c = cooldown;
        // this.slot1Image = buffImage;
        
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('buff1').className = "buffslot-on";
            document.getElementById('buff1').style.backgroundImage = "url('" + buffImage + "')";
        }
    }
    // slot 2
    else if (this.slots[1].b === 0 || this.slots[2].a === 0)
    {
        console.log('* added buff', buff, 'to slot 2...');        
        // remove extant buff
        if (this.slots[1].b > 0)
        {
            console.log('* replacing existing buff, remove it it appropriately...');
            this.removeBuff(this.slots[1].b);
        }
        this.slots[1].b = buff;
        this.slots[1].c = cooldown;
        
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('buff2').className = "buffslot-on";
            document.getElementById('buff2').style.backgroundImage = "url('" + buffImage + "')";
        }
    }
    // slot 3
    else
    {
        console.log('* added buff', buff, 'to slot 3...');        
        // remove extant buff
        if (this.slots[2].b > 0)
        {
            console.log('* replacing existing buff, remove it it appropriately...');
            this.removeBuff(this.slots[2].b);
        }
        this.slots[2].b = buff;
        this.slots[2].c = cooldown;
        
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('buff3').className = "buffslot-on";
            document.getElementById('buff3').style.backgroundImage = "url('" + buffImage + "')";
        }
    }

    this.activateBuff(buff);
};

game_player.prototype.activateBuff = function(buff)
{
    console.log('== activateBuff ==', buff);
    
    // activate buff
    switch(buff) // buff
    {
        // case 1: // speed boost
        //     this.updateProgression(10);
        // break;

        case this.game_buffs.BUFFS_BUBBLE:
            // on hit
            this.setBubble(true);//this.bubble = true;
        break;
        case this.game_buffs.BUFFS_ALACRITY:
            // 25% speed buff (on physics)
            this.thrustModifier -= 5;// * 0.00025);
            this.speedBonus = 25;
        break;
        case this.game_buffs.BUFFS_PRECISION:
            // +25% opponent hit radius (on collision)
            this.attackBonus = this.config.hitBase * .25;
        break;
        case this.game_buffs.BUFFS_RECOVER:
            // -25% self hit radius (on collision)
            this.defenseBonus = this.config.hitBase * .25;
        break;
        case this.game_buffs.BUFFS_BLINK:
            this.blinking = true;
        break;
        case this.game_buffs.BUFFS_REVEAL:
            this.unblinker = true;
        break;
        case this.game_buffs.BUFFS_BRUISE:
            // 25% damage bonus (on hit as victor);
            this.damageBonus = 25;
        break;
        case this.game_buffs.BUFFS_PLATE:
            // 25% damage reduction (on hit as victim)
            this.damageReduce = 25;
        break;
    }
    this.setTextFloater(1, 0, 1, buff);
};

game_player.prototype.removeBuff = function(slot)
{
    console.log('== removeBuff ==', slot);

    if (this.slots[0].b === slot)
    {
        // if slot 2 has no buff, clear slot 1
        if (this.slots[1].b === 0)
        {
            this.slots[0].b = 0;
            this.slots[0].c = 0;

            if (!this.config.server && this.isLocal)
            {
                document.getElementById('buff1').className = "buffslot-empty";
                document.getElementById('buff1').style.backgroundImage = "none";
            }
        }
        // replace slot 1 if slot 2 taken
        else
        { 
            this.slots[0].b = this.slots[1].b;
            this.slots[0].c = this.slots[1].c;

            if (!this.config.server && this.isLocal)
            {
                document.getElementById('buff1').style.backgroundImage = "url('" + this.game_buffs.getImageById(this.slots[1].b) + "')";
            }

            if (this.slots[2].b === 0)
            {
                // clear slot 2
                this.slots[1].b = 0;
                this.slots[1].c = 0;
                // clear slot 2 image
                if (!this.config.server && this.isLocal)
                {
                    document.getElementById('buff2').className = "buffslot-empty";
                    document.getElementById('buff2').style.backgroundImage = "none";
                }
            }
            else
            {
                // replace slot 2 if slot 3 taken
                this.slots[1].b = this.slots[2].b;
                this.slots[1].c = this.slots[2].c;
                // move slot image
                if (!this.config.server && this.isLocal)
                {
                    document.getElementById('buff2').style.backgroundImage = "url('" + this.game_buffs.getImageById(this.slots[2].b) + "')";
                }
                // and clear slot 3 (now at slot 2)
                this.slots[2].b = 0;
                this.slots[2].c = 0;
                // clear slot 3 image
                if (!this.config.server && this.isLocal)
                {
                    document.getElementById('buff3').className = "buffslot-empty";
                    document.getElementById('buff3').style.backgroundImage = "none";
                }
            }
        }
    }
    // slot 2
    else if (this.slots[1].b === slot)
    {
        // if slot 3 empty
        if (this.slots[2].b === 0)
        {
            this.slots[1].b = 0;
            this.slots[1].c = 0;
        }
        // else move 3 to 2
        else
        {
            // move slot 3 to 2
            this.slots[1].b = this.slots[2].b;
            this.slots[1].c = this.slots[2].c;
            // clear 3
            this.slots[2].b = 0;
            this.slots[2].c = 0;
        }
    }
    // slot 3
    else
    {
        this.slots[2].b = 0;
        this.slots[2].c = 0;
    }

    this.deactivateBuff(slot);
};

game_player.prototype.deactivateBuff = function(buff)
{
    console.log('== player.deactivateBuff', buff);
    
    // deactivate buff
    switch(buff) // buff
    {
        // case 1: // speed boost
        //     this.updateProgression(10);
        // break;

        case this.game_buffs.BUFFS_BUBBLE:
            this.bubble = false;
            this.bubbleRespawn = 0; // cancel unspawned bubble
        break;
        case this.game_buffs.BUFFS_ALACRITY:
            this.thrustModifier += 5;
            this.speedBonus = 0;
        break;
        case this.game_buffs.BUFFS_PRECISION:
            this.attackBonus = 0;
        break;
        case this.game_buffs.BUFFS_RECOVER:
            this.defenseBonus = 0;
        break;
        case this.game_buffs.BUFFS_REVEAL:
            this.unblinker = false;
        break;
        case this.game_buffs.BUFFS_BRUISE:
            this.damageBonus = 0;
        break;
        case this.game_buffs.BUFFS_PLATE:
            this.damageReduce = 0;
        break;
        case this.game_buffs.BUFFS_BLINK:
            this.blinking = false;
        break;
    }
    
};

game_player.prototype.buffExpired = function(slot)
{
    console.log('== buffExpired ==', slot);

    // clear cooldown
    slot.c = 0;

    // send expired buff to client
    // adding +100 to slot id signals it's an expired buff
    this.slotDispatch = 100 + slot.b;

    // remove it (or should this occur *after* dispatch?)
    this.removeBuff(slot.b);

    // clear buffer on server
    slot.b = 0;
};

game_player.prototype.miscBuff = function(id)
{
    console.log('== player.miscBuff ==', id);

    switch(id)
    {
        case 300: // bubble broken
            this.bubble = false;
        break;

        case 301: // respawn bubble
            this.bubble = true;
        break;
    }
};

game_player.prototype.updateBonusesClient = function(array)
{
    console.log('== player.updateBonusesClient ==', array);

    this.teamBonus = array[0];
    this.playerBonus = array[1];
    this.potionBonus = array[2];
    this.bonusTotal = this.teamBonus + this.playerBonus + this.potionBonus;

    console.log('* bonusTotal', this.bonusTotal);
    
    // update total circle bg color

    if (this.bonusTotal >= 0 && this.isLocal)
    {
        document.getElementById('bonus-total-container-positive').style.backgroundColor = '#417505';// 'rbg(' + 0 +',' + 100 +',' + 0 + ',' + 0.65 +')';
        document.getElementById('bonus-total-container-positive').style.borderColor = "#B8E986";
    }
    else if (this.isLocal)
    {
        document.getElementById('bonus-total-container-positive').style.backgroundColor = '#D0011B';//rbg(' + 255 +',' + 0 +',' + 0 + ',' + 0.65 +')';
        document.getElementById('bonus-total-container-positive').style.borderColor = "#F06576";
    }

    // update UI
    if (this.isLocal)
    {
        document.getElementById('modify1-text').innerHTML = (array[0] > 0 && array[0] < 10) ? "+0" + array[0] : array[0];//this.teamBonus;
        document.getElementById('modify2-text').innerHTML = (array[1] > 0 && array[1] < 10) ? "+0" + array[1] : "+" + array[1]//this.playerBonus;
        document.getElementById('modify3-text').innerHTML = (array[2] > 0 && array[2] < 10) ? "+0" + array[2] : "+" + array[2]//this.potionBonus;
        document.getElementById('bonus-total-text').innerHTML = (this.bonusTotal < 10 && this.bonusTotal > 0) ? "0" + this.bonusTotal : this.bonusTotal;//array[0] + array[1] + array[2];
    }
};

game_player.prototype.updateBonuses = function(teamBonus)
{
    console.log('== player.updateBonuses ==', teamBonus);

    // if team bonus defined, apply it
    if (teamBonus !== undefined)
        this.teamBonus = teamBonus;
    
    // total potion bonusus
    this.potionBonus = 0;
    for (var i = this.potionBonuses.length - 1; i >= 0; i--)
    {
        this.potionBonus += this.potionBonuses[i].v;
        console.log('* potion bonus', this.potionBonuses[i].v);
        
    }
    console.log('* bonuses', this.teamBonus, this.playerBonus, this.potionBonus);
    
    // total it
    this.bonusTotal = this.teamBonus + this.playerBonus + this.potionBonus;
    console.log('* bonusTotal', this.bonusTotal);
    
    // update client? via write or livesocket
    this.bonusDispatch = [this.teamBonus, this.playerBonus, this.potionBonus];
};

game_player.prototype.reset = function()
{
    console.log('== player.reset() ==');
    this.dead = false;
    this.dying = false;
    this.visible = false;
    //this.vuln = true; // this disables input
    this.active = false;
    this.landed = 1;
    this.bubble = false;
    this.blinking = false;
    this.unblinker = false;
    this.drawAbility = 0;

    this.levelcaps = [2000,8000,15000,25000];
    this.score = 0;
    this.nextlevel = 2000;
    this.progression = 0;

    this.thrustModifier = 40;

    console.log('disconnected', this.disconnected);
    
    if (this.disconnected)
        this.pos = this.config.gridToPixel(0,0);
    else if (this.config.server) 
        this.respawn();

};
game_player.prototype.setPlayerName = function(name)
{
    console.log('== player.setPlayerName', name, '==');

    // omit setter if new name is same as old name
    // if (name == this.playerName) return;

    this.playerName = name;

    if (this.config.server) return;

    // create name-based image
    // var textLabel = document.createElement('Label');
    // textLabel.value = name;
    // console.log('team', this.team);
    if (!this.playerNameImage)
        this.playerNameImage = new Image();//document.createElement('Image');
    var textCanvas = document.createElement('canvas');
    // textCanvas.width = 150;
    var ctx = textCanvas.getContext('2d');
    ctx.font = "18px sans"; // set font *before* measuring
    ctx.canvas.width = ctx.measureText(name).width + 10;
    // textCanvas.style.border = "1px solid #000000";
    if (this.team === 1)
        ctx.fillStyle = '#FF6961';
    else if (this.team === 2)
        ctx.fillStyle = '#6ebee6';
    else ctx.fillStyle = 'white';
    ctx.font = "16px Mirza";
    // tCtx.textAlign = 'center';
    ctx.fillText(name, 10, 10);//, 300);
    // this.playerNameImage.width = tCtx.measureText(name).width;//textCanvas.width;//200;//tCtx.width;
    this.playerNameImage.src = ctx.canvas.toDataURL();
    console.log('* text image src', this.playerNameImage.src);

    // gc cleanup
    textCanvas = null;
};

game_player.prototype.setSkin = function(skin)
{
    console.log('== player.setSkin', skin, '==');
    
    this.skin = skin;
    if (!this.config.server)
    {
        this.sprite = new game_spritesheet(assets.skins[skin]);
    }    
};

game_player.prototype.addToScore = function(val)
{
    if (val)
    this.score += val;

    if (this.level === 1 && this.score >= this.levels[1])
    {
        console.log('* LEVEL UP - 2!');
        this.level = 2;
        this.healthMax = 125;
        this.playerBonus += 5;
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('txtLevelC').innerHTML = this.level;
            document.getElementById('txtLevelN').innerHTML = this.level + 1;
        }
    }
    else if (this.level === 2 && this.score >= this.levels[2])
    {
        console.log('* LEVEL UP - 3!');
        this.level = 3;
        this.healthMax = 150;
        this.slots[1].a = 1;
        this.playerBonus += 5;
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('txtLevelC').innerHTML = this.level;
            document.getElementById('txtLevelN').innerHTML = this.level + 1;
        }
    }
    else if (this.level === 3 && this.score >= this.levels[3])
    {
        console.log('* LEVEL UP - 4!');
        this.level = 4;
        this.healthMax = 175;
        this.playerBonus += 5;
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('txtLevelC').innerHTML = this.level;
            document.getElementById('txtLevelN').innerHTML = this.level + 1;
        }
    }
    else if (this.level === 5 && this.score >= this.levels[4])
    {
        console.log('* LEVEL UP - 5!');
        this.level = 5;
        this.healthMax = 200;
        this.slots[2].a = 1;
        this.playerBonus += 5;
        if (!this.config.server && this.isLocal)
        {
            document.getElementById('txtLevelC').innerHTML = this.level;
            document.getElementById('txtLevelN').innerHTML = "*";//this.level + 1;
        }
    }

    if (!this.config.server && this.isLocal)
    {
        // update score text
        document.getElementById('txtScore').innerHTML = this.score + " / " + this.levels[this.level];
        console.log("**** update score", this.score, (this.score * 100) / this.levels[this.level]);

        var prog = Math.floor((this.score * 100) / this.levels[this.level]);
        document.getElementById('level-progressbar').style.width =  prog + "%";

        switch(this.level)
        {
            case 1:
            break;

            case 2:
            break;

            case 3:
            break;

            case 4:
            break;

            case 5:
            break;
        }
    }

};

game_player.prototype.respawn = function()
{
    console.log("== respawn ==");//, this.instance);

    if (!this.instance) 
    {
        console.warn("ERROR: player.respawn failed due to undefined value of this.instance");
        return;
    }

    //var allplayers = this.instance.game.gamecore.getplayers.allplayers;

    // set start position (based on team)
    var startPos = {x:0,y:0};
    var teamRed_x = 3;
    var teamRed_y = 4;
    var teamBlue_x = 47;
    var teamBlue_y = 26;
    var sx, sy;
    // var sx = Math.floor(Math.random() * teamRed_x) + 1;
    // var sy = Math.floor(Math.random() * teamRed_y) + 1;
    console.log("* team", this.team);
    //var y_offset = 15;
    if (this.team === 1) // red
    {
        sx = teamRed_x;
        sy = teamRed_y;
    }
    else if (this.team === 2)
    {
        sx = teamBlue_x;
        sy = teamBlue_y;
    }
    else 
    {
        console.warn("player team undecided!"); return;
    }
    // TODO: set position based on team
    var pos = this.instance.game.gamecore.gridToPixel(sx, sy);//3,4);
    startPos.x = pos.x;
    startPos.y = pos.y;

    this.pos = startPos;
    //assets.respawnPos = startPos;
};

game_player.prototype.botAction = function()
{
    console.log('== botAction ==');
    
    // A: left down
    // B: left up
    // C: right down
    // E: right up
    // u: flap down
    // x: flap up
    if (this.config.keyboard)
    this.config.keyboard._onKeyChange({keyCode:39}, false);
    //document.externalControlAction(data);
};

game_player.prototype.doFlap = function()
{
    // console.log('doFlap', this.dir);

    // set flap flag
    this.flap = true;
    // if (!this.config.server)
    // this.glideRight = true;

    // clear landed flag
    this.landed = 0;
    //console.log('a', this.a);

    //if (vy < -6)
    //console.log('vy1', this.vy);
    // if (this.vy > 0)
    // this.vy -= (this.thrust + this.thrustModifier) * 5;
    // else
    this.vy = -(this.thrust) * 5;
    //console.log('vy2', this.vy);
    if (this.a !== 0)
        this.vx = (this.thrust);///10;
    
    // console.log('a', this.a, 'vx', this.vx, 'vy', this.vy, 'thrustMod', this.thrustModifier);

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
    // console.log('=== player.doLand', this.mp, '===', this.vx);//, this.vy);

    // var _this = this;

    // if falling fataly fast...
    /*if (this.vy > 10)
    {
        console.log('fatal bounce!', this.vy);
        
        this.vy = 0;

        if (this.config.server)
        {
            console.log('dead!', this.instance.game.id);
            
            // this.instance.room(this.instance.game.id).write({type:'pk', action: this.mp + '|' + ""});
            this.instance.room(this.instance.game.id).write([5, this.id, 0]);//this.mp + '|' + ""]));
            // this.config._.forEach(_this.instance.game.gamecore.getplayers.allplayers, function(p, i)
            // {
            //     if (p.instance)// && p.mp != "hp")
            //     {
            //         console.log('sending...', p.mp);
                    
            //         p.instance.send('p.k.' + _this.mp + '|' + "");
            //     }
            // });
        }
        this.doKill();
        return;
    }*/
    // ...survivably fast
    if (this.vy > 5)// && this.config.server)
    {
        console.log('* bounce up!', this.vy);
        // account for .5 discrepancy between server and client
        if (this.config.server)
            this.vy += 0.5;
        // set length of vulnerability based on how hard player hits
        var len = 1500 + ((this.vy - 5) * 1000);
        // impact drag
        this.vy = this.vy/2;
        // bounce
        this.vy *= -1;
        // set vulnerability
        this.isVuln(len);
        //this.a *= -1;
        // inflict fall damage
        if (this.config.server)
        {
            var dmg = this.getRandomRange(Math.round(this.vy * 2), Math.round(this.vy * 3));
            this.updateHealth(0 - dmg);
            // send to client
            this.instance.room(this.playerPort).write([5, this.id, null, 0 - dmg]);
            // this.setTextFloater(100, Math.abs(dmg), 1);
        }

        return;
    }

    // decelerate
    if (this.vx > 0)
    {
        // console.log('* slowing +', this.vx);

        // slow horizontal velocity
        //this.vx -= 200;

        // set landing flag (moving)
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx -= 0.025.toFixed(2); // friction

        if (this.vx < 0)
        {
            this.vx = 0;
            //this.vy = 25;
            this.landed = 1;
            this.a = 0;
        }
    }
    else if (this.vx < 0)
    {
        //console.log('* slowing -', this.vx);
        
        //this.vx += 200;
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx += 0.025.toFixed(2); // friction

        if (this.vx > 0)
        { 
            this.vx = 0;
            this.landed = 1;
            this.a = 0;
        }
    }
    if (this.vx === 0)
    {
        // stuck landing (no velocity)
        this.vx = 0;
        //this.vy = 25;
        // set landing flag (stationary)
        this.landed = 1;
        this.a = 0;
    }

    // if (this.isLocal && !this.config.server)
    // {
    //     this.config.client_process_net_prediction_correction2();
    // }
    //if (this.mp == this.config.players.self.mp)
    //if (this.landed === 2)
	    //console.log('* data', this.vx, 'vy', this.vy, 'a', this.a);
    //else if (this.landed === 1 && this.mp == "cp1") console.log('landed', this.pos.x, this.pos.y);
    
};

game_player.prototype.doWalk = function(dir)
{
    //console.log('walking...', dir, this.ax, this.vx, this.a, this.vy);
    this.landed = 2; // walking

    /*if (dir === 0)
        this.a = 90;
    else this.a = -90;*/
    this.vx = this.thrust;
};

game_player.prototype.takeFlag = function(flag, flagType)
{
    console.log('===player.takeFlag', flag.name, flagType, '===');//, flag, this.team);
    // if (this.team === 1 && flagType === 2) return;
    // if (this.team === 2 && flagType === 3) return;

    //console.log('player.takeFlag', flag.id, flagType, flag.name, flag.sourceSlot, flag.targetSlot);

    /*var cooldown = this.config._.find(this.config.clientCooldowns, {"flag":flag.name});
    cooldown.heldBy = this.mp;
    cooldown.timer = NaN;*/

    /*this.hasFlag = flagType;
    this.flagTakenAt = this.config.server_time;
    this.carryingFlag = flag;*/

    //this.hasFlag = flagType;

    // disable bubble
    // if (this.bubble) this.bubble = false;

    // speed modifier (slow down)

    // set target slot
    /*switch(flag.sourceSlot)
    {
        case "midSlot":
            if (this.team === 1) flag.targetSlot = "slot6";
            else flag.targetSlot = "slot5";
        break;

        case "slotRed":
            flag.targetSlot = "slot1";
        break;

        case "slotBlue":
            flag.targetSlot = "slot10";
        break;

        case "slot1":
            if (this.team === 1) flag.targetSlot = "slotRed";
            else flag.targetSlot = "slot2";
        break;

        case "slot2":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot1";
                else flag.targetSlot = "slot3";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot3";
                else flag.targetSlot = "slot1";
            }
        break;

        case "slot3":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot2";
                else flag.targetSlot = "slot4";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot4";
                else flag.targetSlot = "slot2";
            }
        break;

        case "slot4":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot3";
                else flag.targetSlot = "slot5";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot5";
                else flag.targetSlot = "slot3";
            }
        break;

        case "slot5":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot4";
                else flag.targetSlot = "slot6";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "midSlot";
                else flag.targetSlot = "slot4";
            }
        break;

        // blue territory

        case "slot6":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot7";
                else flag.targetSlot = "slot5";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "midSlot";
                else flag.targetSlot = "slot7";
            }
        break;

        case "slot7":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot8";
                else flag.targetSlot = "slot6";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot6";
                else flag.targetSlot = "slot8";
            }
        break;

        case "slot8":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot9";
                else flag.targetSlot = "slot7";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot7";
                else flag.targetSlot = "slot9";
            }
        break;

        case "slot9":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot10";
                else flag.targetSlot = "slot8";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot8";
                else flag.targetSlot = "slot10";
            }
        break;

        case "slot10":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slotBlue";
                else flag.targetSlot = "slot9";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot9";
                else flag.targetSlot = "slotBlue";
            }
        break;
    }
    // set target locally
    console.log('* sourceSlot', flag.sourceSlot, 'targetSlot', flag.targetSlot);*/
    //flag.targetSlot = flag.getTargetSlot

    // if (!this.config.server)
    // {
    //     // show toast
    //     new game_toast().show();
    // }
    // else
    // {
    //     console.log('* socket emit', flag.targetSlot);
    //     // inform socket
    //     for (var l = 0; l < getplayers.allplayers.length; l++)
    //     {
    //         // dispatch flagremove socket event
    //         if (getplayers.allplayers[l].instance && getplayers.allplayers[l].mp != this.mp)
    //         {
    //             //console.log('flag sent', flag.name);
    //             //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
    //             getplayers.allplayers[l].instance.send('f.r.'+this.mp+"|"+flag.name+"|"+this.flagTakenAt);//_this.laststate);
    //         }
    //     }
    //     // update clientCooldowns objs
    //     var cd = this.config._.find(this.config.clientCooldowns, {"name":flag.name});
    //     //console.log(this.config.clientCooldowns);
    //     cd.heldBy = this.mp;
    //     cd.src = flag.sourceSlot;
    //     cd.target = flag.targetSlot;
    //     //console.log('cooldown obj');

    //     // start cooldown
    //     // get event by id "fc" (flag carried)
    //     var evt = this.config._.find(this.config.events, {'id':"fc"});
    //     evt.flag = flag;
    //     //console.log('got evt', evt);
    //     evt.doStart();
    //     // call event.doStart() to begin 60 second cooldown
    // }
};

// game_player.prototype.removeFlag = function(success, slot, flag)
// {
//     console.log('===player.removeFlag', success, slot.name, flag.name);

//     if (success) // succesfully slotted flag in appropriate placque
//     {
//         flag.x = slot.x - (slot.width/2);
//         flag.y = slot.y - (slot.height/2);
//         flag.sourceSlot = slot.name;
//         console.log('* sourceSlot', flag.sourceSlot);
//         //flag.isActive = false;
//         // note: targetSlot will be defined when flag is taken!

//         console.log('* socket emit', slot);
//         // inform socket
//         for (var l = 0; l < getplayers.allplayers.length; l++)
//         {
//             if (getplayers.allplayers[l].instance && getplayers.allplayers[l].mp != this.mp)
//             {
//                 //console.log('flag sent', slot);
//                 //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
//                 getplayers.allplayers[l].instance.send('f.a.'+this.mp+"|"+slot.name+"|"+flag.name);//_this.laststate);
//             }
//         }

//         // revise territory
//         /*
//         if (this.config.server)
//         {
//             console.log('emit territory change data');
//         }
//         */
//         if (!this.config.server)
//         {
//             this.config.updateTerritory();

//             // start flag-slotted cooldown event
//         }
//     }
//     var flagObj = this.config._.find(this.config.flagObjects, {"name":flag.name});
//     flagObj.reset(success);//, this.config.server_time);
//     this.hasFlag = 0;
//     //this.carryingFlag = null;
// };

game_player.prototype.collision = false;
game_player.prototype.hitFrom = 0;
game_player.prototype.target = null;
game_player.prototype.update = function()
{
    // console.log('== player.update ==', this.config.server_time);//server, this.isBot, this.mp);
    //if (this.mp == "cp1")
    //console.log('p:', this.mp, this.visible, this.active);
    
    // if (this.config.server && this.isBot)
    // {
    //     this.botAction();
    // }

    // check buffs for cooldowns
    // no need to check roundSlot which has no cooldown
    if (this.config.server)
    {
        // blinking? (stacking -> 1=3, 2=2, 3=1)
        if (this.blinking === true && Math.floor(this.config.server_time) % 3 === 0)
            this.drawAbility = 1;
        else if (this.drawAbility === 1)
            this.drawAbility = 0;

        // check buff slots (local player only)
        if (this.isLocal)
        {
            if (this.slots[0].b && this.slots[0].c <= this.config.server_time)
                this.buffExpired(this.slots[0]);
            if (this.slots[1].b && this.slots[1].c <= this.config.server_time)
                this.buffExpired(this.slots[1]);
            if (this.slots[2].b && this.slots[2].c <= this.config.server_time)
                this.buffExpired(this.slots[2]);

            // check potions (3 max)
            if (this.potionBonuses.length > 0)
            {
                for (var i = this.potionBonuses.length - 1; i >= 0; i--)
                {
                    if (this.potionBonuses[i].c <= this.config.server_time)
                    {
                        console.log('* potion expired, removed...');
                        this.potionBonuses.splice(i, 1);
                        // update totals
                        this.updateBonuses();
                        break;
                    }
                }
            }

            // also check for bubble respawns
            if (this.bubbleRespawn > 0 && this.config.server_time >= this.bubbleRespawn)
            {
                console.log("* bubble respawn!");
                this.bubbleRespawn = 0;
                this.setBubble(true);
            }
        }
    } // end this.server

    // ensure tilemap data is loaded (locally)
    if (!this.tmd) this.tmd = this.config.tilemapData;
    if (this.landed === 1)
    {
        if (this.collision === false)
        {
            // reset angle
            this.a = 0;

            // force stoppage
            this.vx = 0;
            this.vy = 0;

            // get out
            //if (this.hitFrom==-1)
            return;
        }
        else this.landed = 2;
    }


    this.vy += this.config.world.gravity;//.fixed(2);///5;
    // 40 = slow, 30 = medium, 25 = fast
    // range 50s - 30f (range of 20)
    // console.log(':::', this.thrust, this.thrustModifier);
    // thrustModifier
    this.vx = ((this.a / this.thrustModifier) * Math.cos(this.thrust));// + this.thrustModifier));//.fixed(2);

    this.pos.y += this.vy;//.fixed(2);

    // /10 = slower /25 = faster /50 = fast
    this.pos.x += this.vx;//.fixed(2);//((this.a/25) * Math.cos(this.vx));
    //console.log('vs', this.vx, this.vy);

    //if (this.pos.x < 165) this.vx *=-1;
    //else
    if (this.collision === true)
    {
        console.log('collision', this.hitFrom);
        
        switch(this.hitFrom)
        {
            case 0: // from the side
                this.vx *= -1;
                this.a *= -1;
                //this.collision = false;
                //if (!this.vuln)
                    //this.isVuln();
                //console.log('vx', this.vx);
            break;
            case 1: // from below
                //this.vx *= -1;
                //this.a *= -1;
                this.vy *= -1;
                this.isVuln(750);
                // dmg 1 - 5
                if (this.config.server)
                {
                    var dmg = this.getRandomRange(1, 5);
                    // console.log("* from below dmg", dmg);
                    this.updateHealth(0 - dmg);
                    this.instance.room(this.playerPort).write([5, this.id, null, dmg]);
                }
                // dmgText = 0 - 2;
                // add floating text with damage (id: 100 = damage text)
                // this.setTextFloater(100, Math.abs(dmg), 1);
                //this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 2: // from above
                //this.vx *= -1;
                console.log('hit speed', this.vy);
                this.vy = 0;
                //this.vx *= -1;
                this.a = 0;//*= -1;
                //this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 3: // opponent
                // if dif >= 15 && dif <= 15 no victim
                // add bonus/buff modifiers to dif below
                // console.log('opponent - dif', this.pos.y - this.target.pos.y);
                // if (this.pos.y - this.target.pos.y >= 15 || this.pos.y - this.target.pos.y <= 15)
                // {
                //     console.log('player tie!');
                    
                // }
                //this.target.vx *= -1;
                console.log('pre', this.vx, this.a);
                
                this.vx *= -1;
                this.vy *= -1;
                this.a *= -1;

                // if opponent is stationary, move him
                if (this.target.landed === 1)
                    this.target.landed = 2;//this.target.update();

                // bump
                if (this.pos.x > this.target.pos.x)
                    this.pos.x += this.size.hx/2;
                else this.pos.x -= this.size.hx/2;
                //this.vuln = true;
                // console.log('post', this.vx, this.a);

                //this.isVuln(500);
                //this.target.isVuln(500);
                
                break;
                
        }
        // reset vars
        this.collision = false;
        this.hitfrom = -1;
        this.target = null;
    }
    else this.vx *= 1;

    this.pos.x = this.pos.x.fixed(2);
    this.pos.y = this.pos.y.fixed(2);
    this.vx = this.vx.fixed(2);
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

// game_player.prototype.doHitClientVictor = function(victim, dmg)
// {
//     console.log('== player.doHitClientVictor', victim.playerName, dmg);
    
//     // i am the victor
// };

game_player.prototype.doHitClientVictim = function(victor, dmg)
{
    console.log('== player.doHitClientVictim ==');
    if (victor) console.log('by', victor.playerName);
    console.log('for dmg', dmg);

    // i am the victim, so show damage callout
    this.isHit = 1;

    // reduce health
    // this.health -= dmg;
    // if (victor.id != this.id)
    //     this.updateHealth(dmg);

    var dmgText = dmg;
    if (victor && this.userid === victor.userid)
        dmgText = dmg;
    else
    { 
        this.updateHealth(0 - dmg);
        dmgText = 0 - dmg;
    }

    // add floating text with damage (id: 100 = damage text)
    this.setTextFloater(100, dmgText, 1);
};

game_player.prototype.getRandomRange = function(min, max)
{
        return Math.floor(Math.random() * (max - min + 1)) + min;
};

game_player.prototype.doHitServer = function(victor, isHit)
{
    console.log('== player.doHitServer ==', victor.userid, victor.id);  

    // i am the victim

    // if hit, ignore additional hits for 3 seconds or if victim (me) is dead...
    if ((this.hitData.by === victor.userid && this.hitData.at + 3 >= this.config.server_time + 2) || this.dead === true)
    {
        console.log('* ignoring multihit! by this player', victor.userid, this.hitData.at, this.config.server_time);
        return;    
    }
    else // I am hit!
    {
        // set hitData to reduce redundant hits
        this.hitData.by = victor.userid;
        this.hitData.at = this.config.server_time;
        // console.log('* setting hitData', this.hitData);

        // check if hit is fatal, and if so, start death seq
        // otherwiese, inform client of hit

        // TODO: determine dmg
        // victim (this) mods vs victor mods
        if (isHit)
        {
            // first, if victim is bubbled, no damage taken
            if (this.bubble === true)
            {
                console.log("* bubble!")
                // remove bubble
                this.setBubble(false);;
                // set bubble on 10 sec cooldown (if cd doesn't expire first)
                // TODO: also check for round slot bubble buff
                for (var i = this.slots.length - 1; i >= 0; i--)
                {
                    if (this.slots[i].b === this.game_buffs.BUFFS_BUBBLE)
                    {
                        // if bubble expires < this.bubbleRespawnTime (10 seconds), get out
                        if (this.slots[i].c - this.config.server_time <= this.bubbleRespawnTime)
                            break;
                        // otherwise, add respawn flag in 10 sec.
                        else
                        {
                            this.bubbleRespawn = this.config.server_time + this.bubbleRespawnTime;
                            console.log("* bubble respawn set to", this.bubbleRespawn);
                        }
                    }
                }
                // get out
                return;
            }
            // set base damage (5 - 15) + victor bonus (victor.total) + victor buffs (victor.damageBonus) + (option for 5% + victor bonus to inflict double-damage) - victim.damageReduce bonus - victim bonus
            // base damage 5 - 15;
            var dmg = Math.floor(Math.random() * 11) + 5;
            console.log("+ base", dmg);
            // victor modifiers (dmg buff + bonus)
            dmg += (dmg * (victor.damageBonus / 100) + (dmg * (victor.bonusTotal / 100)));
            console.log("+ victor bonuses", dmg, victor.damageBonus, victor.bonusTotal);
            // victim modifiers (dmg reduce + bonus)
            dmg -= (dmg * (this.damageReduce / 100) - (dmg * (this.bonusTotal / 100)));
            console.log("- victim bonuses", dmg, this.damageReduce, this.bonusTotal);
            // round it
            dmg = Math.round(dmg);
            console.log("+ final", dmg);
            // damage cannot be negative
            if (dmg < 0) dmg = 0;

            this.updateHealth(0 - dmg);
            if (this.health <= 0)
            {
                console.log('*', this.playerName, 'is dead!');

                // victor is awarded protection for 60 seconds + bonus
                // don't "bounce" victor if victim is dead
            }
            else 
            {
                // if victim *doesn't* has protection, rng 1 - 100
                // if (if rng <= (victor bonus - victim bonus)
                // victim inflicted with stun and rng debuff
                // rng 1 or 2
                // if (rng == 1 && victim has at least 1 active buff)
                // inflict stun
                // otherwise, inflict dazed (equal to bonus differential) for 60 seconds + bonus?

                // if (this.vx === 0)
                console.log("my vx", this.vx, victor.vx);
                // victor.vx *= -1;
                victor.collision = true;
                this.collision = true;
                victor.hitFrom = 3;
                this.hitFrom = 3;
                victor.target = this;
                this.target = victor;
                // if victim is standing, set to walking so player "bumped" location will update
                // if (this.landed === 1) this.landed = 2;
            }
            // notify client
            if (victor && victor.instance)
                victor.instance.room(victor.playerPort).write([5, this.id, victor.id, dmg]);
        }
        else // tie (players collide but no hit)
        {
            // have collided
            victor.collision = true;
            this.collision = true;
            // hit by player
            victor.hitFrom = 3;
            this.hitFrom = 3;
            // set collidee
            victor.target = this;
            this.target = victor;
        }
    }
};

game_player.prototype.doKill = function(victor)
{
    console.log('playerKill', this.playerName);
    if (victor) console.log('by', victor.playerName, 'dead?', this.dead);
    // this.active = false;

    // avoid reduncancy
    if (this.dying === true) return;
    else this.dying = true;

    console.log('player dying', this.playerName);

    // // update all players
    if (this.config.server)
        this.instance.room(this.playerPort).write([5, this.id]);//, victor.id]);
    // this.config._.forEach(this.instance.game.gamecore.getplayers.allplayers, function(p, i)
    // {
    //     if (p.instance && p.mp != "hp")
    //     {
    //         console.log('sending...', p.mp);

    //         if (victor)      
    //             p.instance.send('p.k.' + _this.mp + '|' + victor.mp);
    //         else p.instance.send('p.k.' + _this.mp + '|' + victor.mp);
    //     }
    // });

    this.dead = true;

    // if (victor && victor.mp == this.mp)
    //     console.log('IHAVEDIED!!!!!!!!!!');

    // apply red flash fx
    //this.config.flashBang = 2;d

    // store current position
    var waspos = this.pos;

    // stop movement
    this.vx = 0;
    this.vy = 0;
    this.a = 0;

    // remove bubble
    this.bubble = false;
    // console.log(this.getplayers);
    if (!this.config.server && this.isLocal)//this.config.players.self.mp)
    {
        this.vx = 0;
        this.vy = 0;
        this.a = 0;
        this.dead = true;
        this.vuln = true;
    }

    // if carrying flag, drop it
    var hadFlag = false;
    if (this.hasFlag)
    {
        this.dropFlag();
        hadFlag = true; // needed for victor scoring below

        if (!this.config.server && this.isLocal)//this.mp == this.config.players.self.mp)
            this.dropFlag();
    }

    //this.pos = this.config.gridToPixel(2, 2);

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
        this.config.orbs.push( neworb );
    }
    console.log('total orbs', this.config.orbs.length);//, this.orbs);
    //*/

    // show splatter locally
    /*if (!this.config.server)
        this.config.prerenderer();*/

    if (victor)
    {
        console.log(this.playerName, 'slain by', victor.playerName);

        if (hadFlag)
            victor.addToScore(1500);
        else victor.addToScore(500);

        // var victim = this.mp.replace ( /[^\d.]/g, '' );
        // this.killedBy = parseInt(victim);
        // console.log(victor.mp, 'killed player', this.killedBy);
        
        // assign victor 50% of victim's speed

        // toast or death log
        
        // temporarily have camera follow victor
        //this.config.players.self = victor;
    }

    // dim game screen (alpha overlay)

    // set timer to reset player dead state
    // setTimeout(this.timeoutRespawn.bind(this, victor), 2000);
    setTimeout(this.timeoutRespawn.bind(this), 2000);
};

game_player.prototype.timeoutRespawn = function()
{
    console.log('player dead complete', this.disconnected, this.mp);

    // revise highscore?
    if (assets.myHighscore < this.score)
    {
        // update high score locally
        localStorage.wingdom__myHighscore = this.score;
        assets.myHighscore = this.score;
    }
    assets.myLastscore = this.score;

    this.reset();
    // if (this.disconnected)
    // {
        // this.dead = false;
        // this.dying = false;
        // this.visible = false;
        // //this.vuln = true; // this disables input
        // this.active = true;
        // this.landed = 1;
        // this.bubble = false;
        // this.score = 0;
        // this.progression = 0;
        // this.pos = this.config.gridToPixel(0,0);

    //     if (this.mp == this.config.players.self.mp)
    //     {
    //         var ui = document.getElementById('splash');
    //         if (assets.device == "phone")
    //             ui = document.getElementById('splash-phone');
    //         ui.style.display = "block";
    //         //document.body.style.backgroundImage = "url(" + assets.bg_splash + ")";
    //     }
    //     return;
    // }

    // ...otherwise, not disconnected. Player can respawn...
    
    // this.dead = false;
    // this.dying = false;
    // this.visible = false;
    // //this.vuln = true; // this disables input
    // this.active = true;
    // this.landed = 1;
    // this.bubble = false;
    // this.progression = 0;
    // this.score = 0;
    // //this.pos = this.config.gridToPixel(3,4);

    if (!this.config.server && this.isLocal)//this.mp == this.config.players.self.mp)
    {
        console.log('* dead player is self (me)...');
        
        //this.config.players.self = this;
        // this.config.players.self.visible = false;
        // this.config.players.self.pos = this.config.gridToPixel(3,4);
        // this.config.players.self.dead = false;
        // this.config.players.self.landed = 1;

        if (!this.config.server)
        {
            console.log('* client-only...');

            var event = document.createEvent('Event');
            event.player = this;
            // event.game = this.game;
            event.initEvent('playerRespawn', true, true);
            document.dispatchEvent(event);
        }
        // else // server
        // {
        // }
    }
    else // not self
    {
        //this.visible = false;
    }
    
    if (this.config.server) this.respawn();

    // // show respawn screen (ads)
    // if (!this.config.server && victor.mp != this.config.players.self.mp)
    // {
    //     var ui = document.getElementById('splash');
    //     ui.style.display = "block";
    // }
};

game_player.addRoundBuffToServer = function(data)
{
    console.log('== addRoundBuffToServer ==', data);
};

game_player.prototype.addBuffToServer = function(data)//type, duration, modifier)
{
    console.log('== addBuffToServer ==', this.playerName, data);

    // store new buff
    this.addBuff(data.t);

    // set new buff for dispatch to client (via live socket)
    this.slotDispatch = data.t;
};

game_player.prototype.addHealthToServer = function(data)
{
    console.log('== addHealthToServer ==', data);

    // subject health value to bonus modifier
    var val = data.v;
    val += Math.round(val * (this.bonusTotal / 100));

    console.log("+ player bonus", val - data.v);

    this.updateHealth(val);//data.v);
    // if (this.health + data.v >= this.healthMax)
    //     this.health = this.healthMax;
    // else this.health += data.v;

    // this.healthDispatch = data.v;
}

game_player.prototype.addFocusToServer = function(data)
{
    console.log('== addFocusToServer ==', data);

    // value = data.v;
    // get cooldown
    var bonus = 60 + (60 * (this.bonusTotal / 100));
    this.potionBonuses.push({v:data.v, c:this.config.server_time + bonus});

    // send data to live socket
    this.focusDispatch = data.v;//t;

    this.updateBonuses();
};

game_player.prototype.setTextFloater = function(c, v, bool, type)
{
    console.log('== setTextFloater ==', c, v, bool, type);

    // params:
    // 1. category: 1 (buff) / 2 (health) / 3 (bonus) / 100 damage
    // 2. value: int
    // 3. active: bool
    // 4. type (buff)
    var text, color, img;
    var localOnly = true; // show only to local client
    if (v >= 0)
        text = "+" + v.toString();
    else text = v.toString();

    if (c === 3)
    {
        text += " BONUS";
        color = "yellow";
    }
    else if (c == 100) // damage
    {
        text += " HEALTH";
        color = "red";
        // show to both victim and victor
        localOnly = false;
    }
    else if (c === 2)
    {
        text += " HEALTH";
        color = "lime";
    }
    else if (c === 1)
    {
        color = "white";
        localOnly = true;
        switch(type)
        {
            case this.game_buffs.BUFFS_BUBBLE: 
                text = "Bubble";
                img = this.game_buffs.BUFFS_BUBBLE_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_ALACRITY: 
                text = "Alacrity"; 
                img = this.game_buffs.BUFFS_ALACRITY_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_PRECISION: 
                text = "Precision"; 
                img = this.game_buffs.BUFFS_PRECISION_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_RECOVER: 
                text = "Recover"; 
                img = this.game_buffs.BUFFS_RECOVER_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_BLINK: 
                text = "Blink"; 
                img = this.game_buffs.BUFFS_BLINK_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_REVEAL: 
                text = "Reveal"; 
                img = this.game_buffs.BUFFS_REVEAL_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_BRUISE: 
                text = "Bruise"; 
                img = this.game_buffs.BUFFS_BRUISE_IMAGE_ASSET;
            break;
            case this.game_buffs.BUFFS_PLATE: 
                text = "Plate"; 
                img = this.game_buffs.BUFFS_PLATE_IMAGE_ASSET;
            break;
        }
    }
    // console.log(this.config.server_time, this.config.server_time + 1.5, localOnly);
    this.textFloater = [text, color, bool, this.config.server_time + 1.5, localOnly, img];
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
    if (this.vuln === true || this.dead === true || this.ability === -1 || this.cooldown === true) return;

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
            console.log('bursting!!', this.x_dir, this.mp, this.config.playerspeed);
            //if (this.dir === 0)
                //this.x_dir += 500;//this.pos.x += this.size.hx + 150;
            //else this.ax -= 100;//this.pos.x -= 150;
            this.vx += 500;
            console.log('post!!', this.x_dir, this.mp, this.config.playerspeed);

            //if (this.isLocal) this.config.players.self.pos.x = this.pos.x;
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

        // this.thrustModifier = this.progression * 0.00025;
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
    setTimeout(_this.timeoutEngaged.bind(this), len);
};

game_player.prototype.timeoutEngaged = function()
{
    console.log(this.mp, 'no longer engaged!');
    this.engaged = false;
};

game_player.prototype.isVuln = function(len)
{
    if (this.vuln===true) return;

    console.log('Im vulnerable!', len);
    //var _this = this;

    this.vuln = true;

    // also set to engaged
    if (this.isLocal)
        this.isEngaged(len);

    // break bubble
    if (this.bubble === true)
    {
        // break bubble
        this.setBubble(false);
        // set bubble on 10 sec cooldown
        // get out?
    }

    setTimeout(this.timeoutVuln.bind(this), len);

    // if carrying flag, drop it
    if (this.config.server && this.hasFlag)
        this.dropFlag();    
};

game_player.prototype.dropFlag = function()
{
    console.log("== player.dropFlag ==", this.hasFlag);
    if (this.hasFlag)
    {
        // 1 = midFlag, 2 = redBase, 3 = blueBase
        var flagName;
        switch(this.hasFlag)
        {
            case 1: flagName = "midFlag"; break;
            case 2: flagName = "redFlag"; break;
            case 3: flagName = "blueFlag"; break;
        }
        // remove flag from player
        this.hasFlag = 0;

        // reset flag
        // var flag = this.config._.find(this.config.flagObjects, {"name":flagName});
        // console.log('gamecore:', this.instance);
        var roomFlags;
        if (!this.instance)
            roomFlags = this.config.flagObjects;
        else roomFlags = this.instance.game.gamecore.getplayers.fromRoom(this.playerPort, 3);
        var flag = this.config._.find(roomFlags, {"name":flagName});
        //flag.slotFlag(this);
        flag.reset(false);//, this.game);
    }
}
game_player.prototype.timeoutVuln = function()
{
    this.vuln = false;
    console.log('...no longer vulnerable');
};

game_player.prototype.getGrid = function()
{
    return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};

game_player.prototype.getCoord = function()
{
    // direction-dependent, account for
    this.nw =
    {
        x: Math.floor((this.pos.x + this.size.offset) / 64),
        y: Math.floor(this.pos.y / 64)
    };
    this.ne =
    {
        x: Math.floor((this.pos.x + this.size.hx) / 64),
        y: Math.floor(this.pos.y / 64)
    };
    this.sw =
    {
        x: Math.floor((this.pos.x + this.size.offset) / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.se =
    {
        x: Math.floor((this.pos.x + this.size.hx) / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.n =
    {
        x: Math.floor((this.pos.x + (this.size.hx/2)) / 64),
        y: Math.floor((this.pos.y - (this.size.offset)) / 64)
    };
    this.s =
    {
        x: Math.floor((this.pos.x + (this.size.hx/2)) / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.e =
    {
        x: Math.floor((this.pos.x + this.size.hx - this.size.offset) / 64),
        y: Math.floor((this.pos.y + (this.size.hy/2)) / 64)
    };
    this.w =
    {
        x: Math.floor((this.pos.x + this.size.offset) / 64),
        y: Math.floor((this.pos.y + (this.size.hy/2)) / 64)
    };
    return { nw:this.nw, ne:this.ne, sw:this.sw, se:this.se, n:this.n, s:this.s, e:this.e, w:this.w };
    //return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};
game_player.prototype.hitGrid = function()
{
    // don't proceed unless tilemapData is loaded
    //if (this.config.tilemapData == undefined) return;
    //var tmd = this.config.tilemapData;
    if (this.tmd === null) return;

    this.c = this.getCoord();

    return {
        nw: (this.tmd[this.c.nw.y] && this.tmd[this.c.nw.y][this.c.nw.x]) ? {t:parseInt(this.tmd[this.c.nw.y][this.c.nw.x]),x:this.c.nw.x,y:this.c.nw.y} : 0,
        ne: (this.tmd[this.c.ne.y] && this.tmd[this.c.ne.y][this.c.ne.x]) ? {t:parseInt(this.tmd[this.c.ne.y][this.c.ne.x]),x:this.c.ne.x,y:this.c.ne.y} : 0,
        sw: (this.tmd[this.c.sw.y] && this.tmd[this.c.sw.y][this.c.sw.x]) ? {t:parseInt(this.tmd[this.c.sw.y][this.c.sw.x]),x:this.c.sw.x,y:this.c.sw.y} : 0,
        se: (this.tmd[this.c.se.y] && this.tmd[this.c.se.y][this.c.se.x]) ? {t:parseInt(this.tmd[this.c.se.y][this.c.se.x]),x:this.c.se.x,y:this.c.se.y} : 0,
        e: (this.tmd[this.c.e.y] && this.tmd[this.c.e.y][this.c.e.x]) ? {t:parseInt(this.tmd[this.c.e.y][this.c.e.x]),x:this.c.e.x,y:this.c.e.y} : 0,
        w: (this.tmd[this.c.w.y] && this.tmd[this.c.w.y][this.c.w.x]) ? {t:parseInt(this.tmd[this.c.w.y][this.c.w.x]),x:this.c.w.x,y:this.c.w.y} : 0,
        n: (this.tmd[this.c.n.y] && this.tmd[this.c.n.y][this.c.n.x]) ? {t:parseInt(this.tmd[this.c.n.y][this.c.n.x]),x:this.c.n.x,y:this.c.n.y} : 0,
        s: (this.tmd[this.c.s.y] && this.tmd[this.c.s.y][this.c.s.x]) ? {t:parseInt(this.tmd[this.c.s.y][this.c.s.x]),x:this.c.s.x,y:this.c.s.y} : 0
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
        this.config.ctx.beginPath();
        this.config.ctx.strokeStyle = 'gray';
        this.config.ctx.moveTo(this.pos.x, this.pos.y-10);
        this.config.ctx.lineTo(this.pos.x + 64, this.pos.y-10);
        this.config.ctx.lineWidth = 3;
        this.config.ctx.stroke();
        this.config.ctx.closePath();

        // mana progression
        // calculate
        //var progressPercent = (this.mana / this.levels[this.level]);
        // var progressPercent = (this.progression / 500);
        var progressPercent = (this.health / this.healthMax);
        // 64 is the width of the progression bar
        var progressVal = ((progressPercent / 100) * 64) * 100;
        // draw it
        this.config.ctx.beginPath();
        this.config.ctx.strokeStyle = this.healthbarColor;//(this.health < 20) ? '#f93822' : 'lime';// 'yellow';
        // game.ctx.moveTo(this.pos.x + 14 + (val), this.pos.y-10);
        // game.ctx.lineTo(this.pos.x + 14 + this.size.hx - 28, this.pos.y-10);
        this.config.ctx.moveTo(this.pos.x, this.pos.y-10);
        this.config.ctx.lineTo(this.pos.x + progressVal, this.pos.y - 10);
        this.config.ctx.lineWidth = 3;
        this.config.ctx.stroke();
        this.config.ctx.closePath();

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
    // var _this = this;

    if (this.active === false) return;

    //this.pos.x = this.pos.x.fixed(1);
    //this.pos.y = this.pos.y.fixed(1);
    // player nametags (temp)
    // mana bar bg
    var txtOffset = 20;
    if (this.isLocal) txtOffset += 10;
    if (this.vuln) txtOffset = 10;
    //var abil;

    // player is ME
    if (this.isLocal === true)
    {
        // console.log('blinking?', this.drawAbility);
        
        // nameplate color
        // game.ctx.fillStyle = '#526869';
        // game.ctx.font = "small-caps lighter 15px serif";

        // draw progression
        if (!this.vuln)
            this.drawAbilities();
    }
    else // not local player
    {
        // blinking manager
        if (this.drawAbility === 1 && this.config.client.players.self.unblinker === false && this.vuln === false) return;
    }
    if (this.textFloater)
    {
        if ((this.isLocal && this.textFloater[4]) || (!this.textFloater[4]))
        {
            this.config.ctx.font = "30px Mirza";
            this.config.ctx.textAlign = 'center';
            this.config.ctx.fillStyle = this.textFloater[1];
            // this.config.ctx.save();
            // draw buff image
            if (this.textFloater[5])
                this.config.ctx.drawImage(this.textFloater[5], this.pos.x - 95, this.pos.y - 60 - this.textFloater[2], 50, 50);
            this.config.ctx.fillText(this.textFloater[0],this.pos.x,this.pos.y - 30 - this.textFloater[2]);
            this.textFloater[2] += 0.25;
            // this.config.ctx.restore();
            if (this.config.server_time >= this.textFloater[3])
                this.textFloater = null;
        }
    }
    // else
    // {
    // nameplate color
    /*this.config.ctx.save();
    if (this.team == 1) // 1 = red, 2 = blue
    {
        this.config.ctx.fillStyle = '#FF6961';
        //game.ctx.save();
    }
    else if (this.team == 2)
    {
        this.config.ctx.fillStyle = '#6ebee6';
        //game.ctx.save();
    }
    else this.config.ctx.fillStyle = 'white';*/
    //this.config.ctx.font = "small-caps 15px serif";
    // }
    // game.ctx.strokeRect(
    //     this.pos.x,
    //     this.pos.y-10,
    //     this.size.hx,
    //     5);

    // nameplate
    /*this.config.ctx.font = "16px Mirza";
    this.config.ctx.textAlign = 'center';
    //var txt = "[" + this.level + "] " + this.playerName;//+ "(" + this.mana.toString() + ")";
    var txt = this.playerName;// + this.team.toString();//+ "(" + this.mana.toString() + ")";
    this.config.ctx.fillText(
        txt,// + " (" + this.level + ") " + this.mana.toString(),// + this.config.fps.fixed(1),
        this.pos.x + ((this.size.hx + this.size.offset)/2),//.fixed(1),
        this.pos.y - txtOffset
        //100
    );
    this.config.ctx.restore();*/
    // console.log('* pi:', this.playerNameImage, typeof(this.playerNameImage));
    // if (this.playerNameImage === undefined)
    //     this.setPlayerName(this.playerName);
    // if (this.playerNameImage)
    // if (!this.vuln)
    this.config.ctx.drawImage(this.playerNameImage, this.pos.x + (this.size.hx / 2) - (this.playerNameImage.width / 2), this.pos.y - txtOffset, this.playerNameImage.width, this.playerNameImage.height);

    // draw rank circle
    /*
    game.ctx.fillStyle = "gray";
    game.ctx.beginPath();
    game.ctx.arc (this.pos.x + (this.size.hx/2) - (game.ctx.measureText(txt).width/2) - 20, this.pos.y - txtOffset - 5, 10, 0, Math.PI*2, true);
    game.ctx.closePath();
    game.ctx.fill();
    //*/


    /*if (this.player_abilities_enabled && this.isLocal && this.ability !== -1)
    {
        this.config.ctx.drawImage(document.getElementById("ability-" + this.abilities[this.ability].label),
            //this.pos.x - 15,
            this.pos.x + ((this.size.hx + this.size.offset)/2) - (game.ctx.measureText(txt).width/2) - 20, // 20 = img width (15) - 5 pxl padding
            //this.pos.x + (this.size.hx/2) - 30,
            this.pos.y - txtOffset - 12,
            15, 15);
    }*/


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
    //console.log('flap', this.flap, this.dead);

        // console.log('***', this.config.client.players.self);
        
    
    if (this.dead === true)
    {
        console.log('dead animation...');
        
        img = assets.animate_gg;//document.getElementById('animate-gg');
        imgW = 64;//33;
        imgH = 64;//44;
        this.config.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);
    }
    else if (this.vuln === true)
    {
        if (this.dir === 1)
            this.sprite.draw('vuln-l', this.pos, this.drawAbility);//img = assets.p1stun_l;//document.getElementById("p1stun-l");
            //this.vulnLeft;//document.getElementById("p1stun-l");
        else img = this.sprite.draw('vuln-r', this.pos, this.drawAbility);//assets.p1stun_r;//document.getElementById("p1stun-r");

        imgW = 64;
        imgH = 64;
    }
    else if (this.flap === true)
    {
        // console.log('draw:flap!');
        
        //this.vulnRight;//document.getElementById("p1stun-l");
        // reset flap on client
        // this.flap = false;
        if (this.dir === 1) 
        {
            this.sprite.draw('flap-l', this.pos, this.drawAbility);
            //img = assets.p1l;//document.getElementById("p1l");
        }
        //img = this.flapLeft;//document.getElementById("p1l");
        else this.sprite.draw('flap-r', this.pos, this.drawAbility);//img = assets.p1r;//document.getElementById("p1r");
        //this.flapRight;//document.getElementById("p1r");

        imgW = 64;//40;
        imgH = 64;//40;
    }
    else if (this.landed === 1) // standing
    {
        //console.log('standing', this.landed, this.mp);
        if (this.dir === 1) this.sprite.draw('land-l', this.pos, this.drawAbility);//img = assets.p1stand_l;//document.getElementById("p1stand-l");
            //img = this.standLeft;// document.getElementById("p1stand-l");
        else img = this.sprite.draw('land-r', this.pos, this.drawAbility);//assets.p1stand_r;//document.getElementById("p1stand-r");
        //img = this.standRight;//document.getElementById("p1stand-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else if (this.landed === 2) // walking/skidding
    {
        if (this.dir === 1)
            img = this.sprite.draw('land-l', this.pos, this.drawAbility);//assets.p1skid_l;//document.getElementById("p1skid-l");
        else img = this.sprite.draw('land-r', this.pos, this.drawAbility);//assets.p1skid_r;//document.getElementById("p1skid-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else // gliding
    {
        if (this.dir === 1)
            img = this.sprite.draw('fly-l', this.pos, this.drawAbility);//assets.p2l;//document.getElementById("p2l");
            //img = ctx.putImageData(imgData,10,70);
            //img = this.glideLeft;
        else //img = this.glideRight;//
        this.sprite.draw('fly-r', this.pos, this.drawAbility);//img = assets.p2r;//document.getElementById("p2r");
        //else img = ctx.putImageData(imgData,10,70);

        imgW = 64;//40;
        imgH = 64;//40;
    }

    // draw flag?
    // console.log('this.hasFlag', this.hasFlag);
    if (this.hasFlag > 0)// && this.carryingFlag && this.carryingFlag.name)
    {
        // var roomCooldowns = this.instance.game.gamecore.getplayers.fromRoom(this.playerPort, 4);
        var flag = this.config._.find(this.config.clientCooldowns, {'heldBy':this.userid});
        // console.log('gotflag', flag, this.config.clientCooldowns);

        //console.log('taken at', this.flagTakenAt, 'time left', Math.floor(this.config.server_time - this.flagTakenAt));
        //*
        //var ct = Math.floor(this.config.server_time - this.flagTakenAt);
        //ct = 60 - ct;
        //console.log('carrying flag', this.carryingFlag.name);
        //console.log('flag.timer', flag.timer);
        if (flag && flag.timer === 0)
        {
            console.log('* player.draw: flag reset', this.hasFlag);
            // reset flag
            // for (var f = this.config.flagObjects.length - 1; f >= 0; f--)
            var roomFlags;
            // if (!this.instance)
                roomFlags = this.config.flagObjects;
            // else roomFlag = this.instance.game.gamecore.getplayers.fromRoom(this.playerPort, 3);
            for (var f = roomFlags.length - 1; f >= 0; f--)
            {
                if (roomFlags[f].name == "midFlag" && this.hasFlag === 1)
                    roomFlags[f].reset(false, this.game);
                else if (roomFlags[f].name == "redFlag" && this.hasFlag === 2)
                    roomFlags[f].reset(false, this.game);
                else if (roomFlags[f].name == "blueFlag" && this.hasFlag === 3)
                    roomFlags[f].reset(false, this.game);
            }
            //console.log('resetting flag', this.flagType);
            //console.log('flags', this.config.flagObjects);

            this.hasFlag = 0;
            // get out
            //return;
        }
        //*/
        var flagImg;
        //console.log('* this.hasFlag', this.hasFlag);
        switch(this.hasFlag)
        {
            case 1: // mid
                if (this.dir === 0)
                    flagImg = assets.flag_mid_r;//document.getElementById('flag-mid-r');
                else flagImg = assets.flag_mid_l;//document.getElementById('flag-mid-l');
            break;

            case 2: // red
                if (this.dir === 0)
                    flagImg = assets.flag_red_r;//document.getElementById('flag-red-r');
                else flagImg = assets.flag_red_l;//document.getElementById('flag-red-l');
            break;

            case 3: // blue
                if (this.dir === 0)
                    flagImg = assets.flag_blue_r;//document.getElementById('flag-blue-r');
                else flagImg = assets.flag_blue_l;//document.getElementById('flag-blue-l');
            break;
        }
        // draw flag
        //game.ctx.save();
        //console.log('flagImg', flagImg, this.dir);
        // if flag is undefined, it's been removed
        if (flagImg && flag)
        {
            this.config.ctx.drawImage(flagImg, (this.dir === 0) ? this.pos.x - ((this.size.hx+this.size.offset)/2) : this.pos.x + ((this.size.hx+this.size.offset)/2), this.pos.y - ((this.size.hx + this.size.offset)/2), 64, 64);
            // draw timer
            //*
            this.config.ctx.font = "18px Mirza";
            this.config.ctx.fillStyle = (this.hasFlag === 1) ? "#000" : "#fff";
            this.config.ctx.textAlign = 'center';
            //if (this.carryingFlag)
            if (flag)
            this.config.ctx.fillText(
                flag.timer,// + " (" + this.level + ") " + this.mana.toString(),// + this.config.fps.fixed(1),
                (this.dir === 0) ? this.pos.x - 5 : this.pos.x + (this.size.hx + this.size.offset) + 5,//.fixed(1),
                this.pos.y - 5//txtOffset
                //100
            );
        }
        else {
            //console.warn('attempting to draw flag when player "hasFlag" appears to be 0');
            this.hasFlag = 0;
        }
        //*/
        //game.ctx.restore();

    }

    //game.ctx.beginPath();
    //if (this.glideRight)
        //console.log(this.glideRight);
    //if(String(window.location).indexOf('debug') == -1 && this.visible===true)
        //if (this.glideRight)
            //this.config.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);//img.width, img.height);//, imgW, imgH);
        //else game.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);

        //game.ctx.putImageData(this.glideRight, this.pos.x, this.pos.y);//, imgW, imgH);

    if (this.bubble === true && this.drawAbility === 0)
        this.config.ctx.drawImage(assets.ability_bubble, this.pos.x - 8, this.pos.y - 8, 76, 76);
    if (this.isHit > 0)
    {
        this.config.ctx.drawImage(assets.animate_hit, this.pos.x - 8, this.pos.y - 8, 76, 76);
        if (this.isLocal && this.isHit === 1)
            document.getElementById('screen-splatter').style.display = "block";
        // only display for 10 frames
        if (this.isHit >= 30)
        {
            this.isHit = 0;
            if (this.isLocal)
                document.getElementById('screen-splatter').style.display = "none";
        }
        else this.isHit++;

        if (this.isLocal)
        {
        }
    }



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
