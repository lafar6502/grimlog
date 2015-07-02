var metrics = require('../cogmon_metrics');

module.exports = {
    initialize: function(cfg) {
        cfg.eventHub.on('glogEvent', function() {
            
            metrics.updateMetric('eventCounter', 1);
        });
    }
    
};