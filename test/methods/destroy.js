const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;
const sage = require('../../build/sage');

const User = require('../setup/models/user');
const Profile = require('../setup/models/profile');
const Post = require('../setup/models/post');

let user;
// this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/36
describe('when a destroy fails within a transaction', () => {
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
  // Create two users then attempt to delete one of them twice
  before(done => {
    sage.transaction().then(t => {
      User.create({ USERNAME: 'mrchess' }, { transaction: t })
        .then(() => User.create({ USERNAME: 'jpollard' }, { transaction: t }))
        .then(() =>
          User.findOne({ USERNAME: 'jpollard' }, { transaction: t }).then(
            userModel => {
              user = userModel;
              return Profile.create(
                {
                  USER_ID: user.id,
                  BIO: 'I write software.',
                },
                { transaction: t }
              );
            }
          )
        )
        .then(() =>
          // expect this to fail because profile is still referencing it
          user.destroy({ transaction: t })
        )
        .then(() => t.commit().then(done))
        .catch(err => {
          console.log('err', err);
          return t.rollback().then(done);
        });
    });
  });

  // the entire transaction should be rolled back as opposed to being partially committed
  // // this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/36
  it('the entire transaction should be rolled back', done => {
    User.findOne({ USERNAME: 'mrchess' })
      .then(userModel => {
        // we expect this user can't be found because we should have rolled back the entire transaction
        expect(userModel).to.equal(undefined);
        done();
      })
      .catch(err => {
        console.log(err);
      });
  });
});
