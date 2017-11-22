// Licensed under the Apache 2.0 License. See footer for details.

const express = require("express"),
  http = require("http"),
  path = require("path"),
  cloudant = require("cloudant"),
  dotenv = require("dotenv"),
  bodyParser = require("body-parser"),
  cfenv = require("cfenv"),
  cookieParser = require("cookie-parser"),
  hbs = require("hbs");

const config = require("./config.js")();
console.log("Using repository database " + config.repository_db_name);  

dotenv.load();

var appEnv = cfenv.getAppEnv();

var cloudantRepo = null;

if (process.env.VCAP_SERVICES) {
  var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  if (vcapServices.cloudantNoSQLDB && vcapServices.cloudantNoSQLDB.length > 0) {
    var service = vcapServices.cloudantNoSQLDB[0];
    if (service.credentials) {
      cloudantRepo = cloudant({
        username: service.credentials.username,
        password: service.credentials.password,
        account: service.credentials.username
      });
    }
  }
}

if(! cloudantRepo) {
  console.error("No Cloudant instance is associated with this application.");
  process.exit(1);
}

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var urlEncodedParser = bodyParser.urlencoded({ extended: false }),
    jsonParser = bodyParser.json();

app.get("/", function(req, res) {
  res.render("index");
});

// Get metrics overview
app.get("/stats", function(req, res) {
  res.redirect("/");
});

// Get CSV of metrics overview
app.get("/stats.csv", function(req, res) {
  res.status(410).end();
});

// Get JSON of metrics overview
app.get("/repos", function(req, res) {
  res.status(410).json({});
});

// Get metrics for a specific repo
app.get("/stats/:hash", function(req, res) {
  res.redirect("/");
});

// Public API to get metrics for a specific repo
app.get("/stats/:hash/metrics.json", function(req, res) {
  res.status(410).json({});
});

// Get badge of metrics for a specific repo
app.get("/stats/:hash/badge.svg", function(req, res) {
  res.status(410).end();
});

// Get a "Deploy to Bluemix" button for a specific repo
app.get("/stats/:hash/button.svg", function(req, res) {
  res.status(410).end();
});

function trackClient(req, res) {

  function returnGoneJSON() {
    return({
            ok: false,
            error: "This service is no longer available. Refer to the " +
                   "<a href=\"https://github.com/IBM-Bluemix/cf-deployment-tracker-service/" +
                   "wiki/Deployment-Tracker-Service-status\">" +
                   " status page for details.</a>"});
  }

  if (! req.body) {
    return res.status(410).json(returnGoneJSON());    
  }

  if (req.body.hasOwnProperty("instance_index")) {
    // VCAP_APPLICATION.instance_index (Index number of the application instance, e.g. 0,1,...)
    var idx = Number(req.body.instance_index);
    if((! isNaN(idx)) && (idx > 0)) {
      return res.status(410).json(returnGoneJSON()); 
    }
  }  

  var event = {
    date_received: new Date().toJSON()
  };

  if (req.body.repository_url) {
    event.repository_url = req.body.repository_url;
  }
  else {
    console.log("Ignoring incomplete tracking request.");
    return res.status(410).json(returnGoneJSON());
  }

  if (req.body.runtime) {
    event.runtime = req.body.runtime;
  }  

  var clientDb = cloudantRepo.use(config.repository_db_name);
  clientDb.insert(event, function (err) {
    if (err) {
      console.error("Error logging client information: " + err);
    }
    return res.status(410).json(returnGoneJSON());  
  });
}

app.post("/", urlEncodedParser, trackClient);

app.post("/api/v1/track", jsonParser, trackClient);

app.get("/api/v1/whoami", function (req, res) {
  res.status(410).end();
});

app.get("/api/v1/stats", function (req, res) {
  res.status(410).end();
});

app.get("/error", function (req, res) {
  res.status(410).end();
});

//prevent this page getting indexed
app.get("/robots.txt", function (req, res) {
  res.send("User-agent: *\nDisallow: /");
});

// Set the view engine
app.set("view engine", "html");
app.engine("html", hbs.__express);

// Serve static assets
app.use(express.static(path.join(__dirname, "public")));

// Create the HTTP server
http.createServer(app).listen(appEnv.port, appEnv.bind, function(){
  console.log("server starting on " + appEnv.url);
});
//-------------------------------------------------------------------------------
// Copyright IBM Corp. 2015, 2017
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
