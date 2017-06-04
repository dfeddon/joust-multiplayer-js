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

var CONSUMABLE_CATEGORY_CHEST = 1,
      CONSUMABLE_CATEGORY_POTION_HEALTH = 2,
      CONSUMABLE_CATEGORY_POTION_FOCUS = 3;
      // CONSUMABLE_CATEGORY_POTION_POTENCY = 2,
      // CONSUMABLE_CATEGORY_POTION_DURATION = 3,

function game_consumable(data, client, getplayers)
{
  console.log('== game_consumable constructor ==', data, client);

  // hold refs  
  this.getplayers = getplayers;
  this.gamebuffs = new game_buffs();// null;

  // set id
  if (data && data.i)
    this.id = data.i;
  // only server can set id
  else if (!client) this.id = getUid();

  this.data = {c:null,v:null,t:null,i:this.id};
  this.active = false;

  if (client)
  {
    var v = document.getElementById('viewport');
    this.ctx = v.getContext('2d');
    // TweenLite.ticker.addEventListener("tick", this.draw);
    //this.ctx = this.game.viewport.getContext('2d');
  }

  // if we have data, assign it
  if (data) this.addData(data);
  // otherwise, we're resuing from the obj pool, so clear it
  else if (this.data) this.reset();
}

game_consumable.prototype.addData = function(data)
{
  console.log('== consumable.addData ==', data);

  // this.consumableData.i = this.consumable.id;
  // this.consumableData.x = this.spawn.x;
  // this.consumableData.y = this.spawn.y;
  // this.consumableData.t = this.passive.type;
  // this.consumableData.d = this.passive.discipline;
  
  this.active = true;

  // copy data properties
  for (var k in data)
  {
    this.data[k] = data[k];
  }

  this.category = data.c;//ategory;
  this.value = data.v;
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

  }
  // if (this.category === CONSUMABLE_CATEGORY_CHEST)
  // if (this.category === CONSUMABLE_CATEGORY_CHEST)
    // this.game_buffs = data.b;//new game_buffs();
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

  // this.data = data;

  this.width = 64;
  this.height = 64;

  this.taken = false;
  this.takenBy = null;
  this.opening = false;

  this.callout = null;

  return this;
}

game_consumable.prototype.reset = function()
{
  console.log('== consumable.reset ==');
  
  // defaults
  // this.id = getUid();
  this.active = false;

  this.data.c = null;
  this.data.v = null;
  this.data.t = null;
  this.data.x = null;
  this.data.y = null;

  // this.id = null;
  this.category = null;
  this.value = null;
  this.imageOpen = null;
  this.imageClose = null;
  this.x = null;
  this.y = null;
  this.buff = null;
  this.health = null;
  this.focus = null;
  this.width = null;
  this.height = null;
  this.taken = null;
  this.takenBy = null;
  this.opening = null;
  this.callout = null;
};

game_consumable.prototype.doTake = function(player)//, chests)
{
  console.log('=== consumable.doTake', this.id, player.playerPort, '===');

  if (this.taken === true) return;
  else this.taken = true;

  // var _this = this;

  this.takenBy = player;//.mp;

  // send to server (if category is *not* health potion. We'll send open health *after* bonus applied in player.addHealthToServer)
  if (this.data.c !== CONSUMABLE_CATEGORY_POTION_HEALTH)
    player.instance.room(player.playerPort).write([15, this.id, player.id]);
  
  // no double-takes!

  // assign passive to player
  console.log('passive', this.data);//this.type, this.category);//, this.duration, this.modifier);

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

  // // first, remove chest from room
  // var roomChests = this.getplayers.fromRoom(player.playerPort, 2); // <- returns inRoomChests array
  // for (var c = roomChests.length - 1; c >= 0; c--)
  // {
  //   console.log(roomChests[c].id, this.id);
  //   if (roomChests[c].id == this.id)
  //   {
  //     console.log('* removing chest!', roomChests[c].category, 'of total', roomChests.length);
  //     // roomChests.splice(i, 1);
  //     roomChests[c].active = false;
  //     console.log('* removed...', roomChests[c].active);//.length);
  //     break;
  //   }
  // }
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

game_consumable.prototype.timeoutOpened = function()
{
  console.log("removing consumable taken by ", this.takenBy.playerName);
  this.doRemove();
};

game_consumable.prototype.doRemove = function()
{
  console.log('=== chest.doRemove', this.takenBy.playerPort, '===');//, player.mp, '===');

  _.pull(this.getplayers.config.chests, this);
  this.takenBy.instance.room(this.takenBy.playerPort).write([16, this.id, this.takenBy.id]);
  this.taken = false;

  this.reset();
};

game_consumable.prototype.getRandomInt = function(min, max) 
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

game_consumable.prototype.getHealthModifier = function()
{
  return this.getRandomInt(5, 15);
};

game_consumable.prototype.getFocusModifier = function()
{
  return this.getRandomInt(1, 10);
};

game_consumable.prototype.update = function()
{

};

game_consumable.prototype.draw = function()
{
  if (this.opening === true)
    this.ctx.drawImage(this.imageOpen, this.x, this.y, this.width, this.height);
  else 
    this.ctx.drawImage(this.imageClose, this.x, this.y, this.width, this.height);
};

// game_consumable.prototype.doAnimate = function()
// {
//   this.ctx.drawImage(assets.callout_shield, this.x, this.y - 50, this.width, this.height);
// }

if('undefined' != typeof global)
    module.exports = game_consumable;
