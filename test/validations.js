var assert = require('assert');
var sage = require('../build/sage');

var schema; 

describe('validators', function() {
  describe('varchar', function() {
    before(function() {
      schema = new sage.Schema({
        id: "number",
        name: { 
          type: "varchar",
          minlength: 1,      
          maxlength: 5
        }
      });    
    })    
    it('validates minlength', function() {
      var User = sage.model("User", schema)
      var user = new User({
        name: ""
      })

      assert.equal(user.valid, false)
      user.set('name', 'bob')
      user.valid
      assert.equal(user.valid, true)
    })
    it('validates maxlength', function() {
      var User = sage.model("User", schema)
      var user = new User({
        name: "over5characters"
      })
      assert.equal(user.valid, false)
      user.set('name', 'bob');
      assert.equal(user.valid, true)
    })    
  })

  describe('clob', function() {
    before(function() {
      schema = new sage.Schema({
        id: "number",
        bio: { 
          required: true,
          type: "clob"
        }
      });    
    })    
    it('validates', function() {
      var User = sage.model("User", schema)
      var user = new User({
        bio: "Hello world"
      })

      assert.equal(user.valid, true)
    })    
  })

  describe('number', function() {
    before(function() {
      schema = new sage.Schema({
        id: "number",
        age: { 
          required: true,
          type: "number",
          min: 10,      
          max: 20
        }
      });    
    })    
    it('validates min', function() {
      var User = sage.model("User", schema)
      var user = new User()

      assert.equal(user.valid, false)
      user.set('age', 5)
      assert.equal(user.valid, false)
      user.set('age', 10)
      assert.equal(user.valid, true)
      
    })
    it('validates max', function() {
      var User = sage.model("User", schema)
      var user = new User()

      assert.equal(user.valid, false)
      user.set('age', 30)
      assert.equal(user.valid, false)
      user.set('age', 20)
      assert.equal(user.valid, true)
    })    
  })  

})