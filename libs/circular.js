//circular buffer implementation
function CircularBuffer(n) {
	var buf = new Array(n + 1);
	var head=0, tail=0; //head==tail -> empty, head=tail-1 -> full

	this.enqueue = function(x) {
		buf[head] = x;
		head = (head + 1) % buf.length;
		if (tail == head) { //head has trumped tail
			tail = (tail + 1) % buf.length;
		}
		//console.log('enqueue: ' + x);
		//console.log('head: ' + head + ', tail: ' + tail);
	};
	
	this.dequeue = function() {
		//empty if tail == head
		if (tail === head) return undefined;
		var ret = buf[tail];
		tail = (tail + 1) % buf.length;
		return ret;
	};

	this.getCount = function() {
		return head >= tail ? head - tail : head - tail + buf.length;  //head < tail -> ???
	};
	this.getFirst = function() {
		if (head == tail) return undefined;
		return buf[tail];
	};
	this.getLast = function() {
		if (head == tail) return undefined;
		return buf[head > 0 ? head - 1 : head - 1 + buf.length];
	};
	this.getAt = function(idx) {
		if (head == tail) return undefined;
        var f = head + idx;
        return buf[f > 0 ? f - 1 : f - 1 + buf.length];
	};

	this.toArray = function() {
		var arr = new Array(this.getCount());
		var tl = tail, pos = 0;
		while(tl != head) {
			arr[pos++] = buf[tl];
			tl = (tl + 1) % buf.length;
		};
		return arr;
	};

	this.clear = function() {
		head = tail = 0;
	};

	return this;
};

module.exports = {
	CircularBuffer: CircularBuffer
};


/*
var cb = new CircularBuffer(10);

for (var i=0; i<20; i++) {
	cb.enqueue(i);
};
console.log(cb.toArray());
console.log('---');
while(cb.getCount() > 0) {
	console.log(cb.dequeue());
};
*/


