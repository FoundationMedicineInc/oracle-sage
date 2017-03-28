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

describe('schemas', function() {
  it('should get a key definition', function() {
    var tempschema = new sage.Schema({
      id: "number"
    })
    var Temp = sage.model("Temp", tempschema);
    assert(Temp.schema.getDefinition('id'))
    assert.equal(Temp.schema.getDefinition('abc'), undefined)
  })
})

describe('models', function() {
  before(function() {
    schema = new sage.Schema({
      id: {
        type: "number",
        readonly: true
      },
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
      age: {
        type: "number"
      },
      gender: {
        type: "char",
        enum: {
          values: 'M F'.split(' '),
        }
      },
      is_single: 'char'
    }, {
      primaryKey: "id"
    });
  })

  it('should have access to the schema as a static', function() {
    var User = sage.model("User", schema)
    assert(User.schema)
  })

  it('should add methods', function() {
    var User = sage.model("User", schema)
    User.methods({
      hello: function() {
      }
    })
    var user = new User()
    assert(user.hello)
  })

  it('should clobber methods from another schema methods', function() {
    var User = sage.model("User", schema)
    var Guest = sage.model("Guest", schema);
    User.methods({
      hello: function() {
        return "userHello";
      }
    });
    Guest.methods({
      hello: function() {
        return "guestHello";
      }
    });
    var user = new User();
    var guest = new Guest();
    assert.equal(user.hello(), "userHello");
    assert.equal(guest.hello(), "guestHello");

  })

  it('should add statics', function() {
    var User = sage.model("User", schema)
    User.statics({
      hello: function() {
      }
    })
    assert(User.hello)
  })


  it('get an primary key id', function() {
    var User = sage.model("User", schema)
    user = new User()
    user.set('id', 5)
    assert.equal(user.id, 5)
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

  it('should validate char', function() {
    var User = sage.model("User", schema);
    var user = new User({
      name: "bob",
      gender: ""
    });
    assert.equal(user.valid, false);
  });


  it("should normalize", function() {
    var User = sage.model("User", schema);
    var user = new User({name: "alice"});
    assert.equal(user.normalized.id, null);
    assert.equal(user.normalized.name, "alice");

    user.set('age', "100");
    assert.equal(user.normalized.age, 100);
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
