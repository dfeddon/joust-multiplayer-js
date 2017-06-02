// var canvas = document.getElementById('c');
// var ctx = canvas.getContext('2d');
// // var j = 0;
// var emitters = [];
/*
var tick = function(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(var i=0; i<emitters.length;i++){
        emitters[i].draw();   
    }
    j++ < 10000 && window.requestAnimationFrame(tick);
}
*/
var Emitter = function(opts)
{
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
}

Emitter.prototype.draw = function()
{
   this.opts.ctx.save(); this.opts.ctx.translate(this.opts.center[0],this.opts.center[1]);
    for(var i=0; i<this.particles.length;i++)
    {
        this.opts.ctx.save();
        
        if(!this.particles[i].draw(this.opts.ctx,Date.now()) && (this.opts.particlesTotal == -1 || this.total++ < this.opts.particlesTotal))
        {
            this.opts.i = Date.now();
            this.particles[i] = new Particle(this.opts);
        }
        this.opts.ctx.restore();
    }
   this.opts.ctx.restore();
}

var Particle = function(opts)
{
    this.reset(opts);
}
Particle.prototype.beforeDraw = function(p,ctx)
{
    ctx.globalAlpha=p;
}

Particle.prototype.reset = function(opts)
{
    if (opts.colorFn)
    {
        this.color = opts.colorFn();
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
    return value[0] + (value[1]*2*Math.random()-value[1]);
}

Particle.prototype.draw = function(ctx,i)
{
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

var ParticleShrink = function(opts)
{
    this.reset(opts);
}
for(var i in Particle.prototype)
{
    ParticleShrink.prototype[i] = Particle.prototype[i];
}
ParticleShrink.prototype.beforeDraw = function(p)
{
    this.rNow = this.r * p;
}

var explode = function()
{
    emitters[0] = new Emitter(
    {
        particles:20,
        particlesTotal:10,
        particleType: ParticleShrink,
        colorFn:function()
        {
            var color = 'rgba(255,255,255,'+Math.random()*.5+')';
            return color;;
        },
        ang: [Math.PI,Math.PI],
        r: [16,6],
        spd: [.1,.05],
        life: [800,250],
        ctx:ctx,
        center: [100,100]
    });
    emitters[1] = new Emitter(
    {
        particles:15,
        particleType: ParticleShrink,
        particlesTotal:15,
        colorFn:function()
        {
            var color = 'rgba(255,255,255,1)';
            return color;;
        },
        ang: [Math.PI,Math.PI],
        r: [5,3],
        spd: [.1,.05],
        life: [600,250],
        ctx:ctx,
        center: [100,100]
    });
}
explode();
window.setInterval(explode,2000);


/* Engine Flames */
/*
emitters.push(new Emitter(
{
    particles:20,
    particlesTotal:-1,
    color:'red',
    ang: [Math.PI/2,.5],
    r: [8,3],
    spd: [.02,.0025],
    life: [2000,300],
    ctx:ctx,
    center: [200,200]
}));

emitters.push(new Emitter(
{
    particles:30,
    particleType: ParticleShrink,
    particlesTotal:-1,
    color:'#f40',
    ang: [Math.PI/2,.3],
    r: [5,2],
    spd: [.04,.01],
    life: [3000,1000],
    ctx:ctx,
    center: [200,200]
}));

emitters.push(new Emitter(
{
    particles:20,
    particleType: ParticleShrink,
    particlesTotal:-1,
    color:'orange',
    ang: [Math.PI/2,.25],
    r: [4,2],
    spd: [.02,.01],
    life: [3000,300],
    ctx:ctx,
    center: [200,200]
}));

emitters.push(new Emitter(
{
    particles:20,
    particlesTotal:-1,
    color:'rgba(255,255,255,.5)',
    ang: [Math.PI/2,.25],
    r: [3,2],
    spd: [.02,.01],
    life: [2000,300],
    ctx:ctx,
    center: [200,200]
}));
//*/
/* */

// tick();