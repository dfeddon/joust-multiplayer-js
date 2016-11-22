/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/

'use strict';

var domready = require('domready');
var game_core = require('./game.core');
// var _ = require('./node_modules/lodash/lodash.min');
/*
var egyptian_set = require('./egyptian_set');
var game_spritesheet = require('./class.spritesheet');
var game_stopwatch = require('./class.stopwatch');
var game_toast = require('./class.toast');
var game_chest = require('./class.chest');
var game_flag = require('./class.flag');
var
//*/ 

domready(function()
{
//document.addEventListener('DOMContentLoaded', function()
//{
	console.log('client DOM Loaded...');

	//A window global for our game root variable.
	var game = {};

	//When loading, we store references to our
	//drawing canvases, and initiate a game instance.
	//window.onload = function()
	//{
	//function go(){
	//console.log('window onload');
	//Create our game client instance.
	game = new game_core();

	console.log('client loaded', window);
	console.log('user-agent header', navigator.userAgent);

	console.log("Browser CodeName: " + navigator.appCodeName);
	console.log("Browser Name: " + navigator.appName);
	console.log("Browser Version: " + navigator.appVersion);
	console.log("Cookies Enabled: " + navigator.cookieEnabled);
	console.log("Browser Language: " + navigator.language);
	console.log("Browser Online: " + navigator.onLine);
	console.log("Platform: " + navigator.platform);
	console.log("User-agent header: " + navigator.userAgent);

	var isMobile = 'ontouchstart' in window;
	var userAgent = window.navigator.userAgent.toLowerCase();
	var safari = /safari/.test(userAgent);
	var ios = /iphone|ipod|ipad/.test(userAgent);
	var android = /android/.test(userAgent);
	console.log('isMobile', isMobile);
	console.log('userAgent', userAgent);
	console.log('safari', safari);
	console.log('ios', ios);
	console.log('android', android);
	
	

	//localStorage.debug = '*';

	//Fetch the viewport (primary game canvas )
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

	if (ios || android)
	{
		console.log('mobile device', ios, android);
		
		// document.externalControlAction = function(data)
		// {
		// 	//var game = document.getElementById('viewport').ownerDocument.defaultView.game;
		// 	console.log('extctrl-action', data);
		// 	//alert("HI");
			
			
		// 	var keyboard = new THREEx.KeyboardState();
		// 	console.log('keyboard', keyboard);
		// 	switch(data)
		// 	{
		// 	case "A": // left down
		// 	keyboard._onKeyChange({keyCode:37}, true);
		// 	break;

		// 	case "B": // left up
		// 	keyboard._onKeyChange({keyCode:37}, false);
		// 	break;

		// 	case "D": // right down
		// 	keyboard._onKeyChange({keyCode:39}, true);
		// 	break;

		// 	case "E": // right up
		// 	keyboard._onKeyChange({keyCode:39}, false);
		// 	break;

		// 	case "u": // flap down
		// 	keyboard._onKeyChange({keyCode:38}, true);
		// 	break;

		// 	case "x": // flap up
		// 	keyboard._onKeyChange({keyCode:38}, false);
		// 	break;
		// 	}
		// };
	}
	else console.log('...not mobile device...');

	console.log('doc', document);
	
	//document.externalControlAction("x");

	//console.log("eca", document, document.externalControlAction);
	//alert('test');
	//document.externalControlAction("A");


	//Finally, start the loop
	game.update( new Date().getTime() );
	//}
	//document.externalControlAction("u");
}); //window.onload

		// document.externalControlAction = function(data)
		// {
		// 	//var game = document.getElementById('viewport').ownerDocument.defaultView.game;
		// 	console.log('extctrl-action', data);
		// 	//alert("HI");
			
			
		// 	var keyboard = new THREEx.KeyboardState();
		// 	console.log('keyboard', keyboard);
		// 	switch(data)
		// 	{
		// 	case "A": // left down
		// 	keyboard._onKeyChange({keyCode:37}, true);
		// 	break;

		// 	case "B": // left up
		// 	keyboard._onKeyChange({keyCode:37}, false);
		// 	break;

		// 	case "D": // right down
		// 	keyboard._onKeyChange({keyCode:39}, true);
		// 	break;

		// 	case "E": // right up
		// 	keyboard._onKeyChange({keyCode:39}, false);
		// 	break;

		// 	case "u": // flap down
		// 	keyboard._onKeyChange({keyCode:38}, true);
		// 	break;

		// 	case "x": // flap up
		// 	keyboard._onKeyChange({keyCode:38}, false);
		// 	break;
		// 	}
		// };
