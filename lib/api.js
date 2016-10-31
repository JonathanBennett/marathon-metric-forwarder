  var express = require('express');
  var app = express();

  // Setup express
  var express_port = process.env.PORT || 3000;

  app.get('/v1/timers', function(req, res) {
      var timers = JSON.stringify(targets);
      res.json(targets);
  });

  app.delete('/v1/timer/:id', function(req, res) {
      var timers = JSON.stringify(targets);
      res.send(timers);
  });

  app.listen(express_port);
