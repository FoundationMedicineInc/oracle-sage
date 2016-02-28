import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(modelClass, name, schema, sage) {

  modelClass.findById = function(value, options = {}) {

    let self = this
    let pk = schema.primaryKey
    let data = {
      value: value
    }

    let sql = `select * from (
        select a.*, ROWNUM rnum from (
          SELECT ${self._selectAllStringStatic()} FROM ${name} WHERE ${pk}=:value ORDER BY ${pk} DESC
        ) a where rownum <= 1
      ) where rnum >= 0`

    var resultModel;
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
          sage.log(sql, data)
          connection.query(sql, data, function(err, result) {
            if(err) {
              sage.log(err)
            } else {
              let row = null
              if(result.length) { row = new self(result[0], name, schema) }
              resultModel = row;
            }
            next();
          });
        },
        // Close connection
        function(next) {
          sage.afterExecute(connection, next);
        }
      ], function() {
        resolve(resultModel);
      });
    })
  }       
}