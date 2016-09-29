function game_flag(data, context)
{
  console.log('flag data', data);

  this._ = {};

  if (context)
  {
    this._.forEach = _.forEach;
    //this._.cloneDeep = _.cloneDeep;
  }
  else {
    this._.forEach = require('./node_modules/lodash/forEach');
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
  this.targetSlot = null;
  this.onCooldown = false;
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
      case "slot2":
      case "slot3":
      case "slot4":
      case "slot5":
      case "slot6":
      case "slot7":
      case "slot8":
      case "slot9":
      case "slot10":
      case "midSlot":
      case "slotBlue":
      case "slotRed":
        this.image = document.getElementById("flag-slot");
        break;
    }
  }

  console.log('construct', data.type, this);
}

game_flag.prototype.setTargetSlot = function(slot)
{
  this.targetSlot = slot;
};

game_flag.prototype.setter = function(obj)
{
  console.log('flag.setter');
  //var _this = this;
  console.log('obj', obj);
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

  console.log('flag this', this, this.image);
};

game_flag.prototype.doTake = function(player)
{
  console.log('doTake', this.name, 'by', player.mp);
  if (this.isHeld === false)
    this.isHeld = true;
  else return;

  if (player.hasFlag !== 0)
  {
    console.log('player has flag already');
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
    console.warn("not a valid flag type to take...");
    this.isHeld = false;
    return;
  }

  player.takeFlag(this, flagType);
  //player.hasFlag = flagType;

  // set states
  this.visible = false;
  this.isActive = false;
};

game_flag.prototype.slotFlag = function(player)
{
  console.log('slotFlag', this.name, player.mp, player.carryingFlag.targetSlot);
  if (this.name == player.carryingFlag.targetSlot)
  {
    console.log('slot flag!!!!');
    /*player.carryingFlag.x = this.x - (this.width/2);
    player.carryingFlag.y = this.y - (this.height/2);*/
    // revise flag targetSlot & sourceSlot
    // also start flag cooldown
    player.removeFlag(true, this);
  }
};

game_flag.prototype.reset = function(success, server_time)
{
  console.log('resetting flag', this.name);
  this.isHeld = false;
  this.visible = true;
  if (success)
  {
    this.isActive = false; // flag on cooldown
    this.onCooldownAt = server_time;
    this.onCooldown = true;
  }
  else this.isActive = true;
};

game_flag.prototype.setCtx = function(ctx)
{
  this.ctx = ctx;
  if (this.type == "slot" && this.ctx)
  {
    //this.draw();
    this.image = document.getElementById("flag-slot");
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
    console.log('cooldown', this.onCooldownAt);
    // draw timer
    game.ctx.font = "small-caps lighter 14px arial";
    game.ctx.fillStyle = (this.name == "midFlag") ? "#000" : "#fff";
    game.ctx.textAlign = 'center';
    game.ctx.fillText(
        '60',// + " (" + this.level + ") " + this.mana.toString(),// + this.game.fps.fixed(1),
        this.x + 25,
        this.y + 30//txtOffset
        //100
    );
  }
};

if('undefined' != typeof global)
  module.exports = game_flag;
