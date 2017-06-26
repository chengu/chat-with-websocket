//2016.04.07 by cg
//config module

var _CONFIG = {
	//redis config
	_hostRedis:'localhost',
	_portRedis:6379,

	//socket config
	_portSocket:4000,

	//mongo config
	_hostMongo:'localhost',
	_dbMongo:'msg',

	//sns config
	_accessKeyId: 'xxxxJL6DILBA2R5POOBQ',//sns key id
	_secretAccessKey: 'xxxxxjN54gQmNSIpWbok3QdcAHU4El6j4QcrD1FT',//替换自己的key
	_region: 'ap-northeast-2',
	_sslEnabled: true,
	_platformApplicationArn:'arn:aws:sns:ap-northeast-2:xxxxx:app/APNS_SANDBOX/dev-xxx-apns'//替换此链接为自己的平台arn
}

exports._config = _CONFIG;
