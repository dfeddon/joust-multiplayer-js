(function(){'use strict';}());

const getUid      = require('get-uid');

const BUFFS_BUBBLE = 1;
const BUFFS_BUBBLE_IMAGE = "./assets/buffs/buff-bubble.png";
const BUFFS_ALACRITY = 2;
const BUFFS_ALACRITY_IMAGE = "./assets/buffs/buff-alacrity.png";
const BUFFS_PRECISION = 3;
const BUFFS_PRECISION_IMAGE = "./assets/buffs/buff-precision.png";
const BUFFS_RECOVER = 4;
const BUFFS_RECOVER_IMAGE = "./assets/buffs/buff-recover.png";
const BUFFS_BLINK = 5;
const BUFFS_BLINK_IMAGE = "./assets/buffs/buff-blink.png";
const BUFFS_REVEAL = 6;
const BUFFS_REVEAL_IMAGE = "./assets/buffs/buff-reveal.png";
const BUFFS_BRUISE = 7;
const BUFFS_BRUISE_IMAGE = "./assets/buffs/buff-bruise.png";
const BUFFS_PLATE = 8;
const BUFFS_PLATE_IMAGE = "./assets/buffs/buff-plate.png";

const BUFFS_TOTAL = 8;

function game_buffs()
{
    console.log('== game_buffs constructor ==');
    
}

game_buffs.prototype.getRngBuff = function()
{
    return Math.floor((Math.random() * BUFFS_TOTAL) + 1);
}

game_buffs.prototype.getRngBuffEvent = function()
{
    // {id: 'pass1', type:1, name: "acceleration", duration: 60, modifier: 50},
    return { id: getUid(), type: this.getRngBuff() };
}

module.exports = game_buffs;