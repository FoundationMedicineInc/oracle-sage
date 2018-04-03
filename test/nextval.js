const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('./test_helpers');
const expect = require('chai').expect;

const Sequence = require('./setup/models/sequence_no_trigger');

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

  it('should create', (done) => {
    Sequence.create({
      VALUE: '12345',
    }).then((err) => {
      Sequence.count().then((count) => {
        expect(count).to.equal(1);
        // We must verify this is TRUE because sage temporarily sets it to false during creation
        // Make sure it gets set back
        expect(Sequence.schema.definition[Sequence.schema.primaryKey].readonly).to.be.true;
        done();
      });
    });
  });
});
