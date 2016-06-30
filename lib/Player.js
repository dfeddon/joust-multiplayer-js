/* ************************************************
** GAME PLAYER CLASS
************************************************ */
var Player = function (startX, startY, startD) {
  var x = startX;
  var y = startY;
  var d = startD;
  var id;

  // Getters and setters
  var getX = function () {
    return x;
  };

  var getY = function () {
    return y;
  };

  var getD = function() {
    return d;
  };

  var setX = function (newX) {
    x = newX;
  };

  var setY = function (newY) {
    y = newY;
  };

  var setD = function(newD) {
    d = newD;
  };

  // Define which variables and methods can be accessed
  return {
    getX: getX,
    getY: getY,
    getD: getD,
    setX: setX,
    setY: setY,
    setD: setD,
    id: id
  };
};

// Export the Player class so you can use it in
// other files by using require("Player")
module.exports = Player;
