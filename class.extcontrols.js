document.externalControlAction = function(data)
{
    //var game = document.getElementById('viewport').ownerDocument.defaultView.game_core;
    //console.log('kb', config.keyboard);
    
    //console.log('ext', document.getElementById('viewport').ownerDocument.defaultView);
    
    //if (!this.keyboard)
    //this.keyboard = new THREEx.KeyboardState();
    switch(data)
    {
        case "A": // left down
            config.keyboard._onKeyChange({keyCode:37}, true);
        break;

        case "B": // left up
            config.keyboard._onKeyChange({keyCode:37}, false);
        break;

        case "D": // right down
            config.keyboard._onKeyChange({keyCode:39}, true);
        break;

        case "E": // right up
            config.keyboard._onKeyChange({keyCode:39}, false);
        break;

        case "u": // flap down
            config.keyboard._onKeyChange({keyCode:38}, true);
        break;

        case "x": // flap up
            config.keyboard._onKeyChange({keyCode:38}, false);
        break;
    }
};
