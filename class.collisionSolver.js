function CollisionSolver(){}
CollisionSolver.prototype.resolveElastic = function(player, entity)
{
    //console.log('CollisionSolver.resolveElastic', player, entity);
    var STICKY_THRESHOLD = 0.0004;
    // Find the mid points of the entity and player
    var pMidX = player.getMidX();
    var pMidY = player.getMidY();
    var aMidX = entity.getMidX();
    var aMidY = entity.getMidY();

    // To find the side of entry calculate based on
    // the normalized sides
    var dx = (aMidX - pMidX) / entity.halfWidth;
    var dy = (aMidY - pMidY) / entity.halfHeight;

    // Calculate the absolute change in x and y
    var absDX = Math.abs(dx);
    var absDY = Math.abs(dy);

    // If the distance between the normalized x and y
    // position is less than a small threshold (.1 in this case)
    // then this object is approaching from a corner
    if (Math.abs(absDX - absDY) < 0.1) {

        // If the player is approaching from positive X
        if (dx < 0) {

            // Set the player x to the right side
            player.x = entity.getRight();

        // If the player is approaching from negative X
        } else {

            // Set the player x to the left side
            player.x = entity.getLeft() - player.width;
        }

        // If the player is approaching from positive Y
        if (dy < 0) {

            // Set the player y to the bottom
            player.y = entity.getBottom();

        // If the player is approaching from negative Y
        } else {

            // Set the player y to the top
            player.y = entity.getTop() - player.height;
        }

        // Randomly select a x/y direction to reflect velocity on
        if (Math.random() < 0.5) {

            // Reflect the velocity at a reduced rate
            player.vx = -player.vx * entity.restitution;

            // If the object's velocity is nearing 0, set it to 0
            // STICKY_THRESHOLD is set to .0004
            if (Math.abs(player.vx) < STICKY_THRESHOLD) {
                player.vx = 0;
            }
        } else {

            player.vy = -player.vy * entity.restitution;
            if (Math.abs(player.vy) < STICKY_THRESHOLD) {
                player.vy = 0;
            }
        }

    // If the object is approaching from the sides
    } else if (absDX > absDY) {

        // If the player is approaching from positive X
        if (dx < 0) {
            player.x = entity.getRight();

        } else {
        // If the player is approaching from negative X
            player.x = entity.getLeft() - player.width;
        }

        // Velocity component
        player.vx = -player.vx * entity.restitution;

        if (Math.abs(player.vx) < STICKY_THRESHOLD) {
            player.vx = 0;
        }

    // If this collision is coming from the top or bottom more
    } else {

        // If the player is approaching from positive Y
        if (dy < 0) {
            player.y = entity.getBottom();

        } else {
        // If the player is approaching from negative Y
            player.y = entity.getTop() - player.height;
        }

        // Velocity component
        player.vy = -player.vy * entity.restitution;
        if (Math.abs(player.vy) < STICKY_THRESHOLD) {
            player.vy = 0;
        }
    }
};

if( 'undefined' != typeof global )
{
    module.exports = CollisionSolver;
}
