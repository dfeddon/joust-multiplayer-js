'use strict';

var game_player = require('./class.player');
var game_event_server = require('./class.event');
var game_flag = require('./class.flag');
var game_consumable = require('./class.consumable');
// var game_round = require('./class.round');

function getplayers(game_instance, total_players_per_game, client_gamecore_instance, config) {
    console.log('== getplayers constructor ==');
    this.totalPlayersPerGame = total_players_per_game;
    this.config = config;

    // if server
    if (game_instance) {
        this.game_instance = game_instance;

        game_instance.flagsDefault = []; // hold default flags objects, for cloning into each room

        game_instance.allplayers = []; // <- deprecating
        game_instance.inRoom = {};
        game_instance.inRoomEvents = {};
        game_instance.inRoomConsumables = {};
        game_instance.inRoomFlags = {};
        game_instance.inRoomCooldowns = {};
        game_instance.inRoomRound = {};
    } else // client
    {
        this.core = client_gamecore_instance;
        this.allplayers = []; // <- *NOT* deprecating on client
        this.inRoom = {};
        this.inRoomEvents = {};
        this.inRoomConsumables = {};
        this.inRoomFlags = {};
    }
}
getplayers.prototype.allplayers = []; // <- deprecating

getplayers.prototype.fromRoom = function(port, type) // 0 = players / 1 = events / 2 = chests / 3 = flags / 4 = cooldowns / 5 = round
    {
        if (type === undefined)
            type = 0;

        // console.log('== fromRoom', port, type, '==');// (port===0) ? this.inRoom : this.inRoomEvents);
        // function isEmpty(obj) 
        // {
        //     for (var x in obj) { return false; }
        //     return true;
        // }
        if (this.game_instance) {
            // if (!isEmpty(this.game_instance.inRoom[port]))
            switch (type) {
                case 0: // players

                    if (Array.isArray(this.game_instance.inRoom[port]))
                        return this.game_instance.inRoom[port];
                    else if (this.game_instance.inRoom[port] !== undefined)
                        return [];

                    break;

                case 1: // events

                    if (Array.isArray(this.game_instance.inRoomEvents[port]))
                        return this.game_instance.inRoomEvents[port];
                    else if (this.game_instance.inRoomEvents[port] !== undefined)
                        return [];

                    break;

                case 2: // consumables
                    // console.log('getting room chests:', this.game_instance.inRoomConsumables[port]);

                    var consumables = this.game_instance.inRoomConsumables[port];
                    var consume = [];

                    // get only active consumables in object pool
                    for (var i = consumables.length - 1; i >= 0; i--) {
                        if (consumables[i].active)
                            consume.push(consumables[i]);
                    }

                    return consume;

                case 3: // flags
                    // console.log('getting room flags:', this.game_instance.inRoomFlags);

                    if (Array.isArray(this.game_instance.inRoomFlags[port])) {
                        return this.game_instance.inRoomFlags[port];
                    } else if (this.game_instance.inRoomFlags[port] !== undefined) {
                        return [];
                    }

                    break;

                case 4: // cooldowns

                    if (Array.isArray(this.game_instance.inRoomCooldowns[port]))
                        return this.game_instance.inRoomCooldowns[port];
                    else if (this.game_instance.inRoomCooldowns[port] !== undefined)
                        return [];
                    break;

                case 5: // round
                    // console.log('getting round', port, this.game_instance.inRoomRound);
                    return this.game_instance.inRoomRound[port];

                    // break;
            }
        } else {
            switch (type) {
                case 0: // players

                    if (Array.isArray(this.inRoom[port]))
                        return this.inRoom[port];
                    else if (this.inRoom[port] !== undefined)
                        return [];

                    break;

                case 1: // events

                    if (Array.isArray(this.inRoomEvents[port]))
                        return this.inRoomEvents[port];
                    else if (this.inRoomEvents[port] !== undefined)
                        return [];

                    break;

                case 2: // chests

                    if (Array.isArray(this.inRoomConsumables[port]))
                        return this.inRoomConsumables[port];
                    else if (this.inRoomConsumables[port] !== undefined)
                        return [];

                    break;

                case 3: // flags

                    if (Array.isArray(this.inRoomFlags[port]))
                        return this.inRoomFlags[port];
                    else if (this.inRoomFlags[port] !== undefined)
                        return [];

                    break;
            }
        }
    };

