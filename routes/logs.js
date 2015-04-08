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
    console.log('qry: ', req.query);
    
    var query = {
        level: req.query.level,
        logname: req.query.logname,
        source: req.query.source,
        correlation: req.query.correlation,
        pid: req.query.pid,
        threadid: req.query.threadid,
        startTime: req.query.startTime,
        endTime: req.query.endTime
    };
    var st = isNaN(req.query.start) ? 0 : parseInt(req.query.start);
    var lmt = isNaN(req.query.limit) ? 100 : parseInt(req.query.limit);
    
    lr.search(query, st, lmt, 'entryid', 'asc', {}, function(s, r) {
        lr.close();
        //console.log('result', s, r);
        res.render('showlog', {messages: r});
    });
    
    
});

module.exports = router;
