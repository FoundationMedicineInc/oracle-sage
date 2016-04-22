import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(self, name, schema, sage) {
  self.save = function(options = {}) {
    var self = this;
    return new Promise((resolve, reject) => {
      if(!this.get(this._schema.primaryKey)) {
        sage.log("No primary key. I don't know who to save.")
        reject()
      }
      if(!this.valid) {
        sage.log("Invalid properties on model");
        return reject();
      }

      // save it to the database
      let pk = schema.primaryKey

      let result = sageUtil.getUpdateSQL(this.dirtyProps);
      result.values = sageUtil.fixDateBug(this.schema, result.values);

      let sql = `UPDATE ${name} SET ${result.sql} WHERE ${pk}=:${pk}`

      sql = sageUtil.amendDateFields(this.schema, sql)
      sql = sageUtil.amendTimestampFields(this.schema, sql)
      result.values[pk] = this.get(pk)

      var connection;
      async.series([
        // Get connection
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
              sage.log(err)
            } else {
              self.mergeProps();
            }
            next();
          });
        }
      ], function() {
        sage.afterExecuteCommitable(connection).then(function() {
          resolve();
        });
      });


    })
  }
}