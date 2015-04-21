var glog = require('glog');



function EventCollectors(cfg) {
    console.log('configuring log collector', cfg);
    var lc = glog.createLogCollector(cfg);
    
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
