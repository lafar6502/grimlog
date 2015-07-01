var utl = require('util')
var events = require('events');

/**
 * async event emitter - works just like normal EventEmitter, but event handlers are called asynchronously
 */
function AsyncEventEmitter() {
    this.evts = [];
    this.scheduled = false;
    
    events.EventEmitter.call(this);
}

utl.inherits(AsyncEventEmitter, events.EventEmitter);

AsyncEventEmitter.prototype.emit = function(evt) {
    var me = this;
    me.evts.push(arguments);
    
    if (!me.scheduled) {
        process.nextTick(function() {
            me.scheduled = false;
            var tm = me.evts;
            if (tm.length == 0) return;
            me.evts = [];
            for(var i=0; i<tm.length; i++) {
                events.EventEmitter.prototype.emit.apply(me, tm[i]);
            };
        });
        me.scheduled = true;
    };
    
};

console.log('creating global event hub');
var globalEventHub = new AsyncEventEmitter();

module.exports.AsyncEventEmitter = AsyncEventEmitter;
module.exports.globalEventHub = globalEventHub;

module.exports.test = function() {
    var em = new AsyncEventEmitter();
    em.on('test', function() {
        console.log('test callback', arguments);
    });
    em.emit('test', 1);
    em.emit('something', 2);
    em.emit('test', '3');
    process.nextTick(function() {
        em.emit('test', 4);
        em.emit('something', 5);
        em.emit('test', '6');        
    });
};