function game_platform(game_instance, client)
{
  console.log('game platform constructor', client);

  this.game = game_instance;
  _this = this;

  if (client)
  this.ctx = game_instance.canvasPlatforms.getContext('2d');

  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;
  this.old = {x:this.x,y:this.y,w:this.w,h:this.h};

  // spawn position/dimension, when re-spawning destructable platform
  this.spawn = null;
  this.layout = "h"; // horizontal or vertical

  this.tiles = [];

  this.type = 1; // 1 = standard, 2 = ice, 3 = rain
  this.state = 1; // 1 = intact, 2 = falling, 3 = destructable, 4 = rotating, 5 = shaking
  this.status = 1; // 0 = destroyed, 1 = intact, 2 = shaking, 3 = falling
}

game_platform.prototype.setter = function(data)
{
  // if no spawn vals, store it;
  if (this.spawn == null)
  {
    console.log('setting platform spawn vals');
    this.spawn = {};
    this.spawn.x = data.x;
    this.spawn.y = data.y;
    this.spawn.w = data.w;
    this.spawn.h = data.h;
  }
  // store old vals
  this.old.x = this.x;
  this.old.y = this.y;
  this.old.w = this.w;
  this.old.h = this.h;

  // update new vals
  this.x = data.x;
  this.y = data.y;
  this.w = data.w;
  this.h = data.h;
};

game_platform.prototype.getCoord = function()
{
    // direction-dependent, account for
    var nw = { x: Math.floor(this.x / 64), y: Math.floor(this.y / 64) };
    var ne = { x: Math.floor((this.x + this.w) / 64),y: Math.floor(this.y / 64) };
    var sw = { x: Math.floor(this.x / 64), y: Math.floor((this.y + this.h) / 64) };
    var se = { x: Math.floor((this.x + this.w) / 64), y: Math.floor((this.y + this.h) / 64) };
    return { nw:nw, ne:ne, sw:sw, se:se };
    //return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};
game_platform.prototype.hitGrid = function()
{
    // don't proceed unless tilemapData is loaded
    //if (this.game.tilemapData == undefined) return;
    var tmd = this.game.tilemapData;

    var c = this.getCoord();

    return {
        nw: (tmd[c.nw.y] && tmd[c.nw.y][c.nw.x]) ? {t:parseInt(tmd[c.nw.y][c.nw.x]),x:c.nw.x,y:c.nw.y} : 0,
        ne: (tmd[c.ne.y] && tmd[c.ne.y][c.ne.x]) ? {t:parseInt(tmd[c.ne.y][c.ne.x]),x:c.ne.x,y:c.ne.y} : 0,
        sw: (tmd[c.sw.y] && tmd[c.sw.y][c.sw.x]) ? {t:parseInt(tmd[c.sw.y][c.sw.x]),x:c.sw.x,y:c.sw.y} : 0,
        se: (tmd[c.se.y] && tmd[c.se.y][c.se.x]) ? {t:parseInt(tmd[c.se.y][c.se.x]),x:c.se.x,y:c.se.y} : 0
    };
};

game_platform.prototype.check_collision = function()
{
  // platform to platform
  for (var i = 0; i < this.game.platforms.length; i++)
  {
    if (this.game.platforms[i] != this)
    {
      // collision check
    }
    else console.log('found myself!');
  }

  // platform to tilemap collision
  var h = this.hitGrid();
  if (h !== undefined)
  {
      //if (player.landed === 1) return;

      if (h.nw.t > 0 && h.sw.t > 0) // hit side wall
      {
        console.log('phit1');
      }
      else if (h.ne.t > 0 && h.se.t > 0)
      {
        console.log('phit2!');
      }
      else if (h.nw.t > 0) // collide from below
      {
        console.log('phit3!');
      }
      else if (h.ne.t > 0) // collide from below
      {
        console.log('phit4!');
      }
      else if (h.sw.t > 0 || h.se.t > 0) // landing
      {
        // presume that our platform had fallen and struck a 'barrier' tile below
        console.log('platform hit tile!');

        this.state = 1; // stop the falling state and redraw

        // settimeout for rnd seconds before removeFromStage(true)

        this.x = this.spawn.x;
        this.y = this.spawn.y;
        this.w = this.spawn.w;
        this.h = this.spawn.h;

        // only draw if client
        if (!this.game.server)
          this.draw();
      }
      /*else if (h.se.t > 0) // landing
      {
        console.log('phit6');
        this.state = 1;
      }*/
  }
};

game_platform.prototype.doShake = function(postShakeState)
{
  console.log('doShake', postShakeState);

  // set status to shaking
  this.state = 5;

  // after shaking, fall
  this.status = postShakeState; // after shaking, fall

  // shake tiles
  // var tileL = this.ctx.getImageData(this.spawn.x, this.spawn.y, 64, 64);
  // this.ctx.putImageData(tileL, this.spawn.x - 64, this.spawn.y - 64);

  // update post shake state
  //this.state = postShakeState;

  // start timer
  setTimeout(this.timeoutShaking, 2000);
};

game_platform.prototype.timeoutShaking = function()
{
  console.log('done shaking', _this.state);

  // change status, act on state
  _this.state = _this.status;

  switch(_this.state)
  {
    case 2: // falling
      console.log('platform fall!');
    break;

    case 3: // destoryed
      console.log('destroyed');
    break;

  }
};

game_platform.prototype.removeFromStage = function(doRespawn)
{
  // remove values
  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;
  this.status = 0;
  this.state = 0;
  this.old = {};

  // remove from client
  if (!this.game.server)
    this.draw();

  if (doRespawn === true)
  {
    // random timer?
  }
};

game_platform.prototype.draw = function()
{
  console.log('platform.draw()');
  //if (status === 1)
  //if (this.state == 2)
    //cy =
  //console.log('platform.draw()', this.status, this.ctx.width, this.ctx.height);

  //this.ctx.save();

  this.ctx.clearRect(this.old.x - 5,this.old.y - 5, this.old.w + 5, this.old.h + 5);//this.game.canvasPlatforms.height);

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

  //this.ctx.restore();
};

if('undefined' != typeof global)
    module.exports = game_platform;
