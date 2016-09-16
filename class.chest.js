function game_chest(ctx, data)
{
  this.ctx = ctx;

  this.x = data.x;
  this.y = data.y;
  this.t = data.t; // passive type
  this.d = data.d; // passive duration
  this.m = data.m; // passive modifier

  this.width = 64;
  this.height = 64;

  this.taken = false;
  this.opening = false;

  console.log('chest constructor', this);
}

game_chest.prototype.doTake = function()
{
  console.log('doTake');

  // no double-takes!
  if (this.taken === true) return;
  else this.taken = true;

  this.opening = true;

};

game_chest.prototype.update = function()
{

};

game_chest.prototype.draw = function()
{
  this.ctx.drawImage(document.getElementById("evt-chest"), this.x, this.y, this.width, this.height);
};
