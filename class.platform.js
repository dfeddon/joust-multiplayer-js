function game_platform(game_instance, client)
{
  console.log('game platform constructor', client);

	///////////////////////////
  // constants
	///////////////////////////
	// states
  this.STATE_REMOVED = 0;
  this.STATE_INTACT = 1;
  this.STATE_FALLING = 2;
  this.STATE_DESTROYED = 3;
  this.STATE_ROTATING = 4;
  this.STATE_SHAKING = 5;

	// status
	this.STATUS_ROTATING = 4;

	// misc
  this.TO_RADIANS = Math.PI/180;

  // parameters
  this.game = game_instance;
	this.client = client;
  //_this = this;

  if (this.client)
  {
  	this.ctx = game_instance.canvasPlatforms.getContext('2d');
    //this.trans = new Transform();
  }
  else {
    //this.transformClass = require('./class.transform');
  }

  this.id = 'noid';

  this.x = 0;
  this.y = 0;
  this.w = 0;
  this.h = 0;
  this.old = { x:this.x, y:this.y, w:this.w, h:this.h };

  // spawn position/dimension, when re-spawning destructable platform
  this.spawn = null;
  this.layout = "h"; // horizontal or vertical

  //this.tiles = [];

  this.type = 1; // 1 = fixed, 2 = destructable, 3 = rain
  //this.setState(1; // 1 = intact, 2 = falling, 3 = destroyed, 4 = rotating, 5 = shaking, 6 = destroyed
  this.status = 1; // 0 = destroyed, 1 = intact, 2 = shaking, 3 = falling, 4 = rotating

  this.triggerer = null;
}

game_platform.prototype.state = 1;

game_platform.prototype.setter = function(data)
{
  // if no spawn vals then store it;
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
  //this.id = data.id;
  this.x = data.x;
  this.y = data.y;
  this.w = data.w;
  this.h = data.h;
  //if (data.t) this.t = data.t;
  //if (data.s) this.s = data.s;
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
    if (tmd == null) return; // TODO don't start game until tilemapData is loaded

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
    if (this.game.platforms[i].id != this.id)
    {
      // collision check
      if (
          this.x < (this.game.platforms[i].x + this.game.platforms[i].w) &&
          (this.x + this.w) > this.game.platforms[i].x &&
          this.y < (this.game.platforms[i].y + this.game.platforms[i].h) &&
          (this.y + this.h) > this.game.platforms[i].y
      )
      {
        if (this.state === this.STATE_FALLING) // falling
        {
          // destroy this platform (state 3)
          this.setState(this.STATE_DESTROYED);
          console.log('platform', this.id, 'has hit platform', this.game.platforms[i].id);
          this.y = this.game.platforms[i].y - this.h - 5;
        }
      }
    }
    //else console.log('found myself!');
  }

  // rotating platform to players
  // check rotating platform collision (radius)
  if (this.state === this.STATE_ROTATING)
  {
    for (var j = 0; j < this.game.allplayers.length; j++)
    {
      //console.log('check rotating collision', this.game.allplayers[j].pos.x);//, this.platforms[j].state);
      // set collision w/h radius
      /*var rads=this.r*Math.PI/180;
      var c = Math.abs(Math.cos(rads));
      var s = Math.abs(Math.sin(rads));
      var width = this.h * s + this.w * c;
      var height = this.h * c + this.w * s;*/
      if (
        (this.game.allplayers[j].pos.x + this.game.allplayers[j].size.hx) > this.x &&
        this.game.allplayers[j].pos.x < this.x + this.w &&
        this.game.allplayers[j].pos.y > (this.y - (this.w/2)) &&
        this.game.allplayers[j].pos.y < (this.y + (this.w/2))
      )
      {
        //console.log("*******************", this.game.allplayers[j].mp, this.game.allplayers[j].pos.x);
        var pl = this.game.allplayers[j];
        var adjust;
        if ( pl.pos.x < this.x + (this.w/2) )
          adjust = ((this.x + (this.w/2) - pl.pos.x) * 2); // left of center
        else adjust = -( (pl.pos.x - (this.x + this.w/2) ) * 2);// right of center
        //console.log('adjust', adjust);
        pl.pos.x += adjust;

        if (!this.game.server && pl.mp == this.game.players.self.mp)
        {
          //console.log('draw player', this.game.players.self.pos.x, this.game.players.self);
          this.game.players.self.draw();
        }
        // console.log('adjust', ((this.x + (this.w)) - pl.pos.x) );
        // if ( (pl.pos.x + pl.size.hx) < this.x + (this.w /2))
        //   pl.pos.x += ((this.x + (this.w)) - pl.pos.x);
        //else pl.pos.x -=  pl.pos.x - (this.x + (this.w));*/

        //console.log('####', pl.pos.x);

        //if (!this.game.server) pl.draw();
      }
      //if (this.game.allplayers[j].pos.y )
      //console.log(this.game.allplayers[j].mp, this.game.allplayers[j].pos.x, this.x, this.x + this.w);

      /*console.log(this.game.allplayers[j].mp, this.game.allplayers[j].pos.y, this.y - (this.w / 2), this.y + (this.w/2));*/

      //console.log(this.platforms[j].x + width, this.platforms[j].y + height);//this.platforms[j].x * Math.cos(rads), this.platforms[j].y * Math.cos(rads));//, this.platforms[j].x + width,this.platforms[j].y + height);
    }
  }

  // platform to tilemap collision
  //return;
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
        //return; // TODO:Stub

        this.setState(this.STATE_DESTROYED); // destroyed: stop both falling state and redraw
        //this.y = this.game.platforms[i].y - this.h - 5;

        // settimeout for rnd seconds before removeFromStage(true)
        // setTimeout(_this.timeoutDestroyed, 1000);

        /*this.x = this.spawn.x;
        this.y = this.spawn.y;
        this.w = this.spawn.w;
        this.h = this.spawn.h;

        // only draw if client
        if (!this.game.server)
          this.draw();*/
      }
      /*else if (h.se.t > 0) // landing
      {
        console.log('phit6');
        this.setState(this.STATE_INTACT);
      }*/
  }
};

