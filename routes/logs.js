var express = require('express');
var router = express.Router();
var fs = require('fs');
var glog = require('glog');
var _ = require('lodash');
var path = require('path');
var moment = require('moment');

var logdir = __dirname + '/../../glogs/';

/* GET logs listing. */
router.get('/', function(req, res, next) {
    fs.readdir(logdir, function(err, files) {
        console.log(err, files);
        if (err) {
            res.error();
        }
        else {
            res.render('loglist', { files: _.map(files, function(f) {return path.basename(f, '.db3');}) });
        };
    });
});

router.get('/showlog/:id', function(req, res, next) {
    var fid = req.params.id;
    if (fid.indexOf('.db3') < 0) fid += '.db3';
    var lr = glog.openLogSearcher({
        fileName: logdir + '/' + fid
    });
    if (!isNaN(req.query.hh) && !isNaN(req.query.mm) && !isNaN(rq.query.ss)) {
        //need a date, too!
    };
    var query = _.omit({
        level: req.query.level,
        logname: req.query.logname,
        source: req.query.source,
        correlation: req.query.correlation,
        pid: req.query.pid,
        threadid: req.query.threadid,
        startTime: req.query.startTime,
        endTime: req.query.endTime
    }, function(v) { return v == undefined || v == null || v == ''; });
    
    req.query.limit = isNaN(req.query.limit) ? 100 : parseInt(req.query.limit);
    req.query.start = isNaN(req.query.start) ? 0 : parseInt(req.query.start);
    lr.search(query, req.query.start, req.query.limit, 'entryid', 'asc', {}, function(s, r) {
        lr.close();
        //console.log('result', s, r);
        console.log('more? ', r.hasMore, r.start, r.limit);
        r.form = req.query;
        if (isNaN(r.form.hh) || isNaN(r.form.mm) || isNaN(r.form.ss)) {
            var t0 = r.data.length == 0 ? new Date() : new Date(r.data[0].ts);
            r.form.hh = t0.getHours();
            r.form.mm = t0.getMinutes();
            r.form.ss = t0.getSeconds();
        }
        _.forEach(r.data, function(e) {
            e.tsf = moment(e.ts).format('HH:mm:ss.SSS');
        });
        res.render('showlog', r);
    });
    
    
});

module.exports = router;
