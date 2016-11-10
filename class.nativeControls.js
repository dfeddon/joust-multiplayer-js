

function nativeControls()
{
    console.log('== nativeControls ==');
    this.init();

    this.dir = 0; // 0 = not moving, 1 = left, 2 = right
};

nativeControls.prototype.init = function()
{
    console.log('== nativeControls.init() ==');

    var cv = document.getElementById('viewport');
    // var game = document.getElementById('viewport').ownerDocument.defaultView.game;

    var dirL = document.getElementById('dirL');
    var dirR = document.getElementById('dirR');
    var dirF = document.getElementById('flap');

    /*
    function handleClick(e)
    {
        e.preventDefault();

        console.log('click', e);
        //alert('click');

        switch(e.srcElement.id)
        {
            case "dirL":
                //document.externalControlAction("A");
            break;

            case "dirR":
            break;

            case "flap":
            break;
        }
    }
    //*/

    function handleStart(e)
    {
        console.log('start', e);//.srcElement.id);

       // e.preventDefault();
        //alert(e.srcElement.id);
        //console.log(e.touches[0].clientX, dirL);
        //*
        switch(e)
        {
            case "dirL":
                if (this.dir === 2)
                {
                    this.dir = 1;
                    document.externalControlAction("E");
                }
                document.externalControlAction("A");
            break;

            case "dirR":
                if (this.dir === 1)
                {
                    this.dir = 2;
                    document.externalControlAction("B");
                }
                document.externalControlAction("D");
            break;

            case "flap":

                document.externalControlAction("u");
            break;
        }
        
        //*/

        //e.preventDefault();
    }
    function handleEnd(e)
    {
        console.log('end', e);//.srcElement.id);

        //e.preventDefault();
        switch(e)
        {
            case "dirL":
                this.dir = 0;
                document.externalControlAction("B");
            break;

            case "dirR":
                this.dir = 0;
                document.externalControlAction("E");
            break;

            case "flap":
                //this.dir = 0;
                document.externalControlAction("x");
            break;
        }
    }
    function handleTap(e)
    {
        switch(e)
        {
            case "dirL":
                if (this.dir === 2)
                    document.externalControlAction("E");
                this.dir = 1;
                document.externalControlAction("B");
            break;

            case "dirR":
                if (this.dir === 1)
                    document.externalControlAction("B");
                this.dir = 2;
                document.externalControlAction("E");
            break;

            case "flap":
                document.externalControlAction("x");
                //document.externalControlAction("x");
                //document.externalControlAction("x");
            break;
        }
    }
    function handleCancel(e)
    {
        console.log('cancel', e);

        e.preventDefault();
    }
    function handleMove(e)
    {
        console.log('move', e.changedTouches[0]);
        //alert('move');
        e.preventDefault();
    }
    //var cv = document.getElementById('viewport');
    
    //var dirL = document.getElementById('dirL');
    //var dirR = document.getElementById('dirR');

    //*
    //var mc = new Hammer(cv);
    var dl = new Hammer(dirL);
    var dr = new Hammer(dirR);
    var flap = new Hammer(dirF);
    // mc.on('swipe', function(e)
    // {
    //     console.log('swipe', e.direction);
    // });
    /*
    mc.on('press', function(e)
    {
        console.log('press',e.changedPointers[0].clientX);
        if (e.changedPointers[0].clientX < 150)
            handleStart('dirL');
        else if (e.changedPointers[0].clientX > 350  && (e.changedPointers[0].clientX < 550))
            handleStart('dirR');
        else handleStart('flap');
    });
    mc.on('pressup', function(e)
    {
        console.log('pressup');
        console.log('press',e.changedPointers[0].clientX);
        if (e.changedPointers[0].clientX < 150)
            handleEnd('dirL');
        else if (e.changedPointers[0].clientX > 350 && (e.changedPointers[0].clientX < 550))
            handleEnd('dirR');
        else handleEnd('flap');
    });
    //*/
    dl.on('press', function(e)
    {
        handleStart('dirL');
    });
    dl.on('tap', function(e)
    {
        handleTap('dirL');
    });
    dl.on('pressup', function(e)
    {
        handleEnd('dirL');
    });
    dr.on('press', function(e)
    {
        handleStart('dirR');
    });
    dr.on('tap', function(e)
    {
        handleTap('dirR');
    });
    dr.on('pressup', function(e)
    {
        handleEnd('dirR');
    });
    flap.on('press', function(e)
    {
        handleStart('flap');
    });
    flap.on('tap', function(e)
    {
        handleTap('flap');
    });
    flap.on('pressup', function(e)
    {
        handleEnd('flap');
    });
    //*/

    
    // dirL.addEventListener('mousedown', handleStart, false);
    // dirL.addEventListener('mouseup', handleEnd, false);
    // dirR.addEventListener('mousedown', handleStart, false);
    // dirR.addEventListener('mouseup', handleEnd, false);

    /*
    cv.addEventListener('touchstart', handleStart, false);
    cv.addEventListener('touchend', handleEnd, false);
    cv.addEventListener('touchcancel', handleCancel, false);
    cv.addEventListener('touchmove', handleMove, false);
    //*/
}
