  app.get('/v1/timers', function(req, res) {
      // var timers = JSON.stringify(targets);
      // console.log(targets);
      var timers_copy = [];

      // Filter out and prepare the target data for API
      // TODO Probably better to do this with a reduce filter in underscore than a loop.

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

      // TODO Metrics should be here
      res.send(express_node_metrics.getAll(req.query.reset));

  });

  app.get('/v1/health', function(req, res) {

      // TODO HEALTH should be here
      var health = {};
      res.json(health);

  });

  app.delete('/v1/timer/:id', function(req, res) {
    // TODO add a delete endpoint to force remove targets? Probably easier just to recommend to restart the container
  });
