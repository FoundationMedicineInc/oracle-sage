import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(modelClass, name, schema, sage) {
  modelClass.create = function(props = {}, options = {}) {
    let m = new this(props, name, schema)

    if(!m.valid) {
      sage.logger.warn(m.errors)
      const errors = m.errors.join(',')
      return Promise.reject(new Error(`Cannot create model. Errors: ${errors}`))
    }

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
    let values = m.normalized;
    values = sageUtil.fixDateBug(m.schema, values);

    var connection;

    return sage.getConnection({transaction: options.transaction})
      .then( (c) => {
        connection = c
      })
      .then( () => {
        sage.logger.debug(sql, values);
        return connection.execute(sql, values);
      })
      .then( () => {
        return sage.afterExecuteCommitable(connection);
      })
      .catch( (err) => {
        return sage.afterExecuteCommitable(connection)
          .then( () => {
            throw(err)
          })
      })
  }
}
