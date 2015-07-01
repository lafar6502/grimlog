var glog = require('glog');
var app = require('./app');
var debug = require('debug')('glogv:server');
var http = require('http');
var cfg = require('./config.json');
var EventEmitter = require('events').EventEmitter;
var asevents = require('./asyncevents');
var util = require('util');
var _ = require('lodash');
var statz = require('./livestats');
var fs = require('fs');
var eventHub = asevents.globalEventHub;
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





/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(cfg.httpPort || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

var statc = statz.createStatCollector({
    eventHub: eventHub
});

//load app modules

var mods = fs.readdirSync('app_modules');
console.log('modules: ', mods);
var MODULES = [];
var mcfg = {
    eventHub: eventHub,
    config: cfg,
    app: app,
    httpServer: server
};

for(var i=0; i<mods.length; i++) {
    var fn = './app_modules/' + mods[i];
    var idx = fn.lastIndexOf('.js');
    if (idx != fn.length - 3) continue;
    fn = fn.substr(0, fn.length - 3);
    console.log('loading', fn);
    try {
        var m = require(fn);
        if (!_.has(m, 'initialize') || !_.isFunction(m.initialize)) {
            conosle.log('module has no initialize function:', fn);
            continue;
        };
        var m2 = m.initialize(mcfg);
        m = m2 == undefined || m2 == null ? m : m2;
        m.name = mods[i].substr(0, mods[i].length - 3);
        MODULES.push(m);
    }
    catch(e) {
        console.log('error loading', fn, ':', e);
    }
};

function callModules(funcName, args) {
    for (var i=0; i<MODULES.length; i++) {
        var m = MODULES[i];
        if (!_.has(m, funcName) || !_.isFunction(m[funcName])) {
            console.log('module ', m.name, 'has no ', funcName, 'function');
            continue;
        }
        m[funcName].apply(m, args);
    };
};

callModules('start', []);

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

