function core_server(core, config)
{
    console.log("== core_server constructor ==", config);
    this.core = core;
    this.config = config;

    // server update vars (optimized!)
    this.laststate = {};
    this.tickstate = {};
    this.bufView = new Array(10);//this.MAX_GAMES_PER_SERVER); // where 20 is the max number of games per server
    for (var i = 0; i < this.bufView.length; i++)
    {
        this.bufView[i] = new Array(40); // 40 players per game
        for (var j = 0; j < this.bufView[i].length; j++)
        {
            this.bufView[i][j] = new Array(11); // create a bufView for each 
        }
    }
    this.suRoom, this.suPlayer, this.suEvt, this.allrooms;
}

//Updated at 15ms , simulates the world state
core_server.prototype.server_update_physics = function() 
{
    //if (glog)
    //console.log('##-@@ server_update_physics');

    // var _this = this;

    /*
    //Handle player one
    this.players.self.old_state.pos = this.pos( this.players.self.pos );
    var new_dir = this.process_input(this.players.self);
    this.players.self.pos = this.v_add( this.players.self.old_state.pos, new_dir );

    //Handle player two (other players)
    this.players.other.old_state.pos = this.pos( this.players.other.pos );
    var other_new_dir = this.process_input(this.players.other);
    this.players.other.pos = this.v_add( this.players.other.old_state.pos, other_new_dir);

    //Keep the physics position in the world
    this.check_collision( this.players.self );
    this.check_collision( this.players.other );

    this.players.self.inputs = []; //we have cleared the input buffer, so remove this
    this.players.other.inputs = []; //we have cleared the input buffer, so remove this
    */

    // player collisions
    //for (var i = 0; i < this.getplayers.allplayers.length; i++)
    // var new_dir;
    // _.forEach(this.getplayers.allplayers, function(ply)
    // var ply, room;
    // var room = this.getplayers.fromRoom(player.playerPort);
    // for (var i = room.length - 1; i >= 0; i--)
    this.core.phyAllRooms = Object.keys(this.core.getplayers.fromAllRooms());
    for (var h = this.core.phyAllRooms.length - 1; h >= 0; h--)
    {
        this.core.phyRoom = this.core.getplayers.fromRoom(this.core.phyAllRooms[h]);
        for (var i = this.core.phyRoom.length - 1; i >= 0; i--)
        {
            this.core.phyPlayer = this.core.phyRoom[i];
            //if (ply.mp != "hp")//_this.core.players.self.mp)
            //{
            this.core.phyPlayer.old_state.pos = this.core.pos( this.core.phyPlayer.pos );
            // new_dir = this.core.process_input(ply);
            this.core.phyPlayer.pos = this.core.v_add( this.core.phyPlayer.old_state.pos, this.core.process_input(this.core.phyPlayer));//new_dir);

            //ply.update();

            //Keep the physics position in the world            
            this.core.check_collision( this.core.phyPlayer, i );
            

            //this.core.players.self.inputs = []; //we have cleared the input buffer, so remove this
            this.core.phyPlayer.inputs = []; //we have cleared the input buffer, so remove this
            //}//else console.log("HIHIHIHIHIHIH", ply.mp);
        }
    }

    // platform collisions (minus player)
    /*for (var j = 0; j < this.platforms.length; j++)
    {
        //if (this.platforms[j].state !== this.platforms[j].STATE_INTACT)
        //{
            this.platforms[j].check_collision();
        //}
    }*/
    /*_.forEach(this.chests, function(chest)
    {
        chest.check_collision();
    });*/
    //console.log(this.players.self.mp);
    // phy 2.0
    // var collisions = this.collider.detectCollisions(
    //     this.player,
    //     this.collidables
    // );
    //var collisions = this.collisionDetector.collideRect(this.players.self.ent, this.entities[5].ent);

    // if (collisions != null) {
    //     this.solver.resolve(this.player, collisions);
    // }
    //console.log(collisions);
    // if (collisions != null)
    //     this.collisionSolver.resolveElastic(this.players.self.ent, this.entities[5].ent);
}; //game_core.server_update_physics

