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
    //'hammer.min.js',
    //'hammer-time.min.js',
    'node_modules/lodash/lodash.min',
    'egyptian_set',
    //'animation/sprite-anim',
    //'class.sprites',
    //'class.cellSwitch',
    //'class.CycleBehavior',
    'class.spritesheet',
    //'class.nativeControls',
    'class.stopwatch',
    'class.toast',
    'class.consumable',
    'class.flag',
    'class.event',
    'class.player',
    'class.platform',
    'class.collision',
    'class.physicsEntity',
    'class.collisionDetector',
    'class.collisionSolver'
  ], function (require, domReady, Hammer) {
  domReady(function()
  {
    console.log('domReady');
    // DOM is loaded, now load game
    /*require(['animation/sprite-anim'], function(anim)
    {
      console.log('animation loaded', anim);
      this.anim = anim;*/

      //window.Hammer = Hammer;

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
