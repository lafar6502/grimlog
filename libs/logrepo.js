var sqli = require('sqlite3').verbose();
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
var mtz = require('moment-timezone');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var rLogLevels = ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG', 'TRACE'];
var logLevels = {
    'FATAL': 2,
    'WARN': 4,
    'INFORMATIONAL': 6
};
for(var i=0; i<rLogLevels.length; i++) { logLevels[rLogLevels[i]] = i; };



function getLogLevelId(lvl) {
	if (_.isNumber(lvl)) return lvl;
	if (!_.isString(lvl)) return 0;
    lvl = lvl.toUpperCase();
	if (_.has(logLevels, lvl)) return logLevels[lvl];
	return 0;
};

function getLogLevelName(lvl) {
    if (isNaN(lvl)) return lvl;
    return rLogLevels[parseInt(lvl)];
};

function LogRepository(cfg) {
	this.logLevel = getLogLevelId(cfg.logLevel || 3);
	this.readOnly = _.has(cfg, 'readOnly') ? cfg.readOnly : false;
	this.tableName = 'logentry';
	this.eventz = [];
	var me = this;
	var doClose = false;
    
	var db = null; 
    var flushTimer = null;
                        
    var escSql = function(s) {
        return s.replace(/\'/g, '\'\'');
        //return s.replace("'", "''");
    };
    
    var ns = function(s) {
        if (s == null || s == undefined) return 'NULL';
        return "'" + escSql(s) + "'";
    };
    
    var getDbFileName = function() {
        var fn = cfg.fileName;
        if (_.has(cfg, 'fileDateFormat')) {
            fn = fn + new moment().tz(cfg.timeZone || 'UTC').format(cfg.fileDateFormat);
        };
        fn += ".db3";
        return fn;
    };
    
    var currentFileName = null;
    
    var cleanup = function() {
        console.log('closing the db ' + currentFileName);
        
        if (db != null) {
            db.close();
            db = null;
        };
        if (flushTimer != null) {
            clearInterval(flushTimer);
            flushTimer = null;
        };
    };
    
    var writeDb = function(callback) {
        var nf = getDbFileName();
        console.log('writeDb', nf);
        if (db == null || currentFileName != nf) { //initialize new db
            if (db != null) {
                cleanup();
            };
            me.emit('dbinit', nf, me);
            console.log('initializing/opening db', nf);
            var ndb = new sqli.Database(nf, function() {
                if (!this.readOnly) {
                    
                    
                    var qry = [
                        "CREATE TABLE IF NOT EXISTS logentry(entryid INTEGER NOT NULL PRIMARY KEY, ts INTEGER NOT NULL, level INTEGER NOT NULL, correlation VARCHAR(50), source VARCHAR(50) NOT NULL, send_addr VARCHAR(50) NOT NULL, logname VARCHAR(80) NOT NULL, pid INTEGER NOT NULL, threadid INTEGER NOT NULL, uid VARCHAR(50), message TEXT NOT NULL)",
                        "CREATE VIRTUAL TABLE IF NOT EXISTS logentry_fts USING fts4(content='logentry', message)",
                        "CREATE INDEX IF NOT EXISTS logentry_ts ON logentry(ts)",
                        "CREATE INDEX IF NOT EXISTS logentry_correlation ON logentry(correlation)",
                        "CREATE INDEX IF NOT EXISTS logentry_logname ON logentry(logname)",
                        "CREATE INDEX IF NOT EXISTS logentry_pid ON logentry(pid)",
                        "CREATE INDEX IF NOT EXISTS logentry_tid ON logentry(threadid)",
                        "CREATE TRIGGER IF NOT EXISTS tg_logentry AFTER INSERT ON logentry BEGIN INSERT INTO logentry_fts(docid, message) VALUES(new.rowid, new.message || COALESCE(' ~C' || new.correlation, '') || COALESCE(' ~U' || new.uid, '') || COALESCE(' ~P' || new.pid, '') || COALESCE(' ~T' || new.threadid, '') ); END;"
                    ];
                    console.log('creating db struct', qry.join('; '));
                    var cnt = qry.length;
                    ndb.serialize(function() {
                        _.forEach(qry, function(sql) {
                            console.log('running ', sql);
                            ndb.run(sql, function(err) {
                                cnt--;
                                if (err) console.log('error', arguments);
                                if (cnt == 0) {
                                    db = ndb;
                                    currentFileName = nf;
                                    me.emit('dbcreated', nf, ndb, me);
                                    callback(db);
                                };
                            });
                        });
                    });
                };
            });
        }
        else 
        {
            callback(db);
        }
    };
    
    var writeEvents = function(events, callback) {
        
        writeDb(function(tdb) {
            var qdata = [];
            var ssql = "INSERT INTO logentry(ts, level, correlation, source, logname, message, pid, threadid, send_addr, uid) values \n";
            var rem = events.length;
            
            var errors = null;
            
            var doq = function(dt) {
                if (dt.length == 0) {
                    _.defer(callback);
                    return;
                };
                var qry = ssql + dt.join(",\n") + ";";
                var t0 = new Date().getTime();
                tdb.run(qry, function(err) {
                    rem -= dt.length;
                    console.log('insert ', dt.length, 'events, err:', err, 'time: ', new Date().getTime() - t0);
                    if (err) errors = arguments;
                    if (rem == 0) {
                        if (err) {
                            console.log('query error', err, qry);
                        };
                        callback();
                    };
                });
            };
            
            _.forEach(events, function(evt) {
                if (!_.has(evt, 'message')) throw new Error('message missing');
                var ts = evt.ts || new Date().getTime();
                if (ts < 2100000000) ts = ts * 1000;
                qdata.push("(" + ts + ", " + getLogLevelId(evt.level) + ", " + ns(evt.correlation) + ", " + ns(evt.source) 
                    + ", " + ns(evt.logname) + ", " + ns(evt.message) + ", " + (isNaN(evt.pid) ? -1 : evt.pid) 
                    + ", " + (isNaN(evt.threadid) ? -1 : evt.threadid) + ", " + ns(evt.send_addr) 
                    + ", " + ns(evt.uid)+ ")");
                if (qdata.length >= 500) {
                    doq(qdata);
                    qdata = [];
                };
            });
            doq(qdata);
        });
    };
	
	this.enqueueEvent = function(evt) {
        if (doClose) throw new Error("Database closing");
        if (!_.has(evt, 'ts') || isNaN(evt.ts)) ev.ts = new Date().getTime();
        if (!_.has(evt, 'source')) evt.source = evt.send_addr;
        if (!_.has(evt, 'send_addr')) throw new Error('send_addr required');
        if (!_.has(evt, 'message')) throw new Error('message required');
        
		me.eventz.push(evt);
        if (flushTimer == null) {
            flushTimer = setInterval(function() { me.flush(); }, 100);
        };
	};
    
    
    
    var flushing = false;
    
    this.flush = function() {
        if (flushing) {
            console.log('still flushing');
            return;
        };
        flushing = true;
        
        var el = me.eventz;
        me.eventz = [];
        var t0 = new Date().getTime();
        var cln = function() {
            if (doClose) cleanup();
            flushing = false;
            me.emit('eventsFlushed', {count: el.length, time: new Date().getTime() - t0}, me);
        };
        if (el.length > 0) {
            console.log('flushing ', el.length, 'events');
            writeEvents(el, cln);
        } else cln();
    };
    
    this.close = function() {
        doClose = true;
    };
    
	
};


