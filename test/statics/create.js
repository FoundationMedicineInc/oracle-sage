const _ = require("lodash");
const moment = require("moment");
const TestHelpers = require("../test_helpers");
const expect = require("chai").expect;

const User = require("../setup/models/user");
const Comment = require("../setup/models/comment");

describe("statics/create", function() {
  // Reset Db
  before(function(done) {
    TestHelpers.initdb().then(function() {
      done();
    });
  });
  // Connect to sage
  before(function(done) {
    TestHelpers.connect()
      .then(function() {
        done();
      })
      .catch(function(err) {
        console.log(err);
      });
  });

  it("should create and return the model", function() {
    const id = new Date().getTime().toString();
    return Comment.create({
      COMMENT_ID: id,
      LIKE_COUNT: "0",
      BODY: "My Body"
    }).then(function(result) {
      expect(result.get("COMMENT_ID")).to.equal(`0${id}`);
      expect(result.get("LIKE_COUNT")).to.equal("00");
      expect(result.get("BODY")).to.equal("My Body");
    });
  });

  it("should support arrays and create in bulk", function() {
    return User.create([
      { COMMENT_ID: new Date().getTime().toString() },
      { COMMENT_ID: new Date().getTime().toString() + 1 },
      { COMMENT_ID: new Date().getTime().toString() + 2 },
      { COMMENT_ID: new Date().getTime().toString() + 3 }
    ]).then(function(result) {
      expect(result.rowsAffected).to.equal(4);
    });
  });
});
