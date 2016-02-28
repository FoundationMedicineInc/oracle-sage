import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(modelClass, name, schema, sage) {
  modelClass.count = function(values = {}, options = {}) {
    let self = this
    let result = sageUtil.getSelectANDSQL(values)

    let sql = `SELECT COUNT(*) FROM ${name}`

    if(result.sql != "") {
       sql = sql + ` WHERE ${result.sql}`
    }

    var count;

    return new Promise(function(resolve, reject) {
      var connection;
      async.series([
        // Establish Connection
        function(next) {
          sage.getConnection({transaction: options.transaction}).then(function(c) {
            connection = c;
            next();
          });
        },
        // Perform operation
        function(next) {
          sage.log(sql, result.values);
          connection.execute(sql, result.values, function(err, result) {
            if(err) {
              sage.log(err);
            } else {
              try {
                count = result.rows[0][0]
              } catch(e) {
                sage.log(e)
              }
              next();
            }
          });            
        },
        // Close connection
        function(next) {
          sage.afterExecute(connection, next);
        }
      ], function() {
        resolve(count);
      });
    });
  }  
}