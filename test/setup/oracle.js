/**
 * Used to help set up testing environments.
 */
var oracledb = require('oracledb');
oracledb.stmtCacheSize = 0; // setting this to 0 seems to make import go faster

var Promise = require("bluebird");
var _       = require('lodash');
var fs      = require("fs");

var OracleConnector;
var OracleConnector = (function() {

  function OracleConnector(config) {
    config = config || {};
    _.defaults(this, {
      _credentials: { 
        user: "SAGE_TEST",
        password: "oracle",
        connectString: "127.0.0.1:1521/orcl",
        userSchema: "SAGE_TEST"
      },
      connection: null
    });
  }

  // Returns a Promise that it will connect to the database
  OracleConnector.prototype.connect = function(config) {
    var self = this;
    if(self.connection) {
      // Connection already exists. Return it.             
      return new Promise(function(fulfill, reject) {
        fulfill(self.connection);
      })
    } else {
      // No active connection. Make one.
      return new Promise(function(fulfill, reject) {
        oracledb.getConnection(self._credentials, function(err, connection) {
          if(err) {
            console.log(err);
          }
          self.connection = connection;
          fulfill(connection);
        })
      });
    }
  }

  OracleConnector.prototype.disconnect = function() {
    var self = this;
    if(self.connection) {
      return new Promise(function(fulfill, reject) {
        self.connection.release(function(err) {
          if(err) {
            console.error(err.message);
            reject(err);
          } else {
            self.connection = null;
            fulfill(true);
          }
        })
      })
    } else {
      return new Promise(function(fulfill, reject) {
        fulfill(true);
      })
    }
  }

  // Pass in an array of SQL statements, and it will execute them all
  // pass verbose if you want to see the output
  OracleConnector.prototype.performStatements = function(statements, config) {
    config = config || {};
    var self = this;
    return new Promise(function(fulfill, reject) {
      var statement = statements.shift();
      console.log(statement)
      self.connection.execute(statement, [], { autoCommit: true }, function(err, result) {
        if(config.verbose === true) { console.log(statement) }
        if(err) {
          console.log(err);
        }

        if(statements.length) {
          self.performStatements(statements, config).then(function() {
            fulfill();
          })
        } else {
          fulfill();
        }
      });
    })
  }

  /*
  Runs an entire SQL file against the given connection
  Pass in the path to sql
  */
  OracleConnector.prototype.runSQL = function(config) {
    config = config || {};

    if(!config.path) { throw("No SQL provided") }
    var self = this;

    return new Promise(function(fulfill, reject) {
      var schema = fs.readFile(config.path, 'utf8', function(err, data) {
        if(err) {
          console.log(err)
        }
        
        // Now split it
        var statements = data.split(';');

        // Remove empty item on the end
        if(_.last(statements).trim() === "") {
          statements.pop();
        }

        // Fix triggers since they will be split up when you split on ;
        var temp = [];
        var tempSQL = "";
        _.each(statements, function(statement) {
          if(statement.trim().indexOf('CREATE OR REPLACE TRIGGER') === 0) { // this is a trigger
            temp.push(statement + "; END;");
          } else if(statement.trim().indexOf("END") === 0) {
            // do nothing
          } else {
            temp.push(statement);
          }
        })
        statements = temp;


        // If dropOnly is set, let's just perform the drops
        if(config.dropsOnly) {
          var temp = [];
          _.each(statements, function(statement) {
            if(statement.indexOf("DROP") === 0) {
              temp.push(statement);
            }
          });
          statements = temp;
        }

        // Execute each statement, recurisvely
        self.performStatements(statements, { verbose: config.verbose }).then(function() {
          fulfill();
        })
      })
    });
  }

  return OracleConnector;

})();

// Start up Oracle
o = new OracleConnector();

module.exports = o;