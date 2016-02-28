import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(modelClass, name, schema, sage) {
  modelClass.findOne = function(values = {}, options = {}) {
    let self = this
    let pk = schema.primaryKey
    let result = sageUtil.getSelectANDSQL(values)

    let sql = `select * from (
        select a.*, ROWNUM rnum from (
          SELECT ${self._selectAllStringStatic()} FROM ${name} WHERE ${result.sql} ORDER BY ${pk} DESC
        ) a where rownum <= 1
      ) where rnum >= 0`

    var finalResult;
    return new Promise(function(resolve, reject) {
      var connection;
      async.series([
        // Get connection
        function(next) {
          sage.getConnection({ transaction: options.transaction }).then(function(c) {
            connection = c;
            next();
          });
        },
        function(next) {
          connection.query(sql, result.values, function(err, result) {
            if(err) {
              sage.log(err);
            } else {
              let row = null
              if(result.length) { 
                // For some reason a value called RNUM is returned as well
                delete result[0]["RNUM"];
                row = new self(result[0], name, schema);
              }
              finalResult = row;
            }
            next();
          });
        },
        // Close connection
        function(next) {
          sage.afterExecute(connection, next);
        }
      ], function() {
        resolve(finalResult);
      });
    })
  }       
}