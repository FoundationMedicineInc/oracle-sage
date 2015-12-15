'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

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
      return _this.exec();
    };

    return this.knex;
  }

  _createClass(SelectQuery, [{
    key: 'exec',
    value: function exec() {
      var _this2 = this;

      return new _bluebird2.default(function (resolve, reject) {
        var sql = _this2.knex.toString();

        // Fix: [Error: ORA-01756: quoted string not properly terminated]
        sql = sql.replace(/\\'/g, "''");

        _this2.sage.connection.query(sql, function (err, results) {
          if (err) {
            console.log(err);reject();
          } else {
            (function () {
              var models = [];
              _lodash2.default.each(results, function (result) {
                models.push(new _this2.model(result));
              });
              resolve(models);
            })();
          }
        });
      });
    }
  }]);

  return SelectQuery;
})();

module.exports = SelectQuery;