var assert = require('assert');
var sage = require('../build/sage');

var schema; 

describe('schemas', function() {
  it('should accept of schemas without type', function() {
    schema = new sage.Schema({
      id: "number"
    });
    assert.equal(schema.definition.id.type, "number");
  });
  it('should accept of schemas with a type', function() {
    schema = new sage.Schema({
      id: { type: "varchar" }
    });
    assert.equal(schema.definition.id.type, "varchar");
  });    
});

describe('models', function() {
  before(function() {
    schema = new sage.Schema({
      id: "number",
      name: { 
        type: "varchar",
        validator: function(v) {
          return(v === "bob");
        }
      }
    }, {
      primaryKey: "id"
    });    
  })

  it('should run a validator', function() {
    var User = sage.model("User", schema);
    var user = new User({
      name: "alice"
    });
    assert.equal(user.valid, false);
    user.set('name', 'bob');
    assert.equal(user.valid, true);
  });    

  it("should be able to findById", function(done) {
    var User = sage.model("User", schema);
    User.findById(1).then(function() {
      done();
    })
  });

  it("shouldnt create an invalid model", function(done) {
    var User = sage.model("User", schema);
    User.create({name: "alice"}).then(function(){}, function(model) {
      assert.equal(model.errors.length, 1);
      done();
    });
  });

  it("should create an valid model", function(done) {
    var User = sage.model("User", schema);
    User.create({name: "bob"}).then(function(model){
      assert.equal(model.errors.length, 0);
      done();
    });
  });  

  
})