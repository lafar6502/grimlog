var mtz = require('moment-timezone');
var moment = require('moment');


var ts = 1403454068850;

var m = moment(ts);

console.log('m is', m);

var tzs = ['CEST', 'UTC']

for(var i=0; i<tzs.length; i++) {
    console.log(tzs[i], m.tz(tzs[i]).format());
};
