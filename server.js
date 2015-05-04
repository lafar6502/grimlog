var glog = require('glog');
var gelfserver = require('graygelf/server');
var app = require('./app');
var debug = require('debug')('glogv:server');
var http = require('http');
var cfg = require('./config.json');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var dgram = require('dgram');

var eventHub = new EventEmitter();
app.set('eventHub', eventHub);
console.log('configuring log collector', cfg);
var lc = glog.createLogCollector({
    fileName: cfg.fileName,
    fileDateFormat: cfg.fileDateFormat || 'YYYY-MM-DD'
});

lc.start();
app.set('logCollector', lc);

var stats = {
    receivedMessages: 0,
    errors: 0
};
app.set('stats', stats);
    
eventHub.on('gelfMessage', function(m) {
    //convert gelf message into glog event (implemented elsewhere)
    throw new Error('not imp');
});

eventHub.on('udpMessage', function(m) {
    eventHub.emit('glogEvent', m);
});

eventHub.on('glogEvent', function(m) {
    lc.addEvent(m);
});

eventHub.on('glogEvent', function(m) {
    stats.receivedMessages++;
});

eventHub.on('messageError', function(m) {
    stats.errors++;
});



var gelfsrv = null;
if (_.isNumber(cfg.gelfPort)) {
    console.log('configuring GELF receiver', cfg.gelfAddress, cfg.gelfPort);
    gelfsrv = gelfserver();
    gelfsrv.on('message', function(msg) {
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
        eventHub.emit('glogEvent', ev);
    });
    gelfsrv.on('error', function(er) {
        console.log('gelf message error', er);
        eventHub.emit('messageError', null, er);
    });
    gelfsrv.listen(cfg.gelfPort, cfg.gelfAddress);
    console.log('GELF listening on', gelfsrv.address, gelfsrv.port);
};

var dgsock = null; //udp socket
if (_.isNumber(cfg.udpPort)) {
    var s = dgram.createSocket('udp4');

    s.bind(cfg.udpPort, cfg.listenAddress, function () {
        console.log('udp bound to ', cfg.listenAddress, cfg.udpPort);
    });

    s.on('message', function (msg, rinfo) {
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
    dgsock = s;
};


/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(cfg.httpPort || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, cfg.httpAddress);

server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
