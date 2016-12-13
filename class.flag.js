/*jslint
    this
*/

"use strict";

var game_toast = require('./class.toast');
//var config = require('./class.globals');
//var getplayers = require('./class.getplayers');
var _ = require('lodash');
var assets = require('./singleton.assets');

function game_flag(data, context, getplayers, config)
{
  //console.log('flag data', data);

  this._ = {};

  this.getplayers = getplayers;
  this.config = config;

  /*if (context)
  {
    this._.forEach = _.forEach;
    this._.find = _.find;
    //this._.cloneDeep = _.cloneDeep;
  }
  else {
    this._.forEach = require('./node_modules/lodash/forEach');
    this._.find = require('./node_modules/lodash/find');
    //var stopwatch = require('./class.stopwatch');
    //this._.cloneDeep = require('./node_modules/lodash/cloneDeep');
  }*/
  this._.forEach = require('./node_modules/lodash/forEach');
  this._.find = require('./node_modules/lodash/find');

  this.id = "flg" + data.id;
  this.name = data.name;

  this.x = parseInt(data.x);
  this.y = parseInt(data.y);
  this.width = 64;
  this.height = 64;

  this.type = (data.type) ? data.type : "flag";
  //this.source = 1; // 1 = midFlag, 2 = redBase, 3 = blueBase
  this.visible = true;
  this.isHeld = false;
  this.isPlanted = true;
  this.isActive = (this.type == "flag") ? true : false;
  this.validHolder = undefined;
  this.heldBy = null;
  //this.targetSlot = null;
  this.timer = '';
  this.onCooldown = false;
  //this.onCooldownTimer = null;
  //this.onCooldownLength = 15;
  //this.stopwatch = new stopwatch();
  // set flags target slots
  switch(data.name)
  {
    case "midFlag":
      this.sourceSlot = "midSlot";
    break;

    case "redFlag":
      this.sourceSlot = "slotRed";
    break;

    case "blueFlag":
      this.sourceSlot = "slotBlue";
    break;
  }

  this.ctx = context;

  if (context)
  {
    switch(data.name)
    {
      case "midFlag":
        this.image = assets.flag_mid_r;
        break;

      case "redFlag":
        this.image = assets.flag_red_l;
        break;

      case "blueFlag":
        this.image = assets.flag_blue_r;
      break;

      case "slot1":
        this.image = assets.flag_slot_1;
      break;

      case "slot2":
        this.image = assets.flag_slot_2;
      break;

      case "slot3":
        this.image = assets.flag_slot_3;
      break;

      case "slot4":
        this.image = assets.flag_slot_4;
      break;

      case "slot5":
        this.image = assets.flag_slot_5;
      break;

      case "slot6":
        this.image = assets.flag_slot_6;
      break;

      case "slot7":
        this.image = assets.flag_slot_7;
      break;

      case "slot8":
        this.image = assets.flag_slot_8;
      break;

      case "slot9":
        this.image = assets.flag_slot_9;
      break;

      case "slot10":
        this.image = assets.flag_slot_10;
      break;

      case "slotBlue":
        this.image = assets.flag_slot_blue;
      break;

      case "slotRed":
        this.image = assets.flag_slot_red;
      break;

      case "midSlot":
        this.image = assets.flag_slot_mid;
        break;
    }
  }

  //console.log('construct', data.type, this);
}

game_flag.prototype.targetSlot = null;/*function(slot)
{
  this.targetSlot = slot;
};*/

