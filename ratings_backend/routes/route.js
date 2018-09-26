var express = require('express');
var router = express.Router();
var dbOp = require('../db/dbOp');
var amqp = require('amqplib/callback_api');
var xsenv = require('@sap/xsenv');
var xssec = require('@sap/xssec');
// TODO: Use xsenv
var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
var rabbitmqURL = vcap_services.rabbitmq[0].credentials.uri;

var urlBase = '/products';

router.get('/getUserInfo', function(req, res, next) {
  var accessToken = req.headers['authorization'];
  accessToken = accessToken.substring('Bearer '.length);
  var uaa = xsenv.getServices({
    uaa: {
      tag: 'xsuaa'
    }
  }).uaa;
  return xssec.createSecurityContext(accessToken, uaa, (err, securityContext) => {
    if (err) {
      res.status(400).send("Error");
    }
    res.send(securityContext.userInfo);
  });
});

router.get(urlBase, function(req, res) {
    dbOp.getAllProducts(function (error, data) {
        if (error) {
            res.status(500);
            res.end('Error accessing DB: ' + JSON.stringify(error));
        } else {
            res.status(200);
            res.json(data);
        }
    });
});

router.get(`${urlBase}/comments/:id`, function(req, res) {
    var id = req.params.id;

    dbOp.getCommentsForProductId(id, function(error, data) {
        if (error) {
            res.status(400);
            res.send(error.toString());
        } else {
            res.status(200);
            res.send(data); //modify the response message.
        }
    });
});

function addToRabbitMQ(comment) {
  amqp.connect(rabbitmqURL, function(err, conn) {
    conn.createChannel(function(err, ch) {
      var q = 'Review';
      ch.assertQueue(q, {
        durable: false
      });
      // Note: on Node 6 Buffer.from(msg) should be used
      ch.sendToQueue(q, new Buffer(comment));
      setTimeout(function() {conn.close();}, 1000);
      console.log(" [x] Sent %s", comment);
    });
  });
}

router.put(`${urlBase}/:id`, function(req, res) {
  var id = req.params.id;
  var body = req.body;

  console.log(`Put comment ${id} ${JSON.stringify(body)}`);

  dbOp.modifyRatingANDComments(id, body, function(error, data) {
      if (error) {
          res.status(400);
          res.send(error.toString());
        } else {
        console.log("$$$ inside put request response");
        // TODO: Add Rabbit back in
        addToRabbitMQ(req.body.comment);
        res.status(200);
        res.send(data); //modify the response message.
    }
  });
});

module.exports = router;
