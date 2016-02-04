import Promise from 'bluebird';
import oracledb from 'oracledb';

// https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-3214-stmtcachesize
// Statement caching can be disabled by setting the size to 0.
oracledb.stmtCacheSize = 0;

import SimpleOracleDB from 'simple-oracledb';
SimpleOracleDB.extend(oracledb);

import _ from 'lodash';

import sageModel from '../build/sage_model';
import sageSchema from '../build/sage_schema'

class Sage {
  constructor(options = {}) {
    this.Schema = sageSchema;
    this._connection = null;
    this._connectOptions = null;
    this.models = {}; // all the models that have currently been instantiated

    this.debug = options.debug;
  }

  log(o) {
    if(this.debug) {
      console.trace(o);
    }
  }

  get connection() {
    return this._connection;
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

  disconnect() {
    let self = this;
    if(self._connection) {
      return new Promise(function(resolve, reject) {
        self._connection.release(function(err) {
          if(err) {
            console.error(err.message);
            reject(err);
          } else {
            self._connection = null;
            resolve(true);
          }
        })
      })
    } else {
      // No active connection
      return new Promise(function(resolve, reject) {
        resolve(true);
      })      
    }
  }

  connect(uri, connectOptions = {}) {
    let self = this;
    if(self._connection) {
      return new Promise(function(resolve, reject) { resolve(); })
    }
    // You passed in some optoins. We save them so that if you call connect() without connectOptions
    // it will use them again
    if(_.size(connectOptions) > 1) {
      connectOptions = self._connectOptions
    }


    // Make a new connection
    let auth = { 
      user: "system",
      password: "oracle",
      connectString: uri || "127.0.0.1:1521/orcl"
    }
    auth = _.defaults(connectOptions, auth);
    return new Promise(function(resolve, reject) {
      oracledb.getConnection(auth, function(err, connection) {
        if(err) {
          console.log(err);
          reject(err); 
        }
        self._connection = connection;
        resolve();
      })
    });
  }
}

let sage = new Sage();

module.exports = sage;