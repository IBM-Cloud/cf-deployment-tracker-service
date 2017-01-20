// Licensed under the Apache 2.0 License. See footer for details.

var express = require("express"),
  http = require("http"),
  path = require("path"),
  cloudant = require("cloudant"),
  dotenv = require("dotenv"),
  validator = require("validator"),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  cfenv = require("cfenv"),
  cookieParser = require("cookie-parser"),
  IbmIdStrategy = require("passport-idaas-openidconnect").IDaaSOIDCStrategy,
  expressSession = require("express-session"),
  memoryStore = new expressSession.MemoryStore(),
  RedisStore = require("connect-redis")(expressSession),
  _ = require("underscore"),
  crypto = require("crypto"),
  csv = require("express-csv"), // jshint ignore:line
  hbs = require("hbs"),
  restler = require("restler"),
  forceSSL = require("express-force-ssl"),
  async = require("async");


dotenv.load();

var appEnv = cfenv.getAppEnv();

var forceSslIfNotLocal = function(req, res, next) {
  if (appEnv.isLocal) {
    return next();
  }
  forceSSL(req, res, next);
};

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.enable("trust proxy");

var sessionStore;

if (!appEnv.isLocal) {
  var redisService = appEnv.getService(new RegExp(".*" + "deployment-tracker-redis" +".*", "i"));

  sessionStore = new RedisStore({
    host: redisService.credentials.hostname,
    port: redisService.credentials.port,
    pass: redisService.credentials.password
  });
}
else {
  sessionStore = memoryStore;
}

//in future PR switch to redis or cloudant as a session store
app.use(expressSession({ secret: process.env.SECRET || "blah",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, path: "/", httpOnly: true }
}));

var API_KEY = process.env.API_KEY || "blah",
  GITHUB_STATS_API_KEY = process.env.GITHUB_STATS_API_KEY || "";

app.use(passport.initialize());
app.use(passport.session());

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function authenticate() {
  return function(request, response, next) {
    if (appEnv.isLocal) {
      return next();
    }
    console.log(request.session);
    if (!request.isAuthenticated() || request.session.passport.user === undefined) {
      response.redirect("/auth/sso");
      return next();
    }

    var email = request.session.passport.user.id,
      ibmer = false;

    if (email.toLowerCase().endsWith(".ibm.com")) {
      ibmer = true;
    }
    if (ibmer === false) {
      response.render("error", {message: "You must be an IBM'er to use this app"});
    }
    return next();
  };
}

function checkAPIKey() {
  return function(request, response, next) {
    if (appEnv.isLocal) {
      return next();
    }

    if (request.query.apiKey === undefined) {
      response.status(403);
      response.json({"error": "A query string parameter apiKey must be set"});
    }
    else if (request.query.apiKey !== API_KEY) {
      response.status(403);
      response.json({"error": "Invalid api key"});
    }

    return next();
  };
}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var SSO_CLIENT_ID = (process.env.SSO_CLIENT_ID || " "),
  SSO_CLIENT_SECRET = (process.env.SSO_CLIENT_SECRET || " "),
  SSO_URL = (process.env.SSO_URL || "");

var callbackURL = "https://deployment-tracker.mybluemix.net" + "/auth/sso/callback";
if (process.env.BASE_URL) {
  callbackURL = "https://" + process.env.BASE_URL + "/auth/sso/callback";
}

var Strategy = new IbmIdStrategy({
  authorizationURL : SSO_URL + "/idaas/oidc/endpoint/default/authorize",
  tokenURL : SSO_URL + "/idaas/oidc/endpoint/default/token",
  clientID : SSO_CLIENT_ID,
  scope : "email",
  response_type : "code",
  clientSecret : SSO_CLIENT_SECRET,
  callbackURL : callbackURL,
  skipUserProfile : true,
  issuer : SSO_URL},
  function(iss, sub, profile, accessToken, refreshToken, params, done) {  // jshint ignore:line
    process.nextTick(function() {
      profile.accessToken = accessToken;
      profile.refreshToken = refreshToken;
      done(null, profile);
    });
  }
);

passport.use(Strategy);

app.get("/auth/sso", [forceSslIfNotLocal], passport.authenticate("openidconnect", {}));

app.get("/auth/sso/callback", [forceSslIfNotLocal,
  passport.authenticate("openidconnect", { failureRedirect: "/error" })],
  function(req, res) {
  res.redirect("/stats");
});

app.get("/logout", forceSslIfNotLocal ,function (request, response) {
  passport._strategy("openidconnect").logout(request, response, appEnv.url);
});

