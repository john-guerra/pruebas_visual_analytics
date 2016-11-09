var express = require('express');
var path = require('path');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render('index.html');
});

app.get('/getData', function (req, res) {

	// Connect to db
  res.sendFile(path.normalize(__dirname + '/ieeevisNetwork.json'));
});

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});