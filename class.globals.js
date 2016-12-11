'use strict';

var config = function()
{
    this.preflags = null; // temp array to set flag visibility on "joingame" event
    this.ctx = null;
    this.flagObjects = [];
    //this.allplayers = [];
    this.world = {};
    this.server = true;
    this.keyboard = null;
    this.tilemapData = null;
    //this.players = null; // self
    this._ = null;
    this.clientCooldowns = [];
    this.chests = [];
    this.chestSpawnPoints = [];
    this.passives = [];
    this.events = [];
    this._ = null;

    this.server_time = 0;
}

config.prototype.preflags = null;
config.prototype.ctx = null;
config.prototype.flagObjects = [];
//this.allplayers = [];
config.prototype.world = {};
config.prototype.server = true;
config.prototype.keyboard = null;
config.prototype.tilemapData = null;
//this.players = null; // self
config.prototype._ = null;
config.prototype.clientCooldowns = [];
config.prototype.chests = [];
config.prototype.chestSpawnPoints = [];
config.prototype.passives = [];
config.prototype.events = [];
config.prototype._ = null;

config.prototype.server_time = 0;


config.prototype.gridToPixel = function(x, y)
{
    console.log('gridToPixel', x, y);
    
}

//module.exports = new config();
module.exports = config;