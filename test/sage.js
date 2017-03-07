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
