var _ = require('lodash');
var moment = require('moment');
var TestHelpers = require('./test_helpers');
var expect = require('chai').expect;


var User = require('./setup/models/user');
var Profile = require('./setup/models/profile');
var Post = require('./setup/models/post');

var user;
describe('transactions',function() {
  // Reset Db
  before(function(done) {
    TestHelpers.initdb().then(function() {
      done();
    });
  });;
  // Connect to sage
  before(function(done) {
    TestHelpers.connect().then(function() {
      done();
    }).catch(function(err) {
      console.log(err);
    });
  });  
  // Create and set user
  before(function(done) {
    User.create({ USERNAME: "mrchess" }).then(function(err) {
      User.findOne({ USERNAME: "mrchess" }).then(function(userModel) {
        user = userModel;
        done();
      });
    }).catch(function(err) { console.log('err', err) });
  });

  // Create a profile for user - hasOne
  before(function(done) {
    Profile.create({
      USER_ID: user.id,
      BIO: "I write software."
    }).then(function() {
      done();
    });
  });

  // Create a few posts for the user - hasMany
  before(function(done) {
    Post.create({
      USER_ID: user.id,
      POST_BODY: "My first post."
    }).then(function() {
      done();
    });
  })
  before(function(done) {
    Post.create({
      USER_ID: user.id,
      POST_BODY: "My second post."
    }).then(function() {
      done();
    });
  })  

  it('should populate', function(done) {
    user.populate().then(function() {
      // console.log(user)
      var json = user.toJSON();
      // console.log(json)
      expect(json.posts.length).to.equal(2);

      done();
    });
  });
});