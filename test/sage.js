const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('./test_helpers');
const expect = require('chai').expect;

const User = require('./setup/models/user');
const Profile = require('./setup/models/profile');
const Post = require('./setup/models/post');

let sage = TestHelpers.sage;
sage.logger.transports.console.level = 'debug';

describe('sage basic methods', () => {
  // Reset Db
  before(() => TestHelpers.initdb().then(TestHelpers.connect));

  it('should execute', () => {
    const query = 'SELECT * FROM users';
    return sage.execute(query).then(response => {
      expect(response.length).to.equal(0);
    });
  });
});

// https://github.com/FoundationMedicineInc/oracle-sage/issues/34
describe('sage basic methods work with transactions', () => {
  // Reset Db
  before(() => TestHelpers.initdb().then(TestHelpers.connect));

  it('should execute in the context of a transaction', done => {
    sage = require('../build/sage');
    const query = 'SELECT * FROM users';
    return sage.transaction().then(t =>
      sage
        .execute(query, [], { transaction: t })
        .then(response => {
          expect(response.length).to.equal(0);
        })
        .then(() => User.create({ USERNAME: 'jpollard' }, { transaction: t }))
        .then(() => sage.execute(query, [], { transaction: t }))
        .then(response => {
          expect(response.length).to.equal(1);
        })
        .then(() => t.commit().then(done))
        .catch(err => {
          console.log('err', err);
          return t.rollback().then(done);
        })
    );
  });
});
