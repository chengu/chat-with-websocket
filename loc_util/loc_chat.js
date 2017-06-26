//2016.04.06 by cg
//base chat module
var logger = require("./loc_log.js").helper;
var message = require("../db/models/loc_mongo.js");
var utility = require("./loc_utility.js");

var ChatManager = function(){};


function saveMsgToMongo(socket, msgbody, msgto, type){
    	var obj = { 	
			from:socket.jid, 
			to:msgto, 
			ip:socket.ip,
			content:msgbody,
			type:type,
			time:Date.now()
			};
    	message.save(obj, function(err){
		if(err)
			logger.log('save error');
		else
			logger.log('save success');
	});
}

/*//send msg to all user, not use
ChatManager.prototype.sendBroadcastMessage = function(sio, msgbody){
	sio.emit('sys', msgbody);
	logger.log('sys message: ' + msgbody);
}*/

//send msg to all user except self
ChatManager.prototype.sendBroadcastMessage = function(socket, msgbody, callback){
	socket.broadcast.emit('sys', msgbody);
	logger.log('sys message: ' + msgbody + ' from ' + socket.jid);
	saveMsgToMongo(socket, msgbody, 'sys', 'sys');
}

//send msg to someone by jid or roomid
ChatManager.prototype.sendChatMessageByJid = function(socket, msgto, msgbody){
	var type = 'chat';
	socket.broadcast.to(msgto).emit('message', msgbody);
	logger.log('message: ' + msgbody + ' to ' + msgto + ' from ' + socket.jid);
	if(msgto.substring(0,1) == 'm')
		type = 'mucchat'
	saveMsgToMongo(socket, msgbody, msgto, type);
}

/*//send msg to someone by socketid
ChatManager.prototype.sendChatMessageBySocketId = function(socketid, msgbody){
	sio.socket(socketid).emit('message', msgbody);
	logger.log('message: ' + msgbody + ' to ' + socketid);
}*/

/*//send sync msg
ChatManager.prototype.sendSyncMessage = function(sio, msgto, msgbody){
	sio.in(msgto).emit('sync', msgbody);
	logger.log('sync message: ' + msgbody + ' to ' + msgto);
}*/

//send sync msg except self
ChatManager.prototype.sendSyncMessage = function(socket, msgbody){
	if(msgbody == 'offline'){
		//下线通知
		var type = socket.devtype;
		if(socket.devtype == 'desktop')
			type = 'PC';
		msgbody = '您的帐号在' + type + '设备下线了';
		socket.broadcast.to(socket.jid).emit('linestate', msgbody);
	}else if(msgbody == 'online'){
		//上线通知
		var type = socket.devtype;
		if(socket.devtype == 'desktop')
			type = 'PC';
		msgbody = '您的帐号在' + type + '设备上线了';
		socket.broadcast.to(socket.jid).emit('linestate', msgbody);
	}
	else{
		socket.broadcast.to(socket.jid).emit('sync', msgbody);
		saveMsgToMongo(socket, msgbody, socket.jid, 'sync');
	}
	logger.log('sync message: ' + msgbody + ' to ' + socket.jid);
}

/*//send conflic msg
ChatManager.prototype.sendConflicMessage = function(sio, devtype, socketid){
	sio.in(msgto).emit('conflic', devtype, socketid);
	logger.log('conflic message: ' + 'devtype:' + devtype + ' id:'+ socketid);
}*/

//send conflic msg except self
ChatManager.prototype.sendConflicMessage = function(socket){
	socket.broadcast.to(socket.jid).emit('conflic', socket.devtype, socket.token);
	logger.log('conflic message: ' + 'jid:' + socket.jid + ' type:' + socket.devtype + ' token:' + socket.token);
	var content = {msgfrom:socket.jid, msgto:socket.jid, msgdevtype:socket.devtype, 
			msgid:utility.getRandom(), msgtoken:socket.token,time:Date.now().toString()};
	saveMsgToMongo(socket, JSON.stringify(content), socket.jid, 'conflic');
}

module.exports = new ChatManager();

