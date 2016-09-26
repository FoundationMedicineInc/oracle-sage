import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';
import logger from '../logger';

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
            return next();
          }).catch(next);
        },
        // Perform operation
        function(next) {
          logger.debug(sql, result.values);

          connection.execute(sql, result.values, function(err, result) {
            if(!err) {
              try {
                count = result.rows[0][0]
              } catch(e) {
                next(e);
              }
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
          return resolve(count);
        }).catch(reject);
      });

    });
  }
}