const _ = require('lodash');
const expect = require('chai').expect;

const TestHelpers = require('../test_helpers');
const User = require('../setup/models/user');
const Comment = require('../setup/models/comment');

describe('statics/create', () => {
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

  it('should create and return the model', () => {
    const id = new Date().getTime().toString();
    return Comment.create({
      COMMENT_ID: id,
      LIKE_COUNT: '0',
      BODY: 'My Body',
    }).then(result => {
      expect(result.get('COMMENT_ID')).to.equal(`0${id}`);
      expect(result.get('LIKE_COUNT')).to.equal('00');
      expect(result.get('BODY')).to.equal('My Body');
    });
  });

  it('should support arrays and create in bulk', () =>
    User.create([
      { COMMENT_ID: new Date().getTime().toString() },
      { COMMENT_ID: new Date().getTime().toString() + 1 },
      { COMMENT_ID: new Date().getTime().toString() + 2 },
      { COMMENT_ID: new Date().getTime().toString() + 3 },
    ]).then(result => {
      expect(result.rowsAffected).to.equal(4);
    }));

  it('should work with numbers as integers or floats', (done) => {
    let username1 = new Date().getTime().toString() + _.random(0, 99999);
    return User.create({ USERNAME: username1, AGE: 3.14 })
      .then(() => User.findOne({ USERNAME: username1 }))
      .then(userModel => {
        expect(userModel.get('AGE')).to.equal(3.14);
      }).then(() => {
        let username3 = new Date().getTime().toString() + _.random(0, 99999);
        return User.create({ USERNAME: username3, AGE: 95 })
          .then(() => User.findOne({ USERNAME: username3 }))
          .then(userModel => {
            expect(userModel.get('AGE')).to.equal(95);
            done();
          });
      });
  });
});
