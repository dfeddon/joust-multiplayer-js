
var Particle = function(opts)
{
    // console.log("== Particle ==");

    this.reset(opts);
}

Particle.prototype.beforeDraw = function(p,ctx)
{
    ctx.globalAlpha=p;
}

Particle.prototype.reset = function(opts)
{
    // console.log("* particle.reset");

    if (opts.colorFn)
    {
        this.color = opts.colorFn();
        // console.log("* color fn", opts.colorFn);
    } 
    else 
    {
        this.color = opts.color || 'white';
    }
    this.r = this.fuzz(opts.r) || 4;
    this.ang = this.fuzz(opts.ang) || Math.PI*2*Math.random();
    this.spd = this.fuzz(opts.spd) || Math.random()/5;
    this.life = this.fuzz(opts.life) || 250+Math.random() * 250;
    this.i = opts.i || 0;
    this.animate = opts.animate || ['scale'];
    
    this.rNow = this.r;
    this.angNow = this.ang;
    this.spdNow = this.spd;
    this.colorNow = this.color;
}

Particle.prototype.fuzz = function(value)
{
    if(!value)
    {
        return false;
    }
    return value[0] + (value[1] * 2 * Math.random() - value[1]);
}

Particle.prototype.draw = function(ctx,i)
{
    // console.log("* particle.draw()");
    i -= this.i;
    
    if(i > this.life)
    {
        return false;
    }
    
    var p = (1-(i/this.life));
    this.beforeDraw(p,ctx);
    ctx.rotate(this.angNow);
    ctx.translate(0,i*this.spdNow);
    ctx.fillStyle = this.colorNow;
    this.drawFn(ctx,p);
    
    return this;
}

Particle.prototype.drawFn = function(ctx,p)
{
    // What are we drawing?
    ctx.beginPath();
    
    ctx.arc(0, 0, this.r*p, 0, 2 * Math.PI, false);
    ctx.fill();
}

module.exports = Particle;