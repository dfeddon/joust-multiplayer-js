'use strict';

function getplayers(game_instance)
{
    if (game_instance)
        game_instance.allplayers = [];
    else this.allplayers = [];
}
getplayers.prototype.allplayers = [];

module.exports = getplayers;