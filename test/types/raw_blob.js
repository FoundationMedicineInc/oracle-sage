const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;

const Comment = require('../setup/models/comment');

describe('raw and blob types',function() {
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

  it('should create', function(done) {
    Comment.create({
      COMMENT_ID: "12345",
      LIKE_COUNT: "0",
      BODY: "My Body"
    }).then(function(err) {
      Comment.count().then(function(count) {
        expect(count).to.equal(1);
        done();
      });
    });
  });

  it('should update', function(done) {
    Comment.select().exec()
      .then((comments) => {
        const comment = comments[0];
        comment.set('LIKE_COUNT', '1');
        comment.set('BODY', 'Enhanced body');
        return comment.save();
      })
      .then(() => {
        done();
      })
  });
});
