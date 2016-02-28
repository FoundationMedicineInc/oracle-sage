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

  it('should populate', function(done) {
    User.create({ USERNAME: "mrchess" }).then(function(err) {
      User.findOne({ USERNAME: "mrchess" }).then(function(userModel) {
        user = userModel;
        done();
      });
    }).catch(function(err) { console.log('err', err) });    
  });
});