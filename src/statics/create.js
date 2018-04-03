import _ from 'lodash';
import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

module.exports = function (modelClass, name, schema, sage) {
  function createArray(arrayOfProps) {}

  // Returns string of errors if invalid, null if valid
  function validateModel(model) {
    if (!model.valid) {
      sage.logger.warn(model.errors);
      return model.errors.join(',');
    }
    return null;
  }

  // Start Special Case
  // This is a special case where we want to use nextval instead of a trigger
  // for an autoincrement. Usually you would put a readonly on the primary key
  // so let us temporarily turn it off so we can get it in the INSERT sql
  function disableRequiredForReadonlyNextVal(model) {
    const pk = model.schema.primaryKey;
    const definition = model.schema._definition;

    if (pk) {
      if (definition[pk] && definition[pk].sequenceName) {
        if (definition[pk].readonly) {
          delete definition[pk].readonly;
          return true;
        }
      }
    }
  }
  function enableReadonlyForNextVal(model) {
    const definition = model.schema._definition;
    const pk = model.schema.primaryKey;
    definition[pk].readonly = true;
  }

  function getSql(model) {
    const readOnlyDeleted = disableRequiredForReadonlyNextVal(model);
    const definition = model.schema._definition;
    const pk = model.schema.primaryKey;
    let sql = sageUtil.getInsertSQL(model.name, model.schema);
    // Update the INSERT statement with the correct nextval
    if (definition[pk] && definition[pk].sequenceName) {
      sql = sql.replace(`:${pk}`, `${definition[pk].sequenceName}.nextval`);
    }
    if (readOnlyDeleted) {
      enableReadonlyForNextVal(model);
    }
    return sql;
  }

  function getPatchedNormalizedValues(model) {
    let values = model.normalized;
    values = sageUtil.fixDateBug(model.schema, values);
    return values;
  }

  function createArray(props = [], options = {}, self) {
    // Just create a model so we can reference it for stuff. Not going to do
    // anything withh it
    const model = new self({}, name, schema);
    const template = getSql(model);

    // Build up a list of `INTO ()` statements
    const insertSqls = [];
    _.each(props, (propsOne) => {
      const m = new self(propsOne, name, schema);
      const values = m.normalized;
      let sql = template;
      _.each(_.keys(values), (key) => {
        let replaceValue = values[key] === undefined ? null : values[key];

        if (typeof replaceValue === 'string') {
          // Escape single quotes
          replaceValue = replaceValue.replace(/'/g, "''");
          replaceValue = `'${replaceValue}'`;
        }

        sql = sql.replace(`:${key}`, replaceValue);
      });

      sql = sql.replace('INSERT INTO', 'INTO');

      if (options.hasDbmsErrlog) {
        sql = `${sql} LOG ERRORS REJECT LIMIT UNLIMITED`;
      }

      insertSqls.push(sql);
    });

    const allSqls = insertSqls.join(' ');
    const query = `INSERT ALL ${allSqls} SELECT * FROM dual`;

    let connection;
    let result;

    return sage
      .getConnection({ transaction: options.transaction })
      .then((c) => {
        connection = c;
      })
      .then(() => {
        sage.logger.debug(query);
        return connection.execute(query);
      })
      .then(r => (result = r))
      .then(() => sage.afterExecuteCommitable(connection))
      .then(() => result) // Return native node-oracledb result to user
      .catch(err =>
        sage.afterExecute(connection).then(() => {
          throw err;
        }));
  }

  function createOne(props = {}, options = {}, self) {
    const m = new self(props, name, schema);
    const errors = validateModel(m);
    if (errors) {
      return Promise.reject(new Error(`Cannot create model. Errors: ${errors}`));
    }

    const pk = m.schema.primaryKey;
    let sql = getSql(m);
    const values = getPatchedNormalizedValues(m);

    // If a primary key is defined. Return it after create.
    // Using __ because oracledb does not like prefix `_` eg. `__pk`
    if (pk) {
      sql = `${sql} RETURNING ${pk} INTO :pk__`;
      values.pk__ = {
        dir: sage.oracledb.BIND_OUT,
      };
    }

    let connection;
    let createResult;

    return (
      sage
        .getConnection({ transaction: options.transaction })
        .then((c) => {
          connection = c;
        })
        .then(() => {
          sage.logger.debug(sql, values);
          return connection.execute(sql, values);
        })
        // Store the result of the create operation (it may have a PK value)
        .then(result => (createResult = result))
        // Close the connection
        .then(() => sage.afterExecuteCommitable(connection))
        // Set the model if a pk is defined
        .then(() => {
          if (pk) {
            const id = createResult.outBinds.pk__;
            if (id && id[0]) {
              // Format is { pk__: [ 'someValue' ] }
              return modelClass.findById(id[0], {
                transaction: options.transaction,
              });
            }
          }
          // If no model is set let's just return the status of the operation
          return createResult;
        })
        .catch(err =>
          sage.afterExecute(connection).then(() => {
            throw err;
          }))
    );
  }

  /**
   * @param  {Object} [props={}]   [description]
   * @param  {Object} [options={}]
   * @param  {Object} options.transaction Sage transaction
   *
   * @param  {boolean} options.hasDbmsErrlog Set to true if you set up a dbms err log
   *                                         and want to skip errors when you batch
   *                                         create. See this for more info:
   *                                         http://stackoverflow.com/questions/13420461/oracle-insert-all-ignore-duplicates
   */
  modelClass.create = function (props = {}, options = {}) {
    if (typeof props === 'object' && props.length === undefined) {
      return createOne(props, options, this);
    } else if (typeof props === 'object' && props.length > 0) {
      return createArray(props, options, this);
    }
    return Promise.reject('Invalid argument. Pass object or array > 0');
  };
};
