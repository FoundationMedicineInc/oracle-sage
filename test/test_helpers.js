const _ = require('lodash');
const Promise = require('bluebird');
const path = require('path');
const sage = require('../build/sage');

module.exports = {
  sage,
  initdb(options) {
    options = options || {};

    const oracle = require('./setup/oracle');
    return new Promise(((resolve, reject) => {
      oracle
        .connect()
        .then(() => oracle.runSQL({
          path: path.resolve(__dirname, './setup/db/schema.sql'),
          verbose: options.verbose,
        }))
        .then(() => {
          if (options.verbose) {
            console.log('************');
            console.log('Success.');
            console.log('************');
          }
        })
        .then(() => {
          resolve();
        });
    }));
  },
  connect() {
    return new Promise(((resolve, reject) => {
      sage
        .connect('127.0.0.1:1521/xe', {
          user: 'SAGE_TEST',
          password: 'oracle',
        })
        .then(() => {
          console.log('TestHelper connected via sage');
          resolve();
        })
        .catch((err) => {
          console.log(err);
        });
    }));
  },
};
