'use strict';

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

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

_simpleOracledb2.default.extend(_oracledb2.default);

var sage = {};

sage.connection = null;
sage.connect = function (uri) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (sage.connection) {
    return new _bluebird2.default(function (resolve, reject) {
      resolve();
    });
  }

  // Make a new connection
  var auth = {
    user: "system",
    password: "oracle",
    connectString: "127.0.0.1:1521/orcl"
  };
  auth = _lodash2.default.defaults(options, auth);
  return new _bluebird2.default(function (resolve, reject) {
    _oracledb2.default.getConnection(auth, function (err, connection) {
      if (err) {
        console.log(err);
        reject(err);
      }
      sage.connection = connection;
      resolve();
    });
  });
};

sage.Schema = _sage_schema2.default;
sage.model = _sage_model2.default;

module.exports = sage;