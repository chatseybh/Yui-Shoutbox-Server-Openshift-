var mongoose = require('mongoose');
var xss = require('node-xss').clean;

var chatSchema = mongoose.Schema({
	nick: String,
	uid: String,
	colorsht: String,
	avatar: String,
	msg: String,
	type: String,
	created: Date
});

var Chat = mongoose.model('Message', chatSchema);

exports.getOldMsgs = function(data, cb){
	var query = Chat.find({});
	query.sort('-_id').limit(data.ns).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getcountMsgs = function(data, cb){
	Chat.find({}).count({}, function(err, docs){
		cb(err, docs);
	});
}

exports.getfpglogMsgs = function(data, cb){
	var query = Chat.find({});
	query.sort('-_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsnext = function(data, cb){
	Chat.find({ _id: { $lte: data.id } }).sort('-_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.getlogMsgsback = function(data, cb){
	Chat.find({ _id: { $gte: data.id } }).sort('_id').limit(data.mpp).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.saveMsg = function(data, cb){
	var newMsg = new Chat({msg: xss(data.msg), uid: data.uid, colorsht: xss(data.colorsht), avatar: data.avatar, nick: data.nick, type: data.type, created: Date.now()});
	newMsg.save(function(err, docs){
		cb(err, docs);
	});
};

exports.readonemsg = function(data, cb){
	Chat.findOne({_id: data.id}).exec(function(err, docs){
		cb(err, docs);
	});
}

exports.floodcheck = function(data, cb){
	Chat.findOne({uid: data.uid}).sort('_id').exec(function(err, docs){
		cb(err, docs);
	});
}

exports.updmsg = function(data, cb){
	Chat.findOneAndUpdate({_id: data.id}, { msg: xss(data.newmsg), edt: '1' }, {upsert: false}).exec(function(err, docs){
		cb(err, docs);
	});
};

exports.rmvmsg = function(data, cb){
	Chat.findOneAndRemove({_id: data.id}).exec(function(err, docs){
		cb(err, docs);
	});
};

exports.purge = function(){
	Chat.remove({}).exec();
}

var banSchema = mongoose.Schema({
	_id: String,
	ban: String
});

var banl = mongoose.model('banlist', banSchema);

exports.updbanl = function(data, cb){
	banl.findOneAndUpdate({_id: 'ban1'}, { ban: xss(data.ban) }, {upsert: true}).exec();
};

exports.getbanl = function(cb){
	banl.findOne({_id: 'ban1'}).exec(function(err, docs){
		cb(err, docs);
	});
}