(function(app) {
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    app.set("vcapServices", vcapServices);
    if (vcapServices.cloudantNoSQLDB && vcapServices.cloudantNoSQLDB.length > 0) {
      var service = vcapServices.cloudantNoSQLDB[0];
      if (service.credentials) {
        app.set("deployment-tracker-db", cloudant({
          username: service.credentials.username,
          password: service.credentials.password,
          account: service.credentials.username
        }));
      }
    }
  }
})(app);

var urlEncodedParser = bodyParser.urlencoded({ extended: false }),
  jsonParser = bodyParser.json();

function getStats(repo, callback) {
  var baseURL = "https://github-stats.mybluemix.net/api/v1/stats";

  if (GITHUB_STATS_API_KEY === "") {
    callback(null, null);
    return;
  }

  var url = baseURL + "?apiKey=" + GITHUB_STATS_API_KEY + "&repo=" + repo;

  if (!appEnv.isLocal) {
    sessionStore.client.get("repo-" + repo, function (err, result) {
      if (err || !result) {
        restler.get(url).on("complete", function(data) {
          sessionStore.client.setex("repo-" + repo, 21600, JSON.stringify(data));
          callback(null, data);
        });
      }
      else {
        callback(null, JSON.parse(result));
      }
    });
  }
  else {
    restler.get(url).on("complete", function(data) {
      callback(null, data);
    });
  }
}

app.get("/", forceSslIfNotLocal, function(req, res) {
  res.render("index");
});

// Get metrics overview
app.get("/stats", [forceSslIfNotLocal, authenticate()], function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get("deployment-tracker-db");
  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events");
  eventsDb.view("deployments", "by_repo", {group_level: 3}, function(err, body) {
    var apps = {};
    body.rows.map(function(row) {
      var url = row.key[0];
      var year = row.key[1];
      var month = row.key[2];
      if (!(url in apps)) {
        apps[url] = {
          url: url,
          count: 0,
          deploys: []
        };
        if (url) {
          apps[url].url_hash = crypto.createHash("md5").update(url).digest("hex");
        }
      }
      if (validator.isURL(url, {protocols: ["http","https"], require_protocol: true})) {
        apps[url].is_url = true;
      }
      if (!(year in apps[url].deploys)) {
        apps[url].deploys[year] = {};
      }
      if (!(month in apps[url].deploys[year])) {
        apps[url].deploys[year][month] = row.value;
        apps[url].count += row.value;
      }
    });

    //get count for each app
    async.forEachOf(apps, function (value, key, callback) {
      getStats(key, function(error, data) {
        if (error) {
          callback(error);
        }
        else {
          value.githubStats = data;
          apps[key] = value;
          callback(null);
        }
      });
    }, function() {
      var appsSortedByCount = [];
      for (var url in apps) {
        appsSortedByCount.push(apps[url]);
      }
      appsSortedByCount.sort(function(a, b) {
        if (a.count < b.count) {
          return -1;
        }
        if (a.count > b.count) {
          return 1;
        }
        return 0;
      }).reverse();
      res.render("stats", {apps: appsSortedByCount});
    });
  });
});

// Get CSV of metrics overview
app.get("/stats.csv", [forceSslIfNotLocal, authenticate()], function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get("deployment-tracker-db");
  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events");
  eventsDb.view("deployments", "by_repo", {group_level: 3}, function(err, body) {
    var apps = [
      ["URL", "Year", "Month", "Deployments"]
    ];
    body.rows.map(function(row) {
      var url = row.key[0];
      var year = row.key[1];
      var month = row.key[2];
      var count = row.value;
      apps.push([url, year, month, count]);
    });
    res.csv(apps);
  });
});

// Get JSON of metrics overview
app.get("/repos", [forceSslIfNotLocal, checkAPIKey()], function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get("deployment-tracker-db");

  if (!deploymentTrackerDb) {
    return res.status(500);
  }

  var eventsDb = deploymentTrackerDb.use("events");
  eventsDb.view("deployments", "by_repo", {group_level: 3}, function(err, body) {
    var apps = [];

    body.rows.map(function(row) {
      var url = row.key[0];

      if (!_.contains(apps, url)) {
        apps.push(url);
      }
    });

    res.json(apps);
  });
});

