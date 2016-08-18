// Collision Decorator Pattern Abstraction
// http://www.ibm.com/developerworks/library/wa-build2dphysicsengine/

// These methods describe the attributes necessary for
// the resulting collision calculations

var collisionObj =
{

    // Elastic collisions refer to the simple cast where
    // two entities collide and a transfer of energy is
    // performed to calculate the resulting speed
    // We will follow Box2D's example of using
    // restitution to represent "bounciness"

    elastic: function(restitution)
    {
        this.restitution = restitution || 0.2;
    },

    displace: function()
    {
        // While not supported in this engine
        // the displacement collisions could include
        // friction to slow down entities as they slide
        // across the colliding entity
    }
};

if( 'undefined' != typeof global )
{
    module.exports = collisionObj;
}
