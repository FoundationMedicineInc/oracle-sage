var assert = require("assert");
var sage = require("../build/sage");
var sageUtil = require("../build/sage_util");

var userSchema = new sage.Schema({
  ID: "number",
  SECRET: {
    type: "varchar",
    readonly: true
  },
  CREATED_AT: {
    type: "date",
    format: "MM/DD/YYYY"
  }
});

describe("utilities", function() {
  it("should build sql correctly", function() {
    var sql = sageUtil.schemaToString(userSchema);
    assert.equal(sql, "ID,CREATED_AT");

    var sql = sageUtil.schemaToString(userSchema, { prefix: ":" });
    assert.equal(sql, ":ID,:CREATED_AT");
  });

  it("should amend date fields", function() {
    var sql = sageUtil.schemaToString(userSchema, { prefix: ":" });
    sql = sageUtil.amendDateFields(userSchema, sql);
    var expected = ":ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS')";
    assert.equal(sql, expected);
  });

  it("should build a full query", function() {
    var sql = sageUtil.getInsertSQL("test", userSchema);
    var expected =
      "INSERT INTO test (ID,CREATED_AT) VALUES (:ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS'))";
    assert.equal(sql, expected);
  });

  it("should not have readonly fields in INSERT", function() {
    var sql = sageUtil.getInsertSQL("test", userSchema);
    assert.equal(sql.indexOf("SECRET"), -1);
  });

  it("should handle results with 0 and null values", function() {
    // Sample result from node-oracledb
    const result = {
      rows: [[1, 0, null, 1]],
      metaData: [
        { name: "USER_ID" },
        { name: "BIO" },
        { name: "AGE" },
        { name: "RNUM" }
      ]
    };

    return sageUtil.resultToJSON(result).then(results => {
      const result = results[0];
      assert.equal(result.USER_ID, 1);
      assert.equal(result.BIO, 0);
      assert.equal(result.AGE, null);
    });
  });
});
