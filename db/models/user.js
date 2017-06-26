var mongodb = require('../loc_mongo');
var userSchema = require('../schemas/user.js');


var User = mongodb.mongoose.model('User', userSchema);

var UserDao = function(){};


//save
UserDao.prototype.save=function(obj, callback){
	var instance = new User(obj);
	instance.save(function(err){
		callback(err);
	});
}

UserDao.prototype.findByName = function(name, callback){
	User.findOne({username:name}, function(err, obj){
		callback(err, obj);
	});
}

module.exports = new UserDao();

