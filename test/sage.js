var _ = require('lodash');
var moment = require('moment');
var TestHelpers = require('./test_helpers');
var expect = require('chai').expect;


var User = require('./setup/models/user');
var Profile = require('./setup/models/profile');
var Post = require('./setup/models/post');

var sage = TestHelpers.sage;
sage.logger.transports.console.level = 'debug';

describe('sage basic methods',function() {
  // Reset Db
  before(function() {
    return TestHelpers
      .initdb()
      .then(TestHelpers.connect)
  });;

  it("should execute", function() {
    const query = "SELECT * FROM users";
    return sage.execute(query)
      .then(response => {
        expect(response.length).to.equal(0);
      })
  })
});

// https://github.com/FoundationMedicineInc/oracle-sage/issues/34
describe('sage basic methods work with transactions',function() {
  // Reset Db
  before(function() {
    return TestHelpers
      .initdb()
      .then(TestHelpers.connect)
  });

  it("should execute in the context of a transaction", function(done) {
    sage = require('../build/sage');
    const query = "SELECT * FROM users";
    return sage.transaction().then(t =>
      sage.execute(query, [], { transaction: t })
        .then(response => {
          expect(response.length).to.equal(0);
        })
        .then(() => User.create({ USERNAME: "jpollard" }, { transaction: t }))
        .then(() => sage.execute(query, [], { transaction: t }))
        .then(response => {
          expect(response.length).to.equal(1);
        })
        .then(function() {
          return t.commit().then(done);
        })
        .catch(function(err) {
          console.log('err', err);
          return t.rollback().then(done);
        })
    );
  })
});
