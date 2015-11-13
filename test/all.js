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
      },
      gender: {
        type: "varchar",
        enum: {
          values: 'M F'.split(' '),
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

  it('should validate enum', function() {
    var User = sage.model("User", schema);
    var user = new User({
      name: "bob",
      gender: "dog"
    });
    assert.equal(user.valid, false);
    user.set('gender', 'M');
    assert.equal(user.valid, true);
  });     

  it("should normalize", function() {
    var User = sage.model("User", schema);
    var user = new User({name: "alice"});
    assert.equal(user.normalized.id, null);
    assert.equal(user.normalized.name, "alice");
  });
  
})