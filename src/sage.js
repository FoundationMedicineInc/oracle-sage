import moment from 'moment';
import Promise from 'bluebird';
import oracledb from 'oracledb';

import SimpleOracleDB from 'simple-oracledb';
SimpleOracleDB.extend(oracledb);

import _ from 'lodash';

import sageModel from '../build/sage_model';
import sageSchema from '../build/sage_schema'

let sage = {};

sage.connection = null;
sage.connect = function(uri, options = {}) {
  if(sage.connection) {
    return new Promise(function(resolve, reject) { resolve(); })
  }

  // Make a new connection
  let auth = { 
    user: "system",
    password: "oracle",
    connectString: "127.0.0.1:1521/orcl"
  }
  auth = _.defaults(options, auth);
  return new Promise(function(resolve, reject) {
    oracledb.getConnection(auth, function(err, connection) {
      if(err) {
        console.log(err);
        reject(err); 
      }
      sage.connection = connection;
      resolve();
    })
  });
};

sage.Schema = sageSchema;
sage.model = sageModel;

module.exports = sage;