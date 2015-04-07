var express = require('express');
var router = express.Router();
var fs = require('fs');
var glog = require('glog');

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

router.get('/showlog/:id', function(req, res, next) {
    var lr = glog.openLogSearcher({
        fileName: logdir + '/' + req.params.id
    });
    
    var query = {
    };
    
    lr.search(query, 0, 100, 'entryid', 'asc', {}, function(s, r) {
        lr.close();
        console.log('result', s, r);
        res.render('showlog', {messages: r});
    });
    
    
});

module.exports = router;
