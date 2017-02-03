onmessage = function(e)
{
    console.log('worker is working!');

    var player = e.data[0];
    var spark = e.data[1];
    console.log('sparkWorker', spark);

    postMessage("hi");
};