getplayers.prototype.addRoom = function(port) {
    console.log('adding room to getplayers by port id', port); //, this.game_instance);//typeof(port));
    var round;

    // first, ensure room doesn't already exist
    if (this.game_instance && this.game_instance.inRoom[port] !== undefined) {
        console.log('Server room port', port, 'already exists!');
        return;
    } else if (!this.game_instance && this.inRoom[port] !== undefined) {
        console.log('Client room port', port, 'already exists!');
        return;
    }

    if (this.game_instance) {
        console.log('* creating server objs...');

        // players
        this.game_instance.inRoom[port] = [];
        this.game_instance.inRoomEvents[port] = [];
        this.game_instance.inRoomConsumables[port] = [];
        this.game_instance.inRoomFlags[port] = [];
        this.game_instance.inRoomCooldowns[port] = [];

        // set round end time
        round = this.game_instance.inRoomRound[port] = {}; //new game_round();//{};
        round.duration = 10000000; //7 * 60;
        round.bonusDuration = 30;
        round.endtime = Math.floor(this.config.server_time + round.duration); //(round.duration * 60);
        round.total = 1;
        round.active = true;
        round.stage = 1; // 1 = game / 2 = bonus
        round.redBonus = 0;
        round.blueBonus = 0;
        // console.log('roundEndTime:', round.endtime);
    } else {
        console.log('* creating client objs...');
        port = port.toString();
        // players
        this.inRoom[port] = [];
        this.inRoomEvents[port] = [];
        this.inRoomConsumables[port] = [];
        this.inRoomFlags[port] = [];
        // console.log('* chests', this.inRoomConsumables, this.inRoom);   
    }

    var count = 0;
    if (this.game_instance) {
        // create players on server
        var other;
        for (var i = this.totalPlayersPerGame - 1; i >= 0; i--) {
            other = new game_player(null, false, count++, this.config);
            other.pos = this.config.gridToPixel(i, 0);
            other.setPlayerName = this.game_instance.gamecore.nameGenerator();
            other.playerPort = port;

            other.visible = false;
            other.active = false;

            this.game_instance.inRoom[port].push(other);
        }

        // create server-based events (inRoomEvents)
        ///////////////////////////////////
        // create startup events
        ///////////////////////////////////
        var evt_ec, evt_fc, evt_fs;

        // create chest spawn event        
        evt_ec = new game_event_server(this, this.config); //this);
        evt_ec.type = evt_ec.TYPE_CHEST;
        evt_ec.id = "ec"; // event chest

        // NOTE: evt.chestSpawnPoints defined asyncronously in game_core (culled from Tiled xml file)
        if (this.config.chestSpawnPoints && this.config.chestSpawnPoints.length > 0) {
            // clone spawn points
            evt_ec.chestSpawnPoints = this.config._.cloneDeep(this.config.chestSpawnPoints);
            // reset active state to false
            for (i = evt_ec.chestSpawnPoints.length - 1; i >= 0; i--)
                evt_ec.chestSpawnPoints[i].active = false;
        }
        // else its defined once chestSpawnPoints creation (see note above!)

        //console.log('evt type', evt.type);
        evt_ec.setRandomTriggerTime(25, 45);
        this.game_instance.inRoomEvents[port].push(evt_ec);
        // console.log('@ consumable events', this.game_instance.inRoomEvents[port]);

        // create flag carried cooldown event
        evt_fc = new game_event_server(this, this.config); //this);
        evt_fc.type = evt_fc.TYPE_FLAG_CARRIED_COOLDOWN;
        evt_fc.state = evt_fc.STATE_STOPPED;
        evt_fc.id = "fc"; // event flag carried
        evt_fc.repeatable = false;
        //console.log('evt type', evt.type);
        //evt.setRandomTriggerTime(25, 45);
        this.game_instance.inRoomEvents[port].push(evt_fc);

        // create flag slotted cooldown event
        // create flag carried cooldown event
        evt_fs = new game_event_server(this, this.config); //this);
        evt_fs.type = evt_fs.TYPE_FLAG_SLOTTED_COOLDOWN;
        evt_fs.state = evt_fs.STATE_STOPPED;
        evt_fs.id = "fs"; // event flag slotted
        evt_fs.repeatable = false;
        //console.log('evt type', evt.type);
        //evt.setRandomTriggerTime(25, 45);
        this.game_instance.inRoomEvents[port].push(evt_fs);
        //console.log('startup events', this.events);

        // create client cooldowns
        this.game_instance.inRoomCooldowns[port] = [
            { name: "redFlag", heldBy: null, timer: NaN, src: null, target: null },
            { name: "blueFlag", heldBy: null, timer: NaN, src: null, target: null },
            { name: "midFlag", heldBy: null, timer: NaN, src: null, target: null }
        ];

        // create server-based flags inRoomFlags [port]
        // NOTE: flagObjects defined asyncronously in game_core (culled from Tiled xml file)
        if (this.flagsDefault && this.flagsDefault.length > 0) {
            console.log('@ setting next inroomflags...');
            var flag;
            for (var x = 0; x < this.flagsDefault.length; x++) {
                flag = this.flagsDefault[x];

                flag = new game_flag(flag, null, this, this.config);
                flag.port = port;
                //flag.setter(objectgroupNode[j].object[l].$);
                // flag.id = "flg" + l.toString();
                //console.log('flag', flag);
                // _this.config.flagObjects.push(flag);

                this.game_instance.inRoomFlags[port].push(flag);

                // this.game_instance.inRoomFlags[port].push(this.flagsDefault[i]);
                // console.log('@@', this.flagsDefault[i].port);
            }
        }
        // console.log('flags!', this.game_instance.inRoomFlags[port]);

        // consumables object pool
        for (i = 20 - 1; i >= 0; i--) {
            this.game_instance.inRoomConsumables[port].push(new game_consumable(null, false, this));
        }
    } else // client
    {
        // create players on client
        var p;
        for (var l = 1; l < this.totalPlayersPerGame; l++) {
            p = new game_player(null, false, count++, this.config);
            p.playerPort = port;
            p.pos.x = l * 64;
            p.pos.y = 0;
            // this.inRoom[port].push(p);
            this.allplayers.push(p);
        }
        // create events // inRoomEvents[port]
        // create chests // inRoomConsumables[port]
        // create flags // inRoomFlags[port]
    }
};