game_platform.prototype.setState = function(state)
{
  var was = this.state;
  this.state = state;
  var is = state;
  if (was != is)
    console.log('platform state was', was, 'is now', is);

  // ensure rotating platform completes full 180
  // FIXME: resolve socket data with client (off by 1 to 2 tics)
  if (was === this.STATE_ROTATING && is === this.STATE_INTACT && !this.game.server)
  {
    this.ctx.clearRect(this.x,this.y - (this.w/2), this.w + 10, this.w + 40);
    this.r = 0;
    this.draw();
  }

};

game_platform.prototype.update = function()
{
    switch(this.state)
    {
        case this.STATE_SHAKING:
            //console.log('update().shaking!');
            // num between -10 and 10
            var shake = 5;
            var sx = Math.floor(Math.random()*(shake*2) + 1) - shake;
            var sy = Math.floor(Math.random()*(shake*2) + 1) - shake;
            this.setter({x:this.spawn.x + sx, y:this.spawn.y + sy, w:this.w, h:this.h});
        break;

        case this.STATE_DESTROYED: // destroyed
          //console.log('update().destroy!');
          // clear image
          //this.setState(1;
          //this.removeFromStage(true);
          if (this.status !== 1) // 1 = destroy begin
          {
            setTimeout(this.timeoutDestroyed.bind(this), 2000);
            this.status = 1;
          }
        break;

        case this.STATE_FALLING: // falling
          //console.log('update().falling!', this.y);

          // update y (falling)
          this.setter(
            {
              x:this.x,
              y:this.y = this.y + (this.game.world.gravity * 2),
              w:this.w,
              h:this.h
            }
          );
        break;

        case this.STATE_ROTATING:

          if (this.game.server) this.r += 9;
          //console.log('post', this.r);
          if (this.r < 181)
          {
            //console.log('*', this.state);
          }
          else
          {
            this.r = 0;
            console.log('client', this.game.server);
            if (this.game.server) //this.draw();
            this.setState(this.STATE_INTACT);
            else this.setState(this.STATE_INTACT);
          }

        break;

        case this.STATE_REMOVED:

            console.log('update().removed!');

        break;

        default: console.log("ERROR: Invalid state in platform.update()", this.state);
    }
};

game_platform.prototype.timeoutDestroyed = function()
{
  console.log('timeoutDestroyed complete');

  // set state to removed (on cooldown)
  this.setState(this.STATE_REMOVED);

  // remove platform from stage and ready respawn
  this.removeFromStage(true);
  //setTimeout(this.timeoutShaking.bind(this), 2000);
};

game_platform.prototype.doRotate = function()
{
  console.log('doRotate');

  //}
  // this.triggerer =

  /*if (this.client && this.trans == null)
  {
    this.trans = new Translate();
  }
  else if (this.trans == null)
  {*/
    //this.trans = new this.transformClass();
    //console.log('trans', this.trans);
  //}
  //this.trans = new this.trans();
  this.r = 1;
  this.setState(this.STATE_ROTATING);
};