game_flag.prototype.getTargetSlot = function(team, sourceSlot)
{
  console.log('=== getTargetSlot', team, sourceSlot, '===');

  team = parseInt(team);

  var targetSlot = null;

  // set target slot
  switch(sourceSlot)
  {
      case "midSlot":
          if (team === 1) targetSlot = "slot6";
          else targetSlot = "slot5";
      break;

      case "slotRed":
          targetSlot = "slot1";
      break;

      case "slotBlue":
          targetSlot = "slot10";
      break;

      case "slot1":
          if (team === 1) targetSlot = "slotRed";
          else targetSlot = "slot2";
      break;

      case "slot2":
          if (this.name == "redFlag")
          {
              if (team === 1) targetSlot = "slot1";
              else targetSlot = "slot3";
          }
          else // mid flag
          {
              if (team === 1) targetSlot = "slot3";
              else targetSlot = "slot1";
          }
      break;

      case "slot3":
          if (this.name == "redFlag")
          {
              if (team === 1) targetSlot = "slot2";
              else targetSlot = "slot4";
          }
          else // mid flag
          {
              if (team === 1) targetSlot = "slot4";
              else targetSlot = "slot2";
          }
      break;

      case "slot4":
          if (this.name == "redFlag")
          {
              if (team === 1) targetSlot = "slot3";
              else targetSlot = "slot5";
          }
          else // mid flag
          {
              if (team === 1) targetSlot = "slot5";
              else targetSlot = "slot3";
          }
      break;

      case "slot5":
          if (this.name == "redFlag")
          {
              if (team === 1) targetSlot = "slot4";
              else targetSlot = "slot6";
          }
          else // mid flag
          {
              if (team === 1) targetSlot = "midSlot";
              else targetSlot = "slot4";
          }
      break;

      // blue territory

      case "slot6":
          if (this.name == "blueFlag")
          {
              if (team === 2) targetSlot = "slot7";
              else targetSlot = "slot5";
          }
          else // mid flag
          {
              if (team === 2) targetSlot = "midSlot";
              else targetSlot = "slot7";
          }
      break;

      case "slot7":
          if (this.name == "blueFlag")
          {
              if (team === 2) targetSlot = "slot8";
              else targetSlot = "slot6";
          }
          else // mid flag
          {
              if (team === 2) targetSlot = "slot6";
              else targetSlot = "slot8";
          }
      break;

      case "slot8":
          if (this.name == "blueFlag")
          {
              if (team === 2) targetSlot = "slot9";
              else targetSlot = "slot7";
          }
          else // mid flag
          {
              if (team === 2) targetSlot = "slot7";
              else targetSlot = "slot9";
          }
      break;

      case "slot9":
          if (this.name == "blueFlag")
          {
              if (team === 2) targetSlot = "slot10";
              else targetSlot = "slot8";
          }
          else // mid flag
          {
              if (team === 2) targetSlot = "slot8";
              else targetSlot = "slot10";
          }
      break;

      case "slot10":
          if (this.name == "blueFlag")
          {
              if (team === 2) targetSlot = "slotBlue";
              else targetSlot = "slot9";
          }
          else // mid flag
          {
              if (team === 2) targetSlot = "slot9";
              else targetSlot = "slotBlue";
          }
      break;
  }
  return targetSlot;
};

game_flag.prototype.setter = function(obj)
{
  //console.log('flag.setter');
  //var _this = this;
  //console.log('obj', obj);
  this.id = "flg" + obj.id;
  this.name = obj.name;
  //this.type = obj.type;
  this.x = parseInt(obj.x);
  this.y = parseInt(obj.y);
  this.width = parseInt(obj.width);
  this.height = parseInt(obj.height);

  // if (this.ctx)
  //   this.forEach = _.forEach;

  /*this._.forEach(obj, function(value, key)
  {
    console.log('setter', key, value, _this.key);
    if (key == "id")
    {
      _this.id = "flg" + value.toString();
    }
    else this.key = value;
    console.log(this.key, value);
  });*/
  //console.log('this', this);
  //console.log('ddd', this.ctx, this.type);
  if (this.type == "slot" && this.ctx)
  {
    //this.draw();
    this.image = assets.flag_slot;
  }
  else if (this.ctx && this.type == "flag")
  {
    if (this.name == "midFlag")
      this.image = assets.flag_mid_r;
    else if (this.name == "redFlag")
      this.image = assets.flag_red_l;
    else if (this.name == "blueFlag")
      this.image = assets.flag_blue_r;
  }

  console.log('flag image', this.image);
};

