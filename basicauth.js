var basicAuth = require('basic-auth');
var config = require('./config');
var _ = require('lodash');

var auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        console.log('user name not present');
        return unauthorized(res);
    };
    
    var cli = _.find(config.clients, {user: user.name});
    //console.log('clients: ', config.clients, 'cli:', cli);
    if (cli != null && cli.password == user.pass) {
        req.authUser = cli.user;
        return next();
    }
    console.log('user not authed:', user.name);
    return unauthorized(res);
};

module.exports = auth
