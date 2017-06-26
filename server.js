//2016.04.05 by cg

var config = require('./conf/config.js');
var _portSocket = config._config._portSocket,
    _portRedis = config._config._portRedis, 
    _hostRedis = config._config._hostRedis;

var express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis');

var num_processes = require('os').cpus().length;
var chatManager = require('./loc_util/loc_chat.js');
var roomManager = require('./loc_util/loc_room.js');
var logger = require("./loc_util/loc_log.js").helper;
var message = require("./db/models/loc_mongo.js");
var redisManager = require("./db/loc_redis.js");
var snsManager = require("./loc_util/loc_sns.js");

if(cluster.isMaster){
    var workers = [];
    var spawn = function(i){
        workers[i] = cluster.fork();
        workers[i].on('exit', function(worker, code, signal){
	    logger.log('respawning worker'+ i);
	    spawn(i);
	});
    };

    for(var i = 0; i < num_processes; i++){
        spawn(i);
    }
    
    var worker_index = function(ip, len){
	logger.log(ip + ' len:' + len);
	if(ip == '::1') return 0;
	ips = ip.split(":");
	if(ips.length > 0){
		ip = ips[ips.length-1];
		logger.log(ip);
	}
        var s = '';
        for(var i = 0, _len = ip.length; i < _len; i++){
	    if(ip[i] != '.'){
	        s += ip[i];
	    }
	}
        return Number(s) % len;
    };

    var server = net.createServer({pauseOnConnect: true}, function(connection){
	var worker = workers[worker_index(connection.remoteAddress, num_processes)];
	worker.send('sticky-session:connection', connection);
    }).listen(_portSocket);
}else{
    var app = new express();
    var server = app.listen(0, 'localhost');
        io = sio(server);
    io.adapter(sio_redis({host:_hostRedis, port:_portRedis}));
    redisManager.init(function(err){
	if(err) logger.log('init redis is error');
    });

    redisManager.db13.get('arn:sys', function(err, reply){
	if(!reply){
    	    snsManager.createTopic('sys', function(data){
	    	if(data && data != ''){
	    	    logger.log(JSON.stringify(data));
	    	    redisManager.db13.set('arn:sys', JSON.stringify(data));
	      	}
	    });
	}	
    });

    process.on('message', function(message, connection){
	if(message != 'sticky-session:connection'){
	    return;
	}
	server.emit('connection', connection);
	connection.resume();
    });

    //return test page
    app.get('/', function(req, res){ 
	res.sendFile(__dirname + '/index.html');
    });
  
    io.of('/loc-chat').on('connection', function(socket){
	logger.log(cluster.worker.id);	
	
	socket.on('disconnect', function(){
		//auto quit all room
		if(socket.jid && socket.jid != '' && socket.token && socket.token != ''){		
			redisManager.db10.srem('user:' + socket.jid, socket.jid + '/' + socket.token + '/' + socket.devtype);
			logger.log('client is disconnect:' + socket.jid + ' devtype:' + socket.devtype + socket.token);
			if(socket.state == 'logined'){
				chatManager.sendSyncMessage(socket, 'offline');
				redisManager.db13.set('distime:'+socket.jid, Date.now().toString());
				redisManager.db13.set('distime:'+socket.jid+'/'+socket.token, Date.now().toString());
			}
			if(socket.devtype == 'ios'){
				redisManager.db14.get('count:'+socket.jid, function(err, reply){
					if(!reply)
						return;
					redisManager.db14.get('online:'+socket.jid, function(err, reply){
						if(!reply)
							return;
						if(reply == socket.token)
							redisManager.db14.del('online:'+socket.jid);
					});
				});
			}
		}
	});

	socket.on('message', function(msgto, msgid, msgbody){
		if(msgto == socket.jid){
			//sync msg need?
		//	chatManager.sendSyncMessage(socket, msgbody);
		}
		if(msgto == 'sys'){
			//sys msg 
			chatManager.sendBroadcastMessage(socket, msgbody);

			//apns
			redisManager.db13.get('arn:sys', function(err, reply){
				if(!reply)
					return;
				snsManager.publishMucMsg(JSON.parse(reply), msgbody);
				//update badge number
    				redisManager.db14.keys('count:*', function(err, replies){
					replies.forEach(function(reply, index){
						var jid = reply.toString().substring(6);
						redisManager.db14.incr(reply.toString(), function(err, reply){
							var badgeNum = reply;
							if(badgeNum > 99)
								return;
							redisManager.db14.get('online:'+jid, function(err, reply){
								if(reply)
									return;
								redisManager.db13.get('arn:'+jid, function(err, reply){
									if(reply){
										snsManager.updateBadgeNumber(JSON.parse(reply.substring(65)), badgeNum);
									}
								});
							});
						});
					});
    				});
			});
		}
		else{
			//normal msg
			redisManager.db11.sismember('msg:'+socket.jid+'/'+socket.token, msgid, function(err, reply){
				if(reply == '0'){
					redisManager.db11.sadd('msg:'+socket.jid + '/' + socket.token, msgid);
					if(msgto.substring(0,1) != 'm'){
						chatManager.sendSyncMessage(socket, msgbody);
						chatManager.sendChatMessageByJid(socket, msgto, msgbody);	
						//check user ios offline
						redisManager.db14.get('count:'+msgto, function(err, reply){
							if(!reply)
								return;
							var badgeNum = Number(reply);
							redisManager.db14.get('online:'+msgto, function(err, reply){
								if(reply)
									return;
								redisManager.db14.incr('count:'+msgto);
								redisManager.db13.get('arn:'+msgto, function(err, reply){
									if(reply){
										snsManager.publishMsg(JSON.parse(reply.substring(65)), msgbody, badgeNum+1);
									}
								});
							});
						});
					}else{
						chatManager.sendChatMessageByJid(socket, msgto, msgbody);	
						redisManager.db13.get('arn:'+msgto, function(err, reply){
							if(!reply)
								return;
							snsManager.publishMucMsg(JSON.parse(reply), msgbody);
					
							//update badge number
							redisManager.db12.smembers('group:'+msgto, function(err, replies){
								replies.forEach(function(reply, index){
									var jid = reply.toString();
									redisManager.db14.get('count:'+jid, function(err, reply){
										if(!reply)
											return;
										redisManager.db14.incr('count:'+jid, function(err, reply){
											var badgeNum = reply;
											if(badgeNum > 99)
												return;
											redisManager.db14.get('online:'+jid, function(err, reply){
												if(reply)
													return;
												redisManager.db13.get('arn:'+jid, function(err, reply){
													if(!reply)
														return;
													snsManager.updateBadgeNumber(JSON.parse(reply.substring(65)), badgeNum);
												});
											});
										});
									});
								});
							});
						});
					}
				}
			});
			socket.emit('msgsuc', msgid);
		}
	});
	
	socket.on('loadoffmsg', function(type, rid, timebegin, timeend){
		if(type == 'all' || type == 'chat'){
			logger.log('begintime is:' + timebegin + ' endtime: ' + timeend);
			message.findChatMsgByJid(socket.jid, timebegin, timeend, function(err, obj){
				if(err){
					logger.log('find chat error');
					socket.emit('loadoffmsg', 'chat', 'chat', timebegin, timeend, '');
				}
				else{
					//logger.log(JSON.stringify(obj));
					socket.emit('loadoffmsg', 'chat', 'chat', timebegin, timeend, JSON.stringify(obj));
				}
			});
		}
		if(type == 'all' || type == 'sys'){
			message.findSysMsg(timebegin, timeend, function(err, obj){
				if(err){
					logger.log('find sys error');
					socket.emit('loadoffmsg', 'sys', 'sys', timebegin, timeend, '');
				}
				else{
					//logger.log(JSON.stringify(obj));
					socket.emit('loadoffmsg', 'sys', 'sys', timebegin, timeend, JSON.stringify(obj));
				}
			});
		}
		if(type == 'all' || type == 'mucchat'){
			redisManager.db12.smembers('user:'+socket.jid, function(err, replies){
				replies.forEach(function(reply, index){
					var roomid = reply.toString();
					if(rid != '' && type == 'mucchat')
						roomid = rid;
					redisManager.db10.get(socket.jid+':'+roomid, function(err, reply){
						if(reply){
							logger.log('jointime is: ' + reply + ' to: ' + roomid);
							if(reply > timebegin){
								message.findMucChatMsgByRoomid(roomid, reply, timeend, function(err, obj){
									if(err){
										logger.log('find mucchat error');
									}else{
										//logger.log(JSON.stringify(obj));
										socket.emit('loadoffmsg', 'mucchat', roomid, reply, timeend, JSON.stringify(obj));
									}
								});
							}else{
								message.findMucChatMsgByRoomid(roomid, timebegin, timeend, function(err, obj){
									if(err){
										logger.log('find mucchat error');
									}else{
										//logger.log(JSON.stringify(obj));
										socket.emit('loadoffmsg', 'mucchat', roomid, timebegin, timeend, JSON.stringify(obj));
									}
								});

							}
						}
					});
					if(rid != '' && type == 'mucchat')
						return false;	
				});
			});
		}
	});

	socket.on('login', function(jid, token, devtype, logintime){
		if(!jid || jid == '' || !token || token == ''){
			logger.log('client is no jid, closed by server');
			socket.disconnect('client is no jid, closed by server');
		}else{
			roomManager.joinLocRoom(socket, jid);
			socket.jid = jid;
			socket.token = token;
			socket.ip = socket.request.connection.remoteAddress;
			socket.logintime = logintime;
			socket.state = 'logining';
			if(!devtype || devtype == '')
				socket.devtype = 'unknowntype';
			else{
				//if(devtype == 'ios' || devtype == 'android')
				//	socket.devtype = 'mobile';
				//else
					socket.devtype = devtype;
			}
			redisManager.db10.sadd('user:' + socket.jid, socket.jid + '/' + socket.token + '/' + socket.devtype);
			message.findConflicMsgByTo(socket.jid, socket.devtype, logintime, function(err, obj){
				if(err){
					logger.log('find offline conflic error');
					socket.emit('offconflicmsg', '');
				}else
					socket.emit('offconflicmsg', JSON.stringify(obj));
			});
		}
	});
	
	//client call unregister
	socket.on('unregister', function(deviceToken){
		redisManager.db13.get('arn:'+socket.jid, function(err, reply){
			if(reply){
				var len = deviceToken.length;
				if(reply.substring(0, len) == deviceToken){
					redisManager.db13.del('arn:'+socket.jid);
					snsManager.unregisterToken(JSON.parse(reply.substring(len+1)));
					redisManager.db14.del('count:'+socket.jid);
					redisManager.db13.get('arn:sys-'+socket.jid, function(err, reply){
						if(reply){
							redisManager.db13.del('arn:sys-'+socket.jid);
							snsManager.unsubscribeTopic(JSON.parse(reply));
						}
					});
				}
			}
		});
	});

	socket.on('badgenumber', function(badgenum){
		redisManager.db14.set('count:'+socket.jid, String(badgenum));
	});
	
	socket.on('loginsuc', function(deviceToken){
		socket.state = 'logined';
		socket.first = '0';
		chatManager.sendConflicMessage(socket);
		chatManager.sendSyncMessage(socket, 'online');
		if(deviceToken && deviceToken != '' && (socket.devtype == 'android' || socket.devtype == 'ios')){
			redisManager.db13.get('arn:'+socket.jid, function(err, reply){
				var updateArn = '0';
				var deleteArn = '0';
				if(reply){
					if(socket.devtype == 'android')
						deleteArn = '1';
					else{
						var len = deviceToken.length;
						if(reply.substring(0, len) != deviceToken){
							deleteArn = '1';
							updateArn = '1';
						}
					}
				}else{
					if(socket.devtype == 'ios')
						updateArn = '1';	
				}
				if(deleteArn == '1'){
					redisManager.db13.del('arn:'+socket.jid);
					snsManager.unregisterToken(JSON.parse(reply.substring(len+1)));
					redisManager.db14.del('count:'+socket.jid);
					redisManager.db13.get('arn:sys-'+socket.jid, function(err, reply){
						if(reply){
							redisManager.db13.del('arn:sys-'+socket.jid);
							snsManager.unsubscribeTopic(JSON.parse(reply));
						}
					});
				}
				if(updateArn == '1'){
					snsManager.registerToken(deviceToken, function(data){
						if(data && data != ''){
							logger.log(JSON.stringify(data));
							redisManager.db13.set('arn:'+socket.jid, deviceToken + '-' +JSON.stringify(data));
							redisManager.db14.set('count:'+socket.jid, '0');
							//snsManager.publishMsg(data, '111helloworld!', 100);
							//snsManager.publishMucMsg('arn:aws:sns:ap-northeast-2:943521831168:m12312412412', 'helloworld!');
							redisManager.db13.get('arn:sys', function(err, reply){
								if(reply){
									var endpointArn = data;
									var topicArn = JSON.parse(reply);
    	    								snsManager.subscribeTopic(topicArn, endpointArn, function(data){
	    									if(data && data != ''){
	    	    									redisManager.db13.set('arn:sys-'+socket.jid, JSON.stringify(data));
	      									}
	    								});
								}
							});
						}	
					});
				}
			});
			if(socket.devtype == 'ios'){
				redisManager.db14.set('online:'+socket.jid, socket.token);
			}
		}
		redisManager.db12.smembers('user:'+socket.jid, function(err, replies){
			replies.forEach(function(reply, index){
				var roomid = reply.toString();
				redisManager.db13.get('arn:'+roomid, function(err, reply){
					if(!reply){
						return;
					}
				});
				roomManager.joinLocRoom(socket, roomid);
				redisManager.db13.get('arn:'+roomid+'-'+socket.jid, function(err, reply){
					if(!reply)
						return;
					redisManager.db13.get('arn:'+socket.jid, function(err, reply){
						if(!reply)
							return;
						var endpointArn = JSON.parse(reply.substring(65));
						redisManager.db13.get('arn:'+roomid, function(err, reply){
							if(!reply)
								return;
							var topicArn = JSON.parse(reply);
    	    						snsManager.subscribeTopic(topicArn, endpointArn, function(data){
	    							if(data && data != ''){
	    	    							logger.log('joinroom:' + JSON.stringify(data));
	    	    							redisManager.db13.set('arn:'+roomid+'-'+socket.jid, JSON.stringify(data));
	      							}
	    						});
						});
					});
				});
			});
		});
		
		redisManager.db13.exists('distime:'+socket.jid+'/'+socket.token, function(err, reply){
			socket.lasttime = '0';
			if(reply == '0'){
				redisManager.db13.exists('distime:'+socket.jid, function(err, reply){
					if(reply == '1'){
						redisManager.db13.get('distime:'+socket.jid, function(err, reply){
							socket.lasttime = reply;
							logger.log('lasttime is: ' + socket.lasttime);
							socket.emit('logined', socket.lasttime);
						});	
					}else{
						socket.first = '1';
						socket.emit('logined', socket.lasttime);
					}
				});
			}else{
				redisManager.db13.get('distime:'+socket.jid+'/'+socket.token, function(err, reply){
					socket.lasttime = reply;
					logger.log('lasttime is: ' + socket.lasttime);
					socket.emit('logined', socket.lasttime);
				});	
			}
		});
		redisManager.db11.smembers('msg:'+socket.jid + '/' + socket.token, function(err, replies){
			replies.forEach(function(reply, index){
				socket.emit('msgsuc', reply.toString());
			});
		});
	});

	socket.on('msgsucack', function(msgid){
		if(msgid && msgid != ''){
			redisManager.db11.srem('msg:'+socket.jid + '/' + socket.token, msgid);
		}
	});

	socket.on('joinroom', function(roomid){
		if(roomid && roomid != ''){
			roomManager.joinLocRoom(socket, roomid);
			redisManager.db13.get('arn:'+roomid+'-'+socket.jid, function(err, reply){
				if(reply)
					return;
				redisManager.db13.get('arn:'+socket.jid, function(err, reply){
					if(!reply)
						return;
					var endpointArn = JSON.parse(reply.substring(65));
					redisManager.db13.get('arn:'+roomid, function(err, reply){
						if(!reply)
							return;
						var topicArn = JSON.parse(reply);
    	    					snsManager.subscribeTopic(topicArn, endpointArn, function(data){
	    						if(data && data != ''){
	    	    						logger.log('joinroom:' + JSON.stringify(data));
	    	    						redisManager.db13.set('arn:'+roomid+'-'+socket.jid, JSON.stringify(data));
	      						}
	    					});
					});
				});
			});
		}
	});
	
	socket.on('quitroom', function(roomid){
		if(roomid && roomid != ''){
			roomManager.leaveLocRoom(socket, roomid);
			redisManager.db12.srem('group:'+roomid, socket.jid);
			redisManager.db12.srem('user:'+socket.jid, roomid);
			redisManager.db10.del(socket.jid+':'+roomid);
			redisManager.db13.get('arn:'+roomid+'-'+socket.jid, function(err, reply){
				if(reply){
					redisManager.db13.del('arn:'+roomid+'-'+socket.jid);
					snsManager.unsubscribeTopic(JSON.parse(reply));
				}
			});
			redisManager.db13.get('arn:'+roomid, function(err, reply){
				if(reply){
					chatManager.sendChatMessageByJid(socket, roomid, 'quit msg');	
				}
			});
		}
	});
	
	socket.on('createroom', function(roomid){
		if(roomid && roomid != ''){
    	    		snsManager.createTopic(roomid, function(data){
	    			if(data && data != ''){
	    	    			logger.log('createroom:' + JSON.stringify(data));
	    	    			redisManager.db13.set('arn:'+roomid, JSON.stringify(data));
	      			}
	    		});
		}
	});
	
	socket.on('dismissroom', function(roomid){
		if(roomid && roomid != ''){
			redisManager.db13.get('arn:'+roomid, function(err, reply){
				if(reply){
					redisManager.db13.del('arn:'+roomid);
					snsManager.deleteTopic(JSON.parse(reply));
					chatManager.sendChatMessageByJid(socket, roomid, 'dismiss msg');	
				}
			});
		}
	});

	socket.on('inviteroom', function(roomid, roominfo){
		if(roomid && roomid != ''){
			var arr = JSON.parse(roominfo);
			var i = 0;
			for(;i < arr.length; ++i){
				redisManager.db12.sadd('group:'+roomid, arr[i]);
				redisManager.db12.sadd('user:'+arr[i], roomid);
				redisManager.db10.get(arr[i]+':'+roomid, function(err, reply){
					if(!reply){
						redisManager.db10.set(arr[i]+':'+roomid, Date.now().toString());
					}
				});
			}
			chatManager.sendChatMessageByJid(socket, roomid, 'invite msg');	
		}
	});

	socket.on('exit', function(data){
		logger.log('close, byebye: ' + socket.jid);
		socket.disconnect('close, byebye: '+socket.jid);
	});

	socket.emit('login');
    });
}
