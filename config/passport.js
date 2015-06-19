// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;

// load up the user model
var User = require('../lib/user');
var url = require('url');

// expose this function to our app using module.exports
module.exports = function(passport) {
	// =========================================================================
	// LOCAL SIGNUP ============================================================
	// =========================================================================
	// we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called 'local'

	passport.use('local-signup', new LocalStrategy({
		// by default, local strategy uses username and password, we will override with email
		usernameField : 'user',
		passwordField : 'password',
		passReqToCallback : true // allows us to pass back the entire request to the callback
	},
	function(req, user, password, done) {
		User.find({}).count({}, function(err, docs){
			if (docs==0) {
				// create the user
				var newUser = new User();
				
				domain = url.parse(req.body.origin).hostname.replace("www.","");
				origin = 'http://'+domain+', https://'+domain+', http://www.'+domain+', https://www.'+domain+'';

				// set the user's local credentials
				newUser.local.user = user;
				newUser.local.password = newUser.generateHash(password); // use the generateHash function in our user model
				newUser.local.origin = [origin];
				newUser.local.check = '1';

				// save the user
				newUser.save(function(err) {
					if (err)
						throw err;
					return done(null, newUser);
				});
			}
		});
	}));
	
    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new BasicStrategy(
		function(username, password, done) { // callback with email and password from our form
			process.nextTick(function () {
				// find a user whose email is the same as the forms email
				// we are checking to see if the user trying to login already exists
				User.findOne({ 'local.user' :  username }, function(err, user) {
					// if there are any errors, return the error before anything else
					if (err)
						return done(err);

					// if no user is found, return the message
					if (!user)
						return done(null, false); // req.flash is the way to set flashdata using connect-flash

					// if the user is found but the password is wrong
					if (!user.validPassword(password))
						return done(null, false); // create the loginMessage and save it to session as flashdata

					// all is well, return successful user
					return done(null, user);
				});
			});
		}
	));
};
