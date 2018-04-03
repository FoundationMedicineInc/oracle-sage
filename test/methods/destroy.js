var TestHelpers = require("../test_helpers");
var expect = require("chai").expect;
var sage = require("../../build/sage");

var User = require("../setup/models/user");
var Profile = require("../setup/models/profile");
var Post = require("../setup/models/post");

var user;
// this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/36
describe("when a destroy fails within a transaction", function() {
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
  // Create two users then attempt to delete one of them twice
  before(function(done) {
    sage.transaction().then(t => {
      User.create({ USERNAME: "mrchess" }, { transaction: t })
        .then(function() {
          return User.create({ USERNAME: "jpollard" }, { transaction: t });
        })
        .then(function() {
          return User.findOne(
            { USERNAME: "jpollard" },
            { transaction: t }
          ).then(function(userModel) {
            user = userModel;
            return Profile.create(
              {
                USER_ID: user.id,
                BIO: "I write software."
              },
              { transaction: t }
            );
          });
        })
        .then(function() {
          // expect this to fail because profile is still referencing it
          return user.destroy({ transaction: t });
        })
        .then(function() {
          return t.commit().then(done);
        })
        .catch(function(err) {
          console.log("err", err);
          return t.rollback().then(done);
        });
    });
  });

  // the entire transaction should be rolled back as opposed to being partially committed
  // // this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/36
  it("the entire transaction should be rolled back", function(done) {
    User.findOne({ USERNAME: "mrchess" })
      .then(function(userModel) {
        // we expect this user can't be found because we should have rolled back the entire transaction
        expect(userModel).to.equal(undefined);
        done();
      })
      .catch(function(err) {
        console.log(err);
      });
  });
});
