import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';
import logger from '../logger';

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
          logger.debug(sql, data);

          connection.query(sql, data, function(err, result) {
            if(!err) {
              let row = null
              if(result.length) { row = new self(result[0], name, schema) }
              resultModel = row;
            }
            next(err);
          });
        }
      ], function(err) {
        if(err) {
          logger.error(err);
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