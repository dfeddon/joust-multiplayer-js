var _ = require('./node_modules/lodash/lodash.min');

function game_spritesheet(img) {
    // console.log('== spritesheet() ==', img);
    //this.t = 0;

    //this.type = null;

    this.pos = { x: 0, y: 0 };
    this.x = 0;
    this.y = 0;
    this.w = 0;
    this.h = 0;

    this.speed = 0;

    this.img = img;
    this.sheet = {};
    this.sheet.w = img.width;
    this.sheet.h = img.height;
    this.cell = 0;
    this.cells = (this.sheet.w / 64) * (this.sheet.h / 64);

    this.cellWidth = 64;
    this.cellHeight = 64;

    this.cellData = [];
    this.cellLabels = [
        "fly-r", "flap-r", "land-r", "vuln-r",
        "fly-l", "flap-l", "land-l", "vuln-l"
    ];
    for (var i = 0; i < this.cells; i++)
        this.cellData.push({
            index: i,
            label: this.cellLabels[i],
            x: this.cellWidth * i,
            y: 0
        });

    var v = document.getElementById("viewport");
    this.ctx = v.getContext('2d');

    console.log('* spritesheet instance', this);

    // var _this = this;
    /*setInterval(function()
    {
      console.log(_this.frame);
      if (_this.frame === (_this.frames - 1))
        _this.frame = 0;
      else _this.frame++;
    }, 100);*/


}

/*game_spritesheet.prototype.setter = function(data)
{
  this.type = data.type;
  this.x = data.x;
  this.y = data.y;
  this.w = data.w;
  this.h = data.h;
  this.frames = data.frames;

  //this.update();
};*/

/*game_spritesheet.prototype.update = function()
{
  //console.log('spritesheet update', this.ctx);

  this.draw();
  //var img = document.getElementById(this.type); //new Image();
  //var ctx = this.fg.getContext('2d')
  //this.ctx.drawImage(img, 200, 100, 256, 64);
  //this.draw();
};*/

game_spritesheet.prototype.draw = function(label, pos, abil, radius) {
    // var _this = this;
    // console.log('== spritesheet.draw()', label, this.cellData, radius, '==');
    var data = _.find(this.cellData, { 'label': label });
    // console.log('data', data);

    // if (!radius) radius = 32;

    if (abil === 1) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.25;
    }
    this.ctx.drawImage(
        this.img, //document.getElementById("animate-torches"),
        data.x, //this.x,// + (64 * (i + 1)),
        data.y,
        this.cellWidth,
        this.cellHeight,
        pos.x - radius, //this.x,// + (64 * (i + 1)),
        pos.y - radius,
        this.cellWidth,
        this.cellHeight
    );
    if (abil === 1)
        this.ctx.restore();
    // if (this.frame === this.frames)
    //   this.frame = 0;
    // else this.frame++;

    //this.t++;
};

module.exports = game_spritesheet;