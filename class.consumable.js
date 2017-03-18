/*jslint
    this
*/

"use strict";

//var config = require('./class.globals');
//var getplayers = require('./class.getplayers');

// require('gsap-tween-light');
// var tweenmax = require("./node_modules/gsap/src/minified/TweenLite.min.js");
var assets      = require('./singleton.assets');
var _           = require('./node_modules/lodash/lodash.min');
var game_buffs  = require('./class.buffs');
var getUid      = require('get-uid');

const CONSUMABLE_CATEGORY_CHEST = 1,
      CONSUMABLE_CATEGORY_POTION_HEALTH = 2,
      CONSUMABLE_CATEGORY_POTION_FOCUS = 3;
      // CONSUMABLE_CATEGORY_POTION_POTENCY = 2,
      // CONSUMABLE_CATEGORY_POTION_DURATION = 3,

function game_chest(data, client, getplayers)
{
  console.log('== game_chest constructor ==', data, client);
  
  if (data && data.i)
    this.id = data.i;
  else this.id = getUid();
  this.client;
  this.getplayers = getplayers;

  this.gamebuffs = new game_buffs();// null;

  this.active = false;

  if (client)
  {
    var v = document.getElementById('viewport');
    this.ctx = v.getContext('2d');
    // TweenLite.ticker.addEventListener("tick", this.draw);
    //this.ctx = this.game.viewport.getContext('2d');
  }


  if (data)
    this.addData(data);// = data;
  else this.data = {};
}

game_chest.prototype.addData = function(data)
{
  console.log('== consumable.addData ==', data);

  // this.consumableData.i = this.consumable.id;
  // this.consumableData.x = this.spawn.x;
  // this.consumableData.y = this.spawn.y;
  // this.consumableData.t = this.passive.type;
  // this.consumableData.d = this.passive.discipline;
  
  this.active = true;
  this.data = data;

  this.category = data.c;//ategory;
  console.log('this.category', this.category);
  
  // this.category = Math.floor((Math.random() * 3) + 1);

  switch (this.category)
  {
    case CONSUMABLE_CATEGORY_CHEST: 
      this.imageOpen = assets.consume_chestopen;
      this.imageClose = assets.consume_chestclosed;
      break;
    
    case CONSUMABLE_CATEGORY_POTION_HEALTH:
      this.imageOpen = assets.consume_potgreenempty;
      this.imageClose = assets.consume_potgreenfull;
    break;

    case CONSUMABLE_CATEGORY_POTION_FOCUS:
      this.imageOpen = assets.consume_potyellowempty;
      this.imageClose = assets.consume_potyellowfull;
    break;

    // case CONSUMABLE_CATEGORY_POTION_POTENCY:
    //   this.imageOpen = assets.consume_potredempty;
    //   this.imageClose = assets.consume_potredfull;
    // break;
    
    // case CONSUMABLE_CATEGORY_POTION_DURATION:
    //   this.imageOpen = assets.consume_potblueempty;
    //   this.imageClose = assets.consume_potbluefull;
    // break;

    //return this;
  }
  // if (this.category === CONSUMABLE_CATEGORY_CHEST)
  // if (this.category === CONSUMABLE_CATEGORY_CHEST)
    this.game_buffs = data.b;//new game_buffs();
  //this.game = game_instance;
  // this.data = data;

  // this.id = data.i;//game_instance.getUID();

  this.x = parseInt(data.x);
  this.y = parseInt(data.y);
  // this.type = data.t; // passive type
  this.buff = data.b;
  this.health = data.h;
  this.focus = data.f;
  // this.duration = data.d; // passive duration
  // this.modifier = data.m; // passive modifier

  this.data = data;

  this.width = 64;
  this.height = 64;

  this.taken = false;
  this.takenBy = null;
  this.opening = false;

  this.callout = null;

  return this;
}

game_chest.prototype.reset = function()
{
  console.log('== consumable.reset ==');
  
  this.active = false;
  this.data = null;
  // this.gamebuffs = null;
};

