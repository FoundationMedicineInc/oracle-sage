import Promise from 'bluebird';
import oracledb from 'oracledb';

import SimpleOracleDB from 'simple-oracledb';
SimpleOracleDB.extend(oracledb);

import _ from 'lodash';

import sageModel from '../build/sage_model';
import sageSchema from '../build/sage_schema'

class Sage {
  constructor() {
    this.Schema = sageSchema;
    this._connection = null;
  }
  get connection() {
    return this._connection;
  }

  model(name, schema) {
    return sageModel(name, schema, this)
  }

  connect(uri, options = {}) {
    let self = this;
    if(self._connection) {
      return new Promise(function(resolve, reject) { resolve(); })
    }

    // Make a new connection
    let auth = { 
      user: "system",
      password: "oracle",
      connectString: uri || "127.0.0.1:1521/orcl"
    }
    auth = _.defaults(options, auth);
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