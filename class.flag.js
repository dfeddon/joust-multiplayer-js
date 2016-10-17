/*jslint
    this
*/
"use strict"

function game_flag(data, context)
{
  //console.log('flag data', data);

  this._ = {};

  if (context)
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
  }

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
        this.image = document.getElementById("flag-mid-r");
        break;

      case "redFlag":
        this.image = document.getElementById("flag-red-l");
        break;

      case "blueFlag":
        this.image = document.getElementById("flag-blue-r");
      break;

      case "slot1":
        this.image = document.getElementById("flag-slot-1");
      break;

      case "slot2":
        this.image = document.getElementById("flag-slot-2");
      break;

      case "slot3":
        this.image = document.getElementById("flag-slot-3");
      break;

      case "slot4":
        this.image = document.getElementById("flag-slot-4");
      break;

      case "slot5":
        this.image = document.getElementById("flag-slot-5");
      break;

      case "slot6":
        this.image = document.getElementById("flag-slot-6");
      break;

      case "slot7":
        this.image = document.getElementById("flag-slot-7");
      break;

      case "slot8":
        this.image = document.getElementById("flag-slot-8");
      break;

      case "slot9":
        this.image = document.getElementById("flag-slot-9");
      break;

      case "slot10":
        this.image = document.getElementById("flag-slot-10");
      break;

      case "slotBlue":
        this.image = document.getElementById("flag-slot-blue");
      break;

      case "slotRed":
        this.image = document.getElementById("flag-slot-red");
      break;

      case "midSlot":
        this.image = document.getElementById("flag-slot-mid");
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
    this.image = document.getElementById("flag-slot");
  }
  else if (this.ctx && this.type == "flag")
  {
    if (this.name == "midFlag")
      this.image = document.getElementById("flag-mid-r");
    else if (this.name == "redFlag")
      this.image = document.getElementById("flag-red-l");
    else if (this.name == "blueFlag")
      this.image = document.getElementById("flag-blue-r");
  }

  console.log('flag image', this.image);
};

