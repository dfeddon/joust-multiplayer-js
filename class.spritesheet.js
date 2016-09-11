function game_spritesheet(ctx)
{
  console.log('spritesheet constructor', ctx);
  //this.t = 0;

  this.type = null;
  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;
  this.frame = 0;
  this.frames = 0;

  this.img = null;

  this.ctx = ctx;//canvas.getContext('2d');

  var _this = this;
  setInterval(function()
  {
    console.log(_this.frame);
    if (_this.frame === (_this.frames - 1))
      _this.frame = 0;
    else _this.frame++;
  }, 100);


}

game_spritesheet.prototype.setter = function(data)
{
  this.type = data.type;
  this.x = data.x;
  this.y = data.y;
  this.w = data.w;
  this.h = data.h;
  this.frames = data.frames;

  //this.update();
};

game_spritesheet.prototype.update = function()
{
  //console.log('spritesheet update', this.ctx);

  this.draw();
  //var img = document.getElementById(this.type); //new Image();
  //var ctx = this.fg.getContext('2d')
  //this.ctx.drawImage(img, 200, 100, 256, 64);
  //this.draw();
};

game_spritesheet.prototype.draw = function()
{
  //console.log('draw');
  //if (this.t % 10 !== 0) return;
  this.ctx.drawImage(
      document.getElementById("animate-torches"),
      this.w * this.frame,//this.x,// + (64 * (i + 1)),
      0,//this.y,
      64,
      64,
      this.x,
      this.y,
      64,
      64
  );
  // if (this.frame === this.frames)
  //   this.frame = 0;
  // else this.frame++;

  //this.t++;
};
