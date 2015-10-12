var _ = require('lodash');

module.exports = {
    initialize: function(cfg) {
	cfg.eventHub.on('dummy', function(e) {
	});        
    },
    start: function() {
    },
    stop: function() {
    }
};
