const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;

const Comment = require('../setup/models/comment');

describe('statics/create',function() {
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

  it('should create and return the model', function() {
    return Comment.create({
      COMMENT_ID: "12345",
      LIKE_COUNT: "0",
      BODY: "My Body"
    }).then(function(result) {
      expect(result.get('COMMENT_ID')).to.equal('012345');
      expect(result.get('LIKE_COUNT')).to.equal('00');
      expect(result.get('BODY')).to.equal('My Body');
    });
  });
});
