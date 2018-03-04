var TestHelpers = require('../test_helpers');
var expect = require('chai').expect;
var sage = require('../../build/sage');


var User = require('../setup/models/user');
var Profile = require('../setup/models/profile');
var Post = require('../setup/models/post');

// this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/35
describe('when populate is called within a transaction',function() {
  // Reset Db
  before(function(done) {
    TestHelpers.initdb().then(function() {
      done();
    });
  });
  // Connect to sage
  before(function(done) {
    TestHelpers.connect().then(function() {
      done();
    }).catch(function(err) {
      console.log(err);
    });
  });
  // create a user with a profile
  before(function(done) {
    var user;
    sage.transaction().then(t => {
      User.create({ USERNAME: "jpollard" }, { transaction: t })
        .then(function() {
          return User.findOne({ USERNAME: "jpollard" }, { transaction: t }).then(function(userModel) {
            user = userModel;
            return Profile.create({
              USER_ID: user.id,
              BIO: "I write software."
            }, { transaction: t });
          });
        })
        .then(function() {
          return t.commit().then(done);
        })
        .catch(function(err) {
          console.log('err', err);
          return t.rollback().then(done);
        });
    })
  });

  it("populates data modified within the transaction", function(done) {
    var user;
    sage.transaction()
      .then(t => {
        return User.findOne({ USERNAME: "jpollard" }, { transaction: t })
          .then(u => user = u)
          .then(() => Profile.findOne({ USER_ID: user.id }, { transaction: t }))
          .then(p => {
            p.set("BIO", "I write tests.");
            return p.save({ transaction: t });
          })
          .then(() => user.populate({ transaction: t }))
          .then(() => {
            expect(user.get("PROFILE").get("BIO")).to.equal("I write tests.");
          })
          .then(() => {
            t.commit().then(done);
          })
          .catch(err => {
            t.rollback();
            console.log(err)
          });
      })
    });
});
