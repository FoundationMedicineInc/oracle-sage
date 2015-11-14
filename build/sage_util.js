"use strict";

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var util = {};

util.getSelectANDSQL = function () {
  var fields = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var params = [];
  var values = {};
  _lodash2.default.each(fields, function (value, key) {
    params.push(key + "=:" + key);
    values[key] = value;
  });
  var sql = params.join(" AND ");
  return {
    sql: sql,
    values: values
  };
};

util.getUpdateSQL = function () {
  var fields = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var params = [];
  var values = {};
  _lodash2.default.each(fields, function (value, key) {
    params.push(key + "=:" + key);
    values[key] = value;
  });
  var sql = params.join(",");
  return {
    sql: sql,
    values: values
  };
};

util.schemaToString = function (schema) {
  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var prefix = options.prefix || "";
  var result = "";
  _lodash2.default.each(schema.definition, function (value, key) {
    if (value.type != "association") {
      result = result + prefix + key + ",";
    }
  });
  result = result.substring(0, result.length - 1);
  return result;
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
    string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format + "')");
  });
  return string;
};

util.getInsertSQL = function (table, schema) {
  var fields = this.schemaToString(schema);
  var keys = this.schemaToString(schema, { prefix: ":" });
  keys = this.amendDateFields(schema, keys);
  return "INSERT INTO " + table + " (" + fields + ") VALUES (" + keys + ")";
};

module.exports = util;