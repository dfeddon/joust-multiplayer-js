require('throng')(
    function () { require('./app'); },
    {
        workers: process.env.WEB_CONCURRENCY,
        lifetime: Infinity
    }
);