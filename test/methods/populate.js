const TestHelpers = require('../test_helpers');
const expect = require('chai').expect;
const sage = require('../../build/sage');

const User = require('../setup/models/user');
const Profile = require('../setup/models/profile');
const Post = require('../setup/models/post');

// this test addresses https://github.com/FoundationMedicineInc/oracle-sage/issues/35
describe('when populate is called within a transaction', () => {
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
  // create a user with a profile
  before((done) => {
    let user;
    sage.transaction().then((t) => {
      User.create({ USERNAME: 'jpollard' }, { transaction: t })
        .then(() => User.findOne(
          { USERNAME: 'jpollard' },
          { transaction: t },
        ).then((userModel) => {
          user = userModel;
          return Profile.create(
            {
              USER_ID: user.id,
              BIO: 'I write software.',
            },
            { transaction: t },
          );
        }))
        .then(() => t.commit().then(done))
        .catch((err) => {
          console.log('err', err);
          return t.rollback().then(done);
        });
    });
  });

  it('populates data modified within the transaction', (done) => {
    let user;
    sage.transaction().then(t => User.findOne({ USERNAME: 'jpollard' }, { transaction: t })
      .then(u => (user = u))
      .then(() => Profile.findOne({ USER_ID: user.id }, { transaction: t }))
      .then((p) => {
        p.set('BIO', 'I write tests.');
        return p.save({ transaction: t });
      })
      .then(() => user.populate({ transaction: t }))
      .then(() => {
        expect(user.get('PROFILE').get('BIO')).to.equal('I write tests.');
      })
      .then(() => {
        t.commit().then(done);
      })
      .catch((err) => {
        t.rollback();
        console.log(err);
      }));
  });
});
