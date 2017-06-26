//2016.04.07 by cg
//base room module

exports.joinLocRoom = function(socket, room){
	socket.join(room);
}

exports.leaveLocRoom = function(socket, room){
	socket.leave(room);
}


