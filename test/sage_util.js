const assert = require('assert');
const sage = require('../build/sage');
const sageUtil = require('../build/sage_util');

const userSchema = new sage.Schema({
  ID: 'number',
  SECRET: {
    type: 'varchar',
    readonly: true,
  },
  CREATED_AT: {
    type: 'date',
    format: 'MM/DD/YYYY',
  },
});

describe('utilities', () => {
  it('should build sql correctly', () => {
    var sql = sageUtil.schemaToString(userSchema);
    assert.equal(sql, 'ID,CREATED_AT');

    var sql = sageUtil.schemaToString(userSchema, { prefix: ':' });
    assert.equal(sql, ':ID,:CREATED_AT');
  });

  it('should amend date fields', () => {
    let sql = sageUtil.schemaToString(userSchema, { prefix: ':' });
    sql = sageUtil.amendDateFields(userSchema, sql);
    const expected = ":ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS')";
    assert.equal(sql, expected);
  });

  it('should build a full query', () => {
    const sql = sageUtil.getInsertSQL('test', userSchema);
    const expected =
      "INSERT INTO test (ID,CREATED_AT) VALUES (:ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS'))";
    assert.equal(sql, expected);
  });

  it('should not have readonly fields in INSERT', () => {
    const sql = sageUtil.getInsertSQL('test', userSchema);
    assert.equal(sql.indexOf('SECRET'), -1);
  });

  it('should handle results with 0 and null values', () => {
    // Sample result from node-oracledb
    const result = {
      rows: [[1, 0, null, 1]],
      metaData: [
        { name: 'USER_ID' },
        { name: 'BIO' },
        { name: 'AGE' },
        { name: 'RNUM' },
      ],
    };

    return sageUtil.resultToJSON(result).then((results) => {
      const result = results[0];
      assert.equal(result.USER_ID, 1);
      assert.equal(result.BIO, 0);
      assert.equal(result.AGE, null);
    });
  });
});
