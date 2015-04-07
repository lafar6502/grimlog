var express = require('express');
var router = express.Router();
var fs = require('fs');

var logdir = __dirname + '/../../glogs/';

/* GET logs listing. */
router.get('/', function(req, res, next) {
    fs.readdir(logdir, function(err, files) {
        console.log(err, files);
        if (err) {
            res.error();
        }
        else {
            res.render('loglist', { files: files });
        };
    });
});

router.get('/show/:id', function(req, res, next) {
    res.render('showlog', { });
});

module.exports = router;
