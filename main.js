console.log('main');

// require.config({
//   paths : {
//       loader : 'libs/backbone/loader',
//       jQuery : 'libs/jquery/jquery-module',
//       Underscore : 'libs/underscore/underscore-module',
//       Backbone : 'libs/backbone/backbone-module',
//       templates : '../Templates'
//   }
// });

define(['require', 'domReady', 'class.player', 'game.core'], function (require, domReady, player, game)
{
  //console.log('domReady');
  // var _this = this;
  // this.client = client;
  domReady(function()
  {
    console.log('domReady');
    require(['client'], function(client)
    {
      console.log('client loaded');
      //client.go();
    });
    /*define(['class.player', 'game_core'], function (player, game)
    {
      console.log('hi');
    });*/
    //var clientLoad = require('client');
    //console.log(clientLoad);
    //client.go();
  });
  //client(function(){console.log('hi');})
  //console.log('waiting for domReady');
});
