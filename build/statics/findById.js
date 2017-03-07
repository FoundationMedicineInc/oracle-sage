'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (modelClass, name, schema, sage) {

  modelClass.findById = function (value) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var self = this;
    var pk = schema.primaryKey;
    var data = {
      value: value
    };

    var sql = 'select * from (\n        select a.*, ROWNUM rnum from (\n          SELECT ' + self._selectAllStringStatic() + ' FROM ' + name + ' WHERE ' + pk + '=:value ORDER BY ' + pk + ' DESC\n        ) a where rownum <= 1\n      ) where rnum >= 0';

    var resultModel;

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
        sage.logger.debug(sql, data);
        connection.execute(sql, data).then(function (result) {
          return _sage_util2.default.resultToJSON(result);
        }).then(function (results) {
          if (results.length) {
            resultModel = new self(results[0], name, schema);
          }
          next();
        }).catch(next);
      }], function (err) {
        if (err) {
          sage.logger.error(err);
        }
        sage.afterExecute(connection).then(function () {
          if (err) {
            return reject(err);
          }
          return resolve(resultModel);
        }).catch(reject);
      });
    });
  };
};