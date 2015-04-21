var express = require('express');
var router = express.Router();
var fs = require('fs');
var glog = require('glog');
var _ = require('lodash');
var path = require('path');
var moment = require('moment');

var logdir = __dirname + '/../../glogs/';

function getLogFileIds() {
};

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

router.get('/query/:id', function(req, res, next) {
    var fid = req.params.id;
    if (fid.indexOf('.db3') < 0) fid += '.db3';
    var lr = glog.openLogSearcher({
        fileName: logdir + '/' + fid,
        readOnly: true
    });
    
    var stime = null;
    if (!isNaN(req.query.hh) && !isNaN(req.query.mm) && !isNaN(req.query.ss) && !isNaN(req.query.baseDate)) {
        //need a date, too!
        stime = parseInt(req.query.baseDate) + (parseInt(req.query.hh) * 3600 + parseInt(req.query.mm) * 60 + parseInt(req.query.ss)) * 1000;
    };
    
    console.log('stime: ', stime);
    var query = _.omit({
        level: req.query.level,
        logname: req.query.logname,
        source: req.query.source,
        send_addr: req.query.send_addr,
        correlation: req.query.correlation,
        pid: req.query.pid,
        threadid: req.query.threadid,
        startTime: isNaN(req.query.startTime) ? stime : req.query.startTime,
        endTime: req.query.endTime,
        entryid: req.query.entryid,
        text: req.query.text
    }, function(v) { return v == undefined || v == null || v == ''; });
    
    req.query.limit = isNaN(req.query.limit) ? 100 : parseInt(req.query.limit);
    req.query.start = isNaN(req.query.start) ? 0 : parseInt(req.query.start);
    lr.search(query, req.query.start, req.query.limit, 'entryid', req.query.dir, {}, function(s, r) {
        lr.close();
        //console.log('result', s, r);
        if (!s) {
            console.log('search query error', r);
            res.status(500).end(r);
            return;
        };
        
        console.log('more? ', r.hasMore, r.start, r.limit);
        r.form = req.query;
        var t0 = r.data.length == 0 ? new Date() : new Date(r.data[0].ts);
        r.firstTS = t0.getTime();
        if (!_.has(r.form, 'baseDate') || r.form.baseDate == null || r.form.baseDate == undefined || isNaN(r.form.baseDate)) {
            r.form.baseDate = t0 - (t0 % (24 * 3600 * 1000));
        };
        if (isNaN(r.form.hh) || isNaN(r.form.mm) || isNaN(r.form.ss)) {
            r.form.hh = t0.getHours();
            r.form.mm = t0.getMinutes();
            r.form.ss = t0.getSeconds();
        }
        _.forEach(r.data, function(e) {
            e.tsf = moment(e.ts).format('HH:mm:ss.SSS');
        });
        res.render('query', r);
    });
    
});

router.get('/browser/:id', function(req, res, next) {
    
    var r = {
        query: req.query,
        fileId: req.params.id,
        prevFileId: '',
        nextFileId: ''
    };
    res.render('ajaxbrowser', r);

});

router.get('/showlog/:id', function(req, res, next) {
    var fid = req.params.id;
    if (fid.indexOf('.db3') < 0) fid += '.db3';
    var lr = glog.openLogSearcher({
        fileName: logdir + '/' + fid
    });
    var stime = null;
    if (!isNaN(req.query.hh) && !isNaN(req.query.mm) && !isNaN(req.query.ss) && !isNaN(req.query.baseDate)) {
        //need a date, too!
        stime = parseInt(req.query.baseDate) + (parseInt(req.query.hh) * 3600 + parseInt(req.query.mm) * 60 + parseInt(req.query.ss)) * 1000;
    };
    console.log('stime: ', stime);
    var query = _.omit({
        level: req.query.level,
        logname: req.query.logname,
        source: req.query.source,
        correlation: req.query.correlation,
        pid: req.query.pid,
        threadid: req.query.threadid,
        startTime: isNaN(req.query.startTime) ? stime : req.query.startTime,
        endTime: req.query.endTime
    }, function(v) { return v == undefined || v == null || v == ''; });
    
    req.query.limit = isNaN(req.query.limit) ? 100 : parseInt(req.query.limit);
    req.query.start = isNaN(req.query.start) ? 0 : parseInt(req.query.start);
    lr.search(query, req.query.start, req.query.limit, 'entryid', 'asc', {}, function(s, r) {
        lr.close();
        //console.log('result', s, r);
        console.log('more? ', r.hasMore, r.start, r.limit);
        r.form = req.query;
        var t0 = r.data.length == 0 ? new Date() : new Date(r.data[0].ts);
        if (!_.has(r.form, 'baseDate') || r.form.baseDate == null || r.form.baseDate == undefined || isNaN(r.form.baseDate)) {
            r.form.baseDate = t0 - (t0 % (24 * 3600 * 1000));
        };
        if (isNaN(r.form.hh) || isNaN(r.form.mm) || isNaN(r.form.ss)) {
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
