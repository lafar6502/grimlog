// livestats module
// calculates live log event stats and makes them available via web sockets
// 
var _ = require('lodash');

function StatCollector(cfg) {
    if (!_.has(cfg, 'eventHub')) throw new Error('eventHub required');
    
    cfg.eventHub.on('glogEvent', function(ge) {
        
    });
    
    cfg.eventHub.on('', function() {
    });
    
    this.stop = function() {
    };
    
    return this;
};


module.exports = {
    createStatCollector: function(cfg) {
        return new StatCollector(cfg);
    }
};