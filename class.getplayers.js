'use strict';

const game_player = require('./class.player');

function getplayers(game_instance, total_players_per_game, client_gamecore_instance, config)
{
    this.totalPlayersPerGame = total_players_per_game;
    this.config = config;

    // if server
    if (game_instance)
    {
        this.game_instance = game_instance;
        
        game_instance.allplayers = []; // <- deprecating
        game_instance.inRoom = {};
    }
    else // client
    {
        this.core = client_gamecore_instance;
        this.allplayers = []; // <- deprecating
        this.inRoom = {};
    }
}
getplayers.prototype.allplayers = []; // <- 

getplayers.prototype.fromRoom = function(port)
{
    // console.log('getting players from room', port, typeof(port), this.inRoom);
    function isEmpty(obj) 
    {
        for (var x in obj) { return false; }
        return true;
    }
    if (this.game_instance)
    {
        // if (!isEmpty(this.game_instance.inRoom[port]))
        if (Array.isArray(this.game_instance.inRoom[port]))
            return this.game_instance.inRoom[port];
        else if (this.game_instance.inRoom[port] !== undefined)
            return [];
        // else return [];
    }
    else
    {
        if (Array.isArray(this.inRoom[port]))
            return this.inRoom[port];
        else if (this.inRoom[port] !== undefined)
            return [];
        // else return [];
    }
};

getplayers.prototype.addRoom = function(port)
{
    console.log('adding room to getplayers by port id', port, typeof(port));
    var room;

    if (this.game_instance)
        room = this.game_instance.inRoom[port] = [];
    else room = this.inRoom[port] = [];

    var count = 0;
    if (this.game_instance)
    {
        var other;
        for (var i = this.totalPlayersPerGame - 1; i >= 0; i--)
        {
            other = new game_player(null, false, count++, this.config);
            other.pos = this.game_instance.gamecore.gridToPixel(i, 0);
            other.playerName = this.game_instance.gamecore.nameGenerator();
            other.playerPort = port; 
            
            other.visible = false;
            other.active = false;
            
            this.game_instance.inRoom[port].push(other);
        }
    }
    else
    {
        var p;
        for (var l = 1; l < this.totalPlayersPerGame; l++)
        {
            p = new game_player(null, false, count++, this.config);
            p.playerPort = port;
            p.pos = this.core.gridToPixel(l, 0);
            // console.log('getplayers.pos:', p.pos);
            this.inRoom[port].push(p);
        }
    }
};

getplayers.prototype.fromAllRooms = function()
{
    if (this.game_instance)
        return this.game_instance.inRoom;
    else return this.inRoom;
};

getplayers.prototype.roomExists = function(port)
{
    if (this.game_instance)
    {
        return (this.game_instance.inRoom[port] !== undefined)
    }
    else
    {
        return (this.inRoom[port] !== undefined)
    }
};

module.exports = getplayers;