getplayers.prototype.fromRoomNextActiveConsumable = function(port) {
    // console.log('fromRoomNextActiveConsumable', port);

    for (var i = this.game_instance.inRoomConsumables[port].length - 1; i >= 0; i--) {
        // console.log('* isactive',this.game_instance.inRoomConsumables[port][i].active);

        if (this.game_instance.inRoomConsumables[port][i].active === false) {
            this.game_instance.inRoomConsumables[port][i].active = true;
            return this.game_instance.inRoomConsumables[port][i];
        }
    }
};

getplayers.prototype.totalRooms = function() {
    console.log('== totalRooms ==');

    if (this.game_instance) {
        return Object.keys(this.game_instance.inRoom).length;
    } else {
        return Object.keys(this.inRoom).length;
    }

};
getplayers.prototype.fromAllRooms = function() {
    // console.log('* fromAllRooms', this.game_instance.inRoom);
    // if (this.game_instance)
    return this.game_instance.inRoom;
    // else return this.inRoom;
};

getplayers.prototype.roomExists = function(port) {
    if (this.game_instance) {
        return (this.game_instance.inRoom[port] !== undefined)
    } else {
        return (this.inRoom[port] !== undefined)
    }
};

getplayers.prototype.fromRoomByUserId = function(userid) {
    console.log('==getplayers.fromRoomByUserId', userid, '==');

    // we don't know the room, so we'll check them all
    var allrooms = Object.keys(this.fromAllRooms());
    var room;
    if (this.game_instance) {
        for (var h = allrooms.length - 1; h >= 0; h--) {
            room = this.fromRoom(allrooms[h]);
            for (var j = 0; j < room.length; j++) {
                if (room[j].instance && room[j].instance.userid == userid) {
                    console.log("* found room!"); //, room);
                    return room;
                }
            }
        }
    }
    // in the event user has disconnected
    return [];
}

getplayers.prototype.getRoomNameByUserId = function(userid) {
    console.log('== getplayers.getRoomNameByUserId', userid, '==');
    // we don't know the room, so we'll check them all
    var allrooms = Object.keys(this.fromAllRooms());
    var room;
    if (this.game_instance) {
        for (var h = allrooms.length - 1; h >= 0; h--) {
            room = this.fromRoom(allrooms[h]);
            for (var j = 0; j < room.length; j++) {
                if (room[j].instance && room[j].instance.userid == userid) {
                    console.log("* found room name", allrooms[h]);
                    return allrooms[h];
                }
            }
        }
    } else {
        for (h = allrooms.length - 1; h >= 0; h--) {
            room = this.fromRoom(allrooms[h]);
            for (j = 0; j < room.length; j++) {
                if (room[j].userid == userid) {
                    console.log("* found room name", allrooms[h]);
                    return allrooms[h];
                }
            }
        }
    }
};

