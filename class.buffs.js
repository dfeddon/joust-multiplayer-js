(function(){'use strict';}());

var assets = require('./singleton.assets');

const getUid      = require('get-uid');

const path = "https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/";
const BUFFS_BUBBLE = 1;
const BUFFS_BUBBLE_IMAGE = path + "buff-bubble.png";
const BUFFS_ALACRITY = 2;
const BUFFS_ALACRITY_IMAGE = path + "buff-alacrity.png";
const BUFFS_PRECISION = 3;
const BUFFS_PRECISION_IMAGE = path + "buff-precision.png";
const BUFFS_RECOVER = 4;
const BUFFS_RECOVER_IMAGE = path + "buff-recover.png";
const BUFFS_BLINK = 5;
const BUFFS_BLINK_IMAGE = path + "buff-blink.png";
const BUFFS_REVEAL = 6;
const BUFFS_REVEAL_IMAGE = path + "buff-reveal.png";
const BUFFS_BRUISE = 7;
const BUFFS_BRUISE_IMAGE = path + "buff-bruise.png";
const BUFFS_PLATE = 8;
const BUFFS_PLATE_IMAGE = path + "buff-plate.png";

const BUFFS_TOTAL = 8;

function game_buffs()
{
    console.log('== game_buffs constructor ==', assets);

    this.BUFFS_BUBBLE = BUFFS_BUBBLE;
    this.BUFFS_ALACRITY = BUFFS_ALACRITY;
    this.BUFFS_PRECISION = BUFFS_PRECISION;
    this.BUFFS_RECOVER = BUFFS_RECOVER;
    this.BUFFS_BLINK = BUFFS_BLINK;
    this.BUFFS_REVEAL = BUFFS_REVEAL;
    this.BUFFS_BRUISE = BUFFS_BRUISE;
    this.BUFFS_PLATE = BUFFS_PLATE;

    if (assets.buffs)
    {
        this.BUFFS_BUBBLE_IMAGE_ASSET = assets.buffs.bubble;
        this.BUFFS_ALACRITY_IMAGE_ASSET = assets.buffs.alacrity;
        this.BUFFS_PRECISION_IMAGE_ASSET = assets.buffs.precision;
        this.BUFFS_RECOVER_IMAGE_ASSET = assets.buffs.recover;
        this.BUFFS_BLINK_IMAGE_ASSET = assets.buffs.blink;
        this.BUFFS_REVEAL_IMAGE_ASSET = assets.buffs.reveal;
        this.BUFFS_BRUISE_IMAGE_ASSET = assets.buffs.bruise;
        this.BUFFS_PLATE_IMAGE_ASSET = assets.buffs.plate;
    }
}

game_buffs.prototype.getRngBuff = function()
{
    return Math.floor((Math.random() * BUFFS_TOTAL) + 1);
}

game_buffs.prototype.getRngBuffEvent = function()
{
    // {id: 'pass1', type:1, name: "acceleration", duration: 60, modifier: 50},
    return { id: getUid(), type: this.getRngBuff() };
};

game_buffs.prototype.getImageById = function(id)
{
    switch(id)
    {
        case BUFFS_BUBBLE: return BUFFS_BUBBLE_IMAGE;
        case BUFFS_ALACRITY: return BUFFS_ALACRITY_IMAGE;
        case BUFFS_PRECISION: return BUFFS_PRECISION_IMAGE;
        case BUFFS_RECOVER: return BUFFS_RECOVER_IMAGE;
        case BUFFS_BLINK: return BUFFS_BLINK_IMAGE;
        case BUFFS_REVEAL: return BUFFS_REVEAL_IMAGE;
        case BUFFS_BRUISE: return BUFFS_BRUISE_IMAGE;
        case BUFFS_PLATE: return BUFFS_PLATE_IMAGE;
    }
};

game_buffs.prototype.getBuffsAsArray = function(buffs)
{
    // [{i:1, a:1, b:0, c:0}, {i:2, a:0, b:0, c:0}, {i:3, a:0, b:0, c:0}]
    var results = [];

    for (var i = 0; i < buffs.length; i++)
    {
        if (buffs[i].b !== 0)
            results.push(buffs[i].b);
    }

    return results;
};

// game_buffs.prototype.addEventBuffToPlayerSlot = function(slot, buff)
// {
//     console.log('== addEventBuffToPlayerSlot ==', slot, buff);
//     // {i:1, a:1, b:0, u:0}
//     slot.b = buff;

//     // we need to update *all* clients about bubble or blink buffs for display purposes
//     if (buff === BUFFS_BUBBLE || buff === BUFFS_BLINK)
//         slot.u = 1;
    
//     return slot;
// };

module.exports = game_buffs;