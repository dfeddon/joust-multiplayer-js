/*jslint
    this
*/

"use strict";

var config = require('./class.globals');

Number.prototype.fixed = function(n) { n = n || 3; return parseFloat(this.toFixed(n)); };
function game_player(player_instance, isHost, pindex)
{
    console.log('game_player');//, game_instance, player_instance);
    //Store the instance, if any
    // ## NOTE: only server sends instance, not clients!!
    if (player_instance) console.log('** server added player (with instance)');
    else console.log('** added player (without instance)');
    //if (isGhost) console.log('** ^ player is ghost, adding to ghost store');

    var self = this;

    this.instance = player_instance;
    //this.game = game_instance;
    this.isBot = false;

    this.player_abilities_enabled = false;

    //Set up initial values for our state information
    //this.pos = { x:0, y:0 };

    this.lpos = this.pos;
    this.size = { x:64, y:64, hx:64, hy:64 };//{ x:64/2, y:64/2, hx:64/2, hy:64/2 };
    this.hitbox = {w:64/2,h:64/2};
    this.dir = 0; // 0 = right, 1 = left (derek added)

    // velocity
    this.vx = 0; // velocity (derek added)
    this.vy = 0;

    // acceleration
    this.ax = 0;
    this.ay = 0;

    // mass
    this.m = 0.1; // kg
    // angle
    this.a = 0; // -90, 0, 90
    this.thrust = 0.0625; // 0 = 0.0625, 250 = 0.125, 500 = 0.25
    this.thrustModifier = 0;

    this.flap = false; // flapped bool (derek added)
    this.landed = 1; // 0=flying, 1=stationary, 2=walking
    this.supportingPlatformId = "none"; // id of platform on which player is standing
    this.tmd = null;
    this.nw = 0;
    this.sw = 0;
    this.ne = 0;
    this.se = 0;
    this.e = 0;
    this.w = 0;
    this.n =0;
    this.s = 0;
    this.c = 0;
    this.visible = true;
    this.active = false;
    this.state = 'not-connected';
    //this.color = 'rgba(255,255,255,0.1)';
    this.info_color = 'rgba(255,255,255,0.1)';
    //this.id = '';
    this.engaged = false;
    this.vuln = false;
    this.bubble = false;
    this.dying = false;
    //this.stunLen = 500; // 1.5 sec

    this.isLocal = false;
    this.bufferIndex = undefined;//0;

    if (isHost && player_instance)// && player_instance.host)
    {
        console.log('WE GOT SERVER HOST!', player_instance.userid);
        this.mp = 'hp';
        this.mis = 'his';
    }
    else {
        this.mp = 'cp' + pindex;//(getplayers.allplayers.length + 1);
        this.mis = 'cis' + pindex;//(getplayers.allplayers.length + 1);
        //delete getplayers.allplayers;
    }

    // assign pos and input seq properties
    //Our local history of inputs
    this.inputs = [];

    //The world bounds we are confined to
    this.pos_limits = {
        x_min: 0,//this.size.hx,
        x_max: config.world.width - this.size.hx,
        y_min: 0,//this.size.hy,
        y_max: config.world.height - this.size.hy
    };

    //The 'host' of a game gets created with a player instance since
    //the server already knows who they are. If the server starts a game
    //with only a host, the other player is set up in the 'else' below
    //this.pos = { x:Math.floor((Math.random() * config.world.width - 64) + 64), y:128};//config.world.height-this.size.hy };
    this.pos = {x: 0, y: 0};
    //These are used in moving us around later
    this.old_state = {pos:this.pos};
    this.cur_state = {pos:this.pos};
    this.state_time = new Date().getTime();

    this.team = 0; // 1 = red, 2 = blue
    this.level = 1; // 1:256, 2:512, 3:1024, 5:2048, 6:4096, etc.
    this.mana = 0;
    this.pointsTotal = 0;
    //this.levels = [0,128,256,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.levels = [0,50,100,512,1024,2048,4096,8196,16392,32784,65568,131136];
    this.progression = 0;// 0, 250, 500
    this.abilities = []; // 0:none 1:burst
    this.abilities.push({label:"burst", id:1, cd: 5000, t:0});
    this.ability = 0; // abilities index (-1 means no ability available)
    this.abil = 1;
    this.buffs = [];
    this.debuffs = [];
    this.potions = [];
    this.cooldown = false;

    this.hasHelment = false;//true;
    this.hasFlag = 0; // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
    this.flagTakenAt = 0;
    this.disconnected = false;
    //this.carryingFlag = null;

    this.playerName = "";
    this.playerSprite = "roundRooster";
    return;
    if (!config.server)
    {
        // function transparency(img)
        // {
        //     var len = img.data.length;
        //     console.log('len',len);
        //     for (var i = 3; i < len; i+=4)
        //         img.data[i] = 0;
        //     return img;
        // }
        // var flipImage = function(image, ctx, flipH, flipV)
        // {
        //     var scaleH = flipH ? -1 : 1, // Set horizontal scale to -1 if flip horizontal
        //         scaleV = flipV ? -1 : 1, // Set verical scale to -1 if flip vertical
        //         posX = flipH ? 64 * -1 : 0, // Set x position to -100% if flip horizontal
        //         posY = flipV ? 64 * -1 : 0; // Set y position to -100% if flip vertical
        //
        //     ctx.save(); // Save the current state
        //     ctx.scale(scaleH, scaleV); // Set scale to flip the image
        //     ctx.drawImage(image, posX, posY, 64, 64); // draw the image
        //     ctx.restore(); // Restore the last saved state
        //     return ctx;
        // };

        // function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight)
        // {
        //     var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        //     return ratio;
        // }
        var src1 = document.getElementById('ss1');
        var src2 = document.getElementById('ss2');

        var cvs1 = document.createElement('canvas');//('canvas_' + y.toString());
        cvs1.width = 2000;
        cvs1.height = 2000;
        cvs1.x=0;
        cvs1.y=0;
        var cvs2 = document.createElement('canvas');//('canvas_' + y.toString());
        cvs2.width = 2000;
        cvs2.height = 2000;
        cvs2.x=0;
        cvs2.y=0;

        var ctx1 = cvs1.getContext('2d');
        //ctx.scale(0.5,0.5);
        ctx1.drawImage(src1, 0, 0);
        var ctx2 = cvs2.getContext('2d');
        ctx2.drawImage(src2, 0, 0);

        var imgCvs = document.createElement('canvas');
        imgCvs.width = 62;
        imgCvs.height = 57;
        imgCvsCtx = imgCvs.getContext('2d');

        var getImg;
        this.playerSprite = "brownDragon";
        switch(this.playerSprite)
        {
            case "roundRooster":

                // glide right
                getImg=ctx1.getImageData(10,7,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(926,7,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(926,7,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(10,7,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(260,7,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(260,7,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(260,95,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(260,95,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

            break;

            case "brownFishlike":

                // glide right
                getImg=ctx1.getImageData(10,173,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(926,173,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(926,173,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(10,173,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(260,173,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(260,173,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(260,266,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(260,266,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

            break;

            case "greenRound":
                // glide right
                getImg=ctx1.getImageData(10,339,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(926,339,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(926,339,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(10,339,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(260,339,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(260,339,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(260,428,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(260,428,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

            break;

            case "redScreamer":
                // glide right
                getImg=ctx1.getImageData(3,506,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');
                /*var ratio = calculateAspectRatioFit(this.glideRight.width,this.glideRight.height,64,64);
                console.log('ratio', ratio);
                this.glideRight.width*=ratio;
                this.glideRight.height*=ratio;*/

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(919,506,77,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(502,506,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(420,506,77,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(252,506,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(252,506,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(252,607,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(252,607,77,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                this.size.hx = 77;
                this.size.hy = 57;

            break;

            case "brownDragon":
                // glide right
                getImg=ctx1.getImageData(10,673,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(926,673,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(926,673,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(10,673,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(260,673,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(260,673,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(260,768,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(260,768,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

            break;

            case "greenSpotter":
                // glide right
                getImg=ctx1.getImageData(10,840,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideRight = new Image();
                this.glideRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // glide left
                //imgCvsCtx.clearRect(0, 0, imgCvs.width, imgCvs.height);
                getImg = ctx2.getImageData(926,840,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.glideLeft = new Image();
                this.glideLeft.src = imgCvs.toDataURL('image/png');

                // flap right
                getImg=ctx1.getImageData(926,840,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapRight = new Image();
                this.flapRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // flap left
                getImg = ctx2.getImageData(10,840,62,57);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.flapLeft = new Image();
                this.flapLeft.src = imgCvs.toDataURL('image/png');

                // stand right
                getImg=ctx1.getImageData(260,840,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standRight = new Image();
                this.standRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // stand left
                getImg=ctx2.getImageData(260,840,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.standLeft = new Image();
                this.standLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable right
                getImg=ctx1.getImageData(260,943,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnRight = new Image();
                this.vulnRight.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

                // vulnerable left
                getImg=ctx2.getImageData(260,943,62,57);//35,13,128,128);
                imgCvsCtx.putImageData(getImg, 0, 0);
                this.vulnLeft = new Image();
                this.vulnLeft.src = imgCvs.toDataURL('image/png');//cvs.toDataURL('image/png');

            break;
        }

        // gc
        cvs1 = null;
        cvs2 = null;
        imgCvs = null;
        //src1.parentNode.removeChild(src1);
        src1 = null;
        src2 = null;
        //console.log('::',src1);
        /*
        // spritesheet
        var playerSheet = document.getElementById('ss1');
        // cells
        var playerCells = [ { left:1013, top:7, width:128, height:131} ];

        // behaviors
        var glideRightBehavior = new CellSwitchBehavior
        (
            playerCells, // array of rectangles in the sheet
            1000, // duriation in ms
            function(sprite, now, fps, lastAnimationFrameTime) // trigger
            {
                return this.glideRight;
            },
            function(sprite, animator) // callback
            {
                return this.glideRight;
            }
        );

        // animation
        this.animation = new Sprite(
            'player', // type
            new SpriteSheetArtist( // artist
                playerSheet, // spritesheet
                playerCells // *all* cells
            ),
            [ // behaviors
                glideRightBehavior,
                // this.glideLeft,
                // this.flapRight,
                // this.flapLeft,
                // this.stunRight,
                // this.stunLeft,
                // this.dieRight,
                // this.disabledLeftTrackImage
            ]
        );
        console.log('animate', this.animation);*/
    }
    //this.lastNamePlate = "YOU";
} // end game_player constructor

game_player.prototype.pos = { x: 0, y: 0 };
game_player.prototype.pos.x = 0;
game_player.prototype.pos.y = 0;
game_player.prototype.dead = false;
// game_player.prototype.setFlag = function(int) // 0 = none, 1 = midflag, 2 = redflag, 3 = blueflag
// {
//     console.log('player.setFlag', int);
//     this.hasFlag = int;
// };
game_player.prototype.botAction = function()
{
    console.log('== botAction ==');
    
    // A: left down
    // B: left up
    // C: right down
    // E: right up
    // u: flap down
    // x: flap up
    if (config.keyboard)
    config.keyboard._onKeyChange({keyCode:39}, false);
    //document.externalControlAction(data);
};

game_player.prototype.doFlap = function()
{
    //console.log('doFlap', this.dir);

    // set flap flag
    this.flap = true;
    // if (!config.server)
    // this.glideRight = true;

    // clear landed flag
    this.landed = 0;
    //console.log('a', this.a);

    //if (vy < -6)
    //console.log('vy1', this.vy);
    // if (this.vy > 0)
    // this.vy -= (this.thrust + this.thrustModifier) * 5;
    // else
    this.vy = -(this.thrust + this.thrustModifier) * 5;
    //console.log('vy2', this.vy);
    if (this.a !== 0)
        this.vx = (this.thrust + this.thrustModifier);///10;
    //console.log('vx', this.vx, 'vy', this.vy);

    /*this.ax = Math.cos(this.a) * this.thrust * 10;
    this.ay = Math.cos(this.a) * this.thrust * 10;

    if (this.dir === 1)
    {
        //this.ax = -(this.ax);
        this.vx += this.ax;
    }
    else {
        this.vx += this.ax;
    }

    // increase velocity
    this.vy -= this.ay;*/
    //this.vy = -1;

    // console.log('=====================');
    // console.log('a', this.a, 'dir', this.dir);
    // console.log('ax', this.ax);
    // console.log('ay', this.ay);
    // console.log('vx', this.vx);
    // console.log('vy', this.vy);
    // console.log('=====================');

};

game_player.prototype.doLand = function()
{
    //console.log('=== player.doLand', this.mp, '===', this.vx);//, this.vy);

    // if falling fataly fast...
    if (this.vy > 10)
    {
        console.log('fatal bounce!', this.vy);
        
        this.vy = 0;
        this.doKill();
        return;
    }
    // ...survivably fast
    if (this.vy > 6)
    {
        console.log('* bounce up!', this.vy);
        // set length of vulnerability based on how hard player hits
        var len = 1500 + ((this.vy - 6) * 1000);
        // impact drag
        this.vy = this.vy/2;
        // bounce
        this.vy *= -1;
        // set vulnerability
        this.isVuln(len);
        //this.a *= -1;
        return;
    }

    // decelerate
    if (this.vx > 0)
    {
        // console.log('* slowing +', this.vx);

        // slow horizontal velocity
        //this.vx -= 200;

        // set landing flag (moving)
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx -= 0.025.toFixed(2); // friction

        if (this.vx < 0)
        {
            this.vx = 0;
            //this.vy = 25;
            this.landed = 1;
            this.a = 0;
        }
    }
    else if (this.vx < 0)
    {
        //console.log('* slowing -', this.vx);
        
        //this.vx += 200;
        this.landed = 2; // walking
        this.vy = -0.25; // prevents jolting falloff
        this.vx += 0.025.toFixed(2); // friction

        if (this.vx > 0)
        { 
            this.vx = 0;
            this.landed = 1;
            this.a = 0;
        }
    }
    if (this.vx === 0)
    {
        // stuck landing (no velocity)
        this.vx = 0;
        //this.vy = 25;
        // set landing flag (stationary)
        this.landed = 1;
        this.a = 0;
    }

    // if (this.isLocal && !config.server)
    // {
    //     config.client_process_net_prediction_correction2();
    // }
    //if (this.mp == config.players.self.mp)
    //if (this.landed === 2)
	    //console.log('* data', this.vx, 'vy', this.vy, 'a', this.a);
    //else if (this.landed === 1 && this.mp == "cp1") console.log('landed', this.pos.x, this.pos.y);
    
};

game_player.prototype.doWalk = function(dir)
{
    //console.log('walking...', dir, this.ax, this.vx, this.a, this.vy);
    this.landed = 2; // walking

    /*if (dir === 0)
        this.a = 90;
    else this.a = -90;*/
    this.vx = this.thrust;
};

game_player.prototype.takeFlag = function(flag, flagType)
{
    console.log('===player.takeFlag', flag.name, flagType, '===');//, flag, this.team);
    // if (this.team === 1 && flagType === 2) return;
    // if (this.team === 2 && flagType === 3) return;

    //console.log('player.takeFlag', flag.id, flagType, flag.name, flag.sourceSlot, flag.targetSlot);

    /*var cooldown = config._.find(config.clientCooldowns, {"flag":flag.name});
    cooldown.heldBy = this.mp;
    cooldown.timer = NaN;*/

    /*this.hasFlag = flagType;
    this.flagTakenAt = config.server_time;
    this.carryingFlag = flag;*/

    //this.hasFlag = flagType;

    // disable bubble
    if (this.bubble) this.bubble = false;

    // speed modifier (slow down)

    // set target slot
    /*switch(flag.sourceSlot)
    {
        case "midSlot":
            if (this.team === 1) flag.targetSlot = "slot6";
            else flag.targetSlot = "slot5";
        break;

        case "slotRed":
            flag.targetSlot = "slot1";
        break;

        case "slotBlue":
            flag.targetSlot = "slot10";
        break;

        case "slot1":
            if (this.team === 1) flag.targetSlot = "slotRed";
            else flag.targetSlot = "slot2";
        break;

        case "slot2":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot1";
                else flag.targetSlot = "slot3";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot3";
                else flag.targetSlot = "slot1";
            }
        break;

        case "slot3":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot2";
                else flag.targetSlot = "slot4";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot4";
                else flag.targetSlot = "slot2";
            }
        break;

        case "slot4":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot3";
                else flag.targetSlot = "slot5";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "slot5";
                else flag.targetSlot = "slot3";
            }
        break;

        case "slot5":
            if (flag.name == "redFlag")
            {
                if (this.team === 1) flag.targetSlot = "slot4";
                else flag.targetSlot = "slot6";
            }
            else // mid flag
            {
                if (this.team === 1) flag.targetSlot = "midSlot";
                else flag.targetSlot = "slot4";
            }
        break;

        // blue territory

        case "slot6":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot7";
                else flag.targetSlot = "slot5";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "midSlot";
                else flag.targetSlot = "slot7";
            }
        break;

        case "slot7":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot8";
                else flag.targetSlot = "slot6";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot6";
                else flag.targetSlot = "slot8";
            }
        break;

        case "slot8":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot9";
                else flag.targetSlot = "slot7";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot7";
                else flag.targetSlot = "slot9";
            }
        break;

        case "slot9":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slot10";
                else flag.targetSlot = "slot8";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot8";
                else flag.targetSlot = "slot10";
            }
        break;

        case "slot10":
            if (flag.name == "blueFlag")
            {
                if (this.team === 2) flag.targetSlot = "slotBlue";
                else flag.targetSlot = "slot9";
            }
            else // mid flag
            {
                if (this.team === 2) flag.targetSlot = "slot9";
                else flag.targetSlot = "slotBlue";
            }
        break;
    }
    // set target locally
    console.log('* sourceSlot', flag.sourceSlot, 'targetSlot', flag.targetSlot);*/
    //flag.targetSlot = flag.getTargetSlot

    // if (!config.server)
    // {
    //     // show toast
    //     new game_toast().show();
    // }
    // else
    // {
    //     console.log('* socket emit', flag.targetSlot);
    //     // inform socket
    //     for (var l = 0; l < getplayers.allplayers.length; l++)
    //     {
    //         // dispatch flagremove socket event
    //         if (getplayers.allplayers[l].instance && getplayers.allplayers[l].mp != this.mp)
    //         {
    //             //console.log('flag sent', flag.name);
    //             //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
    //             getplayers.allplayers[l].instance.send('f.r.'+this.mp+"|"+flag.name+"|"+this.flagTakenAt);//_this.laststate);
    //         }
    //     }
    //     // update clientCooldowns objs
    //     var cd = config._.find(config.clientCooldowns, {"name":flag.name});
    //     //console.log(config.clientCooldowns);
    //     cd.heldBy = this.mp;
    //     cd.src = flag.sourceSlot;
    //     cd.target = flag.targetSlot;
    //     //console.log('cooldown obj');

    //     // start cooldown
    //     // get event by id "fc" (flag carried)
    //     var evt = config._.find(config.events, {'id':"fc"});
    //     evt.flag = flag;
    //     //console.log('got evt', evt);
    //     evt.doStart();
    //     // call event.doStart() to begin 60 second cooldown
    // }
};

// game_player.prototype.removeFlag = function(success, slot, flag)
// {
//     console.log('===player.removeFlag', success, slot.name, flag.name);

//     if (success) // succesfully slotted flag in appropriate placque
//     {
//         flag.x = slot.x - (slot.width/2);
//         flag.y = slot.y - (slot.height/2);
//         flag.sourceSlot = slot.name;
//         console.log('* sourceSlot', flag.sourceSlot);
//         //flag.isActive = false;
//         // note: targetSlot will be defined when flag is taken!

//         console.log('* socket emit', slot);
//         // inform socket
//         for (var l = 0; l < getplayers.allplayers.length; l++)
//         {
//             if (getplayers.allplayers[l].instance && getplayers.allplayers[l].mp != this.mp)
//             {
//                 //console.log('flag sent', slot);
//                 //this.allplayers[l].instance.send('o.r.' + rid + '|' + player.mp);//, k );
//                 getplayers.allplayers[l].instance.send('f.a.'+this.mp+"|"+slot.name+"|"+flag.name);//_this.laststate);
//             }
//         }

//         // revise territory
//         /*
//         if (config.server)
//         {
//             console.log('emit territory change data');
//         }
//         */
//         if (!config.server)
//         {
//             config.updateTerritory();

//             // start flag-slotted cooldown event
//         }
//     }
//     var flagObj = config._.find(config.flagObjects, {"name":flag.name});
//     flagObj.reset(success);//, config.server_time);
//     this.hasFlag = 0;
//     //this.carryingFlag = null;
// };

game_player.prototype.collision = false;
game_player.prototype.hitFrom = 0;
game_player.prototype.target = null;
game_player.prototype.update = function()
{
    //console.log('== player.update ==', config.server, this.isBot, this.mp);
    // if (config.server && this.isBot)
    // {
    //     this.botAction();
    // }
    // ensure tilemap data is loaded (locally)
    if (!this.tmd) this.tmd = config.tilemapData;
    if (this.landed === 1)
    {
        if (this.collision === false)
        {
            // reset angle
            this.a = 0;

            // force stoppage
            this.vx = 0;
            this.vy = 0;

            // get out
            //if (this.hitFrom==-1)
            return;
        }
        else this.landed = 2;
    }


    this.vy += config.world.gravity;//.fixed(2);///5;
    // 40 = slow, 30 = medium, 25 = fast
    this.vx = ((this.a/40) * Math.cos(this.thrust + this.thrustModifier));//.fixed(2);

    this.pos.y += this.vy.fixed(2);

    // /10 = slower /25 = faster /50 = fast
    this.pos.x += this.vx.fixed(2);//((this.a/25) * Math.cos(this.vx));
    //console.log('vs', this.vx, this.vy);

    //if (this.pos.x < 165) this.vx *=-1;
    //else
    if (this.collision === true)
    {
        console.log('collision', this.hitFrom);
        
        switch(this.hitFrom)
        {
            case 0: // from the side
                this.vx *= -1;
                this.a *= -1;
                //this.collision = false;
                //if (!this.vuln)
                    //this.isVuln();
                //console.log('vx', this.vx);
            break;
            case 1: // from below
                //this.vx *= -1;
                //this.a *= -1;
                this.vy *= -1;
                this.isVuln(750);
                //this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 2: // from above
                //this.vx *= -1;
                console.log('hit speed', this.vy);
                this.vy = 0;
                //this.vx *= -1;
                this.a = 0;//*= -1;
                //this.collision = false;
                //console.log('vx', this.vx);
            break;
            case 3: // opponent
                console.log('opponent', this.target.mp);
                //this.target.vx *= -1;
                console.log('pre', this.vx, this.a);
                
                this.vx *= -1;
                this.vy *= -1;
                this.a *= -1;

                // if opponent is stationary, move him
                if (this.target.landed === 1)
                    this.target.landed = 2;//this.target.update();

                // bump
                if (this.pos.x > this.target.pos.x)
                    this.pos.x += this.size.hx/2;
                else this.pos.x -= this.size.hx/2;
                //this.vuln = true;
                console.log('post', this.vx, this.a);

                //this.isVuln(500);
                //this.target.isVuln(500);
                
                break;
                
        }
        // reset vars
        this.collision = false;
        this.hitfrom = -1;
        this.target = null;
    }
    else this.vx *= 1;

    this.pos.x = this.pos.x.fixed(2);
    this.pos.y = this.pos.y.fixed(2);
    this.vx = this.vx.fixed(2);
};

game_player.prototype.setAngle = function(a)
{
    if (a === 0) // right
    {
        if (this.a > 90)
            this.a = 90;
        //else if (this.a < 0)
        else this.a+=2;
    }
    else // left
    {
        if (this.a < - 90)
            this.a = -90;
        else this.a-=2;
    }
    //console.log('a', this.a);
};

game_player.prototype.doStand = function(id)
{
    console.log('doStand', id);
    // id = platform id
    this.supportingPlatformId = id;
};

game_player.prototype.doKill = function(victor)
{
    console.log('playerKill', this.mp);
    if (victor) console.log('by', victor.mp, 'dead?', this.dead);
    this.active = false;

    // avoid reduncancy
    if (this.dying === true) return;
    else this.dying = true;

    console.log('player dying', this.mp);

    this.dead = true;

    // if (victor && victor.mp == this.mp)
    //     console.log('IHAVEDIED!!!!!!!!!!');

    // apply red flash fx
    //config.flashBang = 2;d

    // store current position
    var waspos = this.pos;

    // stop movement
    this.vx = 0;
    this.vy = 0;
    this.a = 0;

    // remove bubble
    this.bubble = false;

    if (this.mp == config.players.self.mp)
    {
        config.players.self.vx = 0;
        config.players.self.vy = 0;
        config.players.self.a = 0;
        config.players.self.dead = true;
        config.players.self.vuln = true;
    }

    // if carrying flag, drop it
    if (this.hasFlag)
    {
        this.dropFlag();

        if (this.mp == config.players.self.mp)
            config.players.self.dropFlag();
    }

    //this.pos = config.gridToPixel(2, 2);

    // splatter "orbs of death"
    /*
    var size, c, ox, oy, id, neworb;
    var colors = ['white'];
    for (var x = 0; x < 50; x++)
    {
        size = Math.floor(Math.random() * 8) + 3;
        c = colors[Math.floor(Math.random() * colors.length)];
        // TODO: Avoid barriers
        ox = waspos.x + Math.floor(Math.random() * 100) + 1;
        ox *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
        oy = waspos.y + Math.floor(Math.random() * 20) + 1;
        oy *= Math.floor(Math.random()*2) == 1 ? 1 : -1; // + or - val
        id = Math.floor(Math.random() * 5000) + 1;

        neworb = {id:id, x:ox, y:oy, c:c, w:size, h:size, r:false};
        config.orbs.push( neworb );
    }
    console.log('total orbs', config.orbs.length);//, this.orbs);
    //*/

    // show splatter locally
    /*if (!config.server)
        config.prerenderer();*/

    if (victor)
    {
        console.log(this.mp, 'slain by', victor.mp);

        // var victim = this.mp.replace ( /[^\d.]/g, '' );
        // this.killedBy = parseInt(victim);
        // console.log(victor.mp, 'killed player', this.killedBy);
        
        // assign victor 50% of victim's speed

        // toast or death log
        
        // temporarily have camera follow victor
        //config.players.self = victor;
    }

    // dim game screen (alpha overlay)

    // set timer to reset player dead state
    setTimeout(this.timeoutRespawn.bind(this, victor), 2000);
};

game_player.prototype.timeoutRespawn = function(victor)
{
    console.log('player dead complete', this.disconnected);

    if (this.disconnected)
    {
        this.dead = false;
        this.dying = false;
        //this.vuln = true; // this disables input
        // this.active = true;
        this.landed = 1;
        this.bubble = false;
        this.pos = config.gridToPixel(0,0);

        if (this.mp == config.players.self.mp)
        {
            var ui = document.getElementById('splash');
            ui.style.display = "block";
        }

        return;
    }

    // ...otherwise, not disconnected. Player can respawn...
    
    this.dead = false;
    this.dying = false;
    //this.vuln = true; // this disables input
    this.active = true;
    this.landed = 1;
    this.bubble = false;
    this.pos = config.gridToPixel(3,4);

    if (this.mp == config.players.self.mp)
    {
        config.players.self = this;
        // config.players.self.visible = false;
        // config.players.self.pos = config.gridToPixel(3,4);
        // config.players.self.dead = false;
        // config.players.self.landed = 1;

        if (!config.server)
        {
            config.players.self.visible = false;
            config.players.self.active = false;
            config.players.self.pos = config.gridToPixel(3,4);
            config.players.self.dead = false;
            config.players.self.landed = 1;

            var ui = document.getElementById('splash');
            ui.style.display = "block";
        }

    }
    else // not self
    {
        //this.visible = false;
    }

    // // show respawn screen (ads)
    // if (!config.server && victor.mp != config.players.self.mp)
    // {
    //     var ui = document.getElementById('splash');
    //     ui.style.display = "block";
    // }
};

game_player.prototype.setPassive = function(data)//type, duration, modifier)
{
    console.log('setPassive', this.mp, data);

    switch(data.t)
    {
        case 1: // speed boost
            this.updateProgression(10);
        break;

        case 2: // bubble
            this.bubble = true;
        break;
    }
};

game_player.prototype.doCycleAbility = function()
{
    // no abilities (level 1)
    if (this.ability === -1) return;

    console.log('Next Ability');
    // if last ability selected, roll over to first
    if (this.ability === this.abilities.length - 1)
        this.ability = 0;
    // otherwise, get next ability
    else this.ability++;
    //console.log(this.ability, this.abilities.length, this.abilities[this.ability]);
};

game_player.prototype.doAbility = function()
{
    console.log('doAbility', this.mp);
    // first ensure player is not vulnerable, has no abilities, or on global cooldown
    console.log(this.vuln, this.ability, this.cooldown);
    if (this.vuln === true || this.ability === -1 || this.cooldown === true) return;

    // check for ability cooldown
    //console.log(new Date(this.abilities[this.ability].t).getTime(), new Date().getTime());//.getSeconds());
    if (this.abilities[this.ability].t !== 0 && new Date(this.abilities[this.ability].t).getTime() > new Date().getTime())
    {
        console.log('ability on cooldown...');//, this.abilities[this.ability].t, new Date().getSeconds());
        return;
    }

    var _this = this;

    // next, check for active buffs/debuffs
    //console.log(this.abilities);
    //console.log(this.ability);
    console.log('Fire Ability', this.abilities[this.ability]);

    // engage player
    if (this.engaged === false && this.isLocal)
        this.isEngaged(5000);

    // set ability index
    this.abil = this.abilities[this.ability].id;

    // activate ability
    switch(this.abilities[this.ability].label)
    {
        case "burst":
            //this.abil = 1;
            console.log('bursting!!', this.x_dir, this.mp, config.playerspeed);
            //if (this.dir === 0)
                //this.x_dir += 500;//this.pos.x += this.size.hx + 150;
            //else this.ax -= 100;//this.pos.x -= 150;
            this.vx += 500;
            console.log('post!!', this.x_dir, this.mp, config.playerspeed);

            //if (this.isLocal) config.players.self.pos.x = this.pos.x;
            // start cooldown
        break;

        case "blink":
            //console.log('blinking', this.dir);
            //this.abil = 2;
            // start cooldown
            if (this.dir === 0)
                this.pos.x += 150;
            else this.pos.x -= 150;
        break;

        case "grapple":
        break;

        case "anchor":
        break;

        case "frost":
        break;

        case "cinder":
        break;

        case "confusion":
        break;

        default:
            console.log('ERROR: unknown ability!');
    }

    // start 3 second global cooldown (for non-channelling abilities)
    if (this.abilities[this.ability].cd >= 1000)
    {
        this.cooldown = true;
        setTimeout(_this.timeoutGlobalCooldown, 3000);
    }

    // start ability cooldown
    var d = new Date();
    // if cooldown in seconds, else milliseconds
    if (this.abilities[this.ability].cd >= 1000)
        this.abilities[this.ability].t = d.setSeconds(d.getSeconds() + (this.abilities[this.ability].cd / 1000));
    else this.abilities[this.ability].t = d.setSeconds(0, d.getSeconds() + this.abilities[this.ability].cd);
    //console.log('cd', this.abilities[this.ability].cd, this.abilities[this.ability].t);
};

game_player.prototype.timeoutGlobalCooldown = function()
{
    console.log('off global cooldown');
    this.cooldown = false;
};

game_player.prototype.updateProgression = function(val)
{
    console.log('updating progression', this.progression, val);

    if (val > 0)
    {
        this.progression += val;
        this.pointsTotal += val;

        this.thrustModifier = this.progression * 0.00025;
    }
    else
    {
        this.progression -= val;
    }
};

game_player.prototype.updateMana = function(val)
{
    //console.log('update mana', val);

    // does user have mana booster?

    if (val > 0)
    {
        this.mana += val;
        this.pointsTotal += val;
    }
    else
    {
        this.mana -= val;
        this.progression = this.mana;
        return;
    }
    // calculate level, progression and mana stores
    if (this.pointsTotal < this.levels[1])
    {
        this.level = 1;
        this.progression = this.mana;
    }
    else if (this.level === 1 && this.pointsTotal > this.levels[1])
    {
        console.log('** level up 2!');
        this.level = 2;
        this.abilities.push({label:"burst", id:1, cd: 5000, t:0});
        this.ability = 0; // set default to 'burst'

        //this.ability = 0;
        // this.abilities.push({label:"burst"});
        // cd = cooldown, gc = global cooldown, t = time last used (for cd)
        this.abilities.push({label:"frost", id:2, cd: 250, gc:false, t:0});
        this.abilities.push({label:"blink", id:3, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"grapple", id:4, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"anchor", id:5, cd: 5000, gc:true, t:0});
        this.abilities.push({label:"cinder", id:6, cd: 250, gc:false, t:0});
        this.abilities.push({label:"confusion", id:7, cd: 60000, gc:true, t:0});

        // update progression
        this.progression = this.mana;
    }
    else if (this.level === 2 && this.pointsTotal > this.levels[2])
    {
        console.log('** level up 3!');
        this.level = 3;
        // this.abilities.push({label:"frost"});
        // this.abilities.push({label:"blink"});
        // this.abilities.push({label:"grapple"});
        // this.abilities.push({label:"anchor"});
        // this.abilities.push({label:"cinder"});
        // this.abilities.push({label:"confusion"});
    }
    else if (this.level === 3 && this.pointsTotal > this.levels[3])
        this.level = 4;
    else if (this.level === 4 && this.pointsTotal > this.levels[4])
        this.level = 5;
    else if (this.level === 5 && this.pointsTotal > this.levels[5])
        this.level = 6;
    else if (this.level === 6 && this.pointsTotal > this.levels[6])
        this.level = 7;
    else if (this.level === 7 && this.pointsTotal > this.levels[7])
        this.level = 8;
    else if (this.level === 8 && this.pointsTotal > this.levels[8])
        this.level = 9;
    else if (this.level === 9 && this.pointsTotal > this.levels[9])
        this.level = 10;
    else if (this.level === 10 && this.pointsTotal > this.levels[10])
        this.level = 11;

    //this.level = Math.ceil(this.mana / 256);
    //console.log(this.level, this.mana);
};

game_player.prototype.isEngaged = function(len)
{
    console.log(this.mp, 'isEngaged');

    var _this = this;
    this.engaged = true;

    // timer 10 sec
    setTimeout(_this.timeoutEngaged.bind(this), len);
};

game_player.prototype.timeoutEngaged = function()
{
    console.log(this.mp, 'no longer engaged!');
    this.engaged = false;
};

game_player.prototype.isVuln = function(len)
{
    if (this.vuln===true) return;

    console.log('Im vulnerable!', len);
    //var _this = this;

    this.vuln = true;

    // also set to engaged
    if (this.isLocal)
        this.isEngaged(len);

    var stun = setTimeout(this.timeoutVuln.bind(this), len);

    // if carrying flag, drop it
    if (config.server && this.hasFlag)
        this.dropFlag();
};

game_player.prototype.dropFlag = function()
{
    console.log("== player.dropFlag ==", this.hasFlag);
    if (this.hasFlag)
    {
        // 1 = midFlag, 2 = redBase, 3 = blueBase
        var flagName;
        switch(this.hasFlag)
        {
            case 1: flagName = "midFlag"; break;
            case 2: flagName = "redFlag"; break;
            case 3: flagName = "blueFlag"; break;
        }
        // remove flag from player
        this.hasFlag = 0;

        // reset flag
        var flag = config._.find(config.flagObjects, {"name":flagName});
        //flag.slotFlag(this);
        flag.reset(false, this.game);
    }
}
game_player.prototype.timeoutVuln = function()
{
    this.vuln = false;
    console.log('...no longer vulnerable');
};

game_player.prototype.getGrid = function()
{
    return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};

game_player.prototype.getCoord = function()
{
    // direction-dependent, account for
    this.nw =
    {
        x: Math.floor(this.pos.x / 64),
        y: Math.floor(this.pos.y / 64)
    };
    this.ne =
    {
        x: Math.floor((this.pos.x + this.size.hx) / 64),
        y: Math.floor(this.pos.y / 64)
    };
    this.sw =
    {
        x: Math.floor(this.pos.x / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.se =
    {
        x: Math.floor((this.pos.x + this.size.hx) / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.n =
    {
        x: Math.floor((this.pos.x + (this.size.hx/2)) / 64),
        y: Math.floor(this.pos.y / 64)
    };
    this.s =
    {
        x: Math.floor((this.pos.x + (this.size.hx/2)) / 64),
        y: Math.floor((this.pos.y + this.size.hy) / 64)
    };
    this.e =
    {
        x: Math.floor((this.pos.x + this.size.hx) / 64),
        y: Math.floor((this.pos.y + (this.size.hy/2)) / 64)
    };
    this.w =
    {
        x: Math.floor(this.pos.x / 64),
        y: Math.floor((this.pos.y + (this.size.hy/2)) / 64)
    };
    return { nw:this.nw, ne:this.ne, sw:this.sw, se:this.se, n:this.n, s:this.s, e:this.e, w:this.w };
    //return { x: Math.floor(this.pos.x / 64), y: Math.floor(this.pos.y / 64) };
};
game_player.prototype.hitGrid = function()
{
    // don't proceed unless tilemapData is loaded
    //if (config.tilemapData == undefined) return;
    //var tmd = config.tilemapData;
    if (this.tmd === null) return;

    this.c = this.getCoord();

    return {
        nw: (this.tmd[this.c.nw.y] && this.tmd[this.c.nw.y][this.c.nw.x]) ? {t:parseInt(this.tmd[this.c.nw.y][this.c.nw.x]),x:this.c.nw.x,y:this.c.nw.y} : 0,
        ne: (this.tmd[this.c.ne.y] && this.tmd[this.c.ne.y][this.c.ne.x]) ? {t:parseInt(this.tmd[this.c.ne.y][this.c.ne.x]),x:this.c.ne.x,y:this.c.ne.y} : 0,
        sw: (this.tmd[this.c.sw.y] && this.tmd[this.c.sw.y][this.c.sw.x]) ? {t:parseInt(this.tmd[this.c.sw.y][this.c.sw.x]),x:this.c.sw.x,y:this.c.sw.y} : 0,
        se: (this.tmd[this.c.se.y] && this.tmd[this.c.se.y][this.c.se.x]) ? {t:parseInt(this.tmd[this.c.se.y][this.c.se.x]),x:this.c.se.x,y:this.c.se.y} : 0,
        e: (this.tmd[this.c.e.y] && this.tmd[this.c.e.y][this.c.e.x]) ? {t:parseInt(this.tmd[this.c.e.y][this.c.e.x]),x:this.c.e.x,y:this.c.e.y} : 0,
        w: (this.tmd[this.c.w.y] && this.tmd[this.c.w.y][this.c.w.x]) ? {t:parseInt(this.tmd[this.c.w.y][this.c.w.x]),x:this.c.w.x,y:this.c.w.y} : 0,
        n: (this.tmd[this.c.n.y] && this.tmd[this.c.n.y][this.c.n.x]) ? {t:parseInt(this.tmd[this.c.n.y][this.c.n.x]),x:this.c.n.x,y:this.c.n.y} : 0,
        s: (this.tmd[this.c.s.y] && this.tmd[this.c.s.y][this.c.s.x]) ? {t:parseInt(this.tmd[this.c.s.y][this.c.s.x]),x:this.c.s.x,y:this.c.s.y} : 0
    };
};

// new physics properties begin

// new physics properies end

//} //game_player.constructor

game_player.prototype.drawAbilities = function()
{
    //console.log('drawAbil', this.engaged);
    if (this.engaged === false)
    {
        config.ctx.beginPath();
        config.ctx.strokeStyle = 'gray';
        config.ctx.moveTo(this.pos.x, this.pos.y-10);
        config.ctx.lineTo(this.pos.x + 64, this.pos.y-10);
        config.ctx.lineWidth = 3;
        config.ctx.stroke();
        config.ctx.closePath();

        // mana progression
        // calculate
        //var progressPercent = (this.mana / this.levels[this.level]);
        var progressPercent = (this.progression / 500);
        // 64 is the width of the progression bar
        var progressVal = ((progressPercent / 100) * 64) * 100;
        // draw it
        config.ctx.beginPath();
        config.ctx.strokeStyle = 'yellow';
        // game.ctx.moveTo(this.pos.x + 14 + (val), this.pos.y-10);
        // game.ctx.lineTo(this.pos.x + 14 + this.size.hx - 28, this.pos.y-10);
        config.ctx.moveTo(this.pos.x, this.pos.y-10);
        config.ctx.lineTo(this.pos.x + progressVal, this.pos.y-10);
        config.ctx.lineWidth = 3;
        config.ctx.stroke();
        config.ctx.closePath();

        // buffs, potions, and boosters
        //console.log(this.pos.x, this.pos.y);
        /*
        game.ctx.drawImage(document.getElementById("potion-1"), this.pos.x, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-shield"), this.pos.x + 13, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-alacrity"), this.pos.x + 26, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("buff-shield"), this.pos.x + 39, this.pos.y - 15, 10, 10);
        game.ctx.drawImage(document.getElementById("debuff-weakened"), this.pos.x + 52, this.pos.y - 15, 10, 10);
        //*/
        /*game.ctx.fillStyle = 'yellow';
        game.ctx.beginPath();
        game.ctx.arc(this.pos.x + 14, this.pos.y-20, 2,0,2*Math.PI);
        game.ctx.fill();*/
        // TODO: if not buffs, debuffs or boosters
        // then txtOffset = 20;
        //txtOffset = 30;
    } // end isEngaged
};

game_player.prototype.draw = function()
{
    //console.log(this.pos.x, this.pos.y);

    if (this.visible === false) return;
    //this.pos.x = this.pos.x.fixed(1);
    //this.pos.y = this.pos.y.fixed(1);
    // player nametags (temp)
    // mana bar bg
    var txtOffset = 20;
    if (this.vuln) txtOffset = 10;
    //var abil;
    if (this.isLocal === true)
    {
        // nameplate color
        // game.ctx.fillStyle = '#526869';
        // game.ctx.font = "small-caps lighter 15px serif";

        // draw progression
        this.drawAbilities();
    } // end isLocal
    // else
    // {
    // nameplate color
    config.ctx.save();
    if (this.team == 1) // 1 = red, 2 = blue
    {
        config.ctx.fillStyle = '#FF6961';
        //game.ctx.save();
    }
    else if (this.team == 2)
    {
        config.ctx.fillStyle = '#6ebee6';
        //game.ctx.save();
    }
    else config.ctx.fillStyle = 'white';
    //config.ctx.font = "small-caps 15px serif";
    // }
    // game.ctx.strokeRect(
    //     this.pos.x,
    //     this.pos.y-10,
    //     this.size.hx,
    //     5);

    // nameplate
    config.ctx.font = "16px Mirza";
    config.ctx.textAlign = 'center';
    //var txt = "[" + this.level + "] " + this.playerName;//+ "(" + this.mana.toString() + ")";
    var txt = this.playerName + this.team.toString();//+ "(" + this.mana.toString() + ")";
    config.ctx.fillText(
        txt,// + " (" + this.level + ") " + this.mana.toString(),// + config.fps.fixed(1),
        this.pos.x + (this.size.hx/2),//.fixed(1),
        this.pos.y - txtOffset
        //100
    );
    config.ctx.restore();

    // draw rank circle
    /*
    game.ctx.fillStyle = "gray";
    game.ctx.beginPath();
    game.ctx.arc (this.pos.x + (this.size.hx/2) - (game.ctx.measureText(txt).width/2) - 20, this.pos.y - txtOffset - 5, 10, 0, Math.PI*2, true);
    game.ctx.closePath();
    game.ctx.fill();
    //*/


    if (this.player_abilities_enabled && this.isLocal && this.ability !== -1)
    {
        config.ctx.drawImage(document.getElementById("ability-" + this.abilities[this.ability].label),
            //this.pos.x - 15,
            this.pos.x + (this.size.hx/2) - (game.ctx.measureText(txt).width/2) - 20, // 20 = img width (15) - 5 pxl padding
            //this.pos.x + (this.size.hx/2) - 30,
            this.pos.y - txtOffset - 12,
            15, 15);
    }


    // ability
    /*
    if (this.abil > 0)
    {
        //console.log('** doDraw ABILITY', this.abil, 'active!', this.mp);

        switch(this.abil)
        {
            case 1: // burst
            this.abil = 0; // reset
            game.ctx.fillRect(this.pos.x, this.pos.y, 64, 64);
            //game.ctx.drawImage(document.getElementById("ability-" + this.abilities[this.ability].label), this.pos.x - 15, this.pos.y - txtOffset - 12, 15, 15);
            break;

            case 2: // frost
            break;

            case 2: // frost
            break;

            case 3: // blink
            break;

            case 4: // grapple
            break;

            case 5: // anchor
            break;

            case 6: // cinder
            break;

            case 7: // confusion
            break;

            default:
                console.log('ERROR: invalid abil value');
        }
    }
    //*/

    // player bitamps
    var img, imgW, imgH;
    //if (this.pos.d == 1)
    //if (this.landed > 0) console.log(this.landed, this.mp);
    // if (this.abil > 0)
    // {
    //     console.log('abil!', this.abil, this.mp);
    // }
    //console.log('flap', this.flap, this.dead);
    
    if (this.dead === true)
    {
        console.log('dead animation...');
        
        img = document.getElementById('animate-gg');
        imgW = 64;//33;
        imgH = 64;//44;
    }
    else if (this.vuln === true)
    {
        if (this.dir === 1)
            img = document.getElementById("p1stun-l");
            //this.vulnLeft;//document.getElementById("p1stun-l");
        else img = document.getElementById("p1stun-r");

        imgW = 64;
        imgH = 64;
    }
    else if (this.flap === true)
    {
        //console.log('flap!');
        
        //this.vulnRight;//document.getElementById("p1stun-l");
        // reset flap on client
        this.flap = false;
        if (this.dir === 1) img = document.getElementById("p1l");
        //img = this.flapLeft;//document.getElementById("p1l");
        else img = document.getElementById("p1r");
        //this.flapRight;//document.getElementById("p1r");

        imgW = 64;//40;
        imgH = 64;//40;
    }
    else if (this.landed === 1) // standing
    {
        //console.log('standing', this.landed, this.mp);
        if (this.dir === 1)img=document.getElementById("p1stand-l");
            //img = this.standLeft;// document.getElementById("p1stand-l");
        else img=document.getElementById("p1stand-r");
        //img = this.standRight;//document.getElementById("p1stand-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else if (this.landed === 2) // walking/skidding
    {
        if (this.dir === 1)
            img = document.getElementById("p1skid-l");
        else img = document.getElementById("p1skid-r");

        imgW = 64;//33;
        imgH = 64;//44;
    }
    else // gliding
    {
        if (this.dir === 1)
            img = document.getElementById("p2l");
            //img = ctx.putImageData(imgData,10,70);
            //img = this.glideLeft;
        else //img = this.glideRight;//
        img = document.getElementById("p2r");
        //else img = ctx.putImageData(imgData,10,70);

        imgW = 64;//40;
        imgH = 64;//40;
    }

    // draw flag?
    //console.log('this.hasFlag', this.hasFlag);
    if (this.hasFlag > 0)// && this.carryingFlag && this.carryingFlag.name)
    {
        var flag = config._.find(config.clientCooldowns, {'heldBy':this.mp});
        //console.log('gotflag', flag, config.clientCooldowns);

        //console.log('taken at', this.flagTakenAt, 'time left', Math.floor(config.server_time - this.flagTakenAt));
        //*
        //var ct = Math.floor(config.server_time - this.flagTakenAt);
        //ct = 60 - ct;
        //console.log('carrying flag', this.carryingFlag.name);
        //console.log('flag.timer', flag.timer);
        if (flag && flag.timer === 0)
        {
            console.log('* player.draw: flag reset', this.hasFlag);
            // reset flag
            for (var f = 0; f < config.flagObjects.length; f++)
            {
                if (config.flagObjects[f].name == "midFlag" && this.hasFlag === 1)
                    config.flagObjects[f].reset(false, this.game);
                else if (config.flagObjects[f].name == "redFlag" && this.hasFlag === 2)
                    config.flagObjects[f].reset(false, this.game);
                else if (config.flagObjects[f].name == "blueFlag" && this.hasFlag === 3)
                    config.flagObjects[f].reset(false, this.game);
            }
            //console.log('resetting flag', this.flagType);
            //console.log('flags', config.flagObjects);

            this.hasFlag = 0;
            // get out
            //return;
        }
        //*/
        var flagImg;
        //console.log('* this.hasFlag', this.hasFlag);
        switch(this.hasFlag)
        {
            case 1: // mid
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-mid-r');
                else flagImg = document.getElementById('flag-mid-l');
            break;

            case 2: // red
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-red-r');
                else flagImg = document.getElementById('flag-red-l');
            break;

            case 3: // blue
                if (this.dir === 0)
                    flagImg = document.getElementById('flag-blue-r');
                else flagImg = document.getElementById('flag-blue-l');
            break;
        }
        // draw flag
        //game.ctx.save();
        //console.log('flagImg', flagImg, this.dir);
        if (flagImg)
        {
            config.ctx.drawImage(flagImg, (this.dir === 0) ? this.pos.x - (this.size.hx/2) : this.pos.x + (this.size.hx/2), this.pos.y - (this.size.hx/2), 64, 64);
            // draw timer
            //*
            config.ctx.font = "18px Mirza";
            config.ctx.fillStyle = (this.hasFlag === 1) ? "#000" : "#fff";
            config.ctx.textAlign = 'center';
            //if (this.carryingFlag)
            if (flag)
            config.ctx.fillText(
                flag.timer,// + " (" + this.level + ") " + this.mana.toString(),// + config.fps.fixed(1),
                (this.dir === 0) ? this.pos.x - 5 : this.pos.x + this.size.hx + 5,//.fixed(1),
                this.pos.y - 5//txtOffset
                //100
            );
        }
        else {
            //console.warn('attempting to draw flag when player "hasFlag" appears to be 0');
            this.hasFlag = 0;
        }
        //*/
        //game.ctx.restore();

    }

    //game.ctx.beginPath();
    //if (this.glideRight)
        //console.log(this.glideRight);
    if(String(window.location).indexOf('debug') == -1 && this.visible===true)
        //if (this.glideRight)
            config.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);//img.width, img.height);//, imgW, imgH);
        //else game.ctx.drawImage(img, this.pos.x, this.pos.y, imgW, imgH);

        //game.ctx.putImageData(this.glideRight, this.pos.x, this.pos.y);//, imgW, imgH);

    if (this.bubble === true)
        config.ctx.drawImage(document.getElementById("ability-bubble"), this.pos.x - 8, this.pos.y - 8, 76, 76);



    // player x y
    // game.ctx.fillText(this.pos.x + "/" + this.pos.y, this.pos.x, this.pos.y - 40);
    //game.ctx.translate(camX,camY);
    //game.ctx.restore();

}; //game_player.draw
//console.log('dtf',this.parent.server);
//if (typeof module != 'undefined')
if('undefined' != typeof global)
module.exports = game_player;
//else console.log('running client');
