var glog = require('glog');
var gelfserver = require('graygelf/server');


function EventCollectors(cfg) {
    console.log('configuring log collector', cfg);
    var lc = glog.createLogCollector(cfg);
    
    var setupGelfReceiver = function() {
        if (!_.isNumber(cfg.gelfPort)) return;
        console.log('configuring gelf receiver', cfg.gelfAddress, cfg.gelfPort);
        gelfsrv = gelfserver();        
        gelfsrv.on('message', function(msg) {
            stat.udpReceived++;
            if (!_.has(msg, 'level')) msg.level = 'INFO';
            var m = msg.full_message;
            if (_.has(msg, 'short_message') && m != msg.short_message) m = msg.short_message + ' \n' + msg.full_message;
            var ev = {
                ts: msg.timestamp,
                message: m,
                source: msg.source,
                level: msg.level,
                send_addr: msg.host,
                logname: msg._logname || 'gelf',
                pid: isNaN(msg._pid) ? -1 : msg._pid,
                threadid: isNaN(msg._threadid) ? -1 : msg._threadid,
                correlation: _.has(msg, '_correlation') ? msg._correlation : null,
                seq: msg._seq
            };
            if (!_.isString(ev.source)) ev.source = msg.facility;
            if (!_.isString(ev.source)) ev.source = msg.host;
            if (isNaN(ev.ts)) ev.ts = new Date().getTime();
            if (!_.isString(ev.message)) return;
            me.addEvent(ev);
        });
        gelfsrv.listen(cfg.gelfPort, cfg.gelfAddress);
        console.log('GELF listening on', gelfsrv.address, gelfsrv.port);
    };

    
    this.start = function() {
        lc.start();
    };
    
    this.getLogCollector = function() {
        return lc;
    };
    
    this.close = function() {
        lc.stop();
    };
};

module.exports = {
    configureEventCollectors: function(cfg) {
        
        var ec = new EventCollectors(cfg);
        ec.start();
        
        return ec;
    }
}
