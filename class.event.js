'use strict';

/*
var now = new Date();
var e = new Date();
e.setSeconds(e.getSeconds() + 15);
console.log('now ' + now.getSeconds());
console.log('then ' + e.getSeconds());
console.log('diff ' + (e.getTime() - now.getTime())/1000);
*/
//var config = require('./class.globals');
//var getplayers = require('./class.getplayers');
var getUid      = require('get-uid');
var game_buffs  = require('./class.buffs');

var MAX_CHESTS  = 6;

function game_event(getplayers, config)//game_instance)
{
  // console.log('game event constructor');
  this.uid = getUid();
  this.getplayers = getplayers;
  this.config = config;
  // this.game_buffs = new game_buffs();

  //if (game_instance.server)
  this.shuffle = require('./node_modules/lodash/shuffle');

	///////////////////////////
  // constants
	///////////////////////////
	// types
  this.TYPE_CHEST = 1;
  this.TYPE_FLAG_CARRIED_COOLDOWN = 2;
  this.TYPE_FLAG_SLOTTED_COOLDOWN = 3;
  //this.TYPE_REPEATABLE = 2;

  // cooldown lengths
  this.COOLDOWN_FLAG_CARRIED = 60;
  this.COOLDOWN_FLAG_SLOTTED = 15;

  // status
  this.STATE_RUNNING = 1;
  this.STATE_PAUSED = 2;
  this.STATE_COMPLETE = 3;
  this.STATE_AVAILABLE = 4;
  this.STATE_STOPPED = 5;
  this.STATE_EVENT_READY = 6;
  this.STATE_EVENT_QUEUED = 7;

  // parameters
  //this.game = game_instance;

  this.id = 'noid';
  this.type = NaN;
  this.running = false;
  this.state = this.STATE_AVAILABLE;
  //this.status = this.STATE_STOPPED;
  this.repeatable = true;
  this.timer = NaN;
  this.lastTimer = NaN;

  this.rangeMin = 0;
  this.rangeMax = 0;

  this.triggeredAt = null;//= new Date();
  this.triggerOn = null;
  this.triggerer = null;

  this.dif = undefined;

  this.spawn = null;
  this.chestSpawnPoints = []; // chest event (list of avialable spawn points)
  this.passive = null;

  this.flag = null;

  this.consumableData = {};

}

