import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

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
            return next();
          }).catch(next);
        },
        function(next) {
          sage.logger.debug(sql, data);
          connection.execute(sql, data)
            .then((result) => sageUtil.resultToJSON(result))
            .then((results) => {
              if (results.length) {
                resultModel = new self(results[0], name, schema)
              }
              next();
            })
            .catch(next);
        }
      ], function(err) {
        if(err) {
          sage.logger.error(err);
        }
        sage.afterExecute(connection).then(function() {
          if(err) {
            return reject(err);
          }
          return resolve(resultModel);
        }).catch(reject);

      });
    })
  }
}
