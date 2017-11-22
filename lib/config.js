
function loadConfig() {

  var config = null;
  try {
    config = require("../config.json");
    if(! config.hasOwnProperty("repository_db_name")) {
      config.repository_db_name = "clients";  
    }
  }
  catch(exception) {
    console.log("Config file was not found. Using defaults.");
    config = { repository_db_name: "clients" };
  }

  return config;
}

module.exports = exports = loadConfig;
