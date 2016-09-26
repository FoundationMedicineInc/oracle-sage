'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (modelClass, name, schema, sage) {
  modelClass.findOne = function () {
    var values = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var self = this;
    var pk = schema.primaryKey;
    var result = _sage_util2.default.getSelectANDSQL(values);

    var sql = 'select * from (\n        select a.*, ROWNUM rnum from (\n          SELECT ' + self._selectAllStringStatic() + ' FROM ' + name + ' WHERE ' + result.sql + ' ORDER BY ' + pk + ' DESC\n        ) a where rownum <= 1\n      ) where rnum >= 0';

    var finalResult;
    return new _bluebird2.default(function (resolve, reject) {
      var connection;
      _async2.default.series([
      // Get connection
      function (next) {
        sage.getConnection({ transaction: options.transaction }).then(function (c) {
          connection = c;
          return next();
        }).catch(next);
      }, function (next) {
        connection.query(sql, result.values, function (err, result) {
          if (err) {
            _logger2.default.error(err);
            return next(err);
          } else {
            var row = null;
            if (result.length) {
              // For some reason a value called RNUM is returned as well
              delete result[0]["RNUM"];
              row = new self(result[0], name, schema);
            }
            finalResult = row;
          }
          next();
        });
      }], function (err) {
        if (err) {
          _logger2.default.error(err);
        }
        sage.afterExecute(connection).then(function () {
          if (err) {
            return reject(err);
          }
          return resolve(finalResult);
        }).catch(reject);
      });
    });
  };
};