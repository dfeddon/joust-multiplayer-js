function game_chest(game_instance, data, client)
{
  //if (game_instance)
  //{
    this.game = game_instance;
    if (client)
      this.ctx = this.game.viewport.getContext('2d');
  //}
  //else this.game = this;

  this.x = parseInt(data.x);
  this.y = parseInt(data.y);
  this.type = data.t; // passive type
  this.duration = data.d; // passive duration
  this.modifier = data.m; // passive modifier

  this.width = 64;
  this.height = 64;

  this.taken = false;
  this.opening = false;

  console.log('chest constructor', data);

  this._ = require('./node_modules/lodash/lodash.min');
}

game_chest.prototype.doTake = function(player)//, chests)
{
  console.log('doTake by player', player.mp, this.taken);

  var _this = this;

  // no double-takes!
  if (this.taken === true) return;
  else this.taken = true;

  // assign passive to player
  console.log('passive', this.type, this.duration, this.modifier);

  // resset chestSpawnPoints.active to false
  //console.log(this.game.chestSpawnPoints.length);
  this._.forEach(this.game.chestSpawnPoints, function(spawn, key)
  {
    //console.log('->', spawn.x, _this.x, spawn.y, _this.y);
    if (parseInt(spawn.x) === _this.x && parseInt(spawn.y) === _this.y)
    {
      spawn.active = false;
      console.log('set spawn active to FALSE!');
      //return false;
    }
  });

  this.opening = true;

  setTimeout(this.timeoutOpened.bind(this), 750);
};

game_chest.prototype.timeoutOpened = function()
{
  this.doRemove();
};

game_chest.prototype.doRemove = function()
{
  console.log('removing chest');
  this._.pull(this.game.chests, this);
};

game_chest.prototype.update = function()
{

};

game_chest.prototype.draw = function()
{
  if (this.opening === true)
    this.ctx.drawImage(document.getElementById("evt-chestopen"), this.x, this.y, this.width, this.height);
  else this.ctx.drawImage(document.getElementById("evt-chestclosed"), this.x, this.y, this.width, this.height);
};

if('undefined' != typeof global)
    module.exports = game_chest;
