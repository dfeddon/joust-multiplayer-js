"use strict";

function game_round()
{
    console.log('== game_round constructor ==');
    
    // this.round = {};
    
    this.duration = .1; // minutes
    // this.round.endtime = server_time + (this.round.duration * 60);
    this.total = 1;
    this.active = true;

    return this;
}

module.exports = game_round;