console.log('main');

require.config({
  paths : {
        //'lodashlib': '/node_modules/lodash'
//      'animation': '/node_modules/sprite-anim/dist'
//       loader : 'libs/backbone/loader',
//       jQuery : 'libs/jquery/jquery-module',
//       Underscore : 'libs/underscore/underscore-module',
//       Backbone : 'libs/backbone/backbone-module',
//       templates : '../Templates'
  }
});

// load DOM, player class and game core
define(
  [
    'require',
    'domReady',
    'node_modules/lodash/lodash.min',
    'egyptian_set',
    //'animation/sprite-anim',
    'class.spritesheet',
    'class.stopwatch',
    'class.chest',
    'class.flag',
    'class.event',
    'class.player',
    'class.platform',
    'class.collision',
    'class.physicsEntity',
    'class.collisionDetector',
    'class.collisionSolver'
  ], function (require, domReady, player) {
  domReady(function()
  {
    console.log('domReady');
    // DOM is loaded, now load game
    /*require(['animation/sprite-anim'], function(anim)
    {
      console.log('animation loaded', anim);
      this.anim = anim;*/

      require(['game.core'], function(game)
      {
        console.log('game loaded');

        require(['client'], function(client)
        {
          console.log('client loaded');
        });
      });
    //});
  });
});
