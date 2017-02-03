onmessage = function(e)
{
    console.log('worker is working!');
    
    var player = e.data[0];

    // tilemap
    var b = 10; // bounce
    var blueGateAcross = 122;
    var blueGateUp = 74;
    var redGateAcross = 121;
    var redGateDown = 73;

    var h = player.hitGrid();
    //console.log(c);
    console.log('::', h);
    if (h !== undefined)
    {
        //if (player.landed === 1) return;
        // console.log('tiles', h.nw.t, h.sw.t, h.ne.t, h.se.t, h.n.t, h.s.t, h.e.t, h.w.t);
        

        //////////////////////////////
        // collide from below (full)
        //////////////////////////////
        if (h.ne.t > 0 && h.nw.t > 0) // collide from below
        {
            console.log('stop ne,nw', player.mp, h.ne.t, h.nw.t, player.team);
            // blue gate across
            if (h.ne.t === blueGateAcross && h.nw.t === blueGateAcross && player.team === 2) 
            {
                player.pos.y -= gatepush;
            }
            else
            {
                //player.pos.x -= b;
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
                /*if (player.vuln===false)
                    player.isVuln(500);*/
            }
        }
        //////////////////////////////
        // land (full)
        //////////////////////////////
        else if (h.sw.t > 0 && h.se.t > 0) // land
        {
            //console.log(h.sw.t,h.se.t);
            
            // red gate across
            if (h.sw.t === redGateAcross && h.se.t === redGateAcross && player.team === 1) 
            {
                player.pos.y += gatepush;
            }
            else
            {
                //console.log('stop sw', player.mp);//, h.sw.y * 64, player.pos.y + player.size.hy);
                //player.pos.x += b;
                //player.pos.y -= b;

                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                //player.hitFrom = 2;

                // process landing
                //if (this.server)
                player.doLand();
                //if (!this.server) this.client_process_net_prediction_correction2();
            }
        }
        //////////////////////////////
        // side collision (full, left)
        //////////////////////////////
        else if (h.nw.t > 0 && h.sw.t > 0) // hit side wall
        {
            //console.log('hit w wall', h.nw.t, h.sw.t, player.team);
            // blue gate down
            if (h.nw.t === blueGateUp && h.sw.t === blueGateUp && player.team === 2) 
            {
                player.pos.x -= gatepush;
            }
            else
            {
                player.pos.x += 15; // bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            //player.vx *= -1; // stop accel
            //console.log('vx', player.vx);
        }
        //////////////////////////////
        // side collision (full, right)
        //////////////////////////////
        else if (h.ne.t > 0 && h.se.t > 0)
        {
            // red gate down
            if (h.ne.t === redGateDown && h.se.t === redGateDown && player.team === 1) 
            {
                player.pos.x += gatepush;
            }
            else
            {
                player.pos.x -= 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
                //player.vx = 0; // stop accel
            }
        }
        //////////////////////////////
        // side collision (full, right)
        //////////////////////////////
        else if (h.ne.t > 0 && h.se.t > 0)
        {
            player.pos.x -= 15; //bounce
            player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
            player.collision = true;
            //player.vx = 0; // stop accel
        }
        //////////////////////////////
        // slid off platform
        //////////////////////////////
        else if (player.standing === 2)
        {
            console.log('player slid off barrier...');
        }
        //////////////////////////////
        // edge cases
        //////////////////////////////
        else if (h.ne.t > 0 || h.se.t > 0) // hit from left
        {
            //console.log('* edge left', h.n.t, h.s.t, h.e.t);
            if (h.e.t > 0) // east (side collision)
            {
                player.pos.x -= 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else if (h.n.t > 0) // north (from below)
            {
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else // south (landing), determine direction
            {
                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                // process landing
                //if (this.server)
                player.doLand();
            }
            //console.log(player.n, player.s, player.e, player.w);
        }
        else if (h.nw.t > 0 || h.sw.t > 0) // hit from left
        {
            //console.log('* edge right', h.n.t, h.s.t, h.w.t);
            if (h.w.t > 0) // east (side collision)
            {
                player.pos.x += 15; //bounce
                player.hitFrom = 0; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else if (h.n.t > 0) // north (from below)
            {
                player.pos.y += b;
                player.hitFrom = 1; // 0 = side, 1 = below, 2 = above;
                player.collision = true;
            }
            else // south (landing), determine direction
            {
                // set y
                player.pos.y = parseInt((h.sw.y * 64) - player.size.hy);
                // process landing
                //if (this.server)
                player.doLand();
            }
            //console.log(player.n, player.s, player.e, player.w);
        }
    }

    postMessage("hi");
};