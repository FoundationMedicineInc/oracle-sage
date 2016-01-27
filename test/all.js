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
      created_at: {
        type: "timestamp",
        readonly: true
      },
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
      },
      is_single: 'char'
    }, {
      primaryKey: "id"
    });    
  })

  it('should extend', function() {
    var User = sage.model("User", schema)
    User.extend({
      hello: function() {
        console.log(this)
      }
    })
    user = new User()
    user.hello()
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

  it('should validate char', function() {
    var User = sage.model("User", schema);
    var user = new User({
      name: "bob",
      gender: "M",
      is_single: 5
    });
    assert.equal(user.valid, false);
    user.set('is_single', 'Y');
    assert.equal(user.valid, true);
  });     


  it("should normalize", function() {
    var User = sage.model("User", schema);
    var user = new User({name: "alice"});
    assert.equal(user.normalized.id, null);
    assert.equal(user.normalized.name, "alice");
  })


  it('should not have a readonly field in normalize', function() {
    var User = sage.model("User", schema);
    var user = new User({
      name: "alice",
      created_at: "today"
    })
    assert.equal(user.normalized.created_at, undefined)
  })

  it("should unset", function() {
    var User = sage.model("User", schema);
    var user = new User({name: "alice"});
    user.unset('name');
    assert.equal(user.get('name'), null);
  });  
  
})