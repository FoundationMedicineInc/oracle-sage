import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';
import logger from '../logger';

module.exports = function(self, name, schema, sage) {
  self.save = function(options = {}) {
    var self = this;

    return new Promise((resolve, reject) => {
      if(!this.get(this._schema.primaryKey)) {
        logger.warn("No primary key. I don't know who to save.")
        return reject()
      }
      if(!this.valid) {
        logger.warn("Invalid properties on model");
        return reject();
      }

      // save it to the database
      let pk = schema.primaryKey;

      let result = sageUtil.getUpdateSQL(this.dirtyProps);
      result.values = sageUtil.fixDateBug(this.schema, result.values);

      let sql = `UPDATE ${name} SET ${result.sql} WHERE ${pk}=:${pk}`;

      sql = sageUtil.amendDateFields(this.schema, sql);
      sql = sageUtil.amendTimestampFields(this.schema, sql);
      result.values[pk] = this.get(pk);

      var connection;

      async.series([
        // Get connection
        function(next) {
          sage.getConnection({transaction: options.transaction}).then(function(c) {
            connection = c;
            next();
          }).catch(next);
        },
        // Perform operation
        function(next) {
          logger.debug(sql, result.values);

          connection.execute(sql, result.values, function(err, result) {
            if(!err) {
              self.mergeProps();
            }
            next(err);
          });
        }
      ], function(err) {
        if(err) {
          logger.error(err);
        };
        sage.afterExecuteCommitable(connection).then(function() {
          if(err) {
            return reject(err);
          }
          return resolve();
        }).catch(reject);

      });

    })
  }
}