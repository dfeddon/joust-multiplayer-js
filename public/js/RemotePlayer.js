/* global game */

var RemotePlayer = function (index, game, player, startX, startY, startD) {
  var x = startX;
  var y = startY;
  var d = startD;

  this.game = game;
  this.health = 3;
  this.player = player;
  this.alive = true;

  this.player = game.add.sprite(x, y, 'enemy');
  this.player.d = d;

  this.player.animations.add('move', [0, 1, 2, 3, 4, 5, 6, 7], 20, true);
  this.player.animations.add('stop', [3], 20, true);

  this.player.anchor.setTo(0.5, 0.5);

  this.player.name = index.toString();
  game.physics.enable(this.player, Phaser.Physics.ARCADE);
  this.player.body.immovable = true;
  this.player.body.collideWorldBounds = true;

  //this.player.angle = game.rnd.angle();

  this.lastPosition = { x: x, y: y, d: d };
};

RemotePlayer.prototype.update = function () {
  console.log(':', this.player.d, this.lastPosition.d);
  if (this.player.x !== this.lastPosition.x || this.player.y !== this.lastPosition.y) {
    this.player.play('move');
    //this.player.rotation = Math.PI + game.physics.arcade.angleToXY(this.player, this.lastPosition.x, this.lastPosition.y);
  } else {
    this.player.play('stop');
  }

  if (this.player.d !== this.lastPosition.d) {
    console.log("position CHANGED!");
    this.player.anchor.setTo(0.5, 0.5);
    this.player.scale.x *= -1;
  }

  this.lastPosition.x = this.player.x;
  this.lastPosition.y = this.player.y;
  this.lastPosition.d = this.player.d;

  // platform collision
  game.physics.arcade.collide(player, platforms, collisionCallback, processCallback, this);

};

window.RemotePlayer = RemotePlayer;
