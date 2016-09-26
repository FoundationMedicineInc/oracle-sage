'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var knex = require('knex')({ client: 'oracle' });

var SelectQuery = (function () {
  function SelectQuery(sage, tableName, model, columns) {
    var _this = this;

    _classCallCheck(this, SelectQuery);

    this.sage = sage;
    this.knex = knex(tableName);

    this.model = model; // needed to convert results into models

    columns = columns || "*";
    this.knex.select(columns);

    this.knex.exec = function () {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return _this.exec(options);
    };

    return this.knex;
  }

  _createClass(SelectQuery, [{
    key: 'exec',
    value: function exec() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var models = [];
      var self = this;
      return new _bluebird2.default(function (resolve, reject) {
        var connection;
        _async2.default.series([
        // Establish Connection
        function (next) {
          sage.getConnection({ transaction: options.transaction }).then(function (c) {
            connection = c;
            next();
          }).catch(next);
        },
        // Perform operation
        function (next) {
          var sql = self.knex.toString();

          // Fix: [Error: ORA-01756: quoted string not properly terminated]
          sql = sql.replace(/\\'/g, "''");

          _logger2.default.debug(sql);

          connection.query(sql, function (err, results) {
            if (!err) {
              _lodash2.default.each(results, function (result) {
                models.push(new self.model(result));
              });
            }
            next(err);
          });
        }], function (err) {
          if (err) {
            _logger2.default.error(err);
          }
          sage.afterExecute(connection).then(function () {
            if (err) {
              return reject(err);
            }

            return resolve(models);
          }).catch(reject);
        });
      });
    }
  }]);

  return SelectQuery;
})();

module.exports = SelectQuery;