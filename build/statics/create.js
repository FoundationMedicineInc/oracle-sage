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
    var props = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var m = new this(props, name, schema);

    return new _bluebird2.default(function (resolve, reject) {
      if (!m.valid) {
        sage.log(m.errors);
        reject(m.errors);
      } else {
        var connection;

        (function () {

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

          _async2.default.series([
          // Get connection
          function (next) {
            sage.getConnection({ transaction: options.transaction }).then(function (c) {
              connection = c;
              next();
            });
          },
          // Perform operation
          function (next) {
            sage.log(sql, values);
            connection.execute(sql, values, function (err, result) {
              if (err) {
                sage.log(err);
              }
              next();
            });
          }], function () {
            sage.afterExecuteCommitable(connection).then(function () {
              resolve();
            });
          });
        })();
      }
    });
  };
};