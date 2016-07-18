/*
    The player class

        A simple class to maintain state of a player on screen,
        as well as to draw that state when required.
*/
    var Player=function(game_instance, player_instance, isLoc)
    {
        console.log('new player!', isLoc);//, game_instance);//, player_instance);
        //Store the instance, if any
        this.instance = player_instance;
        this.game = game_instance;

        /* derek add */
        this.isLocal = isLoc; // is local player (self)
        if (isLoc===true)
        {
            this.mp = "hp"; // message position
            this.mis = "his"; // message input sequence
        }
        else
        {
            this.mp = "cp" + game_instance.allplayers.length;
            this.mis = "cis" + game_instance.allplayers.length;
        }

        //Set up initial values for our state information
        this.pos = { x:0, y:0 };
        //this.size = { x:16, y:16, hx:8, hy:8 };
        this.size = { x: 32, y:32, hx:16, hy:16 };
        this.dir = 0; // 0 = right, 1 = left (derek added)
        this.v = {x:0,y:0}; // velocity (derek added)
        this.flap = false; // flapped bool (derek added)
        this.state = 'not-connected';
        this.color = 'rgba(255,255,255,0.1)';
        this.info_color = 'rgba(255,255,255,0.1)';
        this.id = '';

        //These are used in moving us around later
        this.old_state = {pos:{x:0,y:0}};
        this.cur_state = {pos:{x:0,y:0}};
        this.state_time = new Date().getTime();

            //Our local history of inputs
        this.inputs = [];

            //The world bounds we are confined to
        this.pos_limits = {
            x_min: this.size.hx,
            x_max: this.game.world.width - this.size.hx,
            y_min: this.size.hy,
            y_max: this.game.world.height - this.size.hy
        };

            //The 'host' of a game gets created with a player instance since
            //the server already knows who they are. If the server starts a game
            //with only a host, the other player is set up in the 'else' below
        if(player_instance) {
            this.pos = { x:20, y:20 };
        } else {
            this.pos = { x:500, y:200 };
        }

        // add player to game_instance.allplayers array
        game_instance.allplayers.push(this);
        //console.log(game_instance.allplayers);
        return this;
    } //game_player.constructor
    Player.prototype.draw = function()
    {
        //*
        game.ctx.save();
        game.ctx.setTransform(1,0,0,1,0,0);//reset the transform matrix as it is cumulative
        //game.ctx.clearRect(0, 0, this.game.viewport.width, this.game.viewport.height);//clear the viewport AFTER the matrix is reset

        //Clamp the camera position to the world bounds while centering the camera around the player
        var camX = clamp(-this.game.players.self.pos.x + this.game.viewport.width/2, -this.game.world.width/2, this.game.world.width - this.game.viewport.width);
        var camY = clamp(-this.game.players.self.pos.y + this.game.viewport.height/2, -this.game.world.height/2, this.game.world.height - this.game.viewport.height);
        game.ctx.translate( camX, camY );

        // Display fps
        //game.ctx.fillStyle = "#ffffff";
        //game.ctx.font = "12px Verdana";
        game.ctx.fillText("ME: " + this.game.fps.fixed(1), this.game.players.self.pos.x, this.game.players.self.pos.y - 20);
        game.ctx.fillText("TL", 0, 0);
        game.ctx.fillText("ML", 0, this.game.world.height/2);
        game.ctx.fillText("BL", 0, this.game.world.height);
        game.ctx.fillText("TM", this.game.world.width/2, 0);
        game.ctx.fillText("MM", this.game.world.width/2, this.game.world.height/2);
        game.ctx.fillText("BM", this.game.world.width/2, this.game.world.height);
        game.ctx.fillText("TR", this.game.world.width, 0);
        game.ctx.fillText("MR", this.game.world.width, this.game.world.height/2);
        game.ctx.fillText("BR", this.game.world.width, this.game.world.height);
        //console.log(this.game.allplayers.length)
        for(var i=0; i < this.game.allplayers.length; i++)
        {
            if (this.game.allplayers[i].isLocal===false)
                game.ctx.fillText("Player X", this.game.allplayers[i].pos.x, this.game.allplayers[i].pos.y - 20);
        }

        // draw a dot at the new origin
    	// game.ctx.beginPath();
    	// game.ctx.arc(0,0,5,0,Math.PI*2);
    	// game.ctx.closePath();
    	// game.ctx.fill();
    	// game.ctx.textAlign='center';
    	// game.ctx.fillText('[ 0, 0 ]',0,10);

        //*/
        //Set the color for this player
        // game.ctx.fillStyle = this.color;
        //
        //     //Draw a rectangle for us
        // game.ctx.fillRect(this.pos.x - this.size.hx, this.pos.y - this.size.hy, this.size.x, this.size.y);
        //
        //     //Draw a status update
        // game.ctx.fillStyle = this.info_color;
        // game.ctx.fillText(this.state, this.pos.x+10, this.pos.y + 4);
        //console.log('flap', this.flap);
        var img;
        if (this.flap === true)
        {
            //console.log("FLAP!");
            this.flap=false;
            if (this.dir === 1) img = document.getElementById("p1l");
            else img = document.getElementById("p1r");
        }
        else
        {
            if (this.dir === 1) img = document.getElementById("p2l");
            else img = document.getElementById("p2r");
        }
        //game.ctx.beginPath();
        game.ctx.drawImage(img, this.pos.x, this.pos.y, 40, 40);

        //game.ctx.translate(camX,camY);
        game.ctx.restore();


        //console.log('camxy', camX, camY);
        //console.log('pos', this.pos.x, this.pos.y);
        //console.log("vp", this.game.viewport.width, this.game.viewport.height);
        //console.log()
    }; //game_player.draw

    function clamp(value, min, max)
    {
        //console.log(value, min, max);
        if(value < min) return min;
        else if(value > max) return max;
        return value;
    }
