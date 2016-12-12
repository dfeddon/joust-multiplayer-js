/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/

'use strict';

var domready = require('domready');
var config = require('./class.globals');
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
	config.device = {};

	//When loading, we store references to our
	//drawing canvases, and initiate a game instance.
	//window.onload = function()
	//{
	//function go(){
	//console.log('window onload');

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

	config.device.isMobile = 'ontouchstart' in window;
	var userAgent = window.navigator.userAgent.toLowerCase();
	config.device.safari = /safari/.test(userAgent);
	config.device.ios = /iphone|ipod|ipad/.test(userAgent);
	config.device.android = /android/.test(userAgent);
	console.log('isMobile', config.device.isMobile);
	console.log('userAgent', userAgent);
	console.log('safari', config.device.safari);
	console.log('ios', config.device.ios);
	console.log('android', config.device.android);
	
	// is mobile device?
	//this.isMobile = 'ontouchstart' in window;
	var splash = true;
	var userAgent = window.navigator.userAgent.toLowerCase();
	var ui = document.getElementById('uiTopBar');
	console.log('isMobile', config.device.isMobile, userAgent);

	// show DOM controls for mobile devices
	if (config.device.isMobile)
	{
		//require('./class.extControls');
		//*
		config.device.standalone = window.navigator.standalone; // (fullscreen)
		config.device.ios = /iphone|ipod|ipad/.test(userAgent);
		config.device.android = /android/.test(userAgent);

		console.log('standalone', config.device.standalone);
		
		
		// if ios browser (not webview)
		if (config.device.ios)// && safari)
		{
			console.log('iOS!');
			
			config.device.safari = /safari/.test( userAgent );
			config.device.iphone = /iphone/.test(userAgent);
			config.device.ipad = /ipad/.test(userAgent);
			config.device.ipod = /ipod/.test(userAgent);
			console.log('ios', config.device.ios, 'safari', config.device.safari, config.device.iphone, config.device.ipad, config.device.ipod);

			if (config.device.safari)
			{
				// browser, suggest app
				splash = false;
				var apprec = document.getElementById('apprec');
				apprec.style.display = "block";
				apprec.addEventListener("click", function(e)
				{
					window.location = "http://www.google.com";
				});
				//var ui = document.getElementById('uiTopBar');
				ui.style.display = "none";
				return;
			}
			else
			{
				// using app
			}
			
			// show native controls
			/*
			document.getElementById('mobile-controls-l').style.display = "block";
			document.getElementById('mobile-controls-r').style.display = "block";                
			//this.addTouchHandlers();
			new nativeControls();
			*/
		}
		else if (config.device.android)
		{
			console.log('android!');
			config.device.webview = /AppName\/[0-9\.]+$/.test(navigator.userAgent);
			console.log('android webview?', config.device.webview);
			if (config.device.webview)
			{
				// using app
			}
			else
			{
				// browser, suggest app
				splash = false;
				var apprec = document.getElementById('apprec');
				apprec.style.display = "block";
				apprec.addEventListener("click", function(e)
				{
					window.location = "http://www.google.com";
				});
				//var ui = document.getElementById('uiTopBar');
				ui.style.display = "none";
				return;
			}
			
		}
		//*/
	}
	//else // website (or app)
	if (splash)
	{
		var splash, nickname, btnStart, adContainer;
		if (config.device.iphone || config.device.ipod)
		{
			splash = document.getElementById('splash-phone');
			nickname = document.getElementById('nickname-phone');
			btnStart = document.getElementById('btnStart-phone');

			/*if (iphone)
			{
				var v = document.getElementById("viewport"); 
				var c = v.getContext('2d');
				c.scale(0.5, 0.5);
			}*/
		}
		else
		{
			splash = document.getElementById('splash');
			nickname = document.getElementById('nickname');
			adContainer = document.getElementById('adContainer');
			btnStart = document.getElementById('btnStart');
		}
		splash.style.display = "block";
		if (config.device.ipad) 
		{
			//adContainer.style.width = "0px";
			adContainer.style.display = "none";
		}

		nickname.addEventListener("change", function(e)
		{
			console.log('nickname changed', e.target.value, e);
			game.players.self.playerName = e.target.value;
		});
		btnStart.addEventListener("click", function(e)
		{
			console.log('start game clicked');
			// activate player
			game.players.self.active = true;
			game.players.self.visible = true;
			game.players.self.vuln = false;
			// hide splash
			splash.style.display = "none";
			
			// force flap (to reveal player)
			//config.keyboard._onKeyChange({keyCode:38}, false);
			//_this.players.self.doFlap();
			//_this.players.self.update();
			//_this.client_update();
			//_this.players.self.visible = true;
		});
	}
	//localStorage.debug = '*';


	console.log('doc', document);
	
	//document.externalControlAction("x");

	//console.log("eca", document, document.externalControlAction);
	//alert('test');
	//document.externalControlAction("A");

	//Create our game client instance.
	game = new game_core();

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

	//Finally, start the loop
	game.update( new Date().getTime() );
	//}
	if (config.device.ios || config.device.android)
	{
		console.log('* mobile device', config.device.ios, config.device.android);
		
		document.externalControlAction = function(data)
		{
			// var vp = document.getElementById('viewport');
			// console.log("vp", vp.ownerDocument.defaultView);
			// //var game = this.game;//document.getElementById('viewport').ownerDocument.defaultView.game_core;
			console.log('extctrl-action', data);
			//alert("HI");
			
			
			//var keyboard = new THREEx.KeyboardState();
			//console.log('keyboard', game.getKeyboard());
			switch(data)
			{
			case "A": // left down
			game.getKeyboard()._onKeyChange({keyCode:37}, true);
			break;

			case "B": // left up
			game.getKeyboard()._onKeyChange({keyCode:37}, false);
			break;

			case "D": // right down
			game.getKeyboard()._onKeyChange({keyCode:39}, true);
			break;

			case "E": // right up
			game.getKeyboard()._onKeyChange({keyCode:39}, false);
			break;

			case "u": // flap down
			game.getKeyboard()._onKeyChange({keyCode:38}, true);
			break;

			case "x": // flap up
			//console.log('flap up!', game);
			game.getKeyboard()._onKeyChange({keyCode:38}, false);
			break;
			}
		};
	}
	else console.log('...not mobile device...');
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
