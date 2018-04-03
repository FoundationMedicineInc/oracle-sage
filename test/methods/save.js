const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;

const User = require('../setup/models/user');
const Profile = require('../setup/models/profile');
const Post = require('../setup/models/post');

let user;
describe('save transactions', () => {
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
  // Create and set user
  before(done => {
    User.create({ USERNAME: 'mrchess' })
      .then(err => {
        User.findOne({ USERNAME: 'mrchess' }).then(userModel => {
          user = userModel;
          user.populate().then(() => {
            done();
          });
        });
      })
      .catch(err => {
        console.log('err', err);
      });
  });

  it('should update the username', done => {
    user.set('USERNAME', 'potato');
    user
      .save()
      .then(() => {
        user.reload().then(() => {
          expect(user.get('USERNAME')).to.equal('potato');
          done();
        });
      })
      .catch(err => {
        console.log(err);
      });
  });
});
