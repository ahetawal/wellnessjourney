var express = require('express');
var crypto = require('crypto');
var templateUtil = require('../util/ejsutil.js');
var emailUtil = require('../util/emailutil.js');
var dbUtil = require('../util/dbutil.js');
var url  = require('url');
var twilio = require("twilio");

var accountSid = 'AC95fe367f44081f3dd847deefde865a44'; // Your Account SID from www.twilio.com/console
var authToken = '81db504afcaa33b2adfb53de52e9463a';   // Your Auth Token from www.twilio.com/console
var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);


var router = express.Router();

/* GET home page. */
router.post('/sendsms', function(req, res, next) {
	console.log(req.body);
	client.messages.create({
    body: 'Hello from Salesforce',
    to: '+14156402834',  // Text this number
    from: '+16507535865' // From a valid Twilio number
	},
	function(err, message) {
    	console.log(message.sid);
    	res.send("Sent");
	});
});



/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('signup', { title: 'Wellness Journey' });
});

router.get('/signup', function(req, res, next) {
	res.render('signup', { title: 'Wellness Journey' });
});


router.get('/delete', function(req, res, next) {
	var userEmail = req.query.email;
	dbUtil.query("DELETE FROM salesforce.contact WHERE email=($1)", [userEmail])
	.done(function(result){
		res.send("Deleted " + userEmail);
	},
    function(error){
    	console.log(error);
    	next(error);
	});
	
});



router.post('/register', function(req, res, next) {
	var userEmail = req.body.user_email;
	var userName = req.body.user_name;
	console.log("HERE is the email passed.. " + userEmail);
	//*** TODO : REMOVE THIS LATER
		//userEmail = "amit.hetawal@gmail.com";
	// ******
	var confirmToken = generateRandomValueHex(12);

	dbUtil.query("SELECT COUNT(*) FROM salesforce.contact where email=($1)", [userEmail], true)
		.then(function(result){
			if(result && result.count == 0) {
				console.log("Inserting");
				insertNewUser(req, res, userEmail, userName, confirmToken, next);
			} else {
				console.log("Not inserting");
				return next(new Error('User Already Registered'));
			}
		});

});

router.get('/confirm', function(req, res, next) {
	var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var userToken = query.token;
    var userEmail = query.email;
    dbUtil.query("UPDATE salesforce.contact set testAmit__wellness_onboarded__c=($1) where email=($2) and testAmit__email_validation_token__c=($3) and testAmit__wellness_onboarded__c=($4)", ["true", userEmail, userToken, "false"])
    	.done(function(updateCount){
    			console.log("UPDATE COUNT IS >> " + updateCount);
    			if(updateCount == 1){
    				res.send("Your seat is confirmed. Sit back and relax !! ");
    			} else {
    				res.send("Invalid Confirmation request...");
    			}
    		},
    		function(error){
    			console.log(error);
    			next(error);
    	});
});


var insertNewUser = function(req, res, userEmail, userName, confirmToken, next){
	dbUtil.query("INSERT INTO salesforce.contact (email, testAmit__email_validation_token__c, lastname, name) values ($1, $2, $3, $3)", [userEmail, confirmToken, userName])
				.then(function(result){
					var emailBody = templateUtil.getConfirmEmailHTML(req.hostname, req.app.settings.port, confirmToken, userEmail, 'confirm-email.ejs');
					return emailUtil.sendMail(emailBody, userEmail, 'Wellness Journey Confirm Email');
				}).done(function(successResult){
							console.log("Sucess >> " + successResult);
							res.send('Success');
						},
						function(errorResult){
							console.log("Error >> " + JSON.stringify(errorResult));
							console.log("Doing Cleanup now for the user entries...");
							dbUtil.query("DELETE FROM USER_TABLE WHERE userEmail=($1)", [userEmail]);
							next(errorResult);
						});
}



var generateRandomValueHex = function(len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
}

module.exports = router;
