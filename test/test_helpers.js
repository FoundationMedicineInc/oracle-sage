// var _ = require('lodash');
// var Promise = require('bluebird');

// module.exports = {
//   initdb: function(options) {
//     options = options || {}

//     var oracle = require('../db/oracle')
//     return new Promise(function(resolve, reject) {
//       oracle.connect().then(function(){ 
//         return oracle.runSQL({ path: path.resolve(__dirname, '../setup/db/schema.sql'), verbose: options.verbose });
//       }).then(function() {
//         if(options.verbose) {
//           console.log('************');
//           console.log('Success.')
//           console.log('************')
//         }
//       }).then(function() {
//         resolve();
//       })
//     })
//   }
// };