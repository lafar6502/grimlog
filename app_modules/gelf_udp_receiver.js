var _ = require('lodash');
var gelfserver = require('graygelf/server');

function GelfUdpReceiver(cfg, eventHub) {
    console.log('configuring GELF receiver', cfg.gelfAddress, cfg.gelfPort);
    var gelfsrv = gelfserver();
    var running = false;
    gelfsrv.on('message', function(msg) {
        //console.log('m',msg);
        eventHub.emit('preprocessMessage', msg, this);
        if (msg.SKIP === true) return; //skip message
        
        if (!_.has(msg, 'level')) msg.level = 'INFO';
        var m = msg.short_message || '';
        if (_.isString(msg.full_message) && msg.full_message.length > 0) {
            if (m == '') 
                m = msg.full_message;
            else
                m = msg.full_message.indexOf(m) < 0 ? m + '\n' + msg.full_message : msg.full_message;
        };
        
        var ev = {
            ts: msg.timestamp,
            message: m,
            source: msg.source,
            level: msg.level,
            send_addr: msg.host,
            logname: msg._logname || msg._facility || msg._ident || 'gelf',
            pid: isNaN(msg._pid) ? -1 : msg._pid,
            threadid: isNaN(msg._threadid) ? -1 : msg._threadid,
            correlation: msg._correlation || msg._uuid || '',
            seq: msg._seq
        };
        if (!_.isString(ev.source)) ev.source = msg.facility;
        if (!_.isString(ev.source)) ev.source = msg.host;
        if (isNaN(ev.ts)) ev.ts = new Date().getTime();
        if (!_.isString(ev.message)) return;
        eventHub.emit('glogEvent', ev);
    });
    gelfsrv.on('error', function(er) {
        console.log('gelf message error', er);
        eventHub.emit('messageError', null, er);
    });



    
    this.start = function() {
        gelfsrv.listen(cfg.gelfPort, cfg.gelfAddress);
        console.log('GELF listening on', gelfsrv.address, gelfsrv.port);
    };
    
    this.stop = function() {
        console.log('stopping gelf listener');
    };
};

module.exports = {
    initialize: function(cfg) {
        if (!_.has(cfg, 'config')) throw new Error('config missing');
        if (!_.isNumber(cfg.config.gelfPort)) {
            console.log('gelfPort not defined - skipping module init');
            return;
        };
        
        var gr = new GelfUdpReceiver(cfg.config, cfg.eventHub);
        return gr;
    },
    
    start: function() {
    },
    stop: function() {
    }
};
