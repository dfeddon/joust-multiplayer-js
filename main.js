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
define(
  [
    'require',
    'domReady',
    'egyptian_set',
    'class.player',
    'class.collision',
    'class.physicsEntity',
    'class.collisionDetector',
    'class.collisionSolver'
  ], function (require, domReady, player) {
  domReady(function()
  {
    console.log('domReady');
    // DOM is loaded, now load game
    require(['game.core'], function(game)
    {
      console.log('game loaded');
      require(['client'], function(client)
      {
        console.log('client loaded');
      });
    });
  });
});
