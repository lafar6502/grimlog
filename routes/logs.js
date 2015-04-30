var express = require('express');
var router = express.Router();
var fs = require('fs');
var glog = require('glog');
var _ = require('lodash');
var path = require('path');
var moment = require('moment');

var logdir = __dirname + '/../../glogs/';

function getLogFileIds(withFileInfo, callback) {
    fs.readdir(logdir, function(err, files) {
        if (err) { 
            callback(false, files);
            return;
        };
        var fl = _.map(files, function(f) {return path.basename(f, '.db3');}).sort();
        if (withFileInfo) {
            var cnt = files.length;
            var rt = [];
            _.forEach(files, function(f) {
                fs.stat(f, function(err, st) {
                    cnt--;
                    if (!err) {
                        console.log(st);
                        rt.push({
                            fileName: path.basename(f, '.db3'),
                            size: st.size,
                            lastModified: st.mtime
                        });
                        
                    };
                    if (cnt == 0) {
                        console.log('files:', rt);
                    };
                });
            });
            callback(true, fl);
        }
        else {
            callback(true, fl);
        };
    });
};

/* GET logs listing. */
router.get('/', function(req, res, next) {
    getLogFileIds(true, function(s, fl) {
        if (!s) {
            res.error();
            return;
        } else {
            res.render('loglist', { files:  fl});
        }
    });
});


function switchFile(id, moveNext, req, res, next) {
    
    getLogFileIds(false, function(s, fl) {
        if (!s) {
            res.error();
            return;
        } else {
            var idx = fl.indexOf(id);
            var did = id;
            if (idx >= 0) {
                if (moveNext && idx < fl.length - 1) did = fl[idx + 1];
                if (!moveNext && idx > 0) did = fl[idx - 1];
            }
            res.redirect('/logs/browser/' + did);
        }
    });
};

router.get('/nextFile/:id', function(req, res, next) {
    switchFile(req.params.id, true, req, res, next);
});

router.get('/prevFile/:id', function(req, res, next) {
    switchFile(req.params.id, false, req, res, next);
});

router.get('/query/:id', function(req, res, next) {
    var fid = req.params.id;
    if (fid.indexOf('.db3') < 0) fid += '.db3';
    var lr = glog.openLogSearcher({
        fileName: logdir + '/' + fid,
        readOnly: true
    });
    console.log('qry: ', req.query);
    var stime = null;
    if (!isNaN(req.query.hh) && !isNaN(req.query.mm) && !isNaN(req.query.ss) && !isNaN(req.query.baseDate)) {
        //need a date, too!
        var dt = new Date(parseInt(req.query.baseDate));
        console.log('based: ', dt);
        dt.setHours(parseInt(req.query.hh));
        dt.setMinutes(parseInt(req.query.mm));
        dt.setSeconds(parseInt(req.query.ss));
        console.log('based2: ', dt);
        
        stime = dt.getTime(); //parseInt(req.query.baseDate) + (parseInt(req.query.hh) * 3600 + parseInt(req.query.mm) * 60 + parseInt(req.query.ss)) * 1000;
    };
    
    console.log('stime: ', stime, 'q.st', isNaN(req.query.startTime), ' - ', req.query.startTime);
    var dquery = {
        level: req.query.level,
        logname: req.query.logname,
        source: req.query.source,
        send_addr: req.query.send_addr,
        correlation: req.query.correlation,
        pid: req.query.pid,
        threadid: req.query.threadid,
        uid: req.query.uid,
        startTime: isNaN(stime) ? undefined : stime,
        endTime: req.query.endTime,
        entryid: req.query.entryid,
        text: req.query.text
    };
    dquery = _.omit(dquery, function(v) { return v == undefined || v == null || v == ''; });
    req.query.limit = isNaN(req.query.limit) ? 100 : parseInt(req.query.limit);
    req.query.start = isNaN(req.query.start) ? 0 : parseInt(req.query.start);
    console.log('db qry = ', dquery);
    lr.search(dquery, req.query.start, req.query.limit, 'entryid', req.query.dir, {}, function(s, r) {
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
            
        };
        r.form.baseDate = t0 - (t0 % (24 * 3600 * 1000));
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
