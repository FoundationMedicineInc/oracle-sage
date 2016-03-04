'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (self, name, schema, sage) {
  self.save = function () {
    var _this = this;

    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    console.log('attempting to save');
    var self = this;
    return new _bluebird2.default(function (resolve, reject) {
      if (!_this.get(_this._schema.primaryKey)) {
        sage.log("No primary key. I don't know who to save.");
        reject();
      }
      if (!_this.valid) {
        sage.log("Invalid properties on model");
        return reject();
      }

      // save it to the database
      var pk = schema.primaryKey;

      console.log('dirty', _this.dirtyProps);
      var result = _sage_util2.default.getUpdateSQL(_this.dirtyProps);
      var sql = 'UPDATE ' + name + ' SET ' + result.sql + ' WHERE ' + pk + '=:' + pk;

      sql = _sage_util2.default.amendDateFields(_this.schema, sql);
      sql = _sage_util2.default.amendTimestampFields(_this.schema, sql);
      result.values[pk] = _this.get(pk);

      var connection;
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
        sage.log(sql, result.values);
        connection.execute(sql, result.values, function (err, result) {
          if (err) {
            sage.log(err);
          } else {
            self.mergeProps();
          }
          next();
        });
      }], function () {
        sage.afterExecuteCommitable(connection).then(function () {
          resolve();
        });
      });
    });
  };
};