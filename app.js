// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
    bodyParser = require('body-parser');

dotenv.load();

var app = express();

(function(app) {
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    app.set('vcapServices', vcapServices);
    if (vcapServices.cloudantNoSQLDB && vcapServices.cloudantNoSQLDB.length > 0) {
      var service = vcapServices.cloudantNoSQLDB[0];
      if (service.credentials) {
        app.set('deployment-tracker-db', cloudant({
          username: service.credentials.username,
          password: service.credentials.password,
          account: service.credentials.username
        }));
      }
    }
  }
})(app);

var urlEncodedParser = bodyParser.urlencoded();
// Handle POSTing an event
app.post('/', urlEncodedParser, function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get('deployment-tracker-db');
  if (!deploymentTrackerDb) {
    return res.status(500).json({ error: 'No database server configured' })
  }
  if (!req.body) {
    return res.sendStatus(400);
  }
  var event = {};
  if (req.body.application_name) {
    event.application_name = req.body.application_name;
  }
  if (req.body.space_id) {
    event.space_id = req.body.space_id;
  }
  if (req.body.application_version) {
    event.application_version = req.body.application_version;
  }
  if (req.body.application_uris) {
    event.application_uris = req.body.application_uris;
  }
  var eventsDB = deploymentTrackerDb.use('events');
  eventsDB.insert(event, function(err, body) {
    if (err) {
      console.error(err);
      return res.status(500).json({error: 'Internal Server Error'});
    }
    return res.status(201).json({
      ok: true
    });
  });
});
// Set the port number based on a command line switch, an environment variable, or a default value
app.set('port', program.port || process.env.PORT || 3000);
// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
// Create the HTTP server
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//-------------------------------------------------------------------------------
