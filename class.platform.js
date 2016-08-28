function game_platform(game_instance, client)
{
  console.log('game platform constructor', client);

  this.game = game_instance;
  if (client)
  this.ctx = game_instance.canvasPlatforms.getContext('2d');

  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;
  this.layout = "h"; // horizontal or vertical

  this.type = 1;
  this.status = 0;
}

game_platform.prototype.draw = function()
{
  console.log('platform.draw()');
  // left side
  this.ctx.drawImage(
      document.getElementById("plat-l"),
      this.x,
      this.y,
      64,
      64
  );

  // right side
  this.ctx.drawImage(
      document.getElementById("plat-r"),
      this.x + this.w - 64,
      this.y,
      64,
      64
  );

  // get num of remaining "middle" tiles
  var rest = (this.w - 128) / 64;

  for (var i = 0; i < rest; i++)
  {
    this.ctx.drawImage(
        document.getElementById("plat-m"),
        this.x + (64 * (i + 1)),
        this.y,
        64,
        64
    );
  }
};

if('undefined' != typeof global)
    module.exports = game_platform;
