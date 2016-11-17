'use strict';

var config = function()
{
    this.ctx = null;
    this.flagObjects = [];
    //this.allplayers = [];
    this.world = {};
    this.server = true;
    this.keyboard = null;
    this.tilemapData = null;
    this.players = null; // self
    this._ = null;
    this.clientCooldowns = [];
    this.chests = [];
    this.chestSpawnPoints = [];
    this.passives = [];
    this.events = [];
    this._ = null;

    this.server_time = 0;
}

config.prototype.gridToPixel = function(x, y)
{
    console.log('gridToPixel', x, y);
    
}

module.exports = new config();