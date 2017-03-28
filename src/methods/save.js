import _ from 'lodash';
import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

module.exports = function(self, name, schema, sage) {
  self.save = function(options = {}) {
    var self = this;

    return new Promise((resolve, reject) => {
      if(!this.get(this._schema.primaryKey)) {
        sage.logger.warn("No primary key. I don't know who to save.")
        return reject()
      }
      if(!this.valid) {
        sage.logger.warn("Invalid properties on model");
        return reject();
      }

      // save it to the database
      let pk = schema.primaryKey;

      let result = sageUtil.getUpdateSQL(this.dirtyProps);
      result.values = sageUtil.fixDateBug(this.schema, result.values);

      // Convert blob fields into buffers before saving
      _.each(_.keys(result.values), (key) => {
        if (this.normalized[key] && this.normalized[key].constructor.name === 'Buffer') {
          result.values[key] = this.normalized[key];
        }
      });

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
          sage.logger.debug(sql, result.values);

          connection.execute(sql, result.values, function(err, result) {
            if(!err) {
              self.mergeProps();
            }
            next(err);
          });
        }
      ], function(err) {
        if(err) {
          sage.logger.error(err);
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
