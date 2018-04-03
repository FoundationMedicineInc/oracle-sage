/**
 * Used to help set up testing environments.
 */
const oracledb = require('oracledb');

oracledb.stmtCacheSize = 0; // setting this to 0 seems to make import go faster

const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs');

var OracleConnector;
var OracleConnector = (function() {
  function OracleConnector(config) {
    config = config || {};
    _.defaults(this, {
      _credentials: {
        user: 'SAGE_TEST',
        password: 'oracle',
        connectString: 'localhost:1521/xe',
        userSchema: 'SAGE_TEST',
      },
      connection: null,
    });
  }

  // Returns a Promise that it will connect to the database
  OracleConnector.prototype.connect = function(config) {
    const self = this;
    if (self.connection) {
      // Connection already exists. Return it.
      return new Promise((fulfill, reject) => {
        fulfill(self.connection);
      });
    }
    // No active connection. Make one.
    return new Promise((fulfill, reject) => {
      oracledb.getConnection(self._credentials, (err, connection) => {
        if (err) {
          console.log(err);
        }
        self.connection = connection;
        fulfill(connection);
      });
    });
  };

  OracleConnector.prototype.disconnect = function() {
    const self = this;
    if (self.connection) {
      return new Promise((fulfill, reject) => {
        self.connection.release(err => {
          if (err) {
            console.error(err.message);
            reject(err);
          } else {
            self.connection = null;
            fulfill(true);
          }
        });
      });
    }
    return new Promise((fulfill, reject) => {
      fulfill(true);
    });
  };

  // Pass in an array of SQL statements, and it will execute them all
  // pass verbose if you want to see the output
  OracleConnector.prototype.performStatements = function(statements, config) {
    config = config || {};
    const self = this;
    return new Promise((fulfill, reject) => {
      const statement = statements.shift();
      console.log(statement);
      self.connection.execute(
        statement,
        [],
        { autoCommit: true },
        (err, result) => {
          if (config.verbose === true) {
            console.log(statement);
          }
          if (err) {
            console.log(err);
          }

          if (statements.length) {
            self.performStatements(statements, config).then(() => {
              fulfill();
            });
          } else {
            fulfill();
          }
        }
      );
    });
  };

  /*
  Runs an entire SQL file against the given connection
  Pass in the path to sql
  */
  OracleConnector.prototype.runSQL = function(config) {
    config = config || {};

    if (!config.path) {
      throw 'No SQL provided';
    }
    const self = this;

    return new Promise((fulfill, reject) => {
      const schema = fs.readFile(config.path, 'utf8', (err, data) => {
        if (err) {
          console.log(err);
        }

        // Now split it
        let statements = data.split(';');

        // Remove empty item on the end
        if (_.last(statements).trim() === '') {
          statements.pop();
        }

        // Fix triggers since they will be split up when you split on ;
        var temp = [];
        const tempSQL = '';
        _.each(statements, statement => {
          if (statement.trim().indexOf('CREATE OR REPLACE TRIGGER') === 0) {
            // this is a trigger
            temp.push(`${statement}; END;`);
          } else if (statement.trim().indexOf('END') === 0) {
            // do nothing
          } else {
            temp.push(statement);
          }
        });
        statements = temp;

        // If dropOnly is set, let's just perform the drops
        if (config.dropsOnly) {
          var temp = [];
          _.each(statements, statement => {
            if (statement.indexOf('DROP') === 0) {
              temp.push(statement);
            }
          });
          statements = temp;
        }

        // Execute each statement, recurisvely
        self
          .performStatements(statements, { verbose: config.verbose })
          .then(() => {
            fulfill();
          });
      });
    });
  };

  return OracleConnector;
})();

// Start up Oracle
o = new OracleConnector();

module.exports = o;
