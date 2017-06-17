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

var Emitter = require('./class.emitter');
var ParticleShrink = require('./class.particleShrink');

function Particles(pos, type, ctx, rgb)
{
    console.log("== Particles ==", pos, type);

    this.ctx = ctx;
    this.x = pos.x;
    this.y = pos.y;
    this.f = 0;

    if (rgb)
        this.rgb = rgb;
    else this.rgb = "255,255,255"; // default is white
    this.rgb = "255,255,255";

    switch(type)
    {
        case 1: // explosion
            this.emitters = this.explosion();
        break;
    }
}

Particles.prototype.draw = function()
{
    // console.log("* emitters to draw", this.emitters.length);

    this.f++;

    for (var i = this.emitters.length - 1; i >= 0; i--)
        this.emitters[i].draw();
};

Particles.prototype.explosion = function()
{
    // console.log("particles.explosion()");

    var _this = this;

    var emitters = [];
    emitters[0] = new Emitter(
    {
        particles:20,
        particlesTotal:10,
        particleType: ParticleShrink,
        colorFn:function()
        {
            var color = 'rgba(' + _this.rgb + ',' + Math.random() * .5 + ')';
            return color;
        },
        ang: [Math.PI,Math.PI],
        r: [16,6],
        spd: [.1,.05],
        life: [800,250],
        ctx: this.ctx,
        center: [this.x, this.y]//[100,100]
    });
    emitters[1] = new Emitter(
    {
        particles:15,
        particleType: ParticleShrink,
        particlesTotal:15,
        colorFn:function()
        {
            var color = 'rgba(' + _this.rgb + ',1)';
            return color;
        },
        ang: [Math.PI,Math.PI],
        r: [5,3],
        spd: [.1,.05],
        life: [600,250],
        ctx: this.ctx,
        center: [this.x, this.y]//[100,100]
    });

    return emitters;
}

Particles.prototype.doRelease = function()
{
    for (var i = 0; i < this.emitters.length; i++)
    {
        for (var j in this.emitters[i])
        {
            this.emitters[i].doRelease();
            delete this.emitters[i][j];
        }
    }
}

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

module.exports = Particles;