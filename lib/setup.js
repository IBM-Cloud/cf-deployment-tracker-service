// Licensed under the Apache 2.0 License. See footer for details.

const cloudant = require("cloudant");
const dotenv = require("dotenv");
const _ = require("underscore");

const config = require("./config.js")();

dotenv.load();

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
  console.error("Nothing to do. No Cloudant instance is associated with this application.");
  process.exit(1);
}

const database_name = config.repository_db_name;

// helper; create/update design doc
function createDesignDoc(database_name, ddoc, callback) {
  var database = cloudantRepo.db.use(database_name);
  database.get(ddoc._id, 
               function(err, body) {
                if(body) {
                  ddoc._rev = body._rev;
                }
                database.insert(ddoc,
                                  function(err) {
                                    return callback(err);
                                  });
              });
}


const analyze_ddoc = {
  "_id": "_design/analyze",
  views: {
    requests_by_runtime: {
      reduce: "_count",
      map: "function (doc) {\n  emit(doc.runtime, 1);\n}"
    },
    requests_by_repository_url: {
      reduce: "_count",
      map: "function (doc) {\n  emit(doc.repository_url, 1);\n}"
    }
  },
  language: "javascript"
};

cloudantRepo.db.list(function(err, databases) {
  if(err) {
    console.error("Error. Database list could not be retrieved:" + err);
  }
  else {
    if(! _.find(databases, 
              function(database) {
                return (database === database_name);
              })) {
      console.log("Database " + database_name + " was not found. Creating it...");
      cloudantRepo.db.create(database_name, 
                             function(err) {
                                if(err) {
                                  console.error("Error. Could not create database " + database_name + ": " + err);
                                }
                                else {
                                  console.log("Database " + database_name + " was created.");
                                  createDesignDoc(database_name, 
                                                  analyze_ddoc,
                                                  function(err) {
                                                    if(err) {
                                                      console.error("Error. The analysis design document " +
                                                                    "could not be created: " + 
                                                                    err);
                                                    }
                                                    else {
                                                      console.log("Design document " + analyze_ddoc._id + 
                                                                  " was created or updated.");
                                                    }
                                                  });
                                }});
    }
    else {
      createDesignDoc(database_name, 
                      analyze_ddoc,
                      function(err) {
                        if(err) {
                          console.error("Error. The analysis design document " +
                                        "could not be created: " + 
                                        err);
                        }
                        else {
                          console.log("Design document " + analyze_ddoc._id + " was created or updated.");
                        }
                      });
    }  
  }
  

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