game_event.prototype.update = function(port)
{
  // console.log('== event.update() ==');
  //var _this = this;
  //console.log('event.update');
  this.dif = ~~(this.config.server_time - this.triggerOn);
  //console.log(this.dif);
  //console.log('triggered in', dif, 'seconds', this.triggeredAt, this.triggerOn);// at', this.triggerOn);

  if (this.dif >= 1)
  {
    // console.log('* new event triggered!', this.type);

    // prep data for the getEvent() fnc
    switch(this.type)
    {
      case this.TYPE_FLAG_CARRIED_COOLDOWN:
        console.log('* cooldown complete!', this.flag.name);//flag_carried_cooldown_event_update');
        var userid = this.flag.heldBy;
        // server reset vars
        this.flag.isHeld = false;
        this.flag.isActive = true;
        this.flag.heldBy = null;
        // reset players vars (flag.heldBy)
        // console.log('getplayers', this.config.getplayers);
        var room = this.getplayers.fromRoomByUserId(userid);
        var player;
        for (var i = 0; i < room.length; i++)
        {
          // console.log('**', room[i]);
          if (room[i].userid == userid)
          {
            console.log("* found player", room[i].instance.userid);
            player = room[i];
            break;
          }
        }
        // var player = this.config._.filter(room, ["instance.userid", userid]);
        // console.log('player', player.instance.userid);
        player.hasFlag = 0;

        // change state to complete
        this.state = this.STATE_STOPPED;
        // reset flag
      break;

      case this.TYPE_FLAG_SLOTTED_COOLDOWN:
        console.log('evt update slotted cooldown complete');
        this.flag.isHeld = false;
        // var userid = this.flag.heldBy;
        // var player = this.getplayers.getPlayerByUserId(userid);
        // console.log("*", player.playerName, 'slotted flag!');
        
        // var room = this.getplayers.fromRoom(roomName);
        // var player = this.config._.find(room, {"userid":userid});
        
        this.flag.isActive = true;
        this.flag.heldBy = null;
        this.flag.onCooldown = false;
        // this.flag.targetSlot = this.flag.getTargetSlot(player.team, this.flag.sourceSlot);
        //console.log('this.flag', this.flag);

      break;

      case this.TYPE_CHEST:

        /*var room, chest;
        var allrooms = Object.keys(this.getplayers.fromAllRooms());
        var chestsArray = [];
        for (var h = allrooms.length - 1; h >= 0; h--)
        {
            // first, ensure room total is less than maximum chests
            // if total reached, continue to next room (return false to cancel?)
            room = this.getplayers.fromRoom(allrooms[h], 2); // <-- 2 denotes object type

            for (var p = room.length - 1; p >= 0; p--)
            {
              // ensure new chest location isn't already occupied
              chest = room[p];
            }
        }*/

        // console.log('* prep chest', this.chestSpawnPoints.length);

        // 1. ensure a new chest is acceptable (max number?)
        var ct = 0;
        var availChests = [];
        // iterate through all available chest spawn locations
        // comparing locations to locations of existing chests
        // add new chest to first vacant location
        for (i = 0; i < this.chestSpawnPoints.length; i++)
        {
          if (this.chestSpawnPoints[i].active === true)
            ct++;
          else availChests.push(this.chestSpawnPoints[i]);
        }
        // console.log('* num active chests', ct, 'of', MAX_CHESTS);// * this.getplayers.totalRooms()));
        // no more than n
        if (ct >= MAX_CHESTS)// * this.getplayers.totalRooms()))
        {
          // console.log('* max consumables reached on port', port);
          
          // resart rnd timer
          this.setRandomTriggerTime(5, 15);
          // cancel event (for this cycle)
          return false;
        }
        //if (this.config.chests.length > 3) return false;
        // 2. randomaly select available chest spawn point (to avoid stacking)
        this.consumable = this.getplayers.fromRoomNextActiveConsumable(port);
        // console.log('* got consumable from next active', this.consumable, 'on port', port);
        
        // set ref to active
        this.consumable.active = true;
        // console.log('this.consumable', this.consumable);
        // rng
        // console.log('* available spawn points...', availChests.length);
        this.spawn = this.shuffle(availChests)[0];
        // set spawnpoint as active
        this.spawn.active = true;
        //console.log('selected spawn', this.spawn);
        // 3. rng chest content
        // this.passive = this.shuffle(this.config.passives)[0];
        this.consumableData.c = ~~((Math.random() * 3) + 1);

        // get value based on category
        switch(this.consumableData.c)
        {
          case 1: this.consumableData.v = this.consumable.gamebuffs.getRngBuff(); break;
          case 2: this.consumableData.v = this.consumable.getHealthModifier(); break;
          case 3: this.consumableData.v = this.consumable.getFocusModifier(); break;
        }
        //console.log('selected passive', this.passive);
        this.consumableData.t = this.consumable.gamebuffs.getRngBuff();//2; // event type consumable
        this.consumableData.i = this.consumable.id;
        this.consumableData.x = this.spawn.x;
        this.consumableData.y = this.spawn.y;

        console.log("* evt.consumableData ready!", this.consumableData, "on port", port);
        
        // update consumable reference (stored in getplayers)
        this.consumable = this.consumable.addData(this.consumableData);
        // 4. place it
        // 5. finalize prep for getEvent() (conform event data for socket dispatch)

        break;
    }

    // repeating? otherwise stop
    if (this.repeatable === true)
      this.setRandomTriggerTime(5, 15);
    else this.state = this.STATE_STOPPED;

    return true;
  }
  else if (this.type === this.TYPE_FLAG_CARRIED_COOLDOWN || this.type === this.TYPE_FLAG_SLOTTED_COOLDOWN)
  {
    this.timer = Math.abs(Math.floor(this.config.server_time - this.triggerOn));
    console.log('* evt timer', this.timer);
    if (this.timer == this.lastTimer) return false;
    else
    {
      this.lastTimer = this.timer;
      return true;
    }
  }
  else return false;
};

game_event.prototype.setRandomTriggerTime = function(min, max)
{
  // store min max
  this.rangeMin = min;
  this.rangeMax = max;

  // get random number between min and max
  var rnd = Math.floor(Math.random() * (max - min + 1)) + min;

  // set start and end times (based on server_time)
  this.triggeredAt = (this.config.server_time) ? Math.floor(this.config.server_time) : 0;
  this.triggerOn = Math.floor(this.triggeredAt) + rnd;

  //console.log('new event triggered at', this.triggerOn);
};

game_event.prototype.setCooldownTime = function()
{
  console.log('event.setCooldownTime', this.type);

  // set start and end times (based on server_time)
  var cd;
  if (this.type === this.TYPE_FLAG_CARRIED_COOLDOWN)
    cd = this.COOLDOWN_FLAG_CARRIED;
  else if (this.type === this.TYPE_FLAG_SLOTTED_COOLDOWN)
    cd = this.COOLDOWN_FLAG_SLOTTED;
  this.triggeredAt = (this.config.server_time) ? Math.floor(this.config.server_time) : 0;
  this.triggerOn = Math.floor(this.triggeredAt) + cd;
  console.log('triggeredAt', this.triggeredAt, 'triggerOn', this.triggerOn, cd);
};

game_event.prototype.doStart = function()
{
  console.log('event.doStart', this.type);

  switch(this.type)
  {
    case this.TYPE_FLAG_CARRIED_COOLDOWN:
      this.setCooldownTime();
    break;

    case this.TYPE_FLAG_SLOTTED_COOLDOWN:
      this.setCooldownTime();
  }
  this.running = true;
  //this.triggeredAt = new Date();
  this.state = this.STATE_RUNNING;//COMPLETE;
  console.log('event started', this.type, this.state, this.uid);
};

game_event.prototype.doStop = function()
{
  console.log('event.doStop', this.type);
  this.running = false;
  this.state = this.STATE_STOPPED;
};

if('undefined' != typeof global)
    module.exports = game_event;