// Get metrics for a specific repo
app.get("/stats/:hash", [forceSslIfNotLocal, authenticate()], function(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get("deployment-tracker-db");
  var appsSortedByCount = [];

  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events");
  var hash = req.params.hash;

  eventsDb.view("deployments", "by_repo_hash",
    {startkey: [hash], endkey: [hash, {}, {}, {}, {}, {}, {}], group_level: 4}, function(err, body) {
    var apps = {},
      protocolAndHost = req.protocol + "://" + req.get("host");
    body.rows.map(function(row) {
      var hash = row.key[0];
      var url = row.key[1];
      var year = row.key[2];
      var month = row.key[3];
      if (!(url in apps)) {
        apps[url] = {
          url: url,
          count: 0,
          deploys: []
        };
        if (hash) {
          apps[url].url_hash = hash;
          apps[url].badgeImageUrl = protocolAndHost +
            "/stats/" +
            apps[url].url_hash +
            "/badge.svg";
          apps[url].badgeMarkdown = "![Bluemix Deployments](" +
            apps[url].badgeImageUrl +
            ")";
          apps[url].buttonImageUrl = protocolAndHost +
            "/stats/" +
            apps[url].url_hash +
            "/button.svg";
          apps[url].buttonLinkUrl = "https://bluemix.net/deploy?repository=" +
            url;
          apps[url].buttonMarkdown = "[![Deploy to Bluemix](" +
            apps[url].buttonImageUrl +
            ")](" +
            apps[url].buttonLinkUrl +
            ")";
        }
      }
      if (validator.isURL(url, {protocols: ["http","https"], require_protocol: true})) {
        apps[url].is_url = true;
      }
      if (!(year in apps[url].deploys)) {
        apps[url].deploys[year] = {};
      }
      if (!(month in apps[url].deploys[year])) {
        apps[url].deploys[year][month] = row.value;
        apps[url].count += row.value;
      }
    });
    for (var url in apps) {
      appsSortedByCount.push(apps[url]);
    }
    appsSortedByCount.sort(function(a, b) {
      if (a.count < b.count) {
        return -1;
      }
      if (a.count > b.count) {
        return 1;
      }
      return 0;
    }).reverse();
    getStats(appsSortedByCount[0].url, function(error, result) {
      if (!error) {
        appsSortedByCount[0].githubStats = result;
      }
      res.render("repo", {protocolAndHost: protocolAndHost, apps: appsSortedByCount});
    });
  });
});

// Public API to get metrics for a specific repo
app.get("/stats/:hash/metrics.json", forceSslIfNotLocal, function(req, res) {
  var app = req.app,
    deploymentTrackerDb = app.get("deployment-tracker-db");

  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events"),
   hash = req.params.hash;

  //TODO: Consider caching this data with Redis
  eventsDb.view("deployments", "by_repo_hash",
    {startkey: [hash], endkey: [hash, {}, {}, {}, {}, {}, {}], group_level: 1}, function(err, body) {
    var appStats = {
      url_hash: hash,
      count: body.rows[0].value
    };
    res.json(appStats);
  });
});

// Get badge of metrics for a specific repo
app.get("/stats/:hash/badge.svg", forceSslIfNotLocal, function(req, res) {
  var app = req.app,
    deploymentTrackerDb = app.get("deployment-tracker-db");

  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events"),
   hash = req.params.hash;

  //TODO: Consider caching this data with Redis
  eventsDb.view("deployments", "by_repo_hash",
    {startkey: [hash], endkey: [hash, {}, {}, {}, {}, {}, {}], group_level: 1}, function(err, body) {
    var count = body.rows[0].value;
    //TODO: Rename this variable
    var svgData = {
      left: "Bluemix Deployments",
      right: count.toString(),
    };
    svgData.leftWidth = svgData.left.length * 6.5 + 10;
    svgData.rightWidth = svgData.right.length * 7.5 + 10;
    svgData.totalWidth = svgData.leftWidth + svgData.rightWidth;
    svgData.leftX = svgData.leftWidth / 2 + 1;
    svgData.rightX = svgData.leftWidth + svgData.rightWidth / 2 - 1;
    res.set({"Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
            "Expires": 0});
    res.render("badge.xml", svgData);
  });
});

