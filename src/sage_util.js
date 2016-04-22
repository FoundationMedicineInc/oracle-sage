import _ from 'lodash';

let util = {};

util.getSelectANDSQL = function(fields = {}) {
  let params = [];
  let values = {};
  _.each(fields, function(value, key) {
    params.push(`${key}=:${key}`)
    values[key] = value;
  });
  let sql = params.join(" AND ");
  return {
    sql: sql,
    values: values
  };
}

util.getUpdateSQL = function(fields = {}) {
  let params = [];
  let values = {};
  _.each(fields, function(value, key) {
    params.push(`${key}=:${key}`)
    values[key] = value;
  });
  let sql = params.join(",");
  return {
    sql: sql,
    values: values
  };
}

util.amendDateFields = function(schema, string) {
  let self = this;
  let fields = [];
  _.each(schema.definition, function(value, key) {
    let schemaProps = value;
    if(schemaProps.type === "date") {
      fields.push({
        name: key,
        format: schemaProps.format
      });
    }
  });
  _.each(fields, function(field) {
    let re = new RegExp(":" + field.name);

    // https://github.com/oracle/node-oracledb/issues/414
    var dateBugFixTime = ' HH24:MI:SS';

    string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format + dateBugFixTime + "')");
    // string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format +"')");
  });
  return string;
}

util.amendTimestampFields = function(schema, string) {
  let self = this;
  let fields = [];
  _.each(schema.definition, function(value, key) {
    let schemaProps = value;
    if(schemaProps.type === "timestamp") {
      fields.push({
        name: key,
        format: schemaProps.format
      });
    }
  });
  _.each(fields, function(field) {
    let re = new RegExp(":" + field.name);
    // https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions193.htm
    var oracleFormat = "DD-Mon-RR HH24:MI:SS.FF"
    string = string.replace(re, "TO_TIMESTAMP(:" + field.name + ",'" + oracleFormat +"')");
  });
  return string;
}


// https://github.com/oracle/node-oracledb/issues/414
// Goes thorugh and gets all DATE fields and sets the time to 12:00:00
util.fixDateBug = function(schema, values) {
  _.each(schema.definition, function(value, key) {
    let schemaProps = value;
    if(schemaProps.type === "date") {
      if(values[key]) { // possible it is not set, eg. undefined/null
        values[key] = values[key] + ' 12:00:00';
      }
    }
  });
  return values;
}

// Helper for getInsertSQL
util.schemaToString = function(schema, options = {}) {
  let prefix = options.prefix || "";
  let result = "";
  _.each(schema.definition, function(value, key) {
    if(value.type != "association") {
      if(!value.readonly) { // NEVER INSERT READONLY FIELDS
        result = result + prefix + key + ",";
      }
    }
  });
  result = result.substring(0, result.length - 1);
  return result;
}

util.getInsertSQL = function(table, schema) {
  let fields = this.schemaToString(schema);
  let keys = this.schemaToString(schema, { prefix: ":" });
  keys = this.amendDateFields(schema, keys);
  keys = this.amendTimestampFields(schema, keys);
  return `INSERT INTO ${table} (${fields}) VALUES (${keys})`;
}

module.exports = util;