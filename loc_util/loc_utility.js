//util module

var LocUtility = function(){};

var arr = [0,1,2,3,4,5,6,7,8,9,"a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
LocUtility.prototype.getRandom = function(){
	var str = Date.now() ;
	for(var index = 0; index < 4; index++){
		randNum = Math.floor(Math.random()*36);
		str = str + arr[randNum];
  	}
	return str;
}

module.exports = new LocUtility();