//add log entry
// source - 
// logName - log name
// level - DEBUG, INFO, TRACE, ERROR, WARNING/WARN 
LogRepository.prototype.addLog = function(ts, senderAddress, processId, logName, level, message, correlation) {
	var evt = {
		send_addr: senderAddress,
        source: senderAddress,
		logname: logName,
		level: getLogLevelId(level),
		message: message,
		correlation: correlation,
		ts: ts,
        pid: processId
	};
	this.enqueueEvent(evt);
};


/***
 * LogSearcher - for reading the logs
 */
function LogSearcher(cfg) {
    var db = new sqli.Database(cfg.fileName, sqli.OPEN_READONLY, function(err) {
    });
    
    
    
    
    this.search = function(query, start, limit, sort, dir, opts, callback) {
        if (isNaN(start)) start = 0;
        if (isNaN(limit)) limit = 100;
        if (sort == undefined || sort == null || sort == '') sort = 'entryid';
        if (dir == undefined || dir == null || !_.isString(dir) || (dir.toUpperCase() != 'ASC' && dir.toUpperCase() != 'DESC')) dir = 'asc';
        
        if (!_.isFunction(callback)) throw new Error('callback expected (param #7)');
        console.log('got query:', query);
        var qry = [];
        prm = {};
        
        var getTS = function(v) {
            if (isNaN(v)) {
                var ts = moment.tz(v, cfg.timeZone || 'UTC').valueOf();
                if (isNaN(ts)) throw new Error('timestamp invalid');
                return ts;
            } else {
                return parseInt(v);
            }
        };
        if (_.has(query, 'startTime') && query.startTime != undefined) {
            var ts = getTS(query.startTime);
            prm.$ts_from = ts;
            qry.push("ts >= $ts_from");
        };
        if (_.has(query, 'endTime') && query.endTime != undefined) {
            var ts = getTS(query.endTime);
            prm.$ts_to = ts;
            qry.push("ts < $ts_to");
        };
        if (_.has(query, 'timestamp') && query.timestamp != undefined) {
            var ts = query.timestamp;
            if (!_.isArray(ts) || ts.length != 2) throw new Error('timestamp should be a 2-element array [from, to]');
            qry.push("ts >= $ts_from AND ts < $ts_to");
            prm.$ts_from = ts[0];
            prm.$ts_to = ts[1];
        };
        if (_.has(query, 'correlation') && query.correlation != undefined) {
            if (!_.isString(query.correlation)) throw new Error('correlation should be a string');
            qry.push('correlation = $correlation');
            prm.$correlation = query.correlation;
        };
        if (_.has(query, 'source') && query.source != undefined) {
            if (!_.isString(query.source)) throw new Error('source should be a string');
            qry.push('source == $source');
            prm.$source = query.source;
        };
        if (_.has(query, 'uid') && query.uid != undefined) {
            if (!_.isString(query.uid)) throw new Error('uid should be a string');
            qry.push('uid == $uid');
            prm.$uid = query.uid;
        };
        if (_.has(query, 'logname')  && query.logname != undefined) {
            qry.push('logname LIKE $logname');
            prm.$logname = query.logname + '%';
        };
        if (_.has(query, 'text')  && query.text != undefined) {
            if (false) qry.push('message LIKE $text');
            if (true) qry.push('entryid in (select rowid from logentry_fts where message MATCH $text)');
            prm.$text = query.text;
        };
        if (_.has(query, 'pid')) {
            qry.push('pid == $pid');
            prm.$pid = query.pid;
        };
        if (_.has(query, 'threadid')) {
            qry.push('threadid == $threadid');
            prm.$threadid = query.threadid;
        };
        if (_.has(query, 'level')  && query.level != undefined) {
            var lvl = _.isArray(query.level) ? query.level : [query.level];
            lvl = _.map(lvl, getLogLevelId);
            if (lvl.length == 1) {
                qry.push('level <= $level');
                prm.$level = lvl[0];
            }
            else {
                qry.push('level in (' + lvl.join(', ') + ')');
            };
        };
        var sql = "select entryid, ts, level, correlation, source, logname, message, pid, threadid, uid, send_addr from logentry ";
        if (qry.length > 0) sql += "where " + qry.join(" AND ");
        sql += " order by " + sort + " " + dir;
        sql += " LIMIT " + start + ", " + (limit + 1);
        console.log('sql', sql, prm);
        db.all(sql, prm, function(err, rows) {
            if (err) {
                callback(false, 'query error');
            } else {
                var hasMore = rows.length > limit;
                if (hasMore) rows = rows.slice(0, -1);
                _.forEach(rows, function(r) {
                    r.time = moment.tz(r.ts, cfg.timeZone || 'UTC').format('YYYY-MM-DD HH:mm:ss.SSS');
                    r.level = getLogLevelName(r.level);
                });
                var ret = {
                    data: rows,
                    hasMore: hasMore,
                    start: start,
                    limit: limit,
                    query: query,
                    sort: '',
                    dir: 'asc',
                    logStartTime: 'TODO: base date of log start/log rotation'
                };
                
                callback(true, ret);
            }
        });
    };
    
    this.getLogStats = function(prm, callback) {
        callback(true, {
            logName: '',
            logStartTime: '',
            firstEventTS: 323,
            lastEventTS: 423423,
            totalEvents: 342349920
        }); 
    };
    
    this.close = function() {
        if (db != null) {
            console.log('closing db');
            db.close();
            db = null;
        };
    };
};


