/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/
console.log('client loaded', window);

//A window global for our game root variable.

var game = {};

//function hi(){console.log("hi")};
	//When loading, we store references to our
	//drawing canvases, and initiate a game instance.
//window.onload = function()
//{
//function go(){
	console.log('window onload');
	//Create our game client instance.
	game = new game_core();

	//Fetch the viewport
	game.viewport = document.getElementById('viewport');

	//Adjust their size
	game.viewport.width = window.innerWidth;//game.world.width;
	game.viewport.height = window.innerHeight;//game.world.height;

	//Fetch the rendering contexts
	game.ctx = game.viewport.getContext('2d');

	//Set the draw style for the font
	game.ctx.font = '11px "Helvetica"';

	// set the canvas origin (0,0) to center canvas
	// All coordinates to the left of center canvas are negative
	// All coordinates below center canvas are negative
	//game.ctx.translate(this.game.world.width / 2, this.game.world.height / 2);

	//Finally, start the loop
	game.update( new Date().getTime() );
//}
//}; //window.onload
