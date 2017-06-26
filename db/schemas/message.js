var mongodb = require('../loc_mongo');
var schema = mongodb.mongoose.Schema;

var MessageSchema = new schema({
	ip: 	String,
	from: 	String,
	to:	String,
	//time:	{type:Date, default:Date.now},
	time:	String,
	content:String,
	type:	String
});

module.exports = MessageSchema;
