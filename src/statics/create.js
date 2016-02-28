import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(modelClass, name, schema, sage) {
  modelClass.create = function(props = {}, options = {}) {
    let m = new this(props, name, schema)

    return new Promise(function(resolve, reject) {
      if(!m.valid) {
        sage.log(m.errors)
        reject(m.errors)
      } else {

        // This is a special case where we want to use nexetval instead of a trigger
        // for an autoincrement. Usually you would put a readonly on the primary key
        // so let us temporarily turn it off so we can get it in the INSERT sql
        let pk = m.schema.primaryKey;
        let readOnlyDeleted = false;
        let definition = m.schema._definition;

        if(pk) {
          if(definition[pk] && definition[pk].sequenceName) {
            if(definition[pk].readonly) {
              delete definition[pk].readonly;
              readOnlyDeleted = true;
            }
          }
        }

        let sql = sageUtil.getInsertSQL(m.name, m.schema)

        // Update the INSERT statement with the correct nextval
        if(definition[pk] && definition[pk].sequenceName) {
          sql = sql.replace(`:${pk}`, `${definition[pk].sequenceName}.nextval`);            
        }
        // Restore readOnly if you turned it off
        if(readOnlyDeleted) {
          definition[pk].readonly = true; // Turn it back on
        }

        // Get the values
        let values = m.normalized

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
            sage.log(sql, values);
            connection.execute(sql, values, function(err, result) {
              if(err) { sage.log(err) }
              next();
            });
          },
          function(next) {
            sage.afterExecuteCommitable(connection, next);
          }
        ], function() {
          resolve();
        });
      }
    })
  }
}