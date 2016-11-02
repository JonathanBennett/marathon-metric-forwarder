// External dependencies
_ = require('underscore'),
request = require('request'),
kafka = require('kafka-node');


// Globals
targets = [];
timers = [];

// Application dependencies
var api = require('./lib/api.js');

// Set up application
var marathon_url = process.env.MARATHON_URL || "http://localhost:8080";
var kafka_topic = process.env.KAFKA_TOPIC || 'metrics_topic';
var zookeeper = process.env.ZOOKEEPER_QUORUM || 'localhost:2181';
var clearup_timeout = process.env.CLEARUP_TIMEOUT || 60;
var clearup_frequency = process.env.CLEARUP_FREQUENCY || 60;
var refresh_frequency = process.env.REFRESH_FREQUENCY || 60;

var clearup_interval = null;
var refresh_interval = null;

var HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.Client(zookeeper),
    producer = new HighLevelProducer(client);


producer.on('error', function (err) {
  console.log("Could not connect to Kafka");
});

producer.on('ready', function () {
  refresh_targets(function() {
    setup_marathon_sd_interval();
    setup_clearup_interval();
  });
});

// Setup the Marathon connection
var marathon = require('marathon-node')(marathon_url, {"logTime":true});


var refresh_targets = function(callback) {
  marathon.app
    .getList({embed:"apps.tasks",label:"metrics_endpoint"})
    .then(function(data) {
      _.each(data.apps, function(app, key) {
        if(app.labels.metrics_endpoint) {
          // console.log(app);
          _.each(app.tasks, function(task,key) {
            var target_def = {
              lastCollected: null,
              lastResult: null,
                target: {
                "id":task.id,
                "appId":task.appId,
                "host":task.host,
                "port":app.labels.metrics_endpoint_port || task.ports[0] || null,
                "metrics_endpoint":app.labels.metrics_endpoint,
                "frequency": app.labels.metrics_frequency || 5
              }
            };
            targets.push(target_def);
          });
        }
      });
      register_scrapers();
      if(typeof callback == "function") {
        callback();
      }
    })
    .catch(function(error) {
      // console.log(error);
      if(error.name == "RequestError") { console.error("Marathon address not reachable. Maybe incorrect value?"); }
    });
}

var register_scrapers = function() {
  // console.log(targets);
  _.each(targets, function(target) {
    start_scraping(target);
  });
}

var start_scraping = function(targetInstance) {
  targetInstance.interval = setInterval(function() {
    request('http://'+targetInstance.target.host+':'+targetInstance.target.port+targetInstance.target.metrics_endpoint, function (error, response, body) {
      targetInstance.lastCollected = (new Date().getTime());
      targetInstance.lastResult = {
        resultCode:response.statusCode,
        error:error || null
      }
      if (!error && response.statusCode == 200) {
        var metric_response = {
          "id":targetInstance.target.id,
          "appId":targetInstance.target.appId,
          "metrics":body,
          "timestamp":(new Date().getTime())
        }

        var messages = [];
        messages.push(JSON.stringify(metric_response));

        send_to_kafka(messages);

      }
    });
  }, targetInstance.target.frequency * 1000);
}

var send_to_kafka = function(messages) {
  payloads = [
    { topic: kafka_topic, messages: messages }
  ];
  producer.send(payloads, function (err, data) {
    console.log(data);
    console.log(err);
    metric_response = null;
  });
}

// Loops and timers
var setup_marathon_sd_interval = function() {
  refresh_interval = setInterval = setInterval(function() {
    refresh_targets();
  }, (refresh_frequency * 1000))
}

// Container removal clean up

var setup_clearup_interval = function() {
  clearup_interval = setInterval(function() {
    cleanup_scrapers();
  }, (clearup_frequency * 1000));
}

var cleanup_scrapers = function() {
  console.log("Beginning clearup");
  _.each(targets, function(target, key) {
    if((target.lastResult != "200" || target.lastResult != "201") && (((new Date().getTime()) + (clearup_timeout * 1000)) > target.lastCollected)) {
      // Remove the scraper
      clearInterval(target.interval);
      // Publish a removal event
    }
  });
}