game_flag.prototype.doTake = function(player)
{
  console.log('===flag.doTake', this.name, 'p', player.mp, 'hasFlag', player.hasFlag, 'isheld', this.isHeld, 'team', player.team, '===');//, this.name, 'by', player.mp, 'isHeld', this.isHeld, 'hasFlag', player.hasFlag, 'isActive', this.isActive, 'onCooldown', this.onCooldown);
  if (this.isActive === false || this.onCooldown === true) return;

  var _this = this;

  if (this.isHeld === false)
    this.isHeld = true;
  else return;

  if (player.hasFlag !== 0)
  {
    console.warn('* player has flag already');
    this.isHeld = false;
    return;
  }

  if (player.team === 1 && this.name == "redFlag")
  {
    console.log("red team cannot get red flag");
    this.isHeld = false;
    return;
  }
  else if (player.team === 2 && this.name == "blueFlag")
  {
    console.log("blue team cannot take blue flag");
    this.isHeld = false;
    return;
  }

  // default is midflag
  var flagType = 1; // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
  if (this.name == "redFlag")
    flagType = 2;
  else if (this.name == "blueFlag")
    flagType = 3;
  else if (this.name != "midFlag")
  {
    console.warn("* not a valid flag type to take...");
    this.isHeld = false;
    return;
  }

  // update flag target
  console.log('* flag.sourceSlot', this.sourceSlot);
  this.targetSlot = this.getTargetSlot(player.team, this.sourceSlot);
  console.log('flag.targetSlot', this.targetSlot);

  // update clientCooldown source and target
  var cd = this.config._.find(_this.config.clientCooldowns, {"name":this.name});
  cd.heldBy = player.mp;
  cd.src = this.sourceSlot;
  cd.target = this.targetSlot;

  // set flag states
  this.visible = false;
  this.isActive = false;
  this.isHeld = true;
  this.heldBy = player.mp;

  // set player states
  player.hasFlag = flagType

  if (player.bubble) player.bubble = false;

  if (!this.config.server)
  {
    // data
    var data = {};
    data.action = "takeFlag";
    data.targetSlot = cd.target;
    data.flagName = this.name;
    data.playerName = player.playerName;
    data.playerTeam = player.team;

    // show toast
    new game_toast().show(data);
  }
  else
  {
      console.log('* socket emit', this.targetSlot);
      // inform socket
      for (var l = 0; l < this.getplayers.allplayers.length; l++)
      {
          // dispatch flagremove socket event
          if (this.getplayers.allplayers[l].instance)// && this.getplayers.allplayers[l].mp != player.mp)
          {
              console.log('flag sent', player.mp, this.name);
              //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
              this.getplayers.allplayers[l].instance.send('f.r.'+player.mp+"|"+this.name+"|"+player.flagTakenAt);//_this.laststate);
          }
      }
      // update clientCooldowns objs
      var cd = this.config._.find(_this.config.clientCooldowns, {"name":_this.name});
      //console.log(this.game.clientCooldowns);
      cd.heldBy = player.mp;
      cd.src = this.sourceSlot;
      cd.target = this.targetSlot;
      //console.log('cooldown obj');

      // start cooldown
      // get event by id "fc" (flag carried)
      var evt = this.config._.find(_this.config.events, {'id':"fc"});
      evt.flag = this;
      //console.log('got evt', evt);
      evt.doStart();
      // call event.doStart() to begin 60 second cooldown
  }

  // notify player
  //player.takeFlag(this, flagType);
  //player.hasFlag = flagType;
};

game_flag.prototype.typeToName = function(type)
{
  switch(type)
  {
    case 0: return null;
    case 1: return "midFlag";
    case 2: return "redFlag";
    case 3: return "blueFlag";
  }
};

