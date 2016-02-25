var _ = require('lodash');
var moment = require('moment');
var TestHelpers = require('./test_helpers');
var expect = require('chai').expect;

var Sequence = require('./setup/models/sequence_no_trigger');

var user;

describe('transactions',function() {
  // Reset Db
  before(function(done) {
    TestHelpers.initdb().then(function() {
      done();
    });
  });;
  // Connect to sage
  before(function(done) {
    TestHelpers.connect().then(function() {
      done();
    }).catch(function(err) {
      console.log(err);
    });
  });  
  
  it('should create', function(done) {
    Sequence.create({
      VALUE: "12345"
    }).then(function(err) {
      Sequence.count().then(function(count) {
        expect(count).to.equal(1);
        // We must verify this is TRUE because sage temporarily sets it to false during creation
        // Make sure it gets set back
        expect(Sequence.schema.definition[Sequence.schema.primaryKey].readonly).to.be.true;
        done();
      });
    });
  });
});