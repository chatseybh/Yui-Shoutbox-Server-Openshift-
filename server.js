// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var cors = require('cors');
var app = express();
var	port = process.env.OPENSHIFT_NODEJS_PORT;
var	ip = process.env.OPENSHIFT_NODEJS_IP;
var mongoose = require('mongoose');
var passport = require('passport');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var User = require('./lib/user');
var db = require('./lib/yuishout-db');
var whitelist = [];
var dbcredential = process.env.OPENSHIFT_MONGODB_DB_URL;
var dbname = 'yuishout';
var url = dbcredential + dbname;

// initialize db ===============================================================

mongoose.connect(url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application

User.findOne({'local.check': '1'}).exec(function(err, docs){
	if (docs) {
		whitelist = docs.local.origin;
	}
	start();
});

function start() {
	var corsOptions = {
	  origin: function(origin, callback){
		var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
		callback(null, originIsWhitelisted);
	  }
	};

	app.use(cors(corsOptions), function(req, res, next) {
		next();
	});

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));

	app.set('view engine', 'ejs'); // set up ejs for templating

	// required for passport
	app.use(passport.initialize());

	// launch ======================================================================
	var server = app.listen(port, ip);
	var io = socketio.listen(server);

	//Routes ======================================================

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		req.logout();
		res.render('index.ejs'); // load the index.ejs file
	});

	app.get('/sucess', function(req, res) {
		req.logout();
		res.render('sucess.ejs'); // load the index.ejs file
	});

	// =====================================
	// Settings ============================
	// =====================================
	// show the settings form
	app.get('/settings', function(req, res) {

		// check if already configured, if not will go to signup page
		User.find({}).count({}, function(err, docs){
			if (docs==0) {
				res.render('settings.ejs');
			}
			else {
				res.redirect('/sucess');
			}
		});
	});

	// process the settings form
	app.post('/settings', passport.authenticate('local-signup', {
		session: false,
		successRedirect : '/sucess', // redirect to the secure profile section
		failureRedirect : '/settings' // redirect back to the signup page if there is an error
	}));

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// socket.io  ===========================================================

	var nspm = io.of('/member');
	nspm.on('connection', function(socket){
		initializeConnection(socket);
	})

	function initializeConnection(socket){
		handleshowOldMsgs(socket);
		handlecountMsgs(socket);
		handleshowfrstpagelogMsgs(socket);
		handleshowlognextMsgs(socket);
		handleshowlogbackMsgs(socket);
		handlereadonemsg(socket);
		handlesgetbml(socket);
	}

	function handleshowOldMsgs(socket){
		socket.on('getoldmsg', function(data){
			db.getOldMsgs(data, function(err, docs){
				nspm.emit('load old msgs', docs);
			});
		});
	}

	function handlereadonemsg(socket){
		socket.on('readonemsg', function(data){
			db.readonemsg(data, function(err, docs){
				nspm.emit('readonemsg', docs);
			});
		});
	}

	function handlecountMsgs(socket){
		socket.on('countmsg', function(data){
			db.getcountMsgs(data, function(err, docs){
				nspm.emit('countmsg', docs);
			});
		});
	}

	function handleshowfrstpagelogMsgs(socket){
		socket.on('logfpgmsg', function(data){
			db.getfpglogMsgs(data, function(err, docs){
				nspm.emit('logfpgmsg', docs);
			});
		});
	}

	function handleshowlognextMsgs(socket){
		socket.on('logmsgnext', function(data){
			db.getlogMsgsnext(data, function(err, docs){
				nspm.emit('logmsgnext', docs);
			});
		});
	}

	function handleshowlogbackMsgs(socket){
		socket.on('logmsgback', function(data){
			db.getlogMsgsback(data, function(err, docs){
				nspm.emit('logmsgback', docs);
			});
		});
	}

	function handlesgetbml(socket){
		socket.on('getbanl', function(data){
			db.getbanl(function(err, docs){
				nspm.emit('getbanl', docs);
			});
		});
	}

	function authet(req, res, next) {
		passport.authenticate('local-login', function(err, user, info) {
			if (err) { 
				return res.send({error: 200}); 
				res.end();
			}
			if (!user) { 
				return res.send({error: 220}); 
				res.end();
			}
			req.logIn(user, { session: false }, function(err) {
				if (err) {
					return res.send({error: 260}); 
					res.end();
				}
				else {
					next();
				}
			});
		})(req, res, next);
	}

	app.post('/message', authet, function(req, res, next) {
		if (parseInt(req.body.fltime)>0) {
			db.floodcheck(req.body, function(err, docs){
				if (docs) {
					if ((Date.now()/1000 - docs.created/1000) > parseInt(req.body.fltime)) {
						db.saveMsg(req.body, function(err, docs){
							nspm.emit('message', docs);
						});
						res.send({sucess: 'sucess'});
						res.end();
					}
					else {
						res.send({error: 110});
						res.end();
					}
				}
				else {
					db.saveMsg(req.body, function(err, docs){
						nspm.emit('message', docs);
					});
					res.send({sucess: 'sucess'});
					res.end();
				}
			});
		}
		else {
			db.saveMsg(req.body, function(err, docs){
				nspm.emit('message', docs);
			});
			res.send({sucess: 'sucess'});
			res.end();
		}
	});

	app.post('/ckuid', authet, function(req, res, next) {
		db.readonemsg(req.body, function(err, docs){
			if (docs) {
				res.send({sucess: docs.uid});
				res.end();
			}
			else {
				res.send({error: 130});
				res.end();		
			}
		});
	});

	app.post('/updmsg', authet, function(req, res, next) {
		db.updmsg(req.body, function(err, docs){
			nspm.emit('updmsg', docs);
		});
		res.send({sucess: 'sucess'});
		res.end();
	});

	app.post('/updbanl', authet, function(req, res, next) {
		db.updbanl(req.body, function(err, docs){
			nspm.emit('updbanl', docs);
		});
		res.send({sucess: 'sucess'});
		res.end();
	});

	app.post('/purge', authet, function(req, res, next) {
		db.purge();
		nspm.emit('purge');
		res.send({sucess: 'sucess'});
		res.end();
	});
	
	app.post('/rmvmsg', authet, function(req, res, next) {
		db.rmvmsg(req.body, function(err, docs){
			nspm.emit('rmvmsg', docs);
		});
		res.send({sucess: 'sucess'});
		res.end();
	});
}