/*jslint
    this
*/

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

function game_event(getplayers, config)//game_instance)
{
  console.log('game event constructor');

  this.getplayers = getplayers;
  this.config = config;

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
  this.passive = null;

  this.flag = null;
}

game_event.prototype.update = function()
{
  var _this = this;
  //console.log('event.update');
  this.dif = Math.floor(this.config.server_time - this.triggerOn);
  //console.log(this.dif);
  //console.log('triggered in', dif, 'seconds', this.triggeredAt, this.triggerOn);// at', this.triggerOn);

  if (this.dif >= 1)
  {
    //console.log('TRIGGER EVENT!!!!', this.type);

    // prep data for the getEvent() fnc
    switch(this.type)
    {
      case this.TYPE_FLAG_CARRIED_COOLDOWN:
        console.log('cooldown complete!', this.flag);//flag_carried_cooldown_event_update');
        var mp = this.flag.heldBy;
        // server reset vars
        this.flag.isHeld = false;
        this.flag.isActive = true;
        this.flag.heldBy = null;
        // reset players vars (flag.heldBy)
        console.log('mp=',mp);
        var player = this.config._.find(_this.getplayers.allplayers, {"mp":mp});
        console.log('player', player.mp);
        player.hasFlag = 0;

        // change state to complete
        this.state = this.STATE_STOPPED;
        // reset flag
      break;

      case this.TYPE_FLAG_SLOTTED_COOLDOWN:
        console.log('evt update slotted cooldown complete');
        //this.flag.isHeld = false;
        var mp = this.flag.heldBy;
        var player = this.config._.find(_this.getplayers.allplayers, {"mp":mp});
        
        this.flag.isActive = true;
        this.flag.heldBy = null;
        this.flag.onCooldown = false;
        this.flag.targetSlot = this.flag.getTargetSlot(player.team, this.flag.sourceSlot);
        //console.log('this.flag', this.flag);

      break;

      case this.TYPE_CHEST:

        //console.log('prep chest', this.config.chestSpawnPoints.length);

        // 1. ensure a new chest is acceptable (max number?)
        var ct = 0;
        var availChests = [];
        for (var i = 0; i < this.config.chestSpawnPoints.length; i++)
        {
          if (this.config.chestSpawnPoints[i].active === true)
            ct++;
          else availChests.push(this.config.chestSpawnPoints[i]);
        }
        //console.log('num active chests', ct);
        // no more than 3
        if (ct > 3) return false;
        //if (this.config.chests.length > 3) return false;
        // 2. randomaly select available chest spawn point (to avoid stacking)
        // rng
        this.spawn = this.shuffle(availChests)[0];
        // set active
        this.spawn.active = true;
        //console.log('selected spawn', this.spawn);
        // 3. rng chest content
        this.passive = this.shuffle(this.config.passives)[0];
        //console.log('selected passive', this.passive);
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
    //console.log('timer', this.timer);
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
};

game_event.prototype.doStop = function()
{
  console.log('event.doStop', this.type);
  this.running = false;
  this.state = this.STATE_STOPPED;
};

if('undefined' != typeof global)
    module.exports = game_event;
