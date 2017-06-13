var Particle = require('./class.particle');

var ParticleShrink = function(opts)
{
    for(var i in Particle.prototype)
    {
        ParticleShrink.prototype[i] = Particle.prototype[i];
    }
    this.reset(opts);
    // console.log("== ParticleShrink ==")
}
ParticleShrink.prototype.beforeDraw = function(p)
{
    this.rNow = this.r * p;
}

module.exports = ParticleShrink;