//2016.05.11
//sns module

var config = require('../conf/config.js');
var AWS = require('aws-sdk');

AWS.config.update({
	accessKeyId: config._config._accessKeyId,
	secretAccessKey: config._config._secretAccessKey,
	region: config._config._region,
	sslEnabled: config._config._sslEnabled
});

var sns = new AWS.SNS();

var SNSManager = function(){};

//register device token
SNSManager.prototype.registerToken = function(token, callback){
	var params = {
		PlatformApplicationArn: config._config._platformApplicationArn,
		Token: token
	};
	sns.createPlatformEndpoint(params, function(err, data){
		if(err){
			console.log('regToken:' + err.stack);
			callback('');
		}else{
			console.log('regToken:' + data.EndpointArn);
			callback(data.EndpointArn);
		}
	});
}

//unregister device token
SNSManager.prototype.unregisterToken = function(endpointArn){
	var params = {
		EndpointArn: endpointArn
	};
	sns.deleteEndpoint(params, function(err, data){
		if(err){
			console.log('unregToken:' + err.stack);
		}else{
			console.log('unregToken' + data);
		}
	});
}

//update badge number
SNSManager.prototype.updateBadgeNumber = function(endpointArn, badgeNum){
	var apnsJSON = {
		aps: {
			alert: '',
			badge: badgeNum
		}
	};

	var apnsString = JSON.stringify(apnsJSON);

	var payload = {
		default: "unknown message",
		APNS: apnsString,
		APNS_SANDBOX: apnsString
	};
	
	payload = JSON.stringify(payload);

	sns.publish({
		Message: payload,
		MessageStructure: 'json',
		TargetArn: endpointArn
		}, function(err, data){
			if(err){
				console.log('updateBadge:' + err.stack);
			}else{
				console.log('update badge number:' + String(badgeNum));
			}
		}
	);
}

//publish msg 
SNSManager.prototype.publishMsg = function(endpointArn, msgBody, badgeNum){
	if(badgeNum >= 99)
		badgeNum = 99;

	var apnsJSON = {
		aps: {
			alert: msgBody,
			badge: badgeNum
		}
	};

	var apnsString = JSON.stringify(apnsJSON);

	var payload = {
		default: "unknown message",
		APNS: apnsString,
		APNS_SANDBOX: apnsString
	};
	
	payload = JSON.stringify(payload);

	sns.publish({
		Message: payload,
		MessageStructure: 'json',
		TargetArn: endpointArn
		}, function(err, data){
			if(err){
				console.log('push msg:' + err.stack);
			}else{
				console.log('push msg:' + JSON.stringify(data));
			}
		}
	);
}

//publish mucmsg
SNSManager.prototype.publishMucMsg = function(topicArn, msgBody){
	var apnsJSON = {
		aps: {
			alert: msgBody
		}
	};

	var apnsString = JSON.stringify(apnsJSON);

	var payload = {
		default: "unknown message",
		APNS: apnsString,
		APNS_SANDBOX: apnsString
	};
	
	payload = JSON.stringify(payload);

	sns.publish({
		Message: payload,
		MessageStructure: 'json',
		TopicArn: topicArn
		}, function(err, data){
			if(err){
				console.log('push mucmsg:' + err.stack);
			}else{
				console.log('push mucmsg:' + JSON.stringify(data));
			}
		}
	);
}

//create topic
SNSManager.prototype.createTopic = function(name, callback){
	var params = {
		Name: name 
	};
	sns.createTopic(params, function(err, data){
		if(err){
			console.log('createToken:' + err.stack);
			callback('');
		}else{
			console.log('createToken:' + data.TopicArn);
			callback(data.TopicArn);
		}
	});
}

//delete topic
SNSManager.prototype.deleteTopic = function(topicArn){
	var params = {
		TopicArn: topicArn 
	};
	sns.deleteTopic(params, function(err, data){
		if(err){
			console.log('deleteToken:' + err.stack);
		}else{
			console.log('deleteToken:' + data);
		}
	});
}

//subcribe topic
SNSManager.prototype.subscribeTopic = function(topicArn, endpointArn, callback){
	var params = {
		Protocol: 'application',
		TopicArn: topicArn,
		Endpoint: endpointArn
	};
	sns.subscribe(params, function(err, data){
		if(err){
			console.log('sub:' + err.stack);
			callback('');
		}else{
			console.log('sub:' + data.SubscriptionArn);
			callback(data.SubscriptionArn);
		}
	});
}

//unsubcribe topic
SNSManager.prototype.unsubscribeTopic = function(subscribeArn){
	var params = {
		SubscriptionArn: subscribeArn 
	};
	sns.unsubscribe(params, function(err, data){
		if(err){
			console.log('unsub:'+err.stack);
		}else{
			console.log('unsub:'+data);
		}
	});
}

module.exports = new SNSManager();
