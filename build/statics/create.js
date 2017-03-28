'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (modelClass, name, schema, sage) {
  modelClass.create = function () {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var m = new this(props, name, schema);

    if (!m.valid) {
      sage.logger.warn(m.errors);
      var errors = m.errors.join(',');
      return _bluebird2.default.reject(new Error('Cannot create model. Errors: ' + errors));
    }

    // This is a special case where we want to use nexetval instead of a trigger
    // for an autoincrement. Usually you would put a readonly on the primary key
    // so let us temporarily turn it off so we can get it in the INSERT sql
    var pk = m.schema.primaryKey;
    var readOnlyDeleted = false;
    var definition = m.schema._definition;

    if (pk) {
      if (definition[pk] && definition[pk].sequenceName) {
        if (definition[pk].readonly) {
          delete definition[pk].readonly;
          readOnlyDeleted = true;
        }
      }
    }

    var sql = _sage_util2.default.getInsertSQL(m.name, m.schema);

    // Update the INSERT statement with the correct nextval
    if (definition[pk] && definition[pk].sequenceName) {
      sql = sql.replace(':' + pk, definition[pk].sequenceName + '.nextval');
    }
    // Restore readOnly if you turned it off
    if (readOnlyDeleted) {
      definition[pk].readonly = true; // Turn it back on
    }

    // Get the values
    var values = m.normalized;
    values = _sage_util2.default.fixDateBug(m.schema, values);

    // If a primary key is defined. Return it after create.
    // Using __ because oracledb does not like prefix `_` eg. `__pk`
    if (pk) {
      sql = sql + ' RETURNING ' + pk + ' INTO :pk__';
      values['pk__'] = {
        dir: sage.oracledb.BIND_OUT
      };
    }

    var connection = undefined;
    var createdModel = undefined;
    var createResult = undefined;

    return sage.getConnection({ transaction: options.transaction }).then(function (c) {
      connection = c;
    }).then(function () {
      sage.logger.debug(sql, values);
      return connection.execute(sql, values);
    })
    // Store the result of the create operation (it may have a PK value)
    .then(function (result) {
      return createResult = result;
    })
    // Close the connection
    .then(function () {
      return sage.afterExecuteCommitable(connection);
    })
    // Set the model if a pk is defined
    .then(function () {
      if (pk) {
        var id = createResult.outBinds['pk__'];
        if (id && id[0]) {
          // Format is { pk__: [ 'someValue' ] }
          return modelClass.findById(id[0], { transaction: options.transaction });
        }
      }
      // If no model is set let's just return the status of the operation
      return createResult;
    }).catch(function (err) {
      return sage.afterExecuteCommitable(connection).then(function () {
        throw err;
      });
    });
  };
};