game_platform.prototype.doShake = function(postShakeState, triggerer)
{
  console.log('doShake', this.state, postShakeState, triggerer, this.id);
  if (this.state !== this.STATE_INTACT) return;

  //var self = this;

  // TODO: Clear below var?
  this.triggerer = triggerer;

  console.log('shaking...', this.state);

  // set status to shaking
  this.setState(this.STATE_SHAKING);
  console.log('shaking 2', this.state, postShakeState, triggerer);

  // after shaking, fall
  this.status = postShakeState; // after shaking, fall

  // shake tiles
  // var tileL = this.ctx.getImageData(this.spawn.x, this.spawn.y, 64, 64);
  // this.ctx.putImageData(tileL, this.spawn.x - 64, this.spawn.y - 64);

  // update post shake state
  //this.setState(postShakeState);

  // start timer
  setTimeout(this.timeoutShaking.bind(this), 2000);
};

game_platform.prototype.timeoutShaking = function()
{
  console.log('done shaking', this.state, this.status, this.id);

  // change status, act on state (fall or destroy)
  this.setState(this.status);

  // if falling, notify players and modify their 'landed' prop to 0
  if (this.status == this.STATE_FALLING)
  {
    for (var i = 0; i < this.game.allplayers.length; i++)
    {
      if (this.game.allplayers[i].supportingPlatformId == this.id)
      {
        console.log('found landed players...');
        this.game.allplayers[i].landed = 0;
      }
    }
  }

  // return position to original
  console.log('pre', this.x, this.y);
  this.setter({x:this.spawn.x, y:this.spawn.y, w:this.w, h:this.h});
  console.log('post', this.x, this.y);
  if (!this.game.server)
    this.draw();

  switch(this.state)
  {
    case this.STATE_FALLING: // falling
      console.log('platform fall!');
    break;

    case this.STATE_DESTROYED: // destroyed
      console.log('destroyed');
    break;

  }
};

game_platform.prototype.removeFromStage = function(doRespawn)
{
  console.log('removeFromStage', doRespawn);
  // remove values
  this.x = -1000;
  this.y = -1000;
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
    //setTimeout(_this.timeoutRespawn, 5000);
    setTimeout(this.timeoutRespawn.bind(this), 5000);
  }
};

game_platform.prototype.timeoutRespawn = function()
{
  console.log('timeoutRespawn');

  // set state
  this.setState(this.STATE_INTACT);

  // respawn position
  console.log(this.spawn);
  this.x = this.spawn.x;
  this.y = this.spawn.y;
  this.w = this.spawn.w;
  this.h = this.spawn.h;

  // only draw if client
  if (!this.game.server)
    this.draw();
};

game_platform.prototype.draw = function()
{
    //console.log('platform.draw()', this.state);
    //if (status === 1)
    //if (this.state == 2)
    //cy =
    //console.log('platform.draw()', this.status, this.ctx.width, this.ctx.height);

    //this.ctx.save();
    //this.ctx.beginPath();
    // left side
    if (this.state === this.STATE_INTACT || this.state === this.STATE_FALLING || this.state === this.STATE_SHAKING)
    {
        this.ctx.clearRect(this.old.x,this.old.y - this.h, this.old.w, this.old.h + this.h);

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
    }
    // destroy particle fx
    else if (this.state === this.STATE_DESTROYED)
    {
        console.log('draw destroyed animation...');
        this.ctx.clearRect(this.x,this.y - 5, this.w, this.h + 5);//this.game.canvasPlatforms.height);
    }
    else if (this.state == this.STATE_ROTATING)
    {
      //console.log('draw rotating animation...');

			this.ctx.clearRect(this.x,this.y - (this.w/2), this.w + 10, this.w + 40);
			//*
      //var TO_RADIANS = Math.PI/180;
      //function drawRotatedImage(image, x, y, angle)
      //{
      // save the current co-ordinate system
      // before we screw with it
      this.ctx.save();

      // move to the middle of where we want to draw our image
      this.ctx.translate(this.x + (this.w / 2), this.y + (this.h / 2));

      // rotate around that point, converting our
      // angle from degrees to radians
			//console.log(this.TO_RADIANS);
      this.ctx.rotate(this.r * this.TO_RADIANS);

      // draw it up and to the left by half the width
      // and height of the image
      //this.ctx.drawImage(image, -(image.width/2), -(image.height/2));

			this.ctx.drawImage(
					document.getElementById("plat-rotate"),
					-(this.w/2),
					-(this.h/2),
					384,
					64
			);

			/*this.ctx.drawImage(
					document.getElementById("plat-rotate"),
					(this.x),
					(this.y)//,
					//384,
					//64
			);*/

      // and restore the co-ords to how they were when we began
      this.ctx.restore();
			//*/
      //}
    }
}; // draw

if('undefined' != typeof global)
    module.exports = game_platform;
