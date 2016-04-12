import Promise from 'bluebird';
import oracledb from 'oracledb';

// https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-3214-stmtcachesize
// Statement caching can be disabled by setting the size to 0.
oracledb.stmtCacheSize = 0;

import SimpleOracleDB from 'simple-oracledb';
SimpleOracleDB.extend(oracledb);

import _ from 'lodash';

import sageModel from '../build/sage_model';
import sageSchema from '../build/sage_schema';

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

    this.oracledb = oracledb;
  }

  log(o) {
    if(this.debug) {
      console.log(o);
    }
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
          sage.log(err); 
          sage.log("Out of connections!");
          return reject();
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
        if(err) { sage.log(err); }
        sage.releaseConnection(connection).then(function() {
          resolve();
        });
      });      
    });
  }

  // Used by statics and methods to figure out what to do with a connection
  // after the operation is performed. If this connection is part of a transaction
  // it will not close the connection.
  afterExecuteCommitable(connection) {
    return new Promise(function(resolve, reject) {
      if(connection.isSageTransaction) {
        return resolve();
      } else {
        sage.commit(connection).then(function() { resolve(); })
      }
    });
  }

  // Used by statics and methods to figure out what to do with a connection
  // after the operation is performed
  afterExecute(connection) {
    return new Promise(function(resolve, reject) {
      if(connection.isSageTransaction) {
        return resolve();
      } else {
        sage.releaseConnection(connection).then(function() { resolve(); })
      }
    });
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
              sage.commit(this.connection).then(function() {
                resolve();
              });
            },
            rollback: function(transaction) {
              sage.releaseConnection(this.connection).then(function() {
                resolve();
              });
            }
          }        
          fn(transaction);
        });      
      });
    } else {
      return new Promise(function(resolve, reject) {
        self.getConnection().then(function(connection) {
          var transaction = {
            connection: connection,
            commit: function() {
              return sage.commit(this.connection);
            },
            rollback: function(transaction) {
              return sage.releaseConnection(this.connection);
            }
          }
          resolve(transaction);
        });
      });
    }
  }

  releaseConnection(connection) {
    return new Promise(function(resolve, reject) {
      connection.release(function(err) {
        if(err) {
          sage.log(err);
        } else {
          resolve();
        }
      });
    });    
  }

  get connection() {
    console.trace("sage connection is deprecated since pools");
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

  connect(uri, connectOptions = {}) {
    let self = this;
    if(self._pool) {
      return new Promise(function(resolve, reject) { resolve(); })
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
      connectString: uri || "127.0.0.1:1521/orcl",
      poolMin: connectOptions.poolMin,
      poolMax: connectOptions.poolMax
    }
    auth = _.defaults(connectOptions, auth);
    return new Promise(function(resolve, reject) {
      oracledb.createPool(auth, function(err, pool) {
        if(err) {
          console.log(err);
          reject(err); 
        }
        self._pool = pool;
        resolve();
      })
    });
  }
}

let sage = new Sage();

module.exports = sage;