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
  const self = this;
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
  const self = this;
  const fields = [];
  _.each(schema.definition, (value, key) => {
    const schemaProps = value;
    if (schemaProps.type === 'timestamp') {
      fields.push({
        name: key,
        format: schemaProps.format,
      });
    }
  });
  _.each(fields, field => {
    const re = new RegExp(`:${field.name}`);
    // https://docs.oracle.com/cd/B19306_01/server.102/b14200/functions193.htm
    const oracleFormat = 'DD-Mon-RR HH24:MI:SS.FF';
    string = string.replace(
      re,
      `TO_TIMESTAMP(:${field.name},'${oracleFormat}')`
    );
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
 * Take a `result` from a Oracle execute and convert it to JSON. Handles cases
 * with CLOBs and BLOBs and the Node oracledb Lob class.
 * @param  {Object} result Oracle result object
 * @return {Array.<Object>}
 */
util.resultToJSON = function(result) {
  const records = [];
  return Promise.each(result.rows, row => {
    const record = {};

    return Promise.each(row, (value, index) => {
      const field = result.metaData[index].name;

      let constructorName;
      // We get the constructor so we can handle specific types in specific ways
      // particulary streams and hex values.
      try {
        constructorName = value.constructor.name;
      } catch (e) {
        // Fails on null or undefined since neither of these have constructors
        constructorName = null;
      }

      switch (constructorName) {
        case 'Buffer':
          record[field] = value.toString('hex');
          break;
        case 'Lob':
          // For lob types. Wrap into a promise to read the stream
          return new Promise(resolve => {
            const chunks = [];
            value.on('data', chunk => {
              chunks.push(chunk.toString());
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
