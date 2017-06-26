var mongodb = require('../loc_mongo');
var schema = mongodb.mongoose.Schema;


var UserSchema = new schema({
	username: String,
	password: String,
	time:{type:Date, default:Date.now}
});

module.exports = UserSchema;