game_flag.prototype.doTake = function(player)
{
  console.log('===flag.doTake', this.name, 'p', player.mp, player.hasFlag, this.isHeld, '===');//, this.name, 'by', player.mp, 'isHeld', this.isHeld, 'hasFlag', player.hasFlag, 'isActive', this.isActive, 'onCooldown', this.onCooldown);
  if (this.isActive === false || this.onCooldown === true) return;

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
    this.isHeld = false;
    return;
  }
  else if (player.team === 2 && this.name == "blueFlag")
  {
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
  var cd = player.game._.find(player.game.clientCooldowns, {"name":this.name});
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

  if (!player.game.server)
  {
      // show toast
      new game_toast().show();
  }
  else
  {
      console.log('* socket emit', this.targetSlot);
      // inform socket
      for (var l = 0; l < player.game.allplayers.length; l++)
      {
          // dispatch flagremove socket event
          if (player.game.allplayers[l].instance && player.game.allplayers[l].mp != player.mp)
          {
              //console.log('flag sent', flag.name);
              //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
              player.game.allplayers[l].instance.send('f.r.'+player.mp+"|"+this.name+"|"+player.flagTakenAt);//_this.laststate);
          }
      }
      // update clientCooldowns objs
      var cd = player.game._.find(player.game.clientCooldowns, {"name":this.name});
      //console.log(this.game.clientCooldowns);
      cd.heldBy = player.mp;
      cd.src = this.sourceSlot;
      cd.target = this.targetSlot;
      //console.log('cooldown obj');

      // start cooldown
      // get event by id "fc" (flag carried)
      var evt = player.game._.find(player.game.events, {'id':"fc"});
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
  // TODO: Resolve issue with targetSlot and sourceSlot values, both
  // of which exist in flag class (client) and clientCooldowns (server)
  console.log('===flag.slotFlag', this.name, player.mp, '===');//, this.name, player.mp, this.typeToName(player.hasFlag));//, player.carryingFlag.targetSlot);
  //console.log('cooldowns', player.game.clientCooldowns);

  var clientFlag = this._.find(player.game.clientCooldowns, {'name':this.typeToName(player.hasFlag)});
  //console.log('clientFlag', clientFlag);
  if (clientFlag === undefined) return;

  console.log('* slot.name', this.name, 'clientCooldown.target', clientFlag.target);
  if (this.name == clientFlag.target)//player.carryingFlag.targetSlot)
  {
    console.log('* slot flag!!!!');
    /*player.carryingFlag.x = this.x - (this.width/2);
    player.carryingFlag.y = this.y - (this.height/2);*/
    // revise flag targetSlot & sourceSlot
    // also start flag cooldown
    var flg = player.game._.find(player.game.flagObjects, {"name":clientFlag.name});
    console.log('* flag', flg);
    
    player.hasFlag = 0;

    flg.isActive = false;
    flg.onCooldown = true;
    flg.isHeld = false;
    //this.sourceSlot = this.name;
    flg.sourceSlot = this.name;
    flg.targetSlot = this.getTargetSlot(this.sourceSlot);
    // stop cooldown (clientFlag)

    // stop flag-carried event (server-side only)
    if (player.game.server)
    {
      // stop flag-carried event
      var evt = player.game._.find(player.game.events, {"id":"fc"});
      //console.log(player.game.events);
      //console.log('*evt', evt.type, evt.timer);
      evt.doStop();

      // ... and start flag slotted cooldown event
      var cd = player.game._.find(player.game.events, {"type":evt.TYPE_FLAG_SLOTTED_COOLDOWN});
      //console.log('*evt cd', cd);
      var flg = player.game._.find(player.game.flagObjects, {"name":clientFlag.name});
      cd.flag = flg;//clientFlag; // TODO: <- should be flag class NOT clientCooldown flag
      cd.doStart();

    }
    //var evt = player.game._.find(player.game.clientCooldowns, {'name':this.name});
    //console.log('slot evt', evt, player.game.clientCooldowns);

    //player.removeFlag(true, this, player.game._.find(player.game.flagObjects, {'name':clientFlag.name}));
    //var slot = player.game._.find(player.game.flagObjects, {'name':clientFlag.name});

    flg.x = this.x - (this.width/2);
    flg.y = this.y - (this.height/2);
    //flg.sourceSlot = slot.name;
    console.log('* sourceSlot', flg.sourceSlot);
    //this.isActive = false;
    // note: targetSlot will be defined when flag is taken!

    console.log('* socket emit', this);
    // inform socket
    for (var l = 0; l < player.game.allplayers.length; l++)
    {
        if (player.game.allplayers[l].instance && player.game.allplayers[l].mp != player.mp)
        {
            //console.log('flag sent', slot);
            //player.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
            player.game.allplayers[l].instance.send('f.a.'+player.mp+"|"+this.name+"|"+flg.name);//_player.laststate);
        }
    }

    // revise territory
    /*
    if (player.game.server)
    {
        console.log('emit territory change data');
    }
    */
    if (!player.game.server)
    {
        player.game.updateTerritory();

        // start flag-slotted cooldown event
    }

    var flagObj = player.game._.find(player.game.flagObjects, {"name":clientFlag.name});//this.name});
    flagObj.reset(true);//, this.game.server_time);
  }
};

game_flag.prototype.reset = function(success)//, server_time)
{
  console.log('===flag.reset', success, this.name, '===');
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
  else this.isActive = true;
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
        this.image = document.getElementById("flag-slot-1");
      break;

      case "slot2":
        this.image = document.getElementById("flag-slot-2");
      break;

      case "slot3":
        this.image = document.getElementById("flag-slot-3");
      break;

      case "slot4":
        this.image = document.getElementById("flag-slot-4");
      break;

      case "slot5":
        this.image = document.getElementById("flag-slot-5");
      break;

      case "slot6":
        this.image = document.getElementById("flag-slot-6");
      break;

      case "slot7":
        this.image = document.getElementById("flag-slot-7");
      break;

      case "slot8":
        this.image = document.getElementById("flag-slot-8");
      break;

      case "slot9":
        this.image = document.getElementById("flag-slot-9");
      break;

      case "slot10":
        this.image = document.getElementById("flag-slot-10");
      break;

    }
    //this.image = document.getElementById("flag-slot");
  }
  if (this.ctx && this.type == "flag")
  {
    if (name == "midFlag")
      this.image = document.getElementById("flag-mid-r");
    else if (name == "redFlag")
      this.image = document.getElementById("flag-red-l");
    else if (name == "blueFlag")
      this.image = document.getElementById("flag-blue-r");
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
      game.ctx.font = "18px Mirza";
      game.ctx.fillStyle = (this.name == "midFlag") ? "#000" : "#fff";
      game.ctx.textAlign = 'center';
      game.ctx.fillText(
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
