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
        name: ''
      })

      assert.equal(user.valid, false)
      user.set('name', 'bob')
      user.valid
      assert.equal(user.valid, true)
    })

    it('validates maxlength on undefined value', function() {
      var userSchema = new sage.Schema({
        id: "number",
        name: {
          type: "varchar",
          maxlength: 5
        }
      });
      var User = sage.model("User", userSchema)
      var user = new User()

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
          type: "clob",
          minlength: 5,
          maxlength: 100
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

    it('validates minlength', function() {
      var User = sage.model("User", schema)
      var user = new User({
        bio: "123"
      })

      assert.equal(user.valid, false)
    })
    it('validates maxlength', function() {
      var User = sage.model("User", schema)
      var user = new User({
        bio: "tenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletters"
      })

      assert.equal(user.valid, false)
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

  describe("enum" , function() {
    it('validates error', function() {
      schema = new sage.Schema({
        id: "number",
        gender: {
          type: "varchar",
          enum: {
            values: ['M', 'F']
          }
        }
      })

      var User = sage.model("User", schema)
      var user = new User({
        gender: 'X'
      })

      assert.equal(user.valid, false)
      assert.equal(user.errors[0], 'key: gender, value: X, is not in enum')
      user.set('gender', 'M')
      assert.equal(user.valid, true)
    })
  })

  describe("timestamp" , function() {
    it('does not throw moment error', function() {
      schema = new sage.Schema({
        id: "number",
        created_at: {
          type: "timestamp",
          format: "YY-MMM-DD HH:mm:ss.SS"
        }
      })

      var User = sage.model("User", schema)
      var user = new User({
        created_at: "Jan 10 1980"
      })
    })
  })

  describe("date" , function() {
    it('does not throw moment error', function() {
      schema = new sage.Schema({
        id: "number",
        created_at: {
          type: "date",
          format: "YY-MMM-DD HH:mm:ss.SS"
        }
      })

      var User = sage.model("User", schema)
      var user = new User({
        created_at: "1/1/1"
      })

      assert.equal(user.valid, true)
    })
    it('fails if bad date', function() {
      schema = new sage.Schema({
        id: "number",
        created_at: {
          type: "date",
          format: "YY-MMM-DD HH:mm:ss.SS"
        }
      })

      var User = sage.model("User", schema)
      var user = new User({
        created_at: "X"
      })

      assert.equal(user.valid, false)
    })
  })

  describe("create" , function() {
    it('should throw error if not valid', function(done) {
      schema = new sage.Schema({
        id: "number",
        name: {
          type: "varchar",
          minlength: 1,
          maxlength: 5
        }
      });

      var User = sage.model("User", schema)

      User.create({ name: '' }).then(function() {
        done('Failed. Should not create');
      })
      .catch(function(err) {
        assert.ok(err.message)
        done()
      })
    })
  })
})
