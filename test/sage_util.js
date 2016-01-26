var assert = require('assert');
var sage = require('../build/sage');
var sageUtil = require('../build/sage_util');

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

describe('utilities', function() {
  it("should build sql correctly", function() {
    var sql = sageUtil.schemaToString(userSchema);
    assert.equal(sql, "ID,CREATED_AT");

    var sql = sageUtil.schemaToString(userSchema, {prefix: ":"});
    assert.equal(sql, ":ID,:CREATED_AT");
  })

  it("should amend date fields", function() {
    var sql = sageUtil.schemaToString(userSchema, {prefix: ":"});
    sql = sageUtil.amendDateFields(userSchema, sql);
    var expected = ":ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY')";
    assert.equal(sql, expected);
  })  

  it("should build a full query", function() {
    var sql = sageUtil.getInsertSQL("test", userSchema);
    var expected = "INSERT INTO test (ID,CREATED_AT) VALUES (:ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY'))"
    assert.equal(sql, expected);
  })    


  it("should not have readonly fields in INSERT", function() {
    var sql = sageUtil.getInsertSQL("test", userSchema)
    assert.equal(sql.indexOf("SECRET"), -1)
  })    

})
