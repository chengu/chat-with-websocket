//2016.04.12 by cg
//redis module

var config = require('../conf/config.js');
var _portRedis = config._config._portRedis, 
    _hostRedis = config._config._hostRedis;

var redis = require('redis');
var store = redis.createClient( _portRedis, _hostRedis);

module.exports = {
	db10: redis.createClient( _portRedis, _hostRedis), //all user invite every mucroom's time; online list
	db11: redis.createClient( _portRedis, _hostRedis), //all receiving msgid used puback
	db12: redis.createClient( _portRedis, _hostRedis), //mucroom member list; user joined mucrooms' list
	db13: redis.createClient( _portRedis, _hostRedis), //arn list; last disconnect time
	db14: redis.createClient( _portRedis, _hostRedis), //apns count
	init: function(next){
		var select = redis.RedisClient.prototype.select;
		require('async').parallel([
			select.bind(this.db10, 10),
			select.bind(this.db11, 11),
			select.bind(this.db12, 12),
			select.bind(this.db13, 13),
			select.bind(this.db14, 14)
		], next);	
	}
}; 