core_server.prototype.handle_server_input = function(client, input, input_time, input_seq)
{
    //if (glog)
    //console.log('##-@@ handle_server_input');
    // if (this.server)
    // {
        var player, room;
        room = this.core.getplayers.fromRoom(client.playerPort, 0);
        if (!room) return;
        for (var h = room.length - 1; h >= 0; h--)
        {
            player = room[h];
            
            if (player.instance && player.instance.userid == client.userid)
            {
                //Store the input on the player instance for processing in the physics loop
                player.inputs.push({inputs:input, time:input_time, seq:input_seq});
                break;
            }
        }
    // }
    // if (!this.server && client.userid == this.players.self.instance.userid)
    // {
        // player_client = this.players.self;//.instance.userid);
        // console.log('self', this.players.self.instance);
    // }
}; //game_core.handle_server_input


core_server.prototype.server_update = function()
{
    // if (glog)
    // console.log('##-@@ server_update');//, this.core.getplayers.allplayers.length);//this.players.self.instance.userid, this.players.self.instance.hosting, this.players.self.host);

    // var _this = this;
    //Update the state of our local clock to match the timer
    this.config.server_time = this.core.local_time;
    // console.log('svrtime', this.config.server_time);
    
    //var host;
    //var others = [];

    /////////////////////////////////
    // process players
    /////////////////////////////////
    // var laststate = new Object();
    
    //for (var i = 0; i < this.core.getplayers.allplayers.length; i++)
    // add a, ax, ay, vx, vy
    //console.log('::',8*this.core.getplayers.allplayers.length);
    
    // var bufArr = new ArrayBuffer(768);//16 * this.core.getplayers.allplayers.length); // 16 * numplayers
    //var bufView;
    //console.log('=====================');
    //var bufArr = new ArrayBuffer(768);
    // _.forEach(_this.core.getplayers.allplayers, function(player, index)
    // var room, player;
    this.allrooms = Object.keys(this.core.getplayers.fromAllRooms());
    // this.allrooms = this.allrooms;
    // var bufView;
    // var roomsArray = [];
    for (var h = this.allrooms.length - 1; h >= 0; h--)
    {
        this.suRoom = this.core.getplayers.fromRoom(this.allrooms[h]);
        // create object for *each* room to hold players
        this.laststate[this.allrooms[h]] = {};
        
        for (var i = this.suRoom.length - 1; i >= 0; i--)
        {
            // this.suPlayer = this.suRoom[i];
            // console.log('================\n' + player.playerName);//player.playerName);
            if (!this.suRoom[i].instance) continue;//return;
            else this.suPlayer = this.suRoom[i];
            // this.bufView = [];
            // clear bufView array
            // console.log(h, i);
            while(this.bufView[h][i].length > 0) 
                this.bufView[h][i].pop();

            //inst = player.instance;
            //console.log(_this.core.getplayers.allplayers.length);
            // set player's bufferIndex
            //player.bufferIndex = index;
            //var bufArr = new ArrayBuffer(768);//16 * this.core.getplayers.allplayers.length); // 16 * numplayers
            //var bufArr = new ArrayBuffer(16 * _this.core.getplayers.allplayers.length);
            //var bufView = new Int16Array(bufArr, (index * 16), 16);
            //console.log(_this.serverPool);
            
            //_this.serverPool[index].prototype.byteLength = 768;

            /*var buffer = pool.malloc(768, "arraybuffer");
            var bufView = new Int16Array(buffer, (i * 16), 16);*/
            
            //var bufView = _this.serverPool;//(_this.bufArr, (index * 16), 16);
            // bufView.buffer = _this.bufArr;
            // bufView.byteOffset = index * 16;
            // bufView.length = 16;
            //*

            // if (player.pos.x === 0 && player.pos.y === 0) continue;//return;
            
            // bufView = player.bufferWrite(bufView, i);

            // this.bufView.length = 0;

            // var ab = new ArrayBuffer(16 * 40);
            // var bufView = new Uint8Array(ab, (i * 16), 16);
            // for (var i = 0; i < buf.length; ++i) {
            //     view[i] = buf[i];
            // }

            
            //*
            // TODO: Avoid redundancies here (send data point only *when changed*)
            // if (this.suPlayer.pos.x!==this.suPlayer.old_state.x)
            this.bufView[h][i][0] = ~~(this.suPlayer.pos.x);//.toFixed();//0);
            // if (this.suPlayer.pos.y!==this.suPlayer.old_state.y)
            this.bufView[h][i][1] = ~~(this.suPlayer.pos.y);//.toFixed();//.toFixed(0);//.fixed(2);
            this.bufView[h][i][2] = this.suPlayer.dir;
            this.bufView[h][i][3] = (this.suPlayer.flap) ? 1 : 0;
            this.bufView[h][i][4] = this.suPlayer.landed;
            this.bufView[h][i][5] = (this.suPlayer.vuln) ? 1 : 0;
            
            /* // perhaps send below data *only* on collision?
            this.bufView[h][i][6] = this.suPlayer.vx.fixed(2);
            this.bufView[h][i][7] = this.suPlayer.vy.fixed(2);
            */
            // TODO: add setter (player.flagChanged = int)
            this.bufView[h][i][8] = this.suPlayer.hasFlag;
            // TODO: buff add/remove
            if (this.suPlayer.slotDispatch)
            {
                console.log("* add/remove buff (svr)", this.suPlayer.slotDispatch);
                this.bufView[h][i][10] = this.suPlayer.slotDispatch;
                this.suPlayer.slotDispatch = null;
            }
            // bonus slot add/remove
            if (this.suPlayer.bonusSlot > 100)
            {
                this.suPlayer.bonusSlot -= 100;
                this.bufView[h][i][11] = this.suPlayer.bonusSlot;
            }
            if (this.suPlayer.score != this.suPlayer.oldscore)
            {
                this.bufView[h][i][12] = this.suPlayer.score;//(player.dead) ? 1 : 0;//player.team;
                this.suPlayer.oldscore = this.suPlayer.score;
            }
            // if (this.suPlayer.bonusDispatch)
            // {
            //     console.log("* bonusDispatch", this.suPlayer.playerName, this.suPlayer.bonusDispatch);
            //     this.bufView[h][i][13] = this.suPlayer.bonusDispatch;
            //     this.suPlayer.bonusDispatch = null;
            // }
            if (this.suPlayer.drawAbility > 0)
                this.bufView[h][i][13] = this.suPlayer.drawAbility;
            
            if (this.suPlayer.healthChanged)
            {
                this.suPlayer.healthChanged = false;
                this.bufView[h][i][14] = this.suPlayer.health;
            }
            // if (this.suPlayer.hadCollision > 0)
            // {
            //     this.bufView[h][i][12] = true;//this.suPlayer.vx;
            //     // this.bufView[h][i][13] = this.suPlayer.vy;
            //     this.suPlayer.hadCollision = 0;//false;
            // }

            // store old data, to avoid redundancy
            // this.suPlayer.old_state = this.suPlayer.pos;
            this.laststate[this.allrooms[h]][this.suPlayer.instance.userid] = this.bufView[h][i];
            this.laststate[this.allrooms[h]][this.suPlayer.mis] = this.suPlayer.last_input_seq;
            // console.log('buffer', this.laststate);
            
            //pool.free(buffer);

            // reset flap on server instance
            if (this.suPlayer.flap === true) this.suPlayer.flap = false;
            // rest abil on server instance
            // if (player.abil > 0) player.abil = 0;
            // reset killedBy
            //if (player.killedBy > 0) player.killedBy = 0;
            ///console.log(':::', player.pos);
        } // end players
    } // end rooms

    // if (!player) return;

    // pool.free(this.serverPool);
    // console.log(this.laststate);

    /////////////////////////////////
    // process platforms
    /////////////////////////////////
    //this.lastPlatformState = {};
    //for (var k = 0; k < this.platforms.length; k++)
    /*_.forEach(this.platforms, function(plat)
    {
        //if (plat.state !== plat.STATE_INTACT) // 1 is fixed/dormant
        //{
            // send: id, state, status, x, y, r(rotation?)
            //if (plat.id == undefined) console.log("HIHIHIHIHIIHIHHIIHI", plat);
            _this.laststate[plat.id] =
            {
                x: plat.x,
                y: plat.y,
                r: plat.r,
                s: plat.state,
                t: plat.type,
                p: plat.triggerer
            };
        //}
    });*/

    // process events
    //for (var l = 0; l < this.events.length; l++)

    // var evt;
    // _.forEach(this.events, function(evt)
//*
    // check events *only* on tick
    /*
    if (this.config.server_time.toFixed(1) % 1 === 0)
    {
        // console.log(this.config.server_time.toFixed(1));
        for (var m = this.allrooms.length - 1; m >= 0; m--)
        {
            // fromRoom: param 1: port number, param2: retreive events array
            this.suRoom = this.core.getplayers.fromRoom(this.allrooms[m], 1);
            // create object for *each* room to hold players
            // laststate[this.allrooms[m]] = {};
            for (var n = this.suRoom.length - 1; n >= 0; n--)
            {
                this.suEvt = this.suRoom[n];
                // evt = this.events[j];
                // console.log('* evt:', this.allrooms[m], this.suEvt.type, this.suEvt.state, this.suEvt.uid);
                
                if (this.suEvt.state !== this.suEvt.STATE_STOPPED)
                {
                    if (this.suEvt.update(this.allrooms[m]) === true)
                    {
                        console.log('add event to socket!', this.suEvt.type);
                        switch(this.suEvt.type)
                        {
                            case this.suEvt.TYPE_CHEST:
                                // var id = getUid();//_this.getUID();
                                // console.log('* event:adding chest', this.suEvt.consumableData.i);//, id);//, evt);//, evt.spawn, 'with passive', evt.passive);
                                if (this.suEvt.id == 'ec') // chest event
                                    // this.addChest(evt.consumable, this.allrooms[m]);
                                        // {
                                        //     i:id,
                                        //     x:evt.spawn.x,
                                        //     y:evt.spawn.y,
                                        //     t:evt.passive.type,
                                        //     c:evt.passive.buff,
                                        //     d:evt.passive.focus,
                                        //     h:evt.passive.health
                                        // }, this.allrooms[m]);
                                // var room = this.core.getplayers.getRoomNameByUserId(player.userid);
                                // console.log('room:', room);
                                // console.log('ls:', laststate);
                                this.laststate[this.allrooms[m]][this.suEvt.id] = this.suEvt.consumableData;
                                // {
                                //     i: id,
                                //     x: evt.spawn.x,
                                //     y: evt.spawn.y,
                                //     t: evt.passive.type,
                                //     d: evt.passive.duration,
                                //     m: evt.passive.modifier
                                // };
                            break;

                            case this.suEvt.TYPE_FLAG_CARRIED_COOLDOWN:

                                console.log('evt active carried cooldown...', this.suEvt.id, this.suEvt.timer, this.suEvt.flag.name, this.suEvt.flag.heldBy);
                                // fc: { t: 6, f: 'midFlag', p: 'cp1' } }
        
                                if (this.suEvt.flag.heldBy)
                                {
                                    // store evt.id in fromRoomByUserId
                                    // var room = this.core.getplayers.getRoomNameByUserId(evt.flag.heldBy);
                                    // laststate[room][evt.id] =
                                    this.laststate[this.allrooms[m]][this.suEvt.id] =
                                    {
                                        t: this.suEvt.timer,
                                        f: this.suEvt.flag.name,
                                        p: this.suEvt.flag.heldBy
                                    };
                                }
                            break;

                            case this.suEvt.TYPE_FLAG_SLOTTED_COOLDOWN:

                                console.log('evt active slotted cooldown', this.suEvt.id, this.suEvt.timer);//, evt);
                                // fc: { t: 6, f: 'midFlag' } }

                                if (this.suEvt.flag.heldBy)
                                {
                                    // var room1 = this.core.getplayers.getRoomNameByUserId(evt.flag.heldBy);
                                    // laststate[room1][evt.id] =
                                    this.laststate[this.allrooms[m]][this.suEvt.id] =
                                    {
                                        t: this.suEvt.timer,
                                        f: this.suEvt.flag.name
                                    };
                                }
                                break;
                        } // end switch
                    } // end update() === true
                } // end !== STATE_STOPPED
            } // end room length
        } // end this.allrooms length
    } // end tick
    //*/
    // process flags
    /*
    _.forEach(this.config.flagObjects, function(flag)
    {
        //if (flag.isHeld)
        if (flag.type=="flag")
        {
            //console.log('flags', flag);
            _this.laststate[flag.id] =
            {
                //x: flag.x,
                //y: flag.y,
                //t: flag.type,
                //h: flag.isHeld,
                //p: flag.isPlanted,
                b: flag.carrier, // mp
                s: flag.slot, // num (int)
                //v: flag.visible,
                a: flag.active, // bool
                c: flag.cooldown // int (if active is false)
                //c: JSON.stringify(flag.carryingFlag)
            };
        }
        //else console.log(flag);
    });
    //*/
    // console.log('laststate', laststate, this.gameid);
    //if (Object.keys(laststate).length === 0) return;
    
    // console.log(laststate);
    // var view = new Int16Array(this.laststate.cp1, 0, 16);
    // console.log('view', view);
    //console.log('bufview', bufView);
    
    
    //console.log('len', this.core.getplayers.allplayers.length);
    //for (var j = 0; j < this.core.getplayers.allplayers.length; j++)
    // console.log('ls', laststate);
    // var ply;
    // _.forEach(this.core.getplayers.allplayers, function(ply)
    //console.log(player);

    // ensure room tags are removed
    if (this.suPlayer)
    {
        for (var x in this.laststate)
        {
            // console.log(x, this.laststate[x]);
            this.laststate[x].t = this.config.server_time;        
            // if (Boolean(this.suPlayer.instance))
            if (this.suPlayer.instance)
            {
                // console.log("***", this.suPlayer.instance.userid, this.suPlayer.playerPort);
                this.suPlayer.instance.room(x).write(this.laststate[x]);
            }
            // else console.log("*** instance failed");//, this.suPlayer.userid);
        }
    }
    this.suPlayer = null;
    //}
        // player.instance.room(this.gameid).write(laststate);
    // else console.log('no io');
    
    // if (inst)
    // {
    //     console.log('emit');
        
    // inst.emit('onserverupdate', laststate);
    // }
    /*
    for (var k = 0; k < this.core.getplayers.allplayers.length; k++)
    {
        ply = this.core.getplayers.allplayers[k];
        if (ply.instance)// && this.core.getplayers.allplayers[j].instance != "host")
        {
            //console.log('inst', laststate['cp1']);//.userid);
            ply.instance.emit('onserverupdate', laststate);
            
            // clear socket's send buffer
            if (ply.instance.sendBuffer)
                ply.instance.sendBuffer.length = 0;
        }
    }
    //*/

    // clear laststate
    //console.log('pre', laststate);
    // pool.free(this.serverPool);
    //*
    for (var k in this.laststate) 
    {
        delete this.laststate[k];
    }
    //console.log('post', laststate);
    // this.laststate = null;
    //*/

    // check round timer
    // var roomRound;
    // for (var m = this.allrooms.length - 1; m >= 0; m--)
    // {
    //     // fromRoom: get round objects
    //     roomRound = this.core.getplayers.fromRoom(this.allrooms[m], 5);
    //     // console.log(roomRound.endtime, this.config.server_time);
    //     if (roomRound.active && this.config.server_time >= roomRound.endtime)
    //     {
    //         roomRound.active = false;
    //         console.log('ROUND HAS COMPLETED', roomRound);
    //         this.core.roundComplete(this.allrooms[m], roomRound);
    //     }
    // }
            
        // for (var n = room.length - 1; n >= 0; n--)
    
    /*for (var l in bufArr)
    {
        delete bufArr[l];
    }*/
    //console.log(typeof(bufView));
    /*
    bufView.forEach (function(item, i, arr)
    {
        console.log('#',item, i, arr);
        for (var m in arr)//.length = 0;
            console.log(typeof arr[m], arr[m]);
    });
    //*/
    //delete bufView[m];
    //bufArr.length = 0;
    //bufView = null;//.length = 0;
    //console.log('laststate', laststate, bufArr, bufView);

    //Make a snapshot of the current state, for updating the clients
    // this.laststate = {
    //     hp  : this.players.self.pos,                //'host position', the game creators position
    //     cp  : this.players.other.pos,               //'client position', the person that joined, their position
    //     his : this.players.self.last_input_seq,     //'host input sequence', the last input we processed for the host
    //     cis : this.players.other.last_input_seq,    //'client input sequence', the last input we processed for the client
    //     t   : this.config.server_time                      // our current local time on the server
    // };
    //if (glog)
    //console.log('ins', this.players.other.instance);
    /*
    //Send the snapshot to the 'host' player
    if(this.players.self.instance) {
        this.players.self.instance.emit( 'onserverupdate', this.laststate );
    }

    //Send the snapshot to the 'client' player
    if(this.players.other.instance) {
        this.players.other.instance.emit( 'onserverupdate', this.laststate );
    }
    */
}; //game_core.server_update

