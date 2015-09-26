// livestats module
// calculates live log event stats and makes them available via web sockets
// 
var _ = require('lodash');
var cb = require('./circular');
var asevents = require('./asyncevents');
// TODO statistics for rrdtool
/* how?

1. filter events - select only matching ones (filtering rules)
2. parse out the value/values  (variables v1, v2, ... - numeric)
3. option #1 -> send directly to rrdtool
4. option #2 -> aggregate, send to rrdtool on next timer tick
5. option #3 -> aggregate, let rrdtool ask us for the values
aggregation calculates basic statistics (min, max, sum, count, median, 90th perc, 95th, 98th) so it outputs 8 variables for each input variable

rules 
{
    id: "some rule",
    rrdTemplateId: "rrd definition template",
    eventType: "glogEvent",
    condition: "source == 'test' and text.indexOf('error#') > 0",
    valueExtractorRE = /error#: (\\d+)/,
    aggregate: true,
    pushInterval: 300
}
output for rrdtool?
rrd ID + v1 v2 v3 v4 v5 .......

*/


function StatCollector(cfg) {
    var hub = _.has(cfg, 'eventHub') ? cfg.eventHub : asevents.globalEventHub;
    var minutes = new cb.CircularBuffer(30);
    var seconds = new cb.CircularBuffer(60);
    var minuteStats = {
        total: 0, 
        errors: 0
    };
    var secStats = {
        total: 0, 
        errors: 0
    };
    
    
    var rotateMinuteStats = function() {
        minutes.enqueue(minuteStats);
        minuteStats = {
            total:0,errors: 0
        };
    };
    
    var rotateSecStats = function() {
        //console.log('secs: ', seconds.toArray());
        seconds.enqueue(secStats);
        secStats = {
            total:0,errors: 0
        };
    };
    
    var it1 = setInterval(rotateMinuteStats, 60000);
    var it2 = setInterval(rotateSecStats, 1000);
    
    hub.on('glogEvent', function(ge) {
        secStats.total++;
        minuteStats.total++;
        //console.log(ge);
        if (_.isString(ge.level) && ge.level.toUpperCase() == 'ERROR') {
            secStats.errors++;
            minuteStats.errors++;
        };
    });
    
    hub.on('glogIntEv', function() { //glog internal events...
        
    });
    
    this.stop = function() {
        clearInterval(it1); 
        it1 = undefined;
    };
    
    return this;
};


module.exports = {
    createStatCollector: function(cfg) {
        return new StatCollector(cfg);
    }
};
