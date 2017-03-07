'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var util = {};

util.getSelectANDSQL = function () {
  var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var params = [];
  var values = {};
  _lodash2.default.each(fields, function (value, key) {
    params.push(key + '=:' + key);
    values[key] = value;
  });
  var sql = params.join(" AND ");
  return {
    sql: sql,
    values: values
  };
};

util.getUpdateSQL = function () {
  var fields = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var params = [];
  var values = {};
  _lodash2.default.each(fields, function (value, key) {
    params.push(key + '=:' + key);
    values[key] = value;
  });
  var sql = params.join(",");
  return {
    sql: sql,
    values: values
  };
};

util.amendDateFields = function (schema, string) {
  var self = this;
  var fields = [];
  _lodash2.default.each(schema.definition, function (value, key) {
    var schemaProps = value;
    if (schemaProps.type === "date") {
      fields.push({
        name: key,
        format: schemaProps.format
      });
    }
  });
  _lodash2.default.each(fields, function (field) {
    var re = new RegExp(":" + field.name);

    // https://github.com/oracle/node-oracledb/issues/414
    var dateBugFixTime = ' HH24:MI:SS';

    string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format + dateBugFixTime + "')");
    // string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format +"')");
  });
  return string;
};

util.amendTimestampFields = function (schema, string) {
  var self = this;
  var fields = [];
  _lodash2.default.each(schema.definition, function (value, key) {
    var schemaProps = value;
    if (schemaProps.type === "timestamp") {
      fields.push({
        name: key,
        format: schemaProps.format
      });
    }
  });
  _lodash2.default.each(fields, function (field) {
    var re = new RegExp(":" + field.name);
    // https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions193.htm
    var oracleFormat = "DD-Mon-RR HH24:MI:SS.FF";
    string = string.replace(re, "TO_TIMESTAMP(:" + field.name + ",'" + oracleFormat + "')");
  });
  return string;
};

// https://github.com/oracle/node-oracledb/issues/414
// Goes thorugh and gets all DATE fields and sets the time to 12:00:00
util.fixDateBug = function (schema, values) {
  _lodash2.default.each(schema.definition, function (value, key) {
    var schemaProps = value;
    if (schemaProps.type === "date") {
      if (values[key]) {
        // possible it is not set, eg. undefined/null
        values[key] = values[key] + ' 12:00:00';
      }
    }
  });
  return values;
};

// Helper for getInsertSQL
util.schemaToString = function (schema) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var prefix = options.prefix || "";
  var result = "";
  _lodash2.default.each(schema.definition, function (value, key) {
    if (value.type != "association") {
      if (!value.readonly) {
        // NEVER INSERT READONLY FIELDS
        result = result + prefix + key + ",";
      }
    }
  });
  result = result.substring(0, result.length - 1);
  return result;
};

util.getInsertSQL = function (table, schema) {
  var fields = this.schemaToString(schema);
  var keys = this.schemaToString(schema, { prefix: ":" });
  keys = this.amendDateFields(schema, keys);
  keys = this.amendTimestampFields(schema, keys);
  return 'INSERT INTO ' + table + ' (' + fields + ') VALUES (' + keys + ')';
};

/**
 * Take a `result` from a Oracle execute and convert it to JSON. Handles cases
 * with CLOBs and BLOBs and the Node oracledb Lob class.
 * @param  {Object} result Oracle result object
 * @return {Array.<Object>}
 */
util.resultToJSON = function (result) {
  var records = [];
  return _bluebird2.default.each(result.rows, function (row) {
    var record = {};

    return _bluebird2.default.each(row, function (value, index) {
      var field = result.metaData[index].name;
      switch (value.constructor.name) {
        case 'Buffer':
          record[field] = value.toString('hex');
          break;
        case 'Lob':
          // For lob types. Wrap into a promise to read the stream
          return new _bluebird2.default(function (resolve) {
            var chunks = [];
            value.on('data', function (chunk) {
              chunks.push(chunk.toString());
            });
            value.on('end', function () {
              record[field] = chunks.join('');
              resolve();
            });
          });
        default:
          // When using where rownum, a RNUM field is also returned for some reason.
          // See `findOne`.
          if (field !== 'RNUM') {
            record[field] = value;
          }
          break;
      }
    }).then(function () {
      records.push(record);
    });
  }).then(function () {
    return records;
  });
};

module.exports = util;