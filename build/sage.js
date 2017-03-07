'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _oracledb = require('oracledb');

var _oracledb2 = _interopRequireDefault(_oracledb);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _simpleOracledb = require('simple-oracledb');

var _simpleOracledb2 = _interopRequireDefault(_simpleOracledb);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sage_model = require('../build/sage_model');

var _sage_model2 = _interopRequireDefault(_sage_model);

var _sage_schema = require('../build/sage_schema');

var _sage_schema2 = _interopRequireDefault(_sage_schema);

var _sage_util = require('../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-3214-stmtcachesize
// Statement caching can be disabled by setting the size to 0.
_oracledb2.default.stmtCacheSize = 0;

_simpleOracledb2.default.extend(_oracledb2.default);

var knex = require('knex')({ client: 'oracle' });

var Sage = (function () {
  function Sage() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Sage);

    this.Schema = _sage_schema2.default;
    this._pool = null;
    this._connectOptions = null;
    this._connectURI = null;
    this.models = {}; // all the models that have currently been instantiated

    this.debug = options.debug;

    this.knex = knex;
    this.util = _sage_util2.default;

    this.oracledb = _oracledb2.default;

    this.logger = _logger2.default;
  }

  _createClass(Sage, [{
    key: 'log',
    value: function log(o) {
      _logger2.default.warn('This is deprecated.');
      _logger2.default.debug(o);
    }
  }, {
    key: 'getConnection',
    value: function getConnection() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      var self = this;
      return new _bluebird2.default(function (resolve, reject) {
        if (options.transaction) {
          var connection = options.transaction.connection;
          connection.isSageTransaction = true;
          return resolve(connection);
        }

        self._pool.getConnection(function (err, connection) {
          if (err) {
            _logger2.default.error('Out of connections!', err);
            return reject(err);
          }
          return resolve(connection);
        });
      });
    }

    // Promise wrap oracle connection.commit
    // Commits operations in the connection, then releases it

  }, {
    key: 'commit',
    value: function commit(connection) {
      return new _bluebird2.default(function (resolve, reject) {
        connection.commit(function (err, result) {
          if (err) {
            _logger2.default.error('Could not commit', err);
            // Do not return yet. Release connection first.
          }
          sage.releaseConnection(connection).then(function () {
            if (err) {
              return reject(err);
            }
            return resolve();
          }).catch(reject);
        });
      });
    }

    // Used by statics and methods to figure out what to do with a connection
    // after the operation is performed. If this connection is part of a transaction
    // it will not close the connection.

  }, {
    key: 'afterExecuteCommitable',
    value: function afterExecuteCommitable(connection) {
      if (connection.isSageTransaction) {
        return _bluebird2.default.resolve();
      } else {
        return sage.commit(connection);
      }
    }

    // Used by statics and methods to figure out what to do with a connection
    // after the operation is performed

  }, {
    key: 'afterExecute',
    value: function afterExecute(connection) {
      if (connection.isSageTransaction) {
        return _bluebird2.default.resolve();
      } else {
        return sage.releaseConnection(connection);
      }
    }
    /**
     Create a sage transaction to perform several operations before commit.
      You can create transactions either invoking as a Promise, or by passing down
     a function.
      It is suggested to always pass down a function, as in a function you are forced
     to apply a `commit()` or `rollback()` in order to resolve the promise.
      The Promise style is available in the event you need a slightly different syntax.
      Function Style:
      sage.transaction(function(t) {
      User.create({ transaction: t }).then(function() {
        t.commit();
      });
     }).then(function() {
      // transaction done!
     });
      Promise Style:
      sage.transaction().then(function(t) {
      User.create({ transaction: t }).then(function() {
        t.commit();
      });
     });
       */

  }, {
    key: 'transaction',
    value: function transaction(fn) {
      var self = this;
      if (fn) {
        return new _bluebird2.default(function (resolve, reject) {
          self.getConnection().then(function (connection) {
            var transaction = {
              connection: connection,
              commit: function commit() {
                sage.commit(this.connection).then(resolve).catch(reject);
              },
              rollback: function rollback(transaction) {
                sage.releaseConnection(this.connection).then(resolve).catch(reject);
              }
            };
            fn(transaction);
          });
        });
      } else {
        return self.getConnection().then(function (connection) {
          var transaction = {
            connection: connection,
            commit: function commit() {
              return sage.commit(this.connection);
            },
            rollback: function rollback(transaction) {
              return sage.releaseConnection(this.connection);
            }
          };
          return transaction;
        });
      }
    }
  }, {
    key: 'releaseConnection',
    value: function releaseConnection(connection) {
      return new _bluebird2.default(function (resolve, reject) {
        connection.release(function (err) {
          if (err) {
            _logger2.default.error('Problem releasing connection', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }, {
    key: 'model',
    value: function model(name, schema) {
      if (!schema) {
        var _model = this.models[name];
        if (_model) {
          return _model.model;
        } else {
          return null;
        }
      }
      return (0, _sage_model2.default)(name, schema, this);
    }

    // disconnect() {
    //   let self = this;
    //   if(self._pool) {
    //     return new Promise(function(resolve, reject) {
    //       self._pool.release(function(err) {
    //         if(err) {
    //           console.error(err.message);
    //           reject(err);
    //         } else {
    //           self._pool = null;
    //           resolve(true);
    //         }
    //       })
    //     })
    //   } else {
    //     // No active connection
    //     return new Promise(function(resolve, reject) {
    //       resolve(true);
    //     })
    //   }
    // }

  }, {
    key: 'execute',
    value: function execute(sql) {
      var bindParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var self = this;
      _logger2.default.debug(sql);
      options = _lodash2.default.extend({
        maxRows: 100,
        outFormat: self.oracledb.OBJECT
      }, options);

      var connection = undefined;
      var results = undefined;
      return self.getConnection().then(function (c) {
        return connection = c;
      }).then(function () {
        return connection.execute(sql, bindParams, options);
      }).then(function (r) {
        // Lowercase all the object keys
        // This was just done to make the data more 'JS' friendly since
        // the database column names are all uppercase.
        results = _lodash2.default.map(r.rows, function (row) {
          // Return the row with lowercased keys
          return _lodash2.default.transform(row, function (result, val, key) {
            result[key.toLowerCase()] = val;
          });
        });

        return self.releaseConnection(connection);
      }).then(function () {
        return results;
      }) // Return the results
      .catch(function (err) {
        _logger2.default.warn(err);
        return self.releaseConnection(connection).then(function () {
          throw err;
        }).catch(function (err) {
          throw err;
        });
      });
    }
  }, {
    key: 'connect',
    value: function connect(uri) {
      var connectOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var self = this;
      if (self._pool) {
        return _bluebird2.default.resolve();
      }
      // You passed in some optoins. We save them so that if you call connect() without connectOptions
      // it will use them again
      if (uri) {
        self._connectURI = uri;
      }
      if (_lodash2.default.size(connectOptions) > 0) {
        self._connectOptions = connectOptions;
      }
      // Load saved values if they exist
      if (self._connectOptions) {
        connectOptions = self._connectOptions;
      }
      if (self._connectURI) {
        uri = self._connectURI;
      }

      // Make a new connection
      var auth = {
        user: "system",
        password: "oracle",
        connectString: uri || "127.0.0.1:1521/orcl",
        poolMin: connectOptions.poolMin,
        poolMax: connectOptions.poolMax
      };
      auth = _lodash2.default.defaults(connectOptions, auth);
      return new _bluebird2.default(function (resolve, reject) {
        _oracledb2.default.createPool(auth, function (err, pool) {
          if (err) {
            _logger2.default.error(err);
            return reject(err);
          }
          self._pool = pool;
          return resolve();
        });
      });
    }
  }, {
    key: 'connection',
    get: function get() {
      _logger2.default.warn("Sage connection is deprecated since pools");
      throw 'errr';
      return false;
      var self = this;
    }
  }]);

  return Sage;
})();

var sage = new Sage();

module.exports = sage;