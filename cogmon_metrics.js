var cb = require('./circular');
var _ = require('lodash');

function Metric(cfg) {
	_.defaults(cfg, {maxSamples: 500, maxAgeSec: 300});
	if (cfg.name == null || cfg.name == undefined) throw "name missing";
	var data = new cb.CircularBuffer(cfg.maxSamples);
	var firstUpdate = new Date().getTime();
	var lastUpdate = new Date().getTime();
	var numSamples = 0;
	var sum = 0;
	var min = 0;
	var max = 0;

	this.name = cfg.name;
	this.host = cfg.host;

	this.update = function(value) {
		if (value == undefined || value == null || value == '' || !_.isNumber(value)) {
			log.info('incorrect value:', value, 'metric:', this.name);
			return;
		}
		lastValue = value;
		lastUpdate = new Date().getTime();
		numSamples++;
		sum += value;
		if (numSamples == 1 || value > max) max = value;
		if (numSamples == 1 || value < min) min = value;
		
		data.enqueue({
			value: value,
			ts: lastUpdate
		});
		if (firstUpdate == null) firstUpdate = new Date().getTime();
		
	};
	
	this.getLastValue = function() {
		var v = data.getLast();
		return v == undefined || v == null ? null : v.value;
	};
	this.getAverage = function() {
		return numSamples == 0 ? 0 : sum / numSamples;
	};
	
	this.getFrequency = function() {
		if (numSamples == 0) return 0;
		if (firstUpdate == null) return 0;
		var d = new Date().getTime();
		return d == firstUpdate ? 0 : (numSamples / (d - firstUpdate)) * 1000;
	};
	
	var getPerc = function(dt, perc) {
		if (dt.length == 0) return 0;
		var idx = Math.floor(dt.length * perc / 100);
		if (idx == dt.length) idx = dt.length - 1;
		return dt[idx].value;
	};

	this.getPercentile = function(perc) {
		var l = new Date().getTime() - (cfg.maxAgeSec * 1000);
		//var d = _.filter(data.toArray(), function(s) { return s.ts >= l; });
		var dt = _.sortBy(data.toArray(), function(r) { return r.value; });	
		return getPerc(dt, perc);
	};

    
    this.getLastUpdate = function() { 
        return lastUpdate;
    };

	this.reset = function() {
		data.clear();
		numSamples = 0;
		sum = 0;
		min = max = 0;
		lastUpdate = firstUpdate = new Date().getTime();
	};

	this.getValues = function(reset) {
		var l = new Date().getTime() - (cfg.maxAgeSec * 1000);
		//var d = _.filter(data.toArray(), function(s) { return s.ts >= l; });
		var dt = _.sortBy(data.toArray(), function(r) { return r.value; });	
		var v = {
			count: numSamples,
			sum: sum,
			min: min,
			max: max,
			avg: numSamples > 0 ? sum / numSamples : 0,
			last: this.getLastValue(),
			freq: this.getFrequency(),
			median: getPerc(dt, 50),
			perc90: getPerc(dt, 90),
			perc95: getPerc(dt, 95),
			perc98: getPerc(dt, 98),
			last_tstamp: lastUpdate,
			first_tstamp: firstUpdate
		};
		if (reset) {
			this.reset();
		};
		return v;
	};

	return this;
};

module.exports = {
	Metric: Metric
};

/*
var m = new Metric({
	name: 'M1',
	maxSamples: 10
});

m.update(1, '');
m.update(2, '');
m.update(3, '');
setTimeout(function() {
	m.update(6, '');
	console.log(m.getValues());
}, 50);

console.log(m.getValues());

*/
