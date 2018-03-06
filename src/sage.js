import Promise from 'bluebird';
import oracledb from 'oracledb';
import logger from './logger';

// https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-3214-stmtcachesize
// Statement caching can be disabled by setting the size to 0.
oracledb.stmtCacheSize = 0;

import _ from 'lodash';

import sageModel from '../build/sage_model';
import sageSchema from '../build/sage_schema';
import sageUtil from '../build/sage_util';

var knex = require('knex')({ client: 'oracle' })

class Sage {
  constructor(options = {}  ) {
    this.Schema = sageSchema;
    this._pool = null;
    this._connectOptions = null;
    this._connectURI = null;
    this.models = {}; // all the models that have currently been instantiated

    this.debug = options.debug;

    this.knex = knex;
    this.util = sageUtil;

    this.oracledb = oracledb;

    this.logger = logger;
  }

  log(o) {
    logger.warn('This is deprecated.');
    logger.debug(o);
  }

  getConnection(options = {}) {
    var self = this;
    return new Promise(function(resolve, reject) {
      if(options.transaction) {
        var connection = options.transaction.connection;
        connection.isSageTransaction = true;
        return resolve(connection);
      }

      self._pool.getConnection(function(err, connection) {
        if(err) {
          logger.error('Out of connections!', err);
          return reject(err);
        }
        return resolve(connection);
      });
    });
  }

  // Promise wrap oracle connection.commit
  // Commits operations in the connection, then releases it
  commit(connection) {
    return new Promise(function(resolve, reject) {
      connection.commit(function(err, result) {
        if(err) {
          logger.error('Could not commit', err);
          // Do not return yet. Release connection first.
        }
        sage.releaseConnection(connection).then(function() {
          if(err) {
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
  afterExecuteCommitable(connection) {
    if(connection.isSageTransaction) {
      return Promise.resolve();
    } else {
      return sage.commit(connection);
    }
  }

  // Used by statics and methods to figure out what to do with a connection
  // after the operation is performed
  afterExecute(connection) {
    if(connection.isSageTransaction) {
      return Promise.resolve();
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
  transaction(fn) {
    var self = this;
    if(fn) {
      return new Promise(function(resolve, reject) {
        self.getConnection().then(function(connection) {
          var transaction = {
            connection: connection,
            commit: function() {
              sage.commit(this.connection).then(resolve).catch(reject);
            },
            rollback: function(transaction) {
              sage.releaseConnection(this.connection).then(resolve).catch(reject);
            }
          }
          fn(transaction);
        });
      });
    } else {
      return self.getConnection().then(function(connection) {
        var transaction = {
          connection: connection,
          commit: function() {
            return sage.commit(this.connection);
          },
          rollback: function(transaction) {
            return sage.releaseConnection(this.connection);
          }
        }
        return transaction;
      });
    }
  }

  releaseConnection(connection) {
    return new Promise(function(resolve, reject) {
      connection.release(function(err) {
        if(err) {
          logger.error('Problem releasing connection', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  get connection() {
    logger.warn("Sage connection is deprecated since pools");
    throw ('errr')
    return false
    var self = this;
  }

  model(name, schema) {
    if(!schema) {
      let model = this.models[name];
      if(model) {
        return(model.model)
      } else {
        return null
      }
    }
    return sageModel(name, schema, this)
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
  execute(sql, bindParams = [], options = {}) {
    const self = this;
    logger.debug(sql);
    options = _.extend({
      maxRows: 100,
      outFormat: self.oracledb.OBJECT
    }, options);

    let connection;
    let results;
    return self.getConnection({ transaction: options.transaction })
      .then((c) => connection = c)
      .then(() => connection.execute(sql, bindParams, options))
      .then((r) => {
        // Lowercase all the object keys
        // This was just done to make the data more 'JS' friendly since
        // the database column names are all uppercase.
        results = _.map(r.rows, (row) => {
          // Return the row with lowercased keys
          return _.transform(row, (result, val, key) => {
            result[key.toLowerCase()] = val;
          })
        });

        if (!options.transaction) {
          return sage.releaseConnection(connection);
        }

        return;
      })
      .then(() => results) // Return the results
      .catch((err) => {
        logger.warn(err);
        if (options.transaction) {
          throw(err);
        }
        return self.releaseConnection(connection)
          .then( () => { throw(err) })
          .catch( (err) => { throw(err) })
      });
  }

  connect(uri, connectOptions = {}) {
    let self = this;
    if(self._pool) {
      return Promise.resolve();
    }
    // You passed in some optoins. We save them so that if you call connect() without connectOptions
    // it will use them again
    if(uri) {
      self._connectURI = uri
    }
    if(_.size(connectOptions) > 0) {
      self._connectOptions = connectOptions
    }
    // Load saved values if they exist
    if(self._connectOptions) {
      connectOptions = self._connectOptions
    }
    if(self._connectURI) {
      uri = self._connectURI
    }

    // Make a new connection
    let auth = {
      user: "system",
      password: "oracle",
      connectString: uri || "127.0.0.1:1521/xe",
      poolMin: connectOptions.poolMin,
      poolMax: connectOptions.poolMax
    }
    auth = _.defaults(connectOptions, auth);
    return new Promise(function(resolve, reject) {
      oracledb.createPool(auth, function(err, pool) {
        if(err) {
          logger.error(err);
          return reject(err);
        }
        self._pool = pool;
        return resolve();
      })
    });
  }
}

let sage = new Sage();

module.exports = sage;
