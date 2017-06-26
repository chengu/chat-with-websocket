//log module by cg 2016.04.08

var log4js = require("log4js");
var helper = {};
exports.helper = helper;

log4js.configure({
	"appenders":[
			{"type":"console", "category":"console"},
		   	{"type":"file", "filename":"./logs/loc-chat.log", "category":"msg"}
	],
	"levels":{"msg":"INFO"},
	"replaceConsole":true
});

var logger = log4js.getLogger("msg");
var consolelogger = log4js.getLogger("console");

Date.prototype.Format = function(fmt){ 
	var o = {
    		"M+": this.getMonth() + 1, //month
    		"d+": this.getDate(), //day
    		"H+": this.getHours(), //hour 
    		"m+": this.getMinutes(), //minute 
    		"s+": this.getSeconds(), //second
    		"q+": Math.floor((this.getMonth() + 3) / 3), //season
    		"S": this.getMilliseconds() //millisecond
	};
	if (/(y+)/.test(fmt)) 
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt)) 
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

helper.log = function(msg){
	if(msg == null)
		msg = "";
	var time = new Date().Format("yyyy-MM-dd HH:mm:ss");
	//logger.info(time + ': ' +msg);
	consolelogger.info(time + ': ' +msg);
} 

