// Licensed under the Apache 2.0 License. See footer for details.

const express = require("express"),
  http = require("http"),
  dotenv = require("dotenv"),
  bodyParser = require("body-parser"),
  cfenv = require("cfenv"),
  cookieParser = require("cookie-parser"),
  hbs = require("hbs");

dotenv.load();

var appEnv = cfenv.getAppEnv();

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
  res.status(404).end();
});

// Get JSON of metrics overview
app.get("/repos", function(req, res) {
  res.status(404).json({});
});

// Get metrics for a specific repo
app.get("/stats/:hash", function(req, res) {
  res.redirect("/");
});

// Public API to get metrics for a specific repo
app.get("/stats/:hash/metrics.json", function(req, res) {
  res.status(404).json({});
});

// Get badge of metrics for a specific repo
app.get("/stats/:hash/badge.svg", function(req, res) {
  res.status(404).end();
});

// Get a "Deploy to Bluemix" button for a specific repo
app.get("/stats/:hash/button.svg", function(req, res) {
  res.status(404).end();
});

app.post("/", urlEncodedParser, function (req, res) {
  res.status(404).end();
});

app.post("/api/v1/track", jsonParser, function (req, res) {
  res.status(404).end();
});

app.get("/api/v1/whoami", function (req, res) {
  res.status(404).end();
});

app.get("/api/v1/stats", function (req, res) {
  res.status(404).end();
});

app.get("/error", function (req, res) {
  res.status(404).end();
});

//prevent this page getting indexed
app.get("/robots.txt", function (req, res) {
  res.send("User-agent: *\nDisallow: /");
});

// Set the view engine
app.set("view engine", "html");
app.engine("html", hbs.__express);

// Serve static assets
app.use(express.static("public"));

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
