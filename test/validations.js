const assert = require('assert');
const sage = require('../build/sage');

let schema;

describe('validators', () => {
  describe('varchar', () => {
    before(() => {
      schema = new sage.Schema({
        id: 'number',
        name: {
          type: 'varchar',
          minlength: 1,
          maxlength: 5,
        },
      });
    });
    it('validates minlength', () => {
      const User = sage.model('User', schema);
      const user = new User({
        name: '',
      });

      assert.equal(user.valid, false);
      user.set('name', 'bob');
      user.valid;
      assert.equal(user.valid, true);
    });

    it('validates maxlength on undefined value', () => {
      const userSchema = new sage.Schema({
        id: 'number',
        name: {
          type: 'varchar',
          maxlength: 5,
        },
      });
      const User = sage.model('User', userSchema);
      const user = new User();

      assert.equal(user.valid, true);
    });

    it('validates maxlength', () => {
      const User = sage.model('User', schema);
      const user = new User({
        name: 'over5characters',
      });
      assert.equal(user.valid, false);
      user.set('name', 'bob');
      assert.equal(user.valid, true);
    });
  });

  describe('clob', () => {
    before(() => {
      schema = new sage.Schema({
        id: 'number',
        bio: {
          required: true,
          type: 'clob',
          minlength: 5,
          maxlength: 100,
        },
      });
    });
    it('validates', () => {
      const User = sage.model('User', schema);
      const user = new User({
        bio: 'Hello world',
      });

      assert.equal(user.valid, true);
    });

    it('validates minlength', () => {
      const User = sage.model('User', schema);
      const user = new User({
        bio: '123',
      });

      assert.equal(user.valid, false);
    });
    it('validates maxlength', () => {
      const User = sage.model('User', schema);
      const user = new User({
        bio:
          'tenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletterstenletters',
      });

      assert.equal(user.valid, false);
    });
  });

  describe('number', () => {
    before(() => {
      schema = new sage.Schema({
        id: 'number',
        age: {
          required: true,
          type: 'number',
          min: 10,
          max: 20,
        },
      });
    });
    it('validates min', () => {
      const User = sage.model('User', schema);
      const user = new User();

      assert.equal(user.valid, false);
      user.set('age', 5);
      assert.equal(user.valid, false);
      user.set('age', 10);
      assert.equal(user.valid, true);
    });
    it('validates max', () => {
      const User = sage.model('User', schema);
      const user = new User();

      assert.equal(user.valid, false);
      user.set('age', 30);
      assert.equal(user.valid, false);
      user.set('age', 20);
      assert.equal(user.valid, true);
    });
  });

  describe('enum', () => {
    it('validates error', () => {
      schema = new sage.Schema({
        id: 'number',
        gender: {
          type: 'varchar',
          enum: {
            values: ['M', 'F'],
          },
        },
      });

      const User = sage.model('User', schema);
      const user = new User({
        gender: 'X',
      });

      assert.equal(user.valid, false);
      assert.equal(user.errors[0], 'key: gender, value: X, is not in enum');
      user.set('gender', 'M');
      assert.equal(user.valid, true);
    });
  });

  describe('timestamp', () => {
    it('does not throw moment error', () => {
      schema = new sage.Schema({
        id: 'number',
        created_at: {
          type: 'timestamp',
          format: 'YY-MMM-DD HH:mm:ss.SS',
        },
      });

      const User = sage.model('User', schema);
      const user = new User({
        created_at: 'Jan 10 1980',
      });
    });
  });

  describe('date', () => {
    it('does not throw moment error', () => {
      schema = new sage.Schema({
        id: 'number',
        created_at: {
          type: 'date',
          format: 'YY-MMM-DD HH:mm:ss.SS',
        },
      });

      const User = sage.model('User', schema);
      const user = new User({
        created_at: '1/1/1',
      });

      assert.equal(user.valid, true);
    });
    it('fails if bad date', () => {
      schema = new sage.Schema({
        id: 'number',
        created_at: {
          type: 'date',
          format: 'YY-MMM-DD HH:mm:ss.SS',
        },
      });

      const User = sage.model('User', schema);
      const user = new User({
        created_at: 'X',
      });

      assert.equal(user.valid, false);
    });
  });

  describe('create', () => {
    it('should throw error if not valid', (done) => {
      schema = new sage.Schema({
        id: 'number',
        name: {
          type: 'varchar',
          minlength: 1,
          maxlength: 5,
        },
      });

      const User = sage.model('User', schema);

      User.create({ name: '' })
        .then(() => {
          done('Failed. Should not create');
        })
        .catch((err) => {
          assert.ok(err.message);
          done();
        });
    });
  });
});
