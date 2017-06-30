/*  Copyright 2012-2016 Sven "underscorediscovery" Bergström

    written by : http://underscorediscovery.ca
    written for : http://buildnewgames.com/real-time-multiplayer/

    MIT Licensed.
*/
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */ /*global define */
'use strict';

// const WebSocket = require('ws');

var domready = require('domready');
//var config = require('./class.globals');
var assets = require('./singleton.assets');
var game_core = require('./game.core');
//var localStorage = require('bower_components/simple-webstorage/extendStorage');
var device = {};
var _ = require('./node_modules/lodash/lodash.min');
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

	//*
	// amazon sdk globals
	AWS.config.region = "us-east-1";
	AWS.config.apiVersions = 
	{
		dynamodb: '2012-08-10',
		// other service API versions
	};
	AWS.config.credentials = new AWS.CognitoIdentityCredentials(
	{
		IdentityPoolId: 'us-east-1:b5e61654-606a-4082-adab-382e69a24413',
		Logins: 
		{ // optional tokens, used for authenticated login
		// 'graph.facebook.com': 'FBTOKEN',
		// 'www.amazon.com': 'AMAZONTOKEN',
		// 'accounts.google.com': 'GOOGLETOKEN'
		}
	});
	AWS.config.credentials.get(function(err)
	{
		if (err) console.log(err);
		else console.log(AWS.config.credentials);
	})
	// amazon sdk
	
	// dynamodb
	// var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
	// docClient abstracts away the 'type-casting' requirement of the above dynamoDB
	var docClient = new AWS.DynamoDB.DocumentClient();
	/*var params = 
	{
		Key:
		{
			"Userid": { N: "0" }, // Requried: Primary partition key
			"Date": { S: "0" } // Requried: Primary sort key
		},
		TableName: "Session"
	};
	dynamodb.getItem(params, function (err, data) 
	{
		if (err) console.log(err, err.stack); // an error occurred
		else console.log("* got AWS item:", data); // successful response
	});*/
	/*function getTop10(index)
	{
		var gIndicies = ["TopScoreIndex", "TopKillsIndex", "TopWavesIndex"];
		var params = 
		{
			Key:
			{
				"Userid": 1, // Requried: Primary partition key
				"Date": 1498568140 // Requried: Primary sort key
			},
			TableName: "Session",
			IndexName: gIndicies[index],//"TopScoresIndex",
			ScanIndexForward: false,
			KeyConditionExpression: 'GameId = :v_title',// and Date > :rkey',
			ExpressionAttributeValues: 
			{
				':v_title': 1//,
				// ':rkey': 2015
			},
			Limit: 10
		};
		console.log(docClient);
		docClient.query(params, function (err, data) 
		{
			if (err) console.log(err, err.stack); // an error occurred
			else console.log("* got AWS item:", data); // successful response
		});
	}
	// 0 = score, 1 = kills, 2 = waves
	getTop10(0);
	*/
	function addItemToDB(item)
	{
		// if no userid, don't save
		var userid = parseInt(storage("get", "wingdom__userid"));
		if (!userid) return;
		var params =
		{
			TableName: "Session",
			Item:
			{ 
				"Userid": userid, // get this locally
				"GameId": 1,
				"CreatedAt": new Date() / 1000,
				"Player": item.Name,
				"Score": item.Score,
				"Kills": item.Kills,
				"Waves": item.Waves
			}
		};

		docClient.put(params, function (err, data) 
		{
			if (err) console.log(err, err.stack); // an error occurred
			else console.log("* got AWS item:", data); // successful response
		});
	}
	//*/
	// var rnd = Math.floor((Math.random() * 10000) + 10000);
	// var uuid = parseInt(Date.now() + "" + rnd);

	/*
	setTimeout(function(){
	var putItem = {};
	putItem.Userid = uuid;
	// putItem.GameId = 1;
	// putItem.Date = new Date() / 1000;
	putItem.Score = Math.floor((Math.random() * 10000) + 100);
	putItem.Kills = Math.floor((Math.random() * 30) + 1);
	putItem.Waves = Math.floor((Math.random() * 20) + 1);
	addItemToDB(putItem);
	},1000);
	//*/

	// s3
	var appId = "app_id";
	var roleArn = "role_arn";
	var bucketName = "s3_bucket_name";
	//*/

	// hide default doorbell.io button
	// var doorbellButton = document.getElementById('doorbell-button');
	// doorbellButton.style.display = "none";

	// function feedbackFnc()
	// {
	// 	console.log("feedback!");
	// }

	//A window global for our game root variable.
	var game = {};
	var player = {};
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
		device.isNative = false; // default
		device.standalone = window.navigator.standalone; // (fullscreen)
		device.ios = /iphone|ipod|ipad/.test(userAgent);
		device.android = /android/.test(userAgent);

		console.log('standalone', device.standalone);
		
		
		// if ios browser (not webview)
		if (device.ios)// && safari)
		{
			console.log('iOS!');
			device.webview = /ios-wingdom-app/.test(userAgent);//(userAgent == "ios-wingdom-app");
			device.safari = /safari/.test( userAgent );
			device.iphone = /iPhone/.test(userAgent);
			device.ipad = /iPad/.test(userAgent);
			device.ipod = /ipod/.test(userAgent);
			console.log('ios', device.ios, 'safari', device.safari, device.iphone, device.ipad, device.ipod);

			// browser
			if (device.webview)
				device.isNative = true;
			else
			{
				// if (screen.orientation.type != "landscape")
				// 	screen.orientation.lock("landscape");
				// browser, suggest app
				//*
				// splash = false;
				var apprec = document.getElementById('apprec');
				apprec.style.display = "block";
				apprec.addEventListener("click", function(e)
				{
					window.location = "http://www.apple.com/itunes/";
				});
				//var ui = document.getElementById('uiTopBar');
				//ui.style.display = "none";
				// return;
				//*/
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
			device.webview = (userAgent == "android-wingdom-app"); //AppName\/[0-9\.]+$/.test(navigator.userAgent);
			console.log('android webview?', device.webview);
			if (device.webview)
			{
				console.log('yes, android webview!');

				// TODO: Phone or Tablet
				
				// using app
				device.isNative = true;
			}
			//*
			else
			{
				// if (screen.orientation.type != "landscape")
				// 	screen.orientation.lock("landscape");
				// browser, suggest app
				// splash = false;
				var apprec = document.getElementById('apprec');
				apprec.style.display = "block";
				apprec.addEventListener("click", function(e)
				{
					window.location = "https://play.google.com/store/apps/category/GAME?utm_source=na_Med&utm_medium=hasem&utm_content=Nov1215&utm_campaign=Evergreen&pcampaignid=MKT-DR-na-us-all-Med-hasem-gm-Evergreen-May0315-1-SiteLink%7cONSEM_kwid_43700006873862192&gclid=CIGa5JHu8dACFc3ZDQodhNEC4Q&gclsrc=ds&dclid=CPDb6ZHu8dACFUQdHwodFZ4K0g";
				});
				//var ui = document.getElementById('uiTopBar');
				//ui.style.display = "none";
				//return;
			}
			//*/
			
		}
		//*/
	} // end if device is mobile
	//else // website (or app)
	//splash = true;device.webview = true;
	var dirThreshold = 100;
	if (device.isMobile && !device.webview)// && device.isNative === false)
	{
		// setup touch controls
		var cvs = document.getElementById("viewport");
		
		cvs.addEventListener("touchstart", function(e)
		{
			// mousePos = getTouchPos(cvs, e);
			e.preventDefault();

			var ctrlDefault = true;
			var ctrlR = document.getElementById('mobile-controls-r');
			if (ctrlR.style.display == "none")
				ctrlDefault = false;

			//ts = e.touches[0];
			_.forEach(e.touches, function(ts)
			{
				if (ctrlDefault)
				{
					if (ts.clientX < (cvs.width / 2))
					{
						console.log('* ctrl left!');
						if (ts.clientX < dirThreshold)
						{
							console.log('** glide left start');					
							game.getKeyboard()._onKeyChange({keyCode:37}, true);
						}
						else
						{
							console.log('** glide right start');					
							game.getKeyboard()._onKeyChange({keyCode:39}, true);
						}
					}
					else
					{
						console.log('* flap start!');
						game.getKeyboard()._onKeyChange({keyCode:38}, true);
					}
				}
				else
				{
					if (ts.clientX > (cvs.width / 2))
					{
						console.log('* ctrl left!');
						if (ts.clientX > (cvs.width - dirThreshold))
						{
							console.log('** glide right start');					
							game.getKeyboard()._onKeyChange({keyCode:39}, true);
						}
						else
						{
							console.log('** glide left start');					
							game.getKeyboard()._onKeyChange({keyCode:37}, true);
						}
					}
					else
					{
						console.log('* flap start!');
						game.getKeyboard()._onKeyChange({keyCode:38}, true);
					}
				}
			});
		});
		cvs.addEventListener("touchend", function(e)
		{
			e.preventDefault();
			//te = e.changedTouches[0];

			var ctrlDefault = true;
			var ctrlR = document.getElementById('mobile-controls-r');
			if (ctrlR.style.display == "none")
				ctrlDefault = false;
			
			_.forEach(e.changedTouches, function(te)
			{
				if (ctrlDefault)
				{
					if (te.clientX < (cvs.width / 2))
					{
						console.log('* ctrl left!');
						if (te.clientX < dirThreshold)
						{
							console.log('** glide left stop!');
							
							game.getKeyboard()._onKeyChange({keyCode:37}, false);
						}
						else
						{ 
							console.log('** glide right stop!');
							
							game.getKeyboard()._onKeyChange({keyCode:39}, false);
						}
					}
					else
					{
						console.log('* flap stop!', game);
						game.getKeyboard()._onKeyChange({keyCode:38}, false);
					}
				}
				else
				{
					if (te.clientX > (cvs.width / 2))
					{
						console.log('* ctrl left!');
						if (te.clientX > (cvs.width - dirThreshold))
						{
							console.log('** glide right stop!');
							
							game.getKeyboard()._onKeyChange({keyCode:39}, false);
						}
						else
						{ 
							console.log('** glide left stop!');
							
							game.getKeyboard()._onKeyChange({keyCode:37}, false);
						}
					}
					else
					{
						console.log('* flap stop!', game);
						game.getKeyboard()._onKeyChange({keyCode:38}, false);
					}
				}
				console.log('touchEnd', e);
			});
		});
		// cvs.addEventListener("touchmove", function(e)
		// {
		// 	console.log('touchMove', e);
		// });
	}
	if (splash)
	{
		var splash, nickname, btnStart, adContainer, skins, leftArrow, rightArrow, htmlContainer, howtoplayButton, latestnewsButton, leaderboardsButton, feedbackLabel;
		//console.log('screen.width', screen.width);
		
		// is phone?
		device.isPhone = false;
		if (device.isMobile && screen.width <= 760)//device.iphone || device.ipod || device.webview)
		{
			device.isPhone = true;
			splash = document.getElementById('splash-phone');
			nickname = document.getElementById('nickname-phone');
			btnStart = document.getElementById('btnStart-phone');
			//skins = document.getElementsByClassName("slides-phone")

			// hide social media buttons
			document.getElementById('socialmedia').style.display = "none";

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
			// feedbackButton = document.getElementById('doorbellButton');
			howtoplayButton = document.getElementById('howtoplayButton');
			latestnewsButton = document.getElementById('latestnewsButton');
			leaderboardsButton = document.getElementById('leaderboardsButton');
			htmlContainer = document.getElementById('htmlContainer');
			feedbackLabel = document.getElementById('feedbackLabel');
			//skins = document.getElementsByClassName("slides");
		}
		splash.style.display = "block";
		if (device.ipad) 
		{
			//adContainer.style.width = "0px";
			// TODO: only hide is inapp adremove is false
			//adContainer.style.display = "none";
		}
		
		htmlContainer.innerHTML='<object id="howtoplay" class="innerPages" type="text/html" data="howtoplay.html" style="width=100% height=400px;"></object>';

		latestnewsButton.addEventListener('click', function()
		{
			htmlContainer.innerHTML='<object id="latestnews" class="innerPages" type="text/html" data="headlines.html" style="width=100% height=400px;"></object>';
		});
		howtoplayButton.addEventListener('click', function()
		{
			htmlContainer.innerHTML='<object id="howtoplay" class="innerPages" type="text/html" data="howtoplay.html" style="width=100% height=400px;"></object>';
		});
		leaderboardsButton.addEventListener('click', function()
		{
			htmlContainer.innerHTML='<object id="leaderboards" class="innerPages" type="text/html" data="leaderboards.html" style="width=100% height=400px;"></object>';
		});
		// doorbellButton = document.getElementById('feedbackButton');
		feedbackLabel.addEventListener('click', function()
		{
			console.log("click feedback");
			window.doorbell.show();
		});
		// feedbackButton.addEventListener('click', function(e)
		// {
		// 	console.log("feedback button!", e);
		// 	window.doorbell.show();
		// 	// document.getElementById('doorbell-button').show();
		// })
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

		// document.body.onkeydown = function(e)
		// {
		// 	if (e.keyCode === 13)
		// 		console.log('enter start!');
		// };

		btnStart.addEventListener("click", function(e)
		{
			console.log('* start game clicked', assets.loaded, game, e);
			if (!assets.loaded) return;

			//var skin = "skin" + assets.skinIndex.toString();
			// get selected skin
			console.log('* assets.playerSkin', assets.playerSkin);
			
			var skins = document.getElementsByClassName("slides");
			//if (!assets.playerSkin)
			assets.playerSkin = skins[assets.skinIndex - 1].id;
			console.log('* playerSkin', assets.playerSkin, assets.skinIndex);
			

			// get player name
			var myString = nickname.value;
			var noWhiteSpace = myString.replace(/\s/g, "");
			var strLength = noWhiteSpace.length;
			if (strLength > 2)
				assets.playerName = myString;//e.target.value;
			else assets.playerName = undefined;

			console.log('* final player name', assets.playerName);
			
			// if (!game.players) // first game
			if (e.target.textContent != "Play Again?")
			{
				console.log('* this is the first player, start game!', game);
				
				// if mobile, scale to 75% (account for orientation)
				if (device.isMobile && (window.innerWidth <= 480 || window.innerHeight <= 480))
				{
					console.log('*adjusting meta scale...', device.android);
					
					var meta = document.getElementById("meta");
					var canvas = document.getElementById("viewport");
					meta.setAttribute('content', 'width=device-width, initial-scale=0.75, maximum-scale=1.0, minimum-scale=0.5, user-scalable=0');
				}

				startGame();
			}
			else // respawning
			{
				// activate player
				console.log("* respawing existing player...", assets.playerName, assets.playerSkin);//skin);
				console.log('* window', window);
				
				// var game = e.target.game;
				game.core_client.players.self.active = true;
				game.core_client.players.self.visible = true;
				game.core_client.players.self.vuln = false;
				if (assets.playerName)
					game.core_client.players.self.playerName = assets.playerName;
				// skin
				game.core_client.players.self.skin = assets.playerSkin;//skin;//"skin" + assets.skinIndex.toString();
				// start pos
				//game.players.self.pos = assets.respawnPos;
				//game.players.self.respawn();
				// if (!game.gameid) game.gameid = "1";
				console.log('@ socket', game.core_client.socket);
				game.core_client.socket.write({'n': game.core_client.players.self.userid + '.' + game.core_client.playerPort + '.' + assets.playerName + '|' + assets.playerSkin});

				// start the game loop
				// game.update( new Date().getTime() );		
			}

			// notify iOS that we're starting/respawning the game (turn on controls)
			if (device.ios && device.isNative)
			{
				console.log('* notify iOS the game is starting...');
				try {
					webkit.messageHandlers.callbackHandler.postMessage("gamestart");
				} catch (error) {
					console.log('* Error: The native context does not exist!', error);
				}
			}


			// hide app recommendation ui
			var apprec = document.getElementById("apprec");
			if (apprec) apprec.style.display = "none";

			// hide splash
			splash.style.display = "none";

			// hide tabs
			document.getElementById('htmlLinks').style.display = "none";

			// remove bg
			document.body.style.backgroundImage = "none";

			// show UI elements
			var ui = document.getElementById('uiTopBar');
			var info = document.getElementById('uiInfoBar');
			// var infoBottom = document.getElementById('uiInfoBarBottom');
			var scoreboard = document.getElementById('scoreboard');
			ui.style.display = "flex";
			info.style.display = "block";
			// infoBottom.style.display = "block";
			scoreboard.style.display = "block";
			document.getElementById('level-ui').style.display = "flex";
			document.getElementById('score-text-container').style.display = "flex";
			document.getElementById('uiTopBar').style.display = "flex";

			// show controls
			if (device.isMobile && device.isNative === false)
			{
				console.log('* show mobile browser controls');
				
				//var cl = document.getElementById('mobile-controls-l');
				var cr = document.getElementById('mobile-controls-r');
				var cl = document.getElementById('mobile-controls-l');
				//cl.style.display = "block";
				cr.style.display = "flex";

				// listen for controls switch
				var flip = document.getElementById('flip-image');
				flip.addEventListener("touchstart", function(e)
				{
					console.log('flip controls!');

					cr.style.display = "none";
					//var cl = document.getElementById('mobile-controls-l');
					cl.style.display = "flex";
				});

				var flipl = document.getElementById('flip-image-l');
				flipl.addEventListener('touchstart', function(e)
				{
					cl.style.display = "none";
					// var cl = document.getElementById('mobile-controls-l');
					cr.style.display = "flex";
				})
			}
			
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
			var x;
			if (device.isPhone)
				x = document.getElementsByClassName("slides-phone");
			else x = document.getElementsByClassName("slides");
			if (n > x.length) {assets.skinIndex = 1}    
			else if (n < 1) {assets.skinIndex = x.length}
			for (i = 0; i < x.length; i++) 
			{
				x[i].style.display = "none";
			}
			x[assets.skinIndex-1].style.display = "block";			
		};
		//*/
		var leftArrow, rightArrow;
		if (device.isPhone)
		{
			leftArrow = document.getElementById("leftArrow-phone");
			rightArrow = document.getElementById('rightArrow-phone');
		}
		else
		{
			leftArrow = document.getElementById("leftArrow");
			rightArrow = document.getElementById('rightArrow');
		}
		
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

	// canvas resize handler (orientation change)
    window.addEventListener('onresize', resizeCanvas, false);
    function resizeCanvas()
    {
		console.log('resizing', window.innerWidth, window.innerHeight);
		
        viewport.width = window.innerWidth;
        viewport.height = window.innerHeight;
    }
    resizeCanvas();

	window.addEventListener("playerRespawn", function(e)
	{
		console.log('* playerRespawn handler', e, player);
		console.log('* player totals', e.player.totals);

		// store session totals
		addItemToDB(e.player.totals);

		player = e.player;

		// cancel evt
		e.stopImmediatePropagation();

		// notify ios webview
		if (assets.device.ios && assets.device.isNative)
		{
			console.log('* notify iOS the game is starting...');
			try {
				webkit.messageHandlers.callbackHandler.postMessage("gamestop");
			} catch (error) {
				console.log('* Error: The native context does not exist!', error);
			}
		}
		var ui = (assets.device.isPhone) ? document.getElementById('splash-phone') : document.getElementById('splash');
		var start = (assets.device.isPhone) ? document.getElementById('btnStart-phone') : document.getElementById('btnStart');
		var scoring = (assets.device.isPhone) ? document.getElementById('scoring-phone') : document.getElementById('scoring');
		var txtYourscore = (assets.device.isPhone) ? document.getElementById('txtYourscore-phone') : document.getElementById('txtYourscore');
		var txtScore = document.getElementById('txtScore');
		var txtHighscore = (assets.device.isPhone) ? document.getElementById('txtHighscore-phone') : document.getElementById('txtHighscore');
		start.innerText = "One Sec...";
		start.style.backgroundColor = "darkred";
		start.disabled = true;
		// start.game = e.game; // binding game ref to start button!
		console.log('scoring?');
		
		scoring.style.display = "block";
		// update scores
		txtYourscore.innerHTML = assets.myLastscore;//.toString();
		txtScore.innerHTML = assets.myLastscore;//.toString();
		if (assets.myHighscore) // user may be blocking storage OR in incognito mode
			txtHighscore.innerHTML = assets.myHighscore;//.toString();
		// if (!assets.device.isPhone)
		// {
		//     var slides = document.getElementById('cf2');
		//     slides.style.display = "none";
		// }

		// hide ui top bar
		var uiTopBar = document.getElementById('uiTopBar');
		uiTopBar.style.display = "none";

		// hide ui info bars
		var uiInfoBar = document.getElementById('uiInfoBar');
		uiInfoBar.style.display = "none";
		// var uiInfoBarBottom = document.getElementById('uiInfoBarBottom');
		// uiInfoBarBottom.style.display = "none";

		// hide bottom ui
		document.getElementById('level-ui').style.display = "none";
		document.getElementById('score-text-container').style.display = "none";
		
		// show splash
		ui.style.display = "block";//inline-block";
		// ...and score
		var myLastscoreDiv = document.getElementById('mylastscore');
		myLastscoreDiv.style.display = "block";
		// ...but remove bg image
		if (!assets.device.isPhone)
			ui.style.background = 'none';
		// ...and hide leaderboard
		var scoreboard = document.getElementById('scoreboard');
		scoreboard.style.display = "none";

		// start respawn timer
		
		//var deadline = new Date(Date.parse(new Date()) + 15 * 24 * 60 * 60 * 1000);
		var secs = 20;
		var currentTime = Date.parse(new Date());
		var deadline = new Date(currentTime + (secs * 1000));
		initializeClock('respawnTimer', deadline);
	});
	
	function getTimeRemaining(endtime) 
	{
		var t = Date.parse(endtime) - Date.parse(new Date());
		var seconds = Math.floor((t / 1000) % 60);
		var minutes = Math.floor((t / 1000 / 60) % 60);
		var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
		var days = Math.floor(t / (1000 * 60 * 60 * 24));
		return {
			'total': t,
			'days': days,
			'hours': hours,
			'minutes': minutes,
			'seconds': seconds
		};
	}

	function initializeClock(id, endtime) 
	{
		//var clock = document.getElementById(id);
		var respawnTimer = document.getElementById('respawnWrapper');
		var htmlContainer = document.getElementById('htmlContainer');
		// var infoCardsPlayer = document.getElementById('info-cards-player');
		// infoCardsPlayer.style.display = "none";
		htmlContainer.style.display = "none";
		respawnTimer.style.display = "block";
		//   var daysSpan = clock.querySelector('.days');
		//   var hoursSpan = clock.querySelector('.hours');
		//   var minutesSpan = clock.querySelector('.minutes');
		//   var secondsSpan = clock.querySelector('.seconds');
		var seconds = document.getElementById('timerSeconds');

		function updateClock() 
		{
			var t = getTimeRemaining(endtime);
			console.log('respawn in', t.seconds);
			
			// daysSpan.innerHTML = t.days;
			// hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
			// minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
			timerSeconds.innerHTML = ('0' + t.seconds).slice(-2);

			if (t.total <= 0) 
			{
				clearInterval(timeinterval);
				var respawnTimer = document.getElementById('respawnWrapper');
				respawnTimer.style.display = "none";
				var start = (assets.device.isPhone) ? document.getElementById('btnStart-phone') : document.getElementById('btnStart');
				start.disabled = false;
				start.innerText = "Play Again?";
				start.style.backgroundColor = "green";

			}
		}

		updateClock();
		var timeinterval = setInterval(updateClock, 1000);
	}

	// asset loader
	var loader = new PxLoader();

	// link only
	assets.bg_splash = "http://s3.amazonaws.com/com.dfeddon.wingdom/bg-splash.jpg";

	// CORS
	var origin = {origin:"Anonymous"};
	assets.skin1_tileset = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/skin1-tileset.gif",'',0,origin);

	assets.skins = {};
	assets.skins.skin1 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin1.png');
	assets.skins.skin2 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin2.png');
	assets.skins.skin5 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin5.png');
	assets.skins.skin8 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin8.png');
	assets.skins.skin9 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin9.png');
	assets.skins.skin10 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin10.png');
	assets.skins.skin11 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin11.png');
	assets.skins.skin12 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin12.png');
	assets.skins.skin13 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin13.png');
	assets.skins.skin14 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin14.png');
	assets.skins.skin15 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin15.png');
	assets.skins.skin16 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin16.png');
	assets.skins.skin17 = loader.addImage('http://s3.amazonaws.com/com.dfeddon.wingdom/skins/spritesheet-skin17.png');
	
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

	assets.buffs = {};
	assets.buffs.bubble = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-bubble.png");
	assets.buffs.alacrity = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-alacrity.png");
	assets.buffs.precision = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-precision.png");
	assets.buffs.recover = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-recover.png");
	assets.buffs.blink = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-blink.png");
	assets.buffs.reveal = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-reveal.png");
	assets.buffs.bruise = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-bruise.png");
	assets.buffs.plate = loader.addImage("https://s3.amazonaws.com/com.dfeddon.wingdom/buffs/buff-plate.png");

	// assets.callout_shield = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/callout-shield.png");
	assets.ability_bubble = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/ability-bubble.png");

	// assets.animate_explosion = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/sheet-explosion.png");
	// assets.animate_torches = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/sheet-torches.png");
	assets.animate_gg = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/EXPLOSIONS1.png");
	assets.animate_hit = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/player-hit.gif");

	// assets.plat_l = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-l.png");
	// assets.plat_m = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-m.png");
	// assets.plat_r = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-r.png");
	// assets.plat_rotate = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/plat-rotate.png");

	assets.consume_chestopen = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/chest-open.png");
	assets.consume_chestclosed = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/chest-closed.png");
	// assets.consume_potbluefull = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-blue-full.png");
	// assets.consume_potblueempty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-blue-empty.png");
	// assets.consume_potredfull = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-red-full.png");
	// assets.consume_potredempty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-red-empty.png");
	assets.consume_potgreenfull = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-green-full.png");
	assets.consume_potgreenempty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-green-empty.png");
	assets.consume_potyellowfull = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-yellow-full.png");
	assets.consume_potyellowempty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/consumables/potion-yellow-empty.png");
	// assets.evt_potion_red_full = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-red-full.png");
	// assets.evt_potion_red_empty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-red-empty.png");
	// assets.evt_potion_blue_full = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-blue-full.png");
	// assets.evt_potion_blue_empty = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/evt-potion-blue-empty.png");

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
	assets.carrier_arrow = loader.addImage("http://s3.amazonaws.com/com.dfeddon.wingdom/carrier-arrow.png");

	// loader progress
	loader.addProgressListener(function(e)
	{
		//console.log('progress', e.completedCount);
		
	});
	// assets load complete handler
	loader.addCompletionListener(function()
	{
		console.log('* all assets loaded...');

		// update button text from loading to join game
		document.getElementById("btnStart").innerText = "Join Game";
		
		assets.loaded = true;

		// auto-join simulated user
		/*console.log("*", window.location.href);
		var url = new URL(window.location.href);
		var sim = url.searchParams.get("sim");
		console.log("* url sim", sim);
		if (sim == 1)
		{
			var join = document.getElementById("btnStart");
			console.log("* join", join);
			join.click();
		}*/
	});

	var startGame = function()
	{
		console.log("## startGame");

		// // hide default doorbell.io button
		var doorbellButton = document.getElementById('doorbell-button');
		doorbellButton.style.display = "none";

		// // remove bg
		// document.body.style.backgroundImage = "none";

		// // show top UI bar
		// var ui = document.getElementById('uiTopBar');
		// var info = document.getElementById('uiInfoBar');
		// var scoreboard = document.getElementById('scoreboard');
		// ui.style.display = "block";
		// info.style.display = "block";
		// scoreboard.style.display = "block";


		//Create our game client instance.
		// if (!game.init)
		// {
		game = new game_core(2);
		game.init();
		// console.log("* game", game);
		// }

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
	var storage = function(action, item, val)
	{
		if (action == "set")
		{
			localStorage[item] = val;
			return localStorage[item];
		}
		else if (action == "get")
		{
			console.log('localStorage', localStorage);
			
			return localStorage[item];   // --> true
			//localStorage.get('myKey');   // --> {a:[1,2,5], b: 'ok'}
		}
		else if (action == "del")
		{
			localStorage.removeItem(item);
		}
	};

	// if no user id then set it
	if (!storage("get", "wingdom__userid"))
	{
		console.log("* we have no userid, attempting to set...");
		var rnd = Math.floor((Math.random() * 10000) + 10000);
		var uuid = parseInt(Date.now() + "" + rnd);
		storage("set", "wingdom__userid", uuid);
		console.log("* set userid to", uuid);
	}
	else console.log("* userid is", storage("get", "wingdom__userid"));

	// tweet for skins
	assets.skinUnlock = storage("get", "wingdom__skinUnlock");
	console.log('skinUnlock', assets.skinUnlock);
	if (assets.skinUnlock === undefined)	
		console.log(storage("set", "wingdom__skinUnlock", false));
	if (!assets.skinUnlock)
	{
		// show unlock skin callout
		console.log('show skin unlock media callout!');
		
	}
	// highscore
	assets.myHighscore = storage("get", "wingdom__myHighscore");
	if (!assets.myHighscore === undefined)
		console.log(storage("set", "wingdom__myHighscore", 0));
	assets.myHighscore = storage("get", "wingdom__myHighscore");
	
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
			// console.log('keyboard', game.getKeyboard());
			switch(data)
			{
			case "A": // left down
			game.getKeyboard()._onKeyChange({keyCode:37}, true);
			break;

			case "B": // left up
			game.getKeyboard()._onKeyChange({keyCode:37}, false);
			// ...and right to avoid "sticky" keys
			game.getKeyboard()._onKeyChange({keyCode:39}, false);
			break;

			case "D": // right down
			game.getKeyboard()._onKeyChange({keyCode:39}, true);
			break;

			case "E": // right up
			game.getKeyboard()._onKeyChange({keyCode:39}, false);
			// ...and left to avoid "sticky" keys
			game.getKeyboard()._onKeyChange({keyCode:37}, false);
			break;

			case "u": // flap down
			game.getKeyboard()._onKeyChange({keyCode:38}, true);
			break;

			case "x": // flap up
			console.log('flap up!', game);
			game.getKeyboard()._onKeyChange({keyCode:38}, false);
			game.getKeyboard()._onKeyChange({keyCode:88}, true);
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
