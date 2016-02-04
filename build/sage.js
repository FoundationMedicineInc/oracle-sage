'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _oracledb = require('oracledb');

var _oracledb2 = _interopRequireDefault(_oracledb);

var _simpleOracledb = require('simple-oracledb');

var _simpleOracledb2 = _interopRequireDefault(_simpleOracledb);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sage_model = require('../build/sage_model');

var _sage_model2 = _interopRequireDefault(_sage_model);

var _sage_schema = require('../build/sage_schema');

var _sage_schema2 = _interopRequireDefault(_sage_schema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-3214-stmtcachesize
// Statement caching can be disabled by setting the size to 0.
_oracledb2.default.stmtCacheSize = 0;

_simpleOracledb2.default.extend(_oracledb2.default);

var Sage = (function () {
  function Sage() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Sage);

    this.Schema = _sage_schema2.default;
    this._connection = null;

    this.models = {}; // all the models that have currently been instantiated

    this.debug = options.debug;
  }

  _createClass(Sage, [{
    key: 'log',
    value: function log(o) {
      if (this.debug) {
        console.trace(o);
      }
    }
  }, {
    key: 'model',
    value: function model(name, schema) {
      if (!schema) {
        var _model = this.models[name];
        if (_model) {
          return _model.model;
        } else {
          return null;
        }
      }
      return (0, _sage_model2.default)(name, schema, this);
    }
  }, {
    key: 'disconnect',
    value: function disconnect() {
      var self = this;
      if (self._connection) {
        return new _bluebird2.default(function (resolve, reject) {
          self._connection.release(function (err) {
            if (err) {
              console.error(err.message);
              reject(err);
            } else {
              self._connection = null;
              resolve(true);
            }
          });
        });
      } else {
        // No active connection
        return new _bluebird2.default(function (resolve, reject) {
          resolve(true);
        });
      }
    }
  }, {
    key: 'connect',
    value: function connect(uri) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var self = this;
      if (self._connection) {
        return new _bluebird2.default(function (resolve, reject) {
          resolve();
        });
      }

      // Make a new connection
      var auth = {
        user: "system",
        password: "oracle",
        connectString: uri || "127.0.0.1:1521/orcl"
      };
      auth = _lodash2.default.defaults(options, auth);
      return new _bluebird2.default(function (resolve, reject) {
        _oracledb2.default.getConnection(auth, function (err, connection) {
          if (err) {
            console.log(err);
            reject(err);
          }
          self._connection = connection;
          resolve();
        });
      });
    }
  }, {
    key: 'connection',
    get: function get() {
      return this._connection;
    }
  }]);

  return Sage;
})();

var sage = new Sage();

module.exports = sage;