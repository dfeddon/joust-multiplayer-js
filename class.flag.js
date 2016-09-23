function game_flag(data, context)
{
  console.log('data', data);

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
  this.isHeld = false;
  this.isPlanted = true;
  this.isActive = true;
  this.validHolder = undefined;
  this.heldBy = null;

  this.ctx = context;

  if (context)
  {
    switch(data.name)
    {
      case "midFlag":
        this.image = document.getElementById("flag-blue-r");
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
        this.image = document.getElementById("flag-slot");
        break;
    }
  }

  console.log('construct', data.type, this);
}

game_flag.prototype.setter = function(obj)
{
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
  console.log('ddd', this.ctx, this.type);
  if (this.type == "slot" && this.ctx)
  {
    //this.draw();
    this.image = document.getElementById("flag-slot");
  }
  else if (this.ctx && this.type == "flag")
  {
    if (this.name == "midFlag")
      this.image = document.getElementById("flag-blue-r");
    else if (this.name == "redFlag")
      this.image = document.getElementById("flag-red-l");
    else if (this.name == "blueFlag")
      this.image = document.getElementById("flag-blue-r");
  }

  console.log('flag this', this, this.image);
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
      this.image = document.getElementById("flag-blue-r");
    else if (name == "redFlag")
      this.image = document.getElementById("flag-red-l");
    else if (name == "blueFlag")
      this.image = document.getElementById("flag-blue-r");
  }

  console.log('setter', this);
};

game_flag.prototype.draw = function()
{
  console.log('dodraw', this.image, this.x, this.y);
  if (this.image)
  this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};

if('undefined' != typeof global)
  module.exports = game_flag;
