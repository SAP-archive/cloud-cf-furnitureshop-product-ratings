/*eslint no-console: 0*/
"use strict";

var express = require("express");
var bodyParser = require("body-parser");
var cfenv = require("cfenv");
var route = require("./routes/route");
var dbOp = require("./db/dbOp");

var app = express();

app.use(bodyParser.json());

app.use('/', route);

var appEnv   = cfenv.getAppEnv();
dbOp.initializeDB(function(error) {
    if (error) {
        console.error('Error initializing database ' + error.toString());
        process.exit(-2);
    }

    dbOp.uploadInitialData(function (error) {
        if (error) {
            console.error('Error uploading initial data ' + error.toString());
            process.exit(-3);
        }

        console.log('Uploaded initial data');
		var serviceURL = appEnv.url;
		var servicePort = appEnv.port;

        app.listen(servicePort, function() {
            console.log("server started on " + serviceURL);
    	});

        // TODO: Add cleanup - https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html
	});


});
