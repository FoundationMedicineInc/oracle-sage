import _ from 'lodash';
import Promise from 'bluebird';

const util = {};

util.getSelectANDSQL = function(fields = {}) {
  const params = [];
  const values = {};
  _.each(fields, (value, key) => {
    params.push(`${key}=:${key}`);
    values[key] = value;
  });
  const sql = params.join(' AND ');
  return {
    sql,
    values,
  };
};

util.getUpdateSQL = function(fields = {}) {
  const params = [];
  const values = {};
  _.each(fields, (value, key) => {
    params.push(`${key}=:${key}`);
    values[key] = value;
  });
  const sql = params.join(',');
  return {
    sql,
    values,
  };
};

util.amendDateFields = function(schema, string) {
  const fields = [];
  _.each(schema.definition, (value, key) => {
    const schemaProps = value;
    if (schemaProps.type === 'date') {
      fields.push({
        name: key,
        format: schemaProps.format,
      });
    }
  });
  _.each(fields, field => {
    const re = new RegExp(`:${field.name}`);

    // https://github.com/oracle/node-oracledb/issues/414
    const dateBugFixTime = ' HH24:MI:SS';

    string = string.replace(
      re,
      `TO_DATE(:${field.name},'${field.format}${dateBugFixTime}')`
    );
    // string = string.replace(re, "TO_DATE(:" + field.name + ",'" + field.format +"')");
  });
  return string;
};

util.amendTimestampFields = function(schema, string) {
  const fields = [];
  _.each(schema.definition, (value, key) => {
    const schemaProps = value;
    if (schemaProps.type === 'timestamp') {
      const defaultOracleFormat = 'DD-Mon-RR HH24:MI:SS.FF';
      fields.push({
        name: key,
        format: schemaProps.format,

        // There was an issue where Oracle was not saving AM/PM because the SQL was
        // not specifying the format in TO_TIMESTAMP. We do not expose this in the docs
        // because there may be a better way to fix this, and want to fix it properly in the
        // future.
        oracleFormat: schemaProps.oracleFormat || defaultOracleFormat,
      });
    }
  });
  _.each(fields, field => {
    const re = new RegExp(`:${field.name}`);
    // https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions193.htm
    const { name, oracleFormat } = field;
    string = string.replace(re, `TO_TIMESTAMP(:${name},'${oracleFormat}')`);
  });
  return string;
};

// https://github.com/oracle/node-oracledb/issues/414
// Goes thorugh and gets all DATE fields and sets the time to 12:00:00
util.fixDateBug = function(schema, values) {
  _.each(schema.definition, (value, key) => {
    const schemaProps = value;
    if (schemaProps.type === 'date') {
      if (values[key]) {
        // possible it is not set, eg. undefined/null
        values[key] = `${values[key]} 12:00:00`;
      }
    }
  });
  return values;
};

// Helper for getInsertSQL
util.schemaToString = function(schema, options = {}) {
  const prefix = options.prefix || '';
  let result = '';
  _.each(schema.definition, (value, key) => {
    if (value.type != 'association') {
      if (!value.readonly) {
        // NEVER INSERT READONLY FIELDS
        result = `${result + prefix + key},`;
      }
    }
  });
  result = result.substring(0, result.length - 1);
  return result;
};

util.getInsertSQL = function(table, schema) {
  const fields = this.schemaToString(schema);
  let keys = this.schemaToString(schema, { prefix: ':' });
  keys = this.amendDateFields(schema, keys);
  keys = this.amendTimestampFields(schema, keys);
  return `INSERT INTO ${table} (${fields}) VALUES (${keys})`;
};

/**
 * converts a buffer to an uppercase hexadecimal string
 * @param buffer
 * @returns {string}
 */
util.convertBufferToHexString = function(buffer) {
  return buffer.toString('hex').toUpperCase();
};

/**
 * Take a `result` from a Oracle execute and convert it to JSON. Handles cases
 * with CLOBs and BLOBs and the Node oracledb Lob class.
 * @param  {Object} result Oracle result object
 * @param {Object} schema Sage Schema
 * @return {Array.<Object>}
 */
util.resultToJSON = function(result, schema = {}) {
  const records = [];
  return Promise.each(result.rows, row => {
    const record = {};

    return Promise.each(row, (value, index) => {
      const field = result.metaData[index].name;

      let constructorName;
      // We get the constructor so we can handle specific types in specific ways
      // particularly streams and hex values.
      try {
        constructorName = value.constructor.name;
      } catch (e) {
        // Fails on null or undefined since neither of these have constructors
        constructorName = null;
      }

      const schemaDefinition = schema.definition || {};
      const schemaFieldObj = schemaDefinition[field];
      if (schemaFieldObj && schemaFieldObj.transform) {
        // this allows the transform function to be either a regular function or a promise
        return Promise.resolve(schemaFieldObj.transform(value)).then(result => {
          record[field] = result;
        });
      }

      switch (constructorName) {
        case 'Buffer':
          record[field] = this.convertBufferToHexString(value);
          break;
        case 'Lob':
          // For lob types. Wrap into a promise to read the stream
          return new Promise(resolve => {
            const chunks = [];
            value.on('data', chunk => {
              chunks.push(chunk.toString('utf8'));
            });
            value.on('end', () => {
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
    }).then(() => {
      records.push(record);
    });
  }).then(() => records);
};

module.exports = util;
