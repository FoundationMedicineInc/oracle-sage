'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (self, name, schema, sage) {
  self.destroy = function () {
    var _this = this;

    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var self = this;

    return new _bluebird2.default(function (resolve, reject) {
      var pk = _this.get(_this._schema.primaryKey);
      if (!pk) {
        sage.log("Missing primary key on destroy. Who do I destroy?");
        reject();
      }
      var sql = sage.knex(_this._name).where(_this._schema.primaryKey, pk).del().toString();

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
        sage.log(sql);
        connection.execute(sql, function (err, results) {
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
    });
  };
};