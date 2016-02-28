'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (modelClass, name, schema, sage) {
  modelClass.count = function () {
    var values = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var self = this;
    var result = _sage_util2.default.getSelectANDSQL(values);

    var sql = 'SELECT COUNT(*) FROM ' + name;

    if (result.sql != "") {
      sql = sql + (' WHERE ' + result.sql);
    }

    var count;

    return new _bluebird2.default(function (resolve, reject) {
      var connection;
      _async2.default.series([
      // Establish Connection
      function (next) {
        sage.getConnection({ transaction: options.transaction }).then(function (c) {
          connection = c;
          next();
        });
      },
      // Perform operation
      function (next) {
        sage.log(sql, result.values);
        connection.execute(sql, result.values, function (err, result) {
          if (err) {
            sage.log(err);
          } else {
            try {
              count = result.rows[0][0];
            } catch (e) {
              sage.log(e);
            }
            next();
          }
        });
      }], function () {
        sage.afterExecute(connection).then(function () {
          resolve(count);
        });
      });
    });
  };
};