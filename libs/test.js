var r = require('./logrepo.js');
var _ = require('lodash');
var dh = r.getDataHelper({});


var qry = "SELECT substr(datetime(ts/1000, 'unixepoch', 'localtime'), 0, 16) as thetime, source, count(*) as entries from logentry  where source = $src group by substr(datetime(ts/1000, 'unixepoch', 'localtime'), 0, 16), source";
 

var theRep = {};

dh.searchAllLogs(qry, {$src: 'Vista_RORVW8'}, "f:\\grimlog\\glogs", function(dt) {
    _.each(dt, function(v, k) {

        console.log('DB:', k, 'succ:',  v.success, 'rows:', v.data.length);
        if (v.success) {
            for(var i=0; i<v.data.length; i++) {
                //console.log('     - ', v.data[i]);
                var r = v.data[i];
                if (!_.has(theRep, r.thetime)) theRep[r.thetime] = {count: 0, source: r.source};
                theRep[r.thetime].count += r.entries;;
            }    
        }
    });
    
    var ks = _.keys(theRep).sort();
    for(var i=0; i<ks.length; i++) {
        console.log(ks[i], ':', theRep[ks[i]].source, '   :', theRep[ks[i]].count);
    }
})