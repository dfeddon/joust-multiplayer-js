/*
var now = new Date();
var e = new Date();
e.setSeconds(e.getSeconds() + 15);
console.log('now ' + now.getSeconds());
console.log('then ' + e.getSeconds());
console.log('diff ' + (e.getTime() - now.getTime())/1000);
*/
function game_event(game_instance)
{
  console.log('game event constructor');

  //if (game_instance.server)
  this.shuffle = require('./node_modules/lodash/shuffle');

	///////////////////////////
  // constants
	///////////////////////////
	// types
  this.TYPE_CHEST = 1;
  //this.TYPE_REPEATABLE = 2;

  // status
  this.STATE_RUNNING = 1;
  this.STATE_PAUSED = 2;
  this.STATE_COMPLETE = 3;
  this.STATE_AVAILABLE = 4;
  this.STATE_STOPPED = 5;
  this.STATE_EVENT_READY = 6;
  this.STATE_EVENT_QUEUED = 7;

  // parameters
  this.game = game_instance;

  this.id = 'noid';
  this.running = false;
  this.state = this.STATE_AVAILABLE;
  //this.status = this.STATE_STOPPED;
  this.repeatable = true;

  this.rangeMin = 0;
  this.rangeMax = 0;

  this.triggeredAt = null;//= new Date();
  this.triggerOn = null;
  this.triggerer = null;

  this.dif = undefined;

  this.spawn = null;
  this.passive = null;
}

game_event.prototype.update = function()
{
  this.dif = Math.floor(this.game.server_time - this.triggerOn);
  //console.log('triggered in', dif, 'seconds', this.triggeredAt, this.triggerOn);// at', this.triggerOn);

  if (this.dif >= 0)
  {
    //console.log('TRIGGER EVENT!!!!', this.type);

    // prep data for the getEvent() fnc
    switch(this.type)
    {
      case this.TYPE_CHEST:

        //console.log('prep chest', this.game.chestSpawnPoints.length);

        // 1. ensure a new chest is acceptable (max number?)
        var ct = 0;
        var availChests = [];
        for (var i = 0; i < this.game.chestSpawnPoints.length; i++)
        {
          if (this.game.chestSpawnPoints[i].active === true)
            ct++;
          else availChests.push(this.game.chestSpawnPoints[i]);
        }
        //console.log('num active chests', ct);
        // no more than 3
        if (ct > 3) return false;
        //if (this.game.chests.length > 3) return false;
        // 2. randomaly select available chest spawn point (to avoid stacking)
        // rng
        this.spawn = this.shuffle(availChests)[0];
        // set active
        this.spawn.active = true;
        console.log('selected spawn', this.spawn);
        // 3. rng chest content
        this.passive = this.shuffle(this.game.passives)[0];
        console.log('selected passive', this.passive);
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
  this.triggeredAt = (this.game.server_time) ? Math.floor(this.game.server_time) : 0;
  this.triggerOn = Math.floor(this.triggeredAt) + rnd;

  //console.log('new event triggered at', this.triggerOn);
};

game_event.prototype.doStart = function()
{
  this.running = true;
  this.triggeredAt = new Date();
  this.status = this.STATE_COMPLETE;
};

game_event.prototype.doStop = function()
{
  this.running = false;
  this.state = this.STATE_STOPPED;
};

if('undefined' != typeof global)
    module.exports = game_event;