core_server.prototype.ticker = function(spark)
{
    // console.log("tick... tick....");

    // this.allrooms = Object.keys(this.core.getplayers.fromthis.allrooms());
    // if (!this.allrooms) return;
    // console.log(this.allrooms.length);

    for (var m = this.allrooms.length - 1; m >= 0; m--)
    {
        this.tickstate[this.allrooms[m]] = {};
        // fromRoom: param 1: port number, param2: retreive events array
        this.suRoom = this.core.getplayers.fromRoom(this.allrooms[m], 1);
        // create object for *each* room to hold players
        // laststate[this.allrooms[m]] = {};
        for (var n = this.suRoom.length - 1; n >= 0; n--)
        {
            this.suEvt = this.suRoom[n];
            // console.log('* evt:', this.allrooms[m], this.suEvt.type, this.suEvt.state, this.suEvt.uid);
            
            if (this.suEvt.state !== this.suEvt.STATE_STOPPED)
            {
                if (this.suEvt.update(this.allrooms[m]) === true)
                {
                    // console.log('* add event to socket!', this.suEvt.type);
                    switch(this.suEvt.type)
                    {
                        case this.suEvt.TYPE_CHEST:
                            if (this.suEvt.id == 'ec') // chest event
                            this.tickstate[this.allrooms[m]][this.suEvt.id] = this.suEvt.consumableData;
                        break;

                        case this.suEvt.TYPE_FLAG_CARRIED_COOLDOWN:
                            // console.log('evt active carried cooldown...', this.suEvt.id, this.suEvt.timer, this.suEvt.flag.name, this.suEvt.flag.heldBy);
                            if (this.suEvt.flag.heldBy)
                            {
                                this.tickstate[this.allrooms[m]][this.suEvt.id] =
                                {
                                    t: this.suEvt.timer,
                                    f: this.suEvt.flag.name,
                                    p: this.suEvt.flag.heldBy
                                };
                            }
                        break;

                        case this.suEvt.TYPE_FLAG_SLOTTED_COOLDOWN:
                            console.log('evt active slotted cooldown', this.suEvt.id, this.suEvt.timer);
                            if (this.suEvt.flag.heldBy)
                            {
                                this.tickstate[this.allrooms[m]][this.suEvt.id] =
                                {
                                    t: this.suEvt.timer,
                                    f: this.suEvt.flag.name
                                };
                            }
                            break;
                    } // end switch
                } // end update() === true
            } // end !== STATE_STOPPED
        } // end room length

        // check round timer
        var roomRound;
        for (m = this.allrooms.length - 1; m >= 0; m--)
        {
            // fromRoom: get round objects
            roomRound = this.core.getplayers.fromRoom(this.allrooms[m], 5);
            // console.log(roomRound.endtime, this.config.server_time);
            if (roomRound.active && this.config.server_time >= roomRound.endtime)
            {
                roomRound.active = false;
                console.log('ROUND HAS COMPLETED', roomRound);
                this.core.roundComplete(this.allrooms[m], roomRound);
            }
        }

    } // end this.allrooms length
    // console.log("* state", this.tickstate);
    for (var x in this.tickstate)
    {
        // console.log('* tickstate', x, this.tickstate[x]);
        // this.tickstate[x].t = this.config.server_time;
        if (Object.keys(this.tickstate[x]).length > 0)
        {
            // console.log('* tickstate', x, this.tickstate[x]);
            spark.room(x).write([100, this.tickstate[x]]);
        }
    }
    for (var k in this.tickstate) 
    {
        delete this.tickstate[k];
    }

}
// Object.prototype.getLength = function()
// {
    // return Object.keys(this.length);
// }

module.exports = core_server;