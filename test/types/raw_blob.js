const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;

const Comment = require('../setup/models/comment');

describe('raw and blob types', () => {
  // Reset Db
  before(done => {
    TestHelpers.initdb().then(() => {
      done();
    });
  });
  // Connect to sage
  before(done => {
    TestHelpers.connect()
      .then(() => {
        done();
      })
      .catch(err => {
        console.log(err);
      });
  });

  it('should create', done => {
    Comment.create({
      COMMENT_ID: '12345',
      LIKE_COUNT: '0',
      BODY: 'My Body',
    }).then(err => {
      Comment.count().then(count => {
        expect(count).to.equal(1);
        done();
      });
    });
  });

  it('should update with select', done => {
    Comment.select()
      .exec()
      .then(comments => {
        const comment = comments[0];
        comment.set('LIKE_COUNT', '1');
        comment.set('BODY', 'Enhanced body');
        return comment.save();
      })
      .then(() => Comment.findById('012345'))
      .then(comment => {
        expect(comment.get('LIKE_COUNT')).to.equal('01');
        expect(comment.get('BODY')).to.equal('Enhanced body');
        done();
      });
  });

  it('should update without setting the blob body', done => {
    Comment.findById('012345')
      .then(comment => {
        comment.set('LIKE_COUNT', '2');
        return comment.save();
      })
      .then(() => Comment.findById('012345'))
      .then(comment => {
        expect(comment.get('LIKE_COUNT')).to.equal('02');
        expect(comment.get('BODY')).to.equal('Enhanced body');
        done();
      });
  });

  // https://github.com/FoundationMedicineInc/oracle-sage/issues/20
  describe('null values', () => {
    it('should create without a blob', () =>
      Comment.create({
        COMMENT_ID: '45678',
        LIKE_COUNT: '0',
      }));

    it('should select with a null blob value', done => {
      Comment.findById('045678')
        .then(comment => {
          comment.set('LIKE_COUNT', '1');
          comment.set('BODY', 'Enhanced body');
          return comment.save();
        })
        .then(() => Comment.findById('045678'))
        .then(comment => {
          expect(comment.get('LIKE_COUNT')).to.equal('01');
          expect(comment.get('BODY')).to.equal('Enhanced body');
          done();
        });
    });
  });
});
