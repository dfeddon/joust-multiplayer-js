/*jslint
    this
*/

"use strict";

//var config = require('./class.globals');
//var getplayers = require('./class.getplayers');

// require('gsap-tween-light');
// var tweenmax = require("./node_modules/gsap/src/minified/TweenLite.min.js");
var assets = require('./singleton.assets');
var _ = require('./node_modules/lodash/lodash.min');

function game_chest(data, client, getplayers, config)
{
  console.log('== game_chest constructor', data, '==');
  
  var _this = this;
  //this.game = game_instance;
  this.data = data;
  this.getplayers = getplayers;
  this.config = config;

  if (client)
  {
    var v = document.getElementById('viewport');
    this.ctx = v.getContext('2d');
    // TweenLite.ticker.addEventListener("tick", this.draw);
    //this.ctx = this.game.viewport.getContext('2d');
  }

  this.id = data.i;//game_instance.getUID();

  this.x = parseInt(data.x);
  this.y = parseInt(data.y);
  this.type = data.t; // passive type
  this.duration = data.d; // passive duration
  this.modifier = data.m; // passive modifier

  this.data = data;

  this.width = 64;
  this.height = 64;

  this.taken = false;
  this.takenBy = null;
  this.opening = false;

  this.callout = null;
  //console.log('chest constructor', data);

  //this._ = require('./node_modules/lodash/lodash.min');

  // if (this.config.server)
  // {
  //   _.forEach(getplayers.allplayers, function(ply)
  //   {
  //       if (ply.instance)
  //       {
  //         console.log('* id', _this.id);

  //         console.log('* ply.instance', ply.instance);

  //         ply.instance.send('c.a.' + _this.id)
  //       }
  //   });
  // }

}

game_chest.prototype.doTake = function(player)//, chests)
{
  console.log('=== chest.doTake', player.id, this.taken, '===');

  if (this.taken === true) return;
  else this.taken = true;

  var _this = this;

  this.takenBy = player;//.mp;

  // send to server
  // player.instance.room(player.instance.gameid).write('c.t.' + this.id + '|' + player.mp);
  // player.instance.room(player.instance.gameid).write([15, this.id, player.id]);
  player.instance.room(player.playerSocket).write([15, this.id, player.id]);
  
  // no double-takes!

  // assign passive to player
  // console.log('passive', this.data, this.type, this.duration, this.modifier);
  switch(this.type)
  {
    case 1: // acceleration boost
      player.setPassive(this.data);
    break;

    case 2: // bubble
      player.setPassive(this.data);
    break;
  }

  // resset chestSpawnPoints.active to false
  //console.log(this.config.chestSpawnPoints.length);
  var room = this.getplayers.fromRoom(player.playerPort, 1); // <- returns inRoomEvents array
  _.forEach(room.chestSpawnPoints, function(spawn, key)
  {
    //console.log('->', spawn.x, _this.x, spawn.y, _this.y);
    if (parseInt(spawn.x) === _this.x && parseInt(spawn.y) === _this.y)
    {
      spawn.active = false;
      // console.log('set spawn active to FALSE!');
      //return false;
    }
  });

  this.opening = true;
  if (!this.config.server)
  {
    // start pos
    // this.callout = { x: this.x, y: this.y - 50, image: assets.callout_shield };

    // TweenLite.to(this.callout, 1.5, {x: this.x, y: this.y - 100, onUpdate:this.doAnimate});
  }

  setTimeout(this.timeoutOpened.bind(this), 750);

  player.addToScore(100);
};

game_chest.prototype.timeoutOpened = function()
{
  this.doRemove();
};

game_chest.prototype.doRemove = function()
{
  console.log('=== chest.doRemove', this.takenBy.playerSocket, '===');//, player.mp, '===');

  var _this = this;
  _.pull(this.config.chests, this);
  this.takenBy.instance.room(this.takenBy.playerSocket).write([16, this.id, this.takenBy.id]);
};

game_chest.prototype.update = function()
{

};

game_chest.prototype.draw = function()
{
  if (this.opening === true)
  {
    this.ctx.drawImage(assets.evt_chestopen, this.x, this.y, this.width, this.height);
    // this.ctx.drawImage(assets.callout_shield, this.x, this.y - 50, this.width, this.height);
  }
  else this.ctx.drawImage(assets.evt_chestclosed, this.x, this.y, this.width, this.height);
};

// game_chest.prototype.doAnimate = function()
// {
//   this.ctx.drawImage(assets.callout_shield, this.x, this.y - 50, this.width, this.height);
// }

if('undefined' != typeof global)
    module.exports = game_chest;
