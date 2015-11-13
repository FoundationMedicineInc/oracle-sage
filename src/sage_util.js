import _ from 'lodash';

let util = {};

util.schemaToString = function(schema, options = {}) {
  let prefix = options.prefix || "";
  let result = "";
  _.each(schema.definition, function(value, key) {
    result = result + prefix + key + ",";
  });
  result = result.substring(0, result.length - 1);
  return result;  
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
    string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format +"')");
  });
  return string;   
}

util.getInsertSQL = function(table, schema) {
  let fields = this.schemaToString(schema);
  let keys = this.schemaToString(schema, { prefix: ":" });
  keys = this.amendDateFields(schema, keys);
  return `INSERT INTO ${table} (${fields}) VALUES (${keys})`;
}

module.exports = util;