function LogsHelper(cfg) {
    var me = this;
    
    this.queryDb = function(dbFile, sql, paramz, callback) {
        var db = new sqli.Database(dbFile, sqli.OPEN_READONLY, function(err) {
            if (err) {
                console.log('db err', arguments);
                callback.apply(arguments);
                return;
            }
            
            db.all(sql, paramz, function(err, rows) {
                db.close();
                if (err) {
                    console.log('query err', arguments, sql, paramz);
                    callback.apply(arguments);
                    return;
                }
                var ret = {
                    data: rows,
                    sql: sql, 
                    dbFile: dbFile, 
                    paramz: paramz
                };
                callback(false, ret);
            });
        });
    };
    
    this.searchAllLogs = function(sql, paramz, dataFiles, callback) {
       if (!_.isArray(dataFiles)) {
           if (_.isString(dataFiles)) {
                var fnames = fs.readdirSync(dataFiles);
                fnames = _.filter(fnames, function(f) {
                    return _.endsWith(f, '.db3') || _.endsWith(f, '.db') || _.endsWith(f, '.sqlite');
                });
                fnames = _.map(fnames, function(f) {
                    return dataFiles + '\\' + f;
                });
                dataFiles = fnames;
           }
           else throw new Error("error");
        }
        //console.log('my files', dataFiles);
        
        var theData = {};
        
        var left = dataFiles.length;
        _.each(dataFiles, function(f) {
            me.queryDb(f, sql, paramz, function(err, dt) {
                left--;
                //console.log('got result for', f, err);
               if (err) {
                   console.log('query failed for', f, dt);
                   theData[f] = {success: false, error: dt};
               } 
               else {
                   theData[f] = {success: true, data: dt.data};
               }
               if (left == 0) {
                   callback(theData);
               }
            });
        });

    }
    
}

util.inherits(LogRepository, EventEmitter);

module.exports = {
	openLogRepository: function(cfg) {
		return new LogRepository(cfg);
	},
    openLogSearcher: function(cfg) {
        return new LogSearcher(cfg);
    },
    getDataHelper: function(cfg) {
        return new LogsHelper(cfg);
    },
    getLogLevelName: getLogLevelName,
    getLogLevelId: getLogLevelId
};