game_chest.prototype.doTake = function(player)//, chests)
{
  console.log('=== chest.doTake', this.id, '===');

  if (this.taken === true) return;
  else this.taken = true;

  // var _this = this;

  this.takenBy = player;//.mp;

  // send to server
  // player.instance.room(player.instance.gameid).write('c.t.' + this.id + '|' + player.mp);
  // player.instance.room(player.instance.gameid).write([15, this.id, player.id]);
  player.instance.room(player.playerPort).write([15, this.id, player.id]);
  
  // no double-takes!

  // assign passive to player
  console.log('passive', this.data, this.type, this.category);//, this.duration, this.modifier);

  switch(this.category)
  {
    case CONSUMABLE_CATEGORY_CHEST:
      player.addBuffToServer(this.data);
    break;

    case CONSUMABLE_CATEGORY_POTION_HEALTH:
      player.addHealthToServer(this.data);
    break;

    case CONSUMABLE_CATEGORY_POTION_FOCUS:
      player.addFocusToServer(this.data);
    break;
    
    // case CONSUMABLE_CATEGORY_POTION_POTENCY:
    //   player.addModifierToServer(this.data);
    // break;
    
    // case CONSUMABLE_CATEGORY_POTION_DURATION:
    //   player.addModifierToServer(this.data);
    // break;
    
  }
  // switch(this.type)
  // {
  //   case this.game_buffs.BUFFS_BUBBLE: // acceleration boost
  //     player.setPassive(this.data);
  //   break;

  //   case 2: // bubble
  //     player.setPassive(this.data);
  //   break;
  // }

  // first, remove chest from room
  var roomChests = this.getplayers.fromRoom(player.playerPort, 2); // <- returns inRoomEvents array
  for (var c = roomChests.length - 1; c >= 0; c--)
  {
    console.log(roomChests[c].id, this.id);
    if (roomChests[c].id == this.id)
    {
      console.log('* removing chest!', roomChests.length);
      roomChests.splice(i, 1);
      console.log('* removed...', roomChests.length);
      break;
    }
  }
  

  // next, reset chest spawnpoint

  // resset chestSpawnPoints.active to false
  //console.log(this.getplayers.config.chestSpawnPoints.length);
  var roomEvents = this.getplayers.fromRoom(player.playerPort, 1); // <- returns inRoomEvents array
  // console.log('* roomEvents', roomEvents);
  for (var i = roomEvents.length - 1; i >= 0; i--)
  {
    if (roomEvents[i].id == "ec")
    {
      console.log('* found chest event', roomEvents[i].id);
      // console.log('* chestSpawnPoints:', roomEvents[i].chestSpawnPoints);
      
      // search roomEvents spawn points
      for (var j = roomEvents[i].chestSpawnPoints.length - 1; j >= 0; j--)
      {
        // find chest by id
        if (roomEvents[i].chestSpawnPoints[j].active && roomEvents[i].chestSpawnPoints[j].x == this.x && roomEvents[i].chestSpawnPoints[j].y == this.y)
        {
          console.log("* resetting chest spawn!", this.id);
          // set active param to false
          roomEvents[i].chestSpawnPoints[j].active = false;
          break;
        }
      }
    }
  }
  // _.forEach(roomEvents.chestSpawnPoints, function(spawn, key)
  // {
  //   console.log('->', spawn.x, _this.x, spawn.y, _this.y);
  //   if (parseInt(spawn.x) === _this.x && parseInt(spawn.y) === _this.y)
  //   {
  //     spawn.active = false;
  //     // console.log('set spawn active to FALSE!');
  //     //return false;
  //   }
  // });

  this.opening = true;

  // callout animation
  if (!this.getplayers.config.server)
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
  console.log('=== chest.doRemove', this.takenBy.playerPort, '===');//, player.mp, '===');

  // var _this = this;
  _.pull(this.getplayers.config.chests, this);
  this.takenBy.instance.room(this.takenBy.playerPort).write([16, this.id, this.takenBy.id]);
  this.taken = false;

  this.reset();
};

game_chest.prototype.getHealthModifier = function()
{
  return 5;
};

game_chest.prototype.getFocusModifier = function()
{
  return 5;
};

game_chest.prototype.update = function()
{

};

game_chest.prototype.draw = function()
{
  if (this.opening === true)
    this.ctx.drawImage(this.imageOpen, this.x, this.y, this.width, this.height);
  else 
    this.ctx.drawImage(this.imageClose, this.x, this.y, this.width, this.height);
};

// game_chest.prototype.doAnimate = function()
// {
//   this.ctx.drawImage(assets.callout_shield, this.x, this.y - 50, this.width, this.height);
// }

if('undefined' != typeof global)
    module.exports = game_chest;
