/*eslint no-console: 0*/
var express = require('express');
var bodyParser = require('body-parser');
var cfenv = require("cfenv");
var amqp = require('amqplib/callback_api');
var Twitter = require('twit'); // Module for Twitter
var config = require('./config/config');
var Twit = new Twitter(config);
var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
var rabbitmqURL = vcap_services.rabbitmq[0].credentials.uri;
var app = express();
app.use(bodyParser.json());

var messageReceived;
app.get('/', function(req, res) {
  console.log(" INSIDE TWITTER_COMMENTS ROOT API");
  res.send("Root API");
});

var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, function() {
  // amqp.connect(rabbitmqURL, function(err, connect) {
  //  connect.createChannel(function(err, ch) {
  //    var queue = 'Review';
  //    ch.assertQueue(queue, {
  //      durable: false
  //    });
  //    ch.consume(queue, function(message) {
  //      console.log(" INSIDE TWITTER_COMMENTS ROOT API and comments = " + message);
  //      var tweet = {
  //        status: message.content.toString()
  //      };
  //      console.log(" [x] Received %s", message.content.toString());
  //      Twit.post('statuses/update', tweet, tweeted);

  //      function tweeted(err, data, response) {
  //        if (err) {
  //          console.log("Something went wrong!" + err);
  //        } else {
  //          console.log("Just tweeted!");
  //        }
  //      }
  //    }, {
  //      noAck: true
  //    });
  //  });
  // });
  console.log("server starting on " + appEnv.url);
});
