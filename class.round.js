"use strict";

function game_round(server_time)
{
    console.log('== game_round constructor ==');
    
    this.round = {};
    
    this.round.duration = .1; // minutes
    // this.round.endtime = server_time + (this.round.duration * 60);
    this.round.total = 1;
    this.round.active = true;

    return this;
}

module.exports = game_round;