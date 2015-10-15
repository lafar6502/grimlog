var mtz = require('moment-timezone');
var moment = require('moment');


var ts = 1444713235000;
var m = moment(ts);

console.log('m is', m);

var tzs = ['CEST', 'UTC', 'Europe/Warsaw']

for(var i=0; i<tzs.length; i++) {
    console.log(tzs[i], m.tz(tzs[i]).format());
};

//console.log(moment.tz.names());


