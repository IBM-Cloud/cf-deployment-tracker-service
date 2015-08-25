// Licensed under the Apache 2.0 License. See footer for details.

var express = require('express'),
    http = require('http'),
    path = require('path'),
    cloudant = require('cloudant'),
    program = require('commander'),
    dotenv = require('dotenv'),
    validator = require('validator'),
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

var urlEncodedParser = bodyParser.urlencoded(),
  jsonParser = bodyParser.json();
// Get metrics overview
app.get('/', function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get('deployment-tracker-db');
  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use('events');
  eventsDb.view('deployments', 'by_repo', {group_level: 3}, function(err, body) {
    var apps = {};
    body.rows.map(function(row) {
      var url = row.key[0]
      var year = row.key[1];
      var month = row.key[2];
      if (!(url in apps)) {
        apps[url] = {
          count: 0
        };
      }
      if (validator.isURL(url, {protocols: ['http','https'], require_protocol: true})) {
        apps[url].is_url = true;
      }
      if (!(year in apps[url])) {
        apps[url][year] = {};
      }
      if (!(month in apps[url][year])) {
        apps[url][year][month] = row.value;
        apps[url].count += row.value;
      }
    });
    res.render('index', {apps: apps});
  });
});

app.post('/', urlEncodedParser, function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get('deployment-tracker-db');
  if (!deploymentTrackerDb) {
    return res.status(500).json({ error: 'No database server configured' });
  }
  if (!req.body) {
    return res.sendStatus(400);
  }
  var event = {
    date_received: new Date().toJSON()
  };
  if (req.body.date_sent) {
    event.date_sent = req.body.date_sent;
  }
  if (req.body.code_version) {
    event.code_version = req.body.code_version;
  }
  if (req.body.repository_url) {
    event.repository_url = req.body.repository_url;
  }
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
  var eventsDb = deploymentTrackerDb.use('events');
  eventsDb.insert(event, function(err, body) {
    if (err) {
      console.error(err);
      return res.status(500).json({error: 'Internal Server Error'});
    }
    return res.status(201).json({
      ok: true
    });
  });
});

app.post('/api/v1/track', jsonParser, function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get('deployment-tracker-db');
  if (!deploymentTrackerDb) {
    return res.status(500).json({ error: 'No database server configured' });
  }
  if (!req.body) {
    return res.sendStatus(400);
  }
  var event = {
    date_received: new Date().toJSON()
  };
  if (req.body.date_sent) {
    event.date_sent = req.body.date_sent;
  }
  if (req.body.code_version) {
    event.code_version = req.body.code_version;
  }
  if (req.body.repository_url) {
    event.repository_url = req.body.repository_url;
  }
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
  var eventsDb = deploymentTrackerDb.use('events');
  eventsDb.insert(event, function(err, body) {
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
// Set the view engine
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
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
