const assert = require('assert');
const sage = require('../build/sage');

let schema;

describe('schemas', () => {
  it('should accept of schemas without type', () => {
    schema = new sage.Schema({
      id: 'number',
    });
    assert.equal(schema.definition.id.type, 'number');
  });
  it('should accept of schemas with a type', () => {
    schema = new sage.Schema({
      id: { type: 'varchar' },
    });
    assert.equal(schema.definition.id.type, 'varchar');
  });
});

describe('schemas', () => {
  it('should get a key definition', () => {
    const tempschema = new sage.Schema({
      id: 'number',
    });
    const Temp = sage.model('Temp', tempschema);
    assert(Temp.schema.getDefinition('id'));
    assert.equal(Temp.schema.getDefinition('abc'), undefined);
  });
});

describe('models', () => {
  before(() => {
    schema = new sage.Schema(
      {
        id: {
          type: 'number',
          readonly: true,
        },
        created_at: {
          type: 'timestamp',
          readonly: true,
        },
        name: {
          type: 'varchar',
          validator(v) {
            return v === 'bob';
          },
        },
        age: {
          type: 'number',
        },
        gender: {
          type: 'char',
          enum: {
            values: 'M F'.split(' '),
          },
        },
        is_single: 'char',
      },
      {
        primaryKey: 'id',
      }
    );
  });

  it('should have access to the schema as a static', () => {
    const User = sage.model('User', schema);
    assert(User.schema);
  });

  it('should add methods', () => {
    const User = sage.model('User', schema);
    User.methods({
      hello() {},
    });
    const user = new User();
    assert(user.hello);
  });

  it('should clobber methods from another schema methods', () => {
    const User = sage.model('User', schema);
    const Guest = sage.model('Guest', schema);
    User.methods({
      hello() {
        return 'userHello';
      },
    });
    Guest.methods({
      hello() {
        return 'guestHello';
      },
    });
    const user = new User();
    const guest = new Guest();
    assert.equal(user.hello(), 'userHello');
    assert.equal(guest.hello(), 'guestHello');
  });

  it('should add statics', () => {
    const User = sage.model('User', schema);
    User.statics({
      hello() {},
    });
    assert(User.hello);
  });

  it('get an primary key id', () => {
    const User = sage.model('User', schema);
    user = new User();
    user.set('id', 5);
    assert.equal(user.id, 5);
  });

  it('should run a validator', () => {
    const User = sage.model('User', schema);
    const user = new User({
      name: 'alice',
    });
    assert.equal(user.valid, false);
    user.set('name', 'bob');
    assert.equal(user.valid, true);
  });

  it('should validate enum', () => {
    const User = sage.model('User', schema);
    const user = new User({
      name: 'bob',
      gender: 'dog',
    });
    assert.equal(user.valid, false);
    user.set('gender', 'M');
    assert.equal(user.valid, true);
  });

  it('should validate char', () => {
    const User = sage.model('User', schema);
    const user = new User({
      name: 'bob',
      gender: 'M',
      is_single: 5,
    });
    assert.equal(user.valid, false);
    user.set('is_single', 'Y');
    assert.equal(user.valid, true);
  });

  it('should validate char', () => {
    const User = sage.model('User', schema);
    const user = new User({
      name: 'bob',
      gender: '',
    });
    assert.equal(user.valid, false);
  });

  it('should normalize', () => {
    const User = sage.model('User', schema);
    const user = new User({ name: 'alice' });
    assert.equal(user.normalized.id, null);
    assert.equal(user.normalized.name, 'alice');

    user.set('age', '100');
    assert.equal(user.normalized.age, 100);
  });

  it('should not modify numbers', () => {
    const User = sage.model('User', schema);
    const bob = new User({ name: 'bob' });
    const alice = new User({ name: 'alice' });

    bob.set('age', '50.75');
    assert.equal(bob.normalized.age, '50.75');

    alice.set('age', 80.9);
    assert.equal(alice.normalized.age, 80.9);
  });

  it('should not have a readonly field in normalize', () => {
    const User = sage.model('User', schema);
    const user = new User({
      name: 'alice',
      created_at: 'today',
    });
    assert.equal(user.normalized.created_at, undefined);
  });

  it('should unset', () => {
    const User = sage.model('User', schema);
    const user = new User({ name: 'alice' });
    user.unset('name');
    assert.equal(user.get('name'), null);
  });
});
