//2016.04.09 by cg

var mongodb = require('../loc_mongo');
var messageSchema = require('../schemas/message');


var Message = mongodb.mongoose.model('Message', messageSchema);

var MessageDao = function(){};


//save
MessageDao.prototype.save=function(obj, callback){
	var instance = new Message(obj);
	instance.save(function(err){
		callback(err);
	});
}

//find offline chat msg
MessageDao.prototype.findChatMsgByJid = function(to, timebegin, timeend, callback){
	Message.find({to:to, type:{$in:['chat','sync']}, time:{$gte:timebegin, $lte:timeend}}, 'content', function(err, obj){
		callback(err, obj);
	});
}

//mucchat offline msg
MessageDao.prototype.findMucChatMsgByRoomid = function(roomid, timebegin, timeend, callback){
	Message.find({to:roomid, type:'mucchat', time:{$gte:timebegin, $lte:timeend}}, 'content', function(err, obj){
		callback(err, obj);
	});
}

//find recently offline conflic msg
MessageDao.prototype.findConflicMsgByTo = function(to, devtype, timeend, callback){
	var msgdevtye = "msgdevtype";
	if(devtype == 'ios')
		msgdevtype = "android";
	else if(devtype == 'android')
		msgdevtype = "ios";
	//$gte:timebegin,
	Message.findOne({to:to, type:'conflic', time:{$lte:timeend}, $or:[{content:/msgdevtype/},{content:/devtype/}]}, 'content', {sort: {time: -1}}, function(err, obj){
		callback(err, obj);
	});
}

//find offline sys msg
MessageDao.prototype.findSysMsg = function(timebegin, timeend, callback){
	Message.find({type:'sys', time:{$gte:timebegin, $lte:timeend}}, 'content', function(err, obj){
		callback(err, obj);
	});
}
module.exports = new MessageDao();

