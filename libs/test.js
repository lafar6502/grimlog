var r = require('./logrepo.js');
var _ = require('lodash');
var dh = r.getDataHelper({});


var qry = "SELECT substr(datetime(ts/1000, 'unixepoch', 'utc'), 0, 16) as thetime, source, count(*) as entries from logentry  where source in($src1, $src2) group by substr(datetime(ts/1000, 'unixepoch', 'utc'), 0, 16), source";
 

var theRep = {};

dh.searchAllLogs(qry, {$src1: 'Vista_RORVW8', $src2: 'Fjord_RORVW8'}, "f:\\grimlog\\glogs", function(dt) {
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


var rep2 = {
    columns: [],
    rows: {}
};

var q2 = "SELECT substr(datetime(ts/1000, 'unixepoch', 'utc'), 0, 14) as thetime, source, count(*) as entries from logentry   group by substr(datetime(ts/1000, 'unixepoch', 'utc'), 0, 14), source";

return;
dh.searchAllLogs(q2, {}, "f:\\grimlog\\glogs", function(dt) {
    _.each(dt, function(v, k) {
        if (v.success) {
            for(var i=0; i<v.data.length; i++) {
                var r = v.data[i];
                var dr = rep2.rows[r.thetime];
                if (!dr) {
                    dr = {};
                    rep2.rows[r.thetime] = dr;
                }
                if (rep2.columns.indexOf(r.source) < 0) rep2.columns.push(r.source);
                if (!_.has(dr, r.source)) dr[r.source] = 0;
                dr[r.source] = dr[r.source] + r.entries;
            }    
        }
    });
    
    var ks = _.keys(rep2.rows).sort();
    for(var i=0; i<ks.length; i++) {
        var arr = [];
        for(var j=0; j<rep2.columns; j++) {
            
        }
        
        console.log(ks[i], ':', rep2.rows[ks[i]]);
    }
})
