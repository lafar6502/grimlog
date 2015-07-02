var _ = require('lodash');
var dgram = require('dgram');


function UdpReceiver(cfg, eventHub) {
    console.log('configuring udp event receiver', cfg.listenAddress, cfg.udpPort);
    var sock = dgram.createSocket('udp4');

    sock.bind(cfg.udpPort, cfg.listenAddress, function () {
        console.log('udp event receiver bound to ', cfg.listenAddress, cfg.udpPort);
    });

    sock.on('message', function (msg, rinfo) {
        if (Buffer.isBuffer(msg)) msg = msg.toString();
        msg = msg.trim();
        if (msg.length == 0) return;
        try {
            var ev = JSON.parse(msg);
            ev.send_addr = rinfo.address + ':' + rinfo.port;
            eventHub.emit('glogEvent', ev);
        }
        catch(e) {
            console.log('failed to parse message', msg, e);
            eventHub.emit('messageError', msg, e);
        }
    });
    
    this.start = function() {
        
    };
    
    this.stop = function() {
        console.log('stopping udp listener');
    };
};

module.exports = {
    initialize: function(cfg) {
        if (!_.has(cfg, 'config')) throw new Error('config missing');
        if (!_.isNumber(cfg.config.udpPort)) {
            console.log('udpPortPort not defined - skipping module init');
            return;
        };
        
        var gr = new UdpReceiver(cfg.config, cfg.eventHub);
        return gr;
    },
    
    start: function() {
    },
    stop: function() {
    }
};