game_flag.prototype.slotFlag = function(player)
{
  console.log("== flag.slotFlag", player.mp, this.name, player.hasFlag, "==");

  var _this = this;
  // TODO: Resolve issue with targetSlot and sourceSlot values, both
  // of which exist in flag class (client) and clientCooldowns (server)
  // console.log('===flag.slotFlag', this.name, player.mp, '===');//, this.name, player.mp, this.typeToName(player.hasFlag));//, player.carryingFlag.targetSlot);
  //console.log('cooldowns', this.config.clientCooldowns);

  var clientFlag = this._.find(_this.config.clientCooldowns, {'name':_this.typeToName(player.hasFlag)});
  console.log('* clientFlag', clientFlag, this.name);
  if (clientFlag === undefined) return;

  // console.log('* slot.name', this.name, 'clientCooldown.target', clientFlag.target);
  if (this.name == clientFlag.target)//player.carryingFlag.targetSlot)
  {
    console.log('* found slot flag!!!!', this.name);
    /*player.carryingFlag.x = this.x - (this.width/2);
    player.carryingFlag.y = this.y - (this.height/2);*/
    // revise flag targetSlot & sourceSlot
    // also start flag cooldown
    var flg = this.config._.find(_this.config.flagObjects, {"name":clientFlag.name});
    console.log('* flag', flg);

    player.hasFlag = 0;

    flg.isActive = false;
    flg.onCooldown = true;
    flg.isHeld = false;
    //this.sourceSlot = this.name;
    flg.sourceSlot = this.name;
    flg.targetSlot = this.getTargetSlot(player.team, this.sourceSlot);
    // stop cooldown (clientFlag)

    // stop flag-carried event (server-side only)
    if (this.config.server)
    {
      // stop flag-carried event
      var evt = this.config._.find(_this.config.events, {"id":"fc"});
      //console.log(this.config.events);
      //console.log('*evt', evt.type, evt.timer);
      evt.doStop();

      // ... and start flag slotted cooldown event
      var cd = this.config._.find(_this.config.events, {"type":evt.TYPE_FLAG_SLOTTED_COOLDOWN});
      //console.log('*evt cd', cd);
      var flg = this.config._.find(_this.config.flagObjects, {"name":clientFlag.name});
      cd.flag = flg;//clientFlag; // TODO: <- should be flag class NOT clientCooldown flag
      cd.doStart();

    }
    //var evt = this.config._.find(this.config.clientCooldowns, {'name':this.name});
    //console.log('slot evt', evt, this.config.clientCooldowns);

    //player.removeFlag(true, this, this.config._.find(this.config.flagObjects, {'name':clientFlag.name}));
    //var slot = this.config._.find(this.config.flagObjects, {'name':clientFlag.name});

    flg.x = this.x - (this.width/2);
    flg.y = this.y - (this.height/2);
    //flg.sourceSlot = slot.name;
    console.log('* sourceSlot', flg.sourceSlot);
    //this.isActive = false;
    // note: targetSlot will be defined when flag is taken!

    console.log('* socket emit', this);
    // inform socket
    for (var l = 0; l < this.getplayers.allplayers.length; l++)
    {
        if (this.getplayers.allplayers[l].instance)// && this.getplayers.allplayers[l].mp != player.mp)
        {
            //console.log('flag sent', slot);
            //player.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
            this.getplayers.allplayers[l].instance.send('f.a.'+player.mp+"|"+this.name+"|"+flg.name);//_player.laststate);
        }
    }

    // revise territory
    /*
    if (this.config.server)
    {
        console.log('emit territory change data');
    }
    */
    if (!this.config.server)
    {
      console.log('* calling updateTerritory');
      
      this.config.updateTerritory();
      // start flag-slotted cooldown event
    }

    var flagObj = this.config._.find(_this.config.flagObjects, {"name":clientFlag.name});//this.name});
    flagObj.reset(true);//, this.game.server_time);
  }
};

game_flag.prototype.reset = function(success, game)//, server_time)
{
  console.log('=== flag.reset', success, this.name, '===');
  var _this = this;
  var msg = undefined;

  if (this.isHeld && success === false)
  {
    // Carrier failed, build toast msg
    // flag was dropped because...
    // * player stunned (playerSource.vuln), 
    // * flag timed-out (this.timer), 
    // * player killed (playerSource.killedBy).

    msg = {};

    // carrier
    var playerSource = this.config._.find(_this.getplayers.allplayers, {'mp':_this.heldBy});
    console.log('playerSource', playerSource);
    
    msg.playerName = playerSource.playerName;

    // opponent
    var opponent;
    if (playerSource.killedBy)
    {
      opponent = this.config._.find(_this.getplayers.allplayers, {'mp': playerSource.killedBy});
      opponentName = opponent.playerName;
    }
    
    // action
    if (playerSource.vuln)
      msg.action = "carrierStunned";
    else if (playerSource.killedBy)
      msg.action = "carrierDied";
    else if (playerSource.dying)
      msg.action = "carrierSuicide";
    else if (this.timer == '' || this.timer <= 0)
      msg.action = "flagTimeout";

    msg.playerTeam = playerSource.team;
    msg.sourceSlot = this.sourceSlot;
    msg.targetSlot = this.targetSlot;
    msg.flagName = this.name;
  }

  if (msg != undefined)
    msg = JSON.stringify(msg);

  this.isHeld = false;
  this.visible = true;
  if (success)
  {
    this.isActive = false; // flag on cooldown
    //this.onCooldownLength = server_time;
    this.onCooldown = true;
    // start timer
    //this.onCooldownTimer = setTimeout(this.timeoutCooldown.bind(this), 1000);
    //this.stopwatch.start();
  }
  else
  {
    this.isActive = true;
    // clear flag-carried (fc) event
    console.log('*', this.config.events);

    if (this.config.server)
    {
      var fcEvent = this._.find(_this.config.events, {"type":2});
      fcEvent.doStop();

      _.forEach(_this.getplayers.allplayers, function(ply)
      {
        // TODO: omit self if self was failed carrier
        if (ply.instance)
        {
          ply.instance.send('f.c.' + _this.name + "|" + _this.visible + "|" + msg);
        }
      });
    }
  }
  console.log('flag slotted and reset', this);
};

