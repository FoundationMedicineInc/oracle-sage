var _ = require('lodash');
var Promise = require('bluebird');
var path = require('path');
var sage = require('../build/sage');

module.exports = {
  initdb: function(options) {
    options = options || {}

    var oracle = require('./setup/oracle')
    return new Promise(function(resolve, reject) {
      oracle.connect().then(function(){ 
        return oracle.runSQL({ path: path.resolve(__dirname, './setup/db/schema.sql'), verbose: options.verbose });
      }).then(function() {
        if(options.verbose) {
          console.log('************');
          console.log('Success.')
          console.log('************')
        }
      }).then(function() {
        resolve();
      })
    })
  },
  connect: function() {
    return new Promise(function(resolve, reject) {
      sage.connect('127.0.0.1:1521/orcl', {
        user: 'SAGE_TEST',
        password: 'oracle'
      }).then(function() {
        console.log("TestHelper connected via sage");
        resolve();
      }).catch(function(err) {
        console.log(err);
      })
    })
  }  

};