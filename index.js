// External dependencies
_ = require('underscore'),
    request = require('request'),
    kafka = require('kafka-node'),
    express_node_metrics = require('express-node-metrics').metrics,
    log4js = require('log4js'),
    moment = require('moment');

// Configure the default override logger
    log4js.configure({
      appenders: [
        { type: 'console' }
      ],
      replaceConsole: true
    });


// Globals
targets = {};
timers = [];

// Set up the web server

express = require('express'),
  app = express();


// Application dependencies
var api = require('./lib/api.js');
var web = require('./lib/web.js');

// Set up application
marathon_url = process.env.MARATHON_URL || "http://localhost:8080",
 kafka_topic = process.env.KAFKA_TOPIC || 'metrics_topic',
 zookeeper = process.env.ZOOKEEPER_QUORUM || 'localhost:2181',
 clearup_timeout = process.env.CLEARUP_TIMEOUT || 60,
 clearup_frequency = process.env.CLEARUP_FREQUENCY || 60,
 refresh_frequency = process.env.REFRESH_FREQUENCY || 60;

var clearup_interval = null;
var refresh_interval = null;

var HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.Client(zookeeper),
    producer = new HighLevelProducer(client);


producer.on('error', function(err) {
    console.log("Could not connect to Kafka");
});

producer.on('ready', function() {
    refresh_targets(function() {
        setup_marathon_sd_interval();
        setup_clearup_interval();
    });
});

// Setup the Marathon connection
var marathon = require('marathon-node')(marathon_url);


var refresh_targets = function(callback) {
  // console.log("refreshing");
    marathon.app
        .getList({
            embed: "apps.tasks",
            label: "metrics_endpoint"
        })
        .then(function(data) {
            // console.log(data);
            _.each(data.apps, function(app, key) {
                if (app.labels.metrics_endpoint) {
                    _.each(app.tasks, function(task, key) {
                        if (!targets.hasOwnProperty(task.id)) {
                            var target_def = {
                                lastCollected: null,
                                lastResult: null,
                                target: {
                                    "id": task.id,
                                    "appId": task.appId,
                                    "host": task.host,
                                    "port": app.labels.metrics_endpoint_port || task.ports[0] || null,
                                    "metrics_endpoint": app.labels.metrics_endpoint,
                                    "frequency": app.labels.metrics_frequency || 5
                                }
                            };
                            // console.log
                            targets[task.id] = target_def;
                        }
                    });
                };
            });
            register_scrapers();
            if (typeof callback == "function") {
                callback();
            }
        })
        .catch(function(error) {
            if (error.name == "RequestError") {
                console.error("Marathon address not reachable. Maybe incorrect URL?");
            }
        });
}

var register_scrapers = function() {
    _.each(targets, function(target) {
        start_scraping(target);
    });
}

var start_scraping = function(targetInstance) {
    targetInstance.interval = setInterval(function() {
        request('http://' + targetInstance.target.host + ':' + targetInstance.target.port + targetInstance.target.metrics_endpoint, function(error, response, body) {
            targetInstance.lastCollected = (new Date().getTime());
            targetInstance.lastCollectedHuman = moment();
            targetInstance.lastResult = {
                resultCode: response.statusCode,
                error: error || null
            }
            if (!error && response.statusCode == 200) {
                var metric_response = {
                    "id": targetInstance.target.id,
                    "appId": targetInstance.target.appId,
                    "metrics": body,
                    "timestamp": (new Date().getTime())
                }

                var messages = [];
                messages.push(JSON.stringify(metric_response));

                send_to_kafka(messages);

            }
        });
    }, targetInstance.target.frequency * 1000);
}

var send_to_kafka = function(messages) {
    payloads = [{
        topic: kafka_topic,
        messages: messages
    }];
    producer.send(payloads, function(err, data) {
        // console.log(data);
        if (err) {
            console.log("Kafka producer error", err);
        }
        metric_response = null;
    });
}

// Loops and timers
var setup_marathon_sd_interval = function() {
    // console.log(refresh_frequency);
    refresh_interval = setInterval(function() {
        refresh_targets();
        // console.log("Refreshing targets");
    }, (refresh_frequency * 1000))
}

// Container removal clean up

var setup_clearup_interval = function() {
    clearup_interval = setInterval(function() {
        cleanup_scrapers();
    }, (clearup_frequency * 1000));
}

var cleanup_scrapers = function() {
    // console.log("Beginning clearup");
    _.each(targets, function(target, key) {
        if ((target.lastResult != "200" || target.lastResult != "201") && (((new Date().getTime()) + (clearup_timeout * 1000)) > target.lastCollected)) {
            // Remove the scraper
            clearInterval(target.interval);
            // Publish a removal event
        }
    });
}

app.listen(process.env.PORT || 3000);
