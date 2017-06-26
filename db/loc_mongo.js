//2016.04.07 by cg
//mongo module

var config  = require('../conf/config.js');
var mongoose = require('mongoose');

//single
mongoose.connect('mongodb://' + config._config._hostMongo + '/' + config._config._dbMongo);
//replica sets
//var uri = 'mongodb://user:pass@localhost:port,anotherhost:port,yetanother:port/mydatabase';
//mongoose.connect(uri);


exports.mongoose = mongoose;



