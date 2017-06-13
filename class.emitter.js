var Particle = require('./class.particle');
var ParticleShrink = require('./class.particleShrink');

var Emitter = function(opts)
{
    // console.log("== Emitter ==");

    this.particles = [];
    this.opts = opts;
    this.total = 0;
    this.opts.i = Date.now();
    this.particleType = opts.particleType || Particle;
    for(var i=0; i<opts.particles;i++)
    {
        this.total++;
        this.particles.push(new this.particleType(opts));
    }
    for(i in Particle.prototype)
    {
        // console.log("i shrink");
        ParticleShrink.prototype[i] = Particle.prototype[i];
    }

}

Emitter.prototype.draw = function()
{
    // console.log("* emitter.draw");

    this.opts.ctx.save(); 
    this.opts.ctx.translate(this.opts.center[0],this.opts.center[1]);
    // if (this.particles.length === 0)
        // console.log("emitter is done!");
    for(var i=0; i<this.particles.length;i++)
    {
        this.opts.ctx.save();
        
        if(!this.particles[i].draw(this.opts.ctx,Date.now()) && (this.opts.particlesTotal == -1 || this.total++ < this.opts.particlesTotal))
        {
            this.opts.i = Date.now();
            this.particles[i] = new Particle(this.opts);
        }
        else 
        {
            // console.log("* emitter particle is done...");
            // this.particles.splice(i, 1);
        }
        this.opts.ctx.restore();
    }
   this.opts.ctx.restore();
}

Emitter.prototype.doRelease = function()
{
    // console.log('* parts', this);
    for (var i = 0; i < this.opts.particles.length; i++)
    {
        for (var j in this.opts.particles[i])
            delete this.opts.particles[i][j];
    }
}

module.exports = Emitter;
