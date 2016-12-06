var express = require('express');
var router = express.Router();

var fs = require('fs');
var _ = require('lodash');
var log4js = require('log4js');
var cfg = require('../config.json');
var log = log4js.getLogger('nlog.js');
var asevents = require('../asyncevents');


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('NLOG http target. POST here.');
});

router.post('/', function(req, res, next) {
	var hub =  asevents.globalEventHub;
	req.rawBody = '';
	req.setEncoding('utf8');

	req.on('data', function(chunk) { 
		req.rawBody += chunk;
	});

	req.on('end', function() {
		log.info('received', req.rawBody, 'from ', req.connection.remoteAddress);
		next();
		
		var ev = {
			ts: req.query.ts,
            message: req.rawBody,
            source: req.query.source || req.connection.remoteAddress,
            level: req.query.level || 'INFO',
            send_addr: req.connection.remoteAddress,
            logname: req.query.logger || 'nlog',
            pid: req.query.pid || undefined,
            threadid: req.query.threadid || undefined,
            correlation: undefined,
            seq: undefined
        };
        if (isNaN(ev.ts)) ev.ts = new Date().getTime();
		log.info('event', ev);
        if (!_.isString(ev.message)) return;
        hub.emit('glogEvent', ev);
	});
	
	log.info('nlog post: ', req.query, req.body, ', req:');
	
});

module.exports = router;
