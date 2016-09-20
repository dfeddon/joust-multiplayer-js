function game_flag(context)
{
  this.ctx = context;

  this.TYPE_HIGH = 1;
  this.TYPE_LOW = 2;

  this.id = undefined;
  this.name = undefined;

  this.x = 0;
  this.y = 0;
  this.width = 64;
  this.height = 64;

  this.type = 1;
  this.isHeld = false;
  this.isPlanted = false;
  this.heldBy = null;

  this._ = {};
  if (context)
  {
    this.image = document.getElementById("the-flag");
    this._.forEach = _.forEach;
  }
  else this._.forEach = require('./node_modules/lodash/forEach');
}

game_flag.prototype.setter = function(obj)
{
  //var _this = this;
  console.log('obj', obj);
  this.id = "flg" + obj.id;
  this.name = obj.name;
  this.type = obj.type;
  this.x = obj.x;
  this.y = obj.y;
  this.width = obj.width;
  this.height = obj.height;

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
  console.log('this', this);
};

game_flag.prototype.draw = function()
{
  //console.log('dodraw');
  this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
};

if('undefined' != typeof global)
  module.exports = game_flag;