game_flag.prototype.timeoutCooldown = function()
{
  //this.onCooldownLength -= 1;
  //if (this.onCooldownLength === 0)
  /*if (this.stopwatch.getElapsedTime() == this.onCooldownLength)
  {
    //clearTimeout(this.onCooldownTimer); // clear timeout
    this.stopwatch.stop();
    //this.onCooldownTimer = null;
    this.onCooldownLength = 15; // reset counter
    this.onCooldown = false; // turn off cooldown
    this.isActive = true; // reactivate flag
  }
  else
  {*/
    //this.onCooldownTimer = setTimeout(this.timeoutCooldown.bind(this), 1000);
    // this.stopwatch.start();
  //}
};

game_flag.prototype.cooldownComplete = function()
{
  console.log('===flag.cooldownComplete===');
  //this.stopwatch.reset();
  //this.onCooldownTimer = null;
  this.onCooldownLength = 15; // reset counter
  this.onCooldown = false; // turn off cooldown
  this.isActive = true; // reactivate flag
};

game_flag.prototype.setCtx = function(ctx)
{
  this.ctx = ctx;
  if (this.type == "slot" && this.ctx)
  {
    //this.draw();
    switch(this.name)
    {
      case "slot1":
        this.image = assets.flag_slot_1;
      break;

      case "slot2":
        this.image = assets.flag_slot_2;
      break;

      case "slot3":
        this.image = assets.flag_slot_3;
      break;

      case "slot4":
        this.image = assets.flag_slot_4;
      break;

      case "slot5":
        this.image = assets.flag_slot_5;
      break;

      case "slot6":
        this.image = assets.flag_slot_6;
      break;

      case "slot7":
        this.image = assets.flag_slot_7;
      break;

      case "slot8":
        this.image = assets.flag_slot_8;
      break;

      case "slot9":
        this.image = assets.flag_slot_9;
      break;

      case "slot10":
        this.image = assets.flag_slot_10;
      break;

    }
    //this.image = assets.flag_slot;
  }
  if (this.ctx && this.type == "flag")
  {
    if (name == "midFlag")
      this.image = assets.flag_mid_r;
    else if (name == "redFlag")
      this.image = assets.flag_red_l;
    else if (name == "blueFlag")
      this.image = assets.flag_blue_r;
  }

  console.log('setter', this);
};

game_flag.prototype.draw = function()
{
  //console.log('dodraw', this.image, this.x, this.y);
  if (this.image && this.visible)
  this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

  if (this.onCooldown)
  {
    //console.log('cooldown', this.onCooldownAt);
    //if (Math.floor(this.onCooldownLength - this.stopwatch.getElapsedSeconds()) <= 0)
    /*if (this.timer === 0)
    {
      //this.cooldownComplete();
    }
    else if (this.timer > 0)
    {*/
    // draw timer
    if (this.timer > 0)
    {
      this.ctx.font = "18px Mirza";
      this.ctx.fillStyle = (this.name == "midFlag") ? "#000" : "#fff";
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
          //this.onCooldownLength -
          this.timer,//Math.floor(this.onCooldownLength - this.stopwatch.getElapsedSeconds()),//this.onCooldownLength,
          this.x + 25,
          this.y + 30//txtOffset
          //100
      );
    }
  }
};

if('undefined' != typeof global)
  module.exports = game_flag;
