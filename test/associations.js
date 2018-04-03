const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('./test_helpers');
const expect = require('chai').expect;

const User = require('./setup/models/user');
const Profile = require('./setup/models/profile');
const Post = require('./setup/models/post');

let user;
describe('transactions', () => {
  // Reset Db
  before((done) => {
    TestHelpers.initdb().then(() => {
      done();
    });
  });
  // Connect to sage
  before((done) => {
    TestHelpers.connect()
      .then(() => {
        done();
      })
      .catch((err) => {
        console.log(err);
      });
  });
  // Create and set user
  before((done) => {
    User.create({ USERNAME: 'mrchess' })
      .then((err) => {
        User.findOne({ USERNAME: 'mrchess' }).then((userModel) => {
          user = userModel;
          console.log('found user', user.id);
          done();
        });
      })
      .catch((err) => {
        console.log('err', err);
      });
  });

  // Create a profile for user - hasOne
  before((done) => {
    Profile.create({
      USER_ID: user.id,
      BIO: 'I write software.',
    }).then(() => {
      done();
    });
  });

  // Create a few posts for the user - hasMany
  before((done) => {
    Post.create({
      USER_ID: user.id,
      POST_BODY: 'My first post.',
    }).then(() => {
      done();
    });
  });
  before((done) => {
    Post.create({
      USER_ID: user.id,
      POST_BODY: 'My second post.',
    }).then(() => {
      done();
    });
  });

  it('should populate', (done) => {
    user.populate().then(() => {
      // console.log(user)
      const json = user.toJSON();
      // console.log(json)
      expect(json.posts.length).to.equal(2);
      done();
    });
  });
});
