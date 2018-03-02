'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
    var pk = model.schema.primaryKey;
    var definition = model.schema._definition;

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
    var definition = model.schema._definition;
    var pk = model.schema.primaryKey;
    definition[pk].readonly = true;
  }

  function getSql(model) {
    var readOnlyDeleted = disableRequiredForReadonlyNextVal(model);
    var definition = model.schema._definition;
    var pk = model.schema.primaryKey;
    var sql = _sage_util2.default.getInsertSQL(model.name, model.schema);
    // Update the INSERT statement with the correct nextval
    if (definition[pk] && definition[pk].sequenceName) {
      sql = sql.replace(':' + pk, definition[pk].sequenceName + '.nextval');
    }
    if (readOnlyDeleted) {
      enableReadonlyForNextVal(model);
    }
    return sql;
  }

  function getPatchedNormalizedValues(model) {
    var values = model.normalized;
    values = _sage_util2.default.fixDateBug(model.schema, values);
    return values;
  }

  function createArray() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var self = arguments[2];

    // Just create a model so we can reference it for stuff. Not going to do
    // anything withh it
    var model = new self({}, name, schema);
    var template = getSql(model);

    // Build up a list of `INTO ()` statements
    var insertSqls = [];
    _lodash2.default.each(props, function (propsOne) {
      var m = new self(propsOne, name, schema);
      var values = m.normalized;
      var sql = template;
      _lodash2.default.each(_lodash2.default.keys(values), function (key) {
        var replaceValue = values[key] || null;

        if (typeof replaceValue === 'string') {
          // Escape single quotes
          replaceValue = replaceValue.replace(/'/g, '\'\'');
          replaceValue = '\'' + replaceValue + '\'';
        }

        sql = sql.replace(':' + key, replaceValue);
      });

      sql = sql.replace('INSERT INTO', 'INTO');

      if (options.hasDbmsErrlog) {
        sql = sql + ' LOG ERRORS REJECT LIMIT UNLIMITED';
      }

      insertSqls.push(sql);
    });

    var allSqls = insertSqls.join(' ');
    var query = 'INSERT ALL ' + allSqls + ' SELECT * FROM dual';

    var connection = void 0;
    var result = void 0;

    return sage.getConnection({ transaction: options.transaction }).then(function (c) {
      connection = c;
    }).then(function () {
      sage.logger.debug(query);
      return connection.execute(query);
    }).then(function (r) {
      return result = r;
    }).then(function () {
      return sage.afterExecuteCommitable(connection);
    }).then(function () {
      return result;
    }) // Return native node-oracledb result to user
    .catch(function (err) {
      return sage.afterExecute(connection).then(function () {
        throw err;
      });
    });
  }

  function createOne() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var self = arguments[2];

    var m = new self(props, name, schema);
    var errors = validateModel(m);
    if (errors) {
      return _bluebird2.default.reject(new Error('Cannot create model. Errors: ' + errors));
    }

    var pk = m.schema.primaryKey;
    var sql = getSql(m);
    var values = getPatchedNormalizedValues(m);

    // If a primary key is defined. Return it after create.
    // Using __ because oracledb does not like prefix `_` eg. `__pk`
    if (pk) {
      sql = sql + ' RETURNING ' + pk + ' INTO :pk__';
      values['pk__'] = {
        dir: sage.oracledb.BIND_OUT
      };
    }

    var connection = void 0;
    var createResult = void 0;

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
      return sage.afterExecute(connection).then(function () {
        throw err;
      });
    });
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
  modelClass.create = function () {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if ((typeof props === 'undefined' ? 'undefined' : _typeof(props)) === 'object' && props.length === undefined) {
      return createOne(props, options, this);
    } else if ((typeof props === 'undefined' ? 'undefined' : _typeof(props)) === 'object' && props.length > 0) {
      return createArray(props, options, this);
    }
    return _bluebird2.default.reject('Invalid argument. Pass object or array > 0');
  };
};