  var express = require('express');
  var app = express();

  // Setup express
  var express_port = process.env.PORT || 3000;

  app.get('/v1/timers', function(req, res) {
      // var timers = JSON.stringify(targets);
      console.log(targets);
      var timers_copy = [];
      _.each(targets, function(value, key) {
        var target = {
          "lastCollected":value.lastCollected,
          "lastResult":value.lastResult,
          "target":value.target
        };
        timers_copy.push(target);
      });
      res.json(timers_copy);
  });

  app.get('/v1/metrics', function(req, res) {

      // Metrics should be here
      var metrics = {};
      res.json(metrics);
      
  });

  app.delete('/v1/timer/:id', function(req, res) {
    // TODO
  });

  app.listen(express_port);
