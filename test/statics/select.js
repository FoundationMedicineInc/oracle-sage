const _ = require('lodash');
const expect = require('chai').expect;

const TestHelpers = require('../test_helpers');
const User = require('../setup/models/user');
const Comment = require('../setup/models/comment');

const username1 = 'username1';
const username2 = 'username2';
const username3 = 'username3';
const username4 = 'username4';

describe('statics/select', () => {
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
        User.create({ USERNAME: username1, AGE: 3.14 })
          .then(() => User.create({ USERNAME: username2, AGE: 18 }))
          .then(() => User.create({ USERNAME: username3, AGE: 28 }))
          .then(() => User.create({ USERNAME: username4, AGE: 35 }))
          .then(() => {
            done();
          });
      })
      .catch(err => {
        console.log(err);
      });
  });

  it('should allow bind parameters', () => {
    return User.select()
      .whereRaw('AGE = :bindParamA')
      .execWithBindParams({ bindParamA: 18 })
      .then(result => {
        expect(result.length).to.equal(1);
        expect(result[0].get('USERNAME')).to.equal(username2);
        expect(result[0].get('AGE')).to.equal(18);
      });
  });

  it('should support oracle options', () => {
    return User.select()
      .whereRaw('AGE > :bindParamA')
      .execWithBindParams({ bindParamA: 1 }, { maxRows: 2 })
      .then(result => {
        expect(result.length).to.equal(2);
      });
  });
});
