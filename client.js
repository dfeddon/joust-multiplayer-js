/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */ /*global define */
'use strict';

var domready = require('domready');
//var config = require('./class.globals');
var assets = require('./singleton.assets');
var game_core = require('./game.core');
//var localStorage = require('bower_components/simple-webstorage/extendStorage');
var device = {};
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

/* 
TWITTER POST
https://twitter.com/intent/tweet?status=Come%20and%20play%20http%3A%2F%2Fwingdom.io%20%23wingdomio

*/

domready(function()
{
//document.addEventListener('DOMContentLoaded', function()
//{
	console.log('client DOM Loaded...');

	//A window global for our game root variable.
	var game = {};
	//device = {};

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

	device.isMobile = 'ontouchstart' in window;
	var userAgent = window.navigator.userAgent.toLowerCase();
	device.safari = /safari/.test(userAgent);
	device.ios = /iphone|ipod|ipad/.test(userAgent);
	device.android = /android/.test(userAgent);
	console.log('isMobile', device.isMobile);
	console.log('userAgent', userAgent);
	console.log('safari', device.safari);
	console.log('ios', device.ios);
	console.log('android', device.android);
	
	// is mobile device?
	//this.isMobile = 'ontouchstart' in window;
	var splash = true;
	var userAgent = window.navigator.userAgent.toLowerCase();
	var ui = document.getElementById('uiTopBar');
	console.log('isMobile', device.isMobile, userAgent);

	// show DOM controls for mobile devices
	if (device.isMobile)
	{
		//require('./class.extControls');
		//*
		device.standalone = window.navigator.standalone; // (fullscreen)
		device.ios = /iphone|ipod|ipad/.test(userAgent);
		device.android = /android/.test(userAgent);

		console.log('standalone', device.standalone);
		
		
		// if ios browser (not webview)
		if (device.ios)// && safari)
		{
			console.log('iOS!');
			
			device.safari = /safari/.test( userAgent );
			device.iphone = /iphone/.test(userAgent);
			device.ipad = /ipad/.test(userAgent);
			device.ipod = /ipod/.test(userAgent);
			console.log('ios', device.ios, 'safari', device.safari, device.iphone, device.ipad, device.ipod);

			if (device.safari)
			{
				// browser, suggest app
				splash = false;
				var apprec = document.getElementById('apprec');
				apprec.style.display = "block";
				apprec.addEventListener("click", function(e)
				{
					window.location = "http://www.apple.com/itunes/";
				});
				//var ui = document.getElementById('uiTopBar');
				//ui.style.display = "none";
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
		else if (device.android)
		{
			console.log('android!');
			device.webview = /AppName\/[0-9\.]+$/.test(navigator.userAgent);
			console.log('android webview?', device.webview);
			if (device.webview)
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
					window.location = "https://play.google.com/store/apps/category/GAME?utm_source=na_Med&utm_medium=hasem&utm_content=Nov1215&utm_campaign=Evergreen&pcampaignid=MKT-DR-na-us-all-Med-hasem-gm-Evergreen-May0315-1-SiteLink%7cONSEM_kwid_43700006873862192&gclid=CIGa5JHu8dACFc3ZDQodhNEC4Q&gclsrc=ds&dclid=CPDb6ZHu8dACFUQdHwodFZ4K0g";
				});
				//var ui = document.getElementById('uiTopBar');
				//ui.style.display = "none";
				return;
			}
			
		}
		//*/
	}
	//else // website (or app)
	if (splash)
	{
		var splash, nickname, btnStart, adContainer;
		if (device.iphone || device.ipod)
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
		if (device.ipad) 
		{
			//adContainer.style.width = "0px";
			// TODO: only hide is inapp adremove is false
			//adContainer.style.display = "none";
		}

		nickname.addEventListener("change", function(e)
		{
			console.log('nickname changed', e.target.value, e);
			//game.players.self.playerName = e.target.value;
			// ensure string has at least 3 text chars (excluding whitespace)
			var myString = e.target.value;
			var noWhiteSpace = myString.replace(/\s/g, "");
			var strLength = noWhiteSpace.length;
			if (strLength > 2)
				assets.playerName = e.target.value;
			else assets.playerName = undefined;
		});

		btnStart.addEventListener("click", function(e)
		{
			console.log('start game clicked', assets.loaded);
			if (!assets.loaded) return;

			//var skin = "skin" + assets.skinIndex.toString();
			var skins = document.getElementsByClassName("slides");
			assets.playerSkin = skins[assets.skinIndex - 1].id;

			if (!game.players) // first game
			{				
				startGame();
			}
			else // respawning
			{
				// activate player
				game.players.self.active = true;
				game.players.self.visible = true;
				game.players.self.vuln = false;
				if (assets.playerName)
					game.players.self.playerName = assets.playerName;
				// skin
				game.players.self.skin = skin;//"skin" + assets.skinIndex.toString();
			}

			// hide splash
			splash.style.display = "none";
			
			// force flap (to reveal player)
			//config.keyboard._onKeyChange({keyCode:38}, false);
			//_this.players.self.doFlap();
			//_this.players.self.update();
			//_this.client_update();
			//_this.players.self.visible = true;
		});

		// skins
		//*
		var plusSlides = function(n)
		{
			showSlides(assets.skinIndex += n);
		};
		var showSlides = function(n)
		{
			var i;
			var x = document.getElementsByClassName("slides");
			if (n > x.length) {assets.skinIndex = 1}    
			else if (n < 1) {assets.skinIndex = x.length}
			for (i = 0; i < x.length; i++) 
			{
				x[i].style.display = "none";
			}
			x[assets.skinIndex-1].style.display = "block";			
		};
		//*/
		var leftArrow = document.getElementById("leftArrow");
		var rightArrow = document.getElementById('rightArrow');
		
		leftArrow.addEventListener("click", function(e)
		{
			plusSlides(-1);
		});
		rightArrow.addEventListener("click", function(e)
		{
			plusSlides(1);
		});
		
		assets.skinIndex = 1;
		showSlides(assets.skinIndex);
	}

	assets.device = device;
	//localStorage.debug = '*';

	// asset loader
	var loader = new PxLoader();

	// link only
	assets.bg_splash = "http://s3.amazonaws.com/com.dfeddon.wingdom/bg-splash.jpg";

	// CORS
	var origin = {origin:"Anonymous"};
	assets.skin1_tileset = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-tileset.png",'',0,origin);

	assets.skins = {};
	assets.skins.skin1 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin1.png');
	assets.skins.skin2 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin2.png');
	assets.skins.skin5 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin5.png');
	assets.skins.skin8 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin8.png');
	assets.skins.skin9 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin9.png');
	
	// assets.p2r = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-fly-right.png');
	// assets.p2l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-fly-left.png");
	// assets.p1r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-flap-right.png");
	// assets.p1l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-flap-left.png");
	// assets.p1skid_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-fly-right.png");
	// assets.p1skid_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-fly-left.png");
	// assets.p1stand_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-stand-right.png");
	// assets.p1stand_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-stand-left.png");
	// assets.p1stun_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-stun-left.png");
	// assets.p1stun_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-stun-right.png");

	assets.ability_bubble = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/ability-bubble.png");

	assets.animate_explosion = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/sheet-explosion.png");
	assets.animate_torches = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/sheet-torches.png");
	assets.animate_gg = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/EXPLOSIONS1.png");

	assets.plat_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-l.png");
	assets.plat_m = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-m.png");
	assets.plat_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-r.png");
	assets.plat_rotate = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-rotate.png");

	assets.evt_chestopen = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/chest-open.png");
	assets.evt_chestclosed = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/chest-closed.png");
	assets.evt_potion_red_full = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-red-full.png");
	assets.evt_potion_red_empty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-red-empty.png");
	assets.evt_potion_blue_full = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-blue-full.png");
	assets.evt_potion_blue_empty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-blue-empty.png");

	assets.flag_red_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-red-r.png");
	assets.flag_red_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-red-l.png");
	assets.flag_blue_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-blue-r.png");
	assets.flag_blue_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-blue-l.png");
	assets.flag_mid_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-mid-r.png");
	assets.flag_mid_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-mid-l.png");
	assets.flag_slot_mid = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-mid.png");
	assets.flag_slot_red = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-red.png");
	assets.flag_slot_blue = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-blue.png");
	assets.flag_slot_1 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-1.png");
	assets.flag_slot_2 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-2.png");
	assets.flag_slot_3 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-3.png");
	assets.flag_slot_4 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-4.png");
	assets.flag_slot_5 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-5.png");
	assets.flag_slot_6 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-6.png");
	assets.flag_slot_7 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-7.png");
	assets.flag_slot_8 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-8.png");
	assets.flag_slot_9 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-9.png");
	assets.flag_slot_10 = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/flag-slot-10.png");

	// loader progress
	loader.addProgressListener(function(e)
	{
		console.log('progress', e);
		
	});
	// assets load complete handler
	loader.addCompletionListener(function()
	{
		assets.loaded = true;
	});

	var startGame = function()
	{
		// remove bg
		document.body.style.backgroundImage = "none";

		// show top UI bar
		var ui = document.getElementById('uiTopBar');
		ui.style.display = "block";


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

		//Finally, start the game loop
		game.update( new Date().getTime() );		
	};

	// load assets
	console.log('device:', device);
	loader.start();

	/////////////////////////////////////////
	// localStorage
	/////////////////////////////////////////
	var storage = function(action)
	{
		if (action == "set")
		{
			localStorage.hasTweeted = 1;
		}
		else if (action == "get")
		{
			console.log('localStorage', localStorage);
			
			return localStorage.hasTweeted;   // --> true
			//localStorage.get('myKey');   // --> {a:[1,2,5], b: 'ok'}
		}
		else if (action == "del")
		{
			localStorage.removeItem('hasTweeted');
		}
	}

	assets.hasTweeted = storage("get");
	console.log('hasTweeted', assets.hasTweeted);	
	if (!assets.hasTweeted)
	{
		// show unlock skin callout
		console.log('show media callout!');
		
	}
	/////////////////////////////////////////
	// external controls (from apps)
	/////////////////////////////////////////
	
	if (device.ios || device.android)
	{
		// console.log('* mobile device', device.ios, device.android);
		
		document.externalControlAction = function(data)
		{
			// var vp = document.getElementById('viewport');
			// console.log("vp", vp.ownerDocument.defaultView);
			// //var game = this.game;//document.getElementById('viewport').ownerDocument.defaultView.game_core;
			// console.log('extctrl-action', data);
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
	// else console.log('...not mobile device...');
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
