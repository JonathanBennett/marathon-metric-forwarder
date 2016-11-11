var exphbs  = require('express-handlebars'),
MomentHandler = require("handlebars.moment"),
path = require('path');

MomentHandler.registerHelpers(exphbs);

app.engine('handlebars', exphbs({defaultLayout: 'index',layoutsDir:path.join(__dirname, '..', 'app')}));
app.set('view engine', 'handlebars');
// app.set('views', 'some/path/')
app.set('views', path.join(__dirname, '..', 'app'));

app.get('/', function (req, res) {
  console.log(targets);
    res.render('index', {timers:targets,marathon_url:marathon_url});
});

app.use(express.static('app'));