// Get a "Deploy to Bluemix" button for a specific repo
app.get("/stats/:hash/button.svg", forceSslIfNotLocal, function(req, res) {
  var app = req.app,
    deploymentTrackerDb = app.get("deployment-tracker-db");

  if (!deploymentTrackerDb) {
    return res.status(500);
  }
  var eventsDb = deploymentTrackerDb.use("events"),
   hash = req.params.hash;

  //TODO: Consider caching this data with Redis
  eventsDb.view("deployments", "by_repo_hash",
    {startkey: [hash], endkey: [hash, {}, {}, {}, {}, {}, {}], group_level: 1}, function(err, body) {
    var count = body.rows[0].value;
    //TODO: Rename this variable
    var svgData = {
      left: "Deploy to Bluemix",
      right: count.toString(),
    };
    svgData.leftWidth = svgData.left.length * 11 + 20;
    svgData.rightWidth = svgData.right.length * 12 + 16;
    svgData.totalWidth = svgData.leftWidth + svgData.rightWidth;
    svgData.leftX = svgData.leftWidth / 2 + 1;
    svgData.rightX = svgData.leftWidth + svgData.rightWidth / 2 - 1;
    svgData.leftWidth = svgData.leftWidth + 48;
    svgData.totalWidth = svgData.totalWidth + 48;
    svgData.leftX = svgData.leftX + 48;
    svgData.rightX = svgData.rightX + 48;
    res.set({"Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
            "Expires": 0});
    res.render("button.xml", svgData);
  });
});

function track(req, res) {
  var app = req.app;
  var deploymentTrackerDb = app.get("deployment-tracker-db");
  if (!deploymentTrackerDb) {
    return res.status(500).json({ error: "No database server configured" });
  }
  if (!req.body) {
    return res.sendStatus(400);
  }

  if((req.body.test)&&(req.body.test === true)) {
    // This is a test request. 
    // Verify the payload and return appropriate status:
    //  200 {ok: true} if request meets the spec
    //  400 if request doesn't include all required properties
    //      {
    //       ok: false,
    //       missing: ["missing_property_name"]
    //      }
    var missing = _.filter(["application_id", "application_name", 
                            "repository_url", "runtime", "space_id"],
                           function(property) {
                            return (! (req.body[property]));
                          });
    if(missing.length > 0) {
      return res.status(400).json({ok: false, missing: missing});
    }
    else {
      return res.status(200).json({ok: true});
    }    
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
    event.repository_url_hash = crypto.createHash("md5").update(event.repository_url).digest("hex");
  }
  if (req.body.application_name) {
    event.application_name = req.body.application_name;
  }
  if (req.body.application_id) {
    // VCAP_APPLICATION.application_id
    event.application_id = req.body.application_id;
  }
  if (req.body.instance_index) {
    // VCAP_APPLICATION.instance_index (Index number of the application instance, e.g. 0,1,...)
    event.instance_index = req.body.instance_index;
  }  
  if (req.body.space_id) {
    event.space_id = req.body.space_id;
  }
  if (req.body.application_version) {
    event.application_version = req.body.application_version;
  }
  if (req.body.application_uris) {
    if(! Array.isArray(req.body.application_uris)) {
      event.application_uris = [req.body.application_uris];
    }
    else {
      event.application_uris = req.body.application_uris;      
    }
  }
  if (req.body.runtime) {
    event.runtime = req.body.runtime;
  }  
  if ((req.body.bound_vcap_services) && (Object.keys(req.body.bound_vcap_services).length > 0)) {
    event.bound_vcap_services = req.body.bound_vcap_services;     
  }

  var eventsDb = deploymentTrackerDb.use("events");
  eventsDb.insert(event, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({error: "Internal Server Error"});
    }
    return res.status(201).json({
      ok: true
    });
  });
}

app.post("/", urlEncodedParser, track);

app.post("/api/v1/track", jsonParser, track);

app.get("/api/v1/whoami", [forceSslIfNotLocal, authenticate()], function (request, response) {
  response.send(request.session.passport.user);
});

app.get("/api/v1/stats", [forceSslIfNotLocal, authenticate()], function (request, response) {
  var repo = request.query.repo;

  if (GITHUB_STATS_API_KEY === "") {
    response.json({"error": "GITHUB_STATS_API_KEY is not server on the server"});
    return;
  }

  getStats(repo, function (error, result) {
    if (error) {
      response.send(error);
    }
    else {
      response.json(result);
    }
  });
});

app.get("/error", function (request, response) {
  response.render("error", {message: "Failed to authenticate"});
});

//prevent this page getting indexed
app.get("/robots.txt", function (request, response) {
  response.send("User-agent: *\nDisallow: /");
});

// Set the view engine
app.set("view engine", "html");
app.engine("html", hbs.__express);
app.engine("xml", hbs.__express);

// Serve static assets
app.use(express.static(path.join(__dirname, "public")));

// Create the HTTP server
http.createServer(app).listen(appEnv.port, appEnv.bind, function(){
  console.log("server starting on " + appEnv.url);
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
