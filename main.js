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

// load DOM, player class and game core
define(['require', 'domReady', 'class.player', 'game.core'], function (require, domReady, player, game)
{
  domReady(function()
  {
    console.log('domReady');

    // DOM is loaded, now load client
    require(['client'], function(client)
    {
      console.log('client loaded');
    });
  });
});
