var lr = require('./logrepo');
var _ = require('lodash');
var dgram = require('dgram');
var moment = require('moment');

function LogCollector(cfg) {
    var exampleConfig = {
        fileName: '/tmp/test',
        fileDateFormat: 'YYYY-MM-DD',
        udpPort: 10030,
        listenAddress: '0.0.0.0'
    };
    
    var dgsock = null;
    var me = this;
    var stat = {
        udpReceived: 0,
        unrecognizedMessages: 0
    };
    
    var repo = lr.openLogRepository({
        readOnly: false,
        fileName: cfg.fileName,
        fileDateFormat: cfg.fileDateFormat,
    });
    
    
    this.start = function() {
        
        if (_.isNumber(cfg.udpPort)) {
            var s = dgram.createSocket('udp4');

            s.bind(cfg.udpPort, cfg.listenAddress, function () {
                console.log('udp bound to ', cfg.listenAddress, cfg.udpPort);
            });

            s.on('message', function (msg, rinfo) {
                stat.udpReceived++;
                if (Buffer.isBuffer(msg)) msg = msg.toString();
                
                msg = msg.trim();
                if (msg.length == 0) return;
                try {
                    var ev = JSON.parse(msg);
                    ev.send_addr = rinfo.address + ':' + rinfo.port;
                    me.addEvent(ev);
                    
                }
                catch(e) {
                    stat.unrecognizedMessages++;
                    console.log('failed to parse message', msg, e);
                }
            });
            dgsock = s;
        };
        
    };
    
    
    
    this.stop = function() {
        if (dgsock != null) {
            dgsock.close();
            dgsock = null;
        };
    };
    
    var unixEpochInTicks = 621355968000000000;
    
    this.addEvent = function(ev) {
        var ts = ev.ts;
        if (isNaN(ts)) {
            console.log('ts must be a number (ticks or milliseconds), not ', ev.ts);
        };
        ts = parseInt(ts);
        //ts is in .net ticks (*100ns since 0001-01-01) or unix timestamps (ms since 1970-01-01)
        if (ts >= unixEpochInTicks) ts = Math.floor((ts - unixEpochInTicks) / 10000);
        //ev.ts = ts;
        //console.log('ts is ', ts, new Date(ts));
        repo.enqueueEvent({
            ts: ts,
            message: ev.message,
            source: ev.source || ev.send_addr,
            send_addr: ev.send_addr,
            logname: ev.logname,
            level: ev.level,
            pid: ev.pid,
            threadid: ev.threadid,
            correlation: ev.correlation
        });
        //repo.enqueueEvent(ev);
    };
};

module.exports = {
    createLogCollector: function(cfg) {
        return new LogCollector(cfg);
    }
};