getplayers.prototype.getPlayerByUserId = function(userid) {
    console.log('== getplayers.getPlayerByUserId', userid, '==');
    // we don't know the room, so we'll check them all
    var allrooms = Object.keys(this.fromAllRooms());
    // console.log('allrooms', allrooms);
    var room, h, j;

    if (this.game_instance) {
        for (h = allrooms.length - 1; h >= 0; h--) {
            room = this.fromRoom(allrooms[h]);
            // console.log("* room", room);
            for (j = 0; j < room.length; j++) {
                // console.log(room[j]);
                if (room[j].instance && room[j].instance.userid == userid) {
                    // console.log("* found room name", allrooms[h]);
                    return allrooms[h];
                }
            }
        }
    } else {
        for (h = allrooms.length - 1; h >= 0; h--) {
            room = this.fromRoom(allrooms[h]);
            // console.log("* room", room);
            for (j = 0; j < room.length; j++) {
                // console.log("*", room[j].userid, userid);
                if (room[j].userid == userid) {
                    // console.log("* found room name", allrooms[h]);
                    return allrooms[h];
                }
            }
        }
    }
};

getplayers.prototype.fromRoomLocalPlayer = function(port) {
    console.log('== fromRoomLocalPlayer', port, '==');

    var room = this.fromRoom(port);
    for (var i = 0; i < room.length; i++) {
        if (room[i].isLocal)
            return room[i];
    }
    return null;
};

getplayers.prototype.addToRoom = function(obj, port, type) {
    // type 1 = event
    // type 2 = chest
    // type 3 = flags array

    // console.log('== addToRoom', obj, port, type, '==');

    // var instance;

    // if (this.game_instance === undefined)
    // {
    //     instance = this;
    //     instance = this.game_instance;
    // }
    // else
    // { 
    //     console.log('server!');        

    //     instance = this.game_instance;
    // }

    switch (type) {
        case 2: // chests
            console.log('addToRoom (consumable) -->', port, obj);
            var consumables = this.game_instance.inRoomConsumables[port];
            for (var i = consumables.length - 1; i >= 0; i--) {
                if (consumables[i].active == false)
                    consumables[i].addConsumable(obj);
            }
            // this.game_instance.inRoomConsumables[port].push(obj);
            // console.log('@ total consumables:', this.game_instance.inRoomConsumables[port].length);

            break;

        case 3: // flags
            // console.log('flgs:', obj.length, obj);
            // console.log('flagObjects', this.config.flagObjects);

            if (this.flagsDefault.length === 0)
                this.flagsDefault = obj;

            // this.game_instance.inRoomFlags[port] = this.config._.cloneDeep(this.config.flagObjects);
            var flag;
            for (i = 0; i < obj.length; i++) {
                flag = obj[i];

                flag = new game_flag(flag, null, this, this.config);
                flag.port = port;
                //flag.setter(objectgroupNode[j].object[l].$);
                // flag.id = "flg" + l.toString();
                //console.log('flag', flag);
                // _this.config.flagObjects.push(flag);

                this.game_instance.inRoomFlags[port].push(flag);

                // this.game_instance.inRoomFlags[port].push(this.flagsDefault[i]);
                // console.log('@@', this.flagsDefault[i].port);
            }

            // console.log('@ total flags:', this.game_instance.inRoomFlags[port]);
            // console.log('test1', this.config.flagObjects);

            // console.log('test', this.game_instance.config.flagObjects);

            // validate that flags are saved via getRoom!
            // var test = this.fromRoom(port, 3);
            // console.log(':test:', test);

    }
};

getplayers.prototype.getNextOpenPort = function(cport) //, maxport)
    {
        console.log('== getplayers.getNextOpenPort =='); //, port, maxport);
        // we don't know the room, so we'll check them all
        var allrooms = Object.keys(this.fromAllRooms());
        // console.log('allrooms', allrooms);
        var room, h, j;

        if (this.game_instance) {
            for (h = allrooms.length - 1; h >= 0; h--) {
                // skip port already checked
                if (allrooms[h] == cport) continue;

                room = this.fromRoom(allrooms[h]);
                // console.log("* room", room);
                for (j = 0; j < room.length; j++) {
                    // console.log(room[j]);
                    if (room[j].instance) {
                        // console.log("* found room name", allrooms[h]);
                        return allrooms[h];
                    }
                }
            }
            // didn't find an open port -- server is full!
            return "full";
        }
    };

getplayers.prototype.flagsDefault = [];

module.exports = getplayers;