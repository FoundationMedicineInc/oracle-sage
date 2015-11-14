-> ![](http://i.imgur.com/wYE7vS5.png =100x100) <-

# Oracle Sage

*WARNING: DO NOT USE THIS PACKAGE. I put it on NPM so I can continue to test it and I couldn't make it private. Wait at least a week or two before using this as I will probably change a lot of stuff.*

Promise driven object modeling for OracleDB.

## Install & Require

`$ npm install oracle-sage`

```
var sage = require('oracle-sage');
```

## Connect

```
var auth = {
  user: "system",
  password: "oracle"
}
sage.connect("127.0.0.1:1521/orcl", auth).then(function() {
  // do something...
});

```

## Defining Schemas

```
var userSchema = sage.Schema({
  ID: "number",
  CREATED_AT: {
    type: "date",
    format: "MM/DD/YYYY"
  },  
  USERNAME: {
    type: "varchar"
    validator: function(value) {
      return /^[a-zA-Z]+$/.test(value); // test only letters
    },    
  },
  GENDER: {
    type: "char",
    enum: {
      values: ['M', 'F']
    }
  },
  BIO: "clob"
}, {
  primaryKey: "ID"
})
```

Supports types:

- number
- char
- date
- varchar
- clob

Special features:

- enum 
- validators

## Initialize

```
var userTable = "users";
var User = sage.model(userTable, userSchema);
```

## Creation

```
User.create({ USERNAME: "example" });
```

## Updating

Updating will only update modified fields.

```
User.findOne({ username: "example" }).then(function(user) {
  user.set("username", "bob");
  user.save().then(function() {
    // do something
  });
})
```

## Querying

##### findBydId(value)

Finds model based on `value` against the set primary key

##### findOne({})

Accepts `{}` which transforms into **AND** conditions.

```
User.findOne({ USERNAME: example, GENDER: 'M'})
```

##### execute(query = "", values = {})

Runs a raw Oracle query. Promise wrapper around `connection.query` from `simple-oracledb`

## Model Methods

##### get

```
user.get('USERNAME');
```

##### set

```
user.set('USERNAME', 'alice');
user.set({ 'USERNAME': 'alice', 'GENDER': 'F');
```

## Model Properties


##### valid

```
user.set('USERNAME', 12345);
user.valid // false
user.set('USERNAME', 'example');
user.valid // true
```

##### errors

```
user.errors // []
user.set({'USERNAME': 12345, GENDER: 'xyz');
user.valid // false
user.errors // ['USERNAME fails validator', 'GENDER is not in enum']
```

## Example

```
var user;

User.create({USERNAME: "example"}).then(function() {
  return User.findOne({USERNAME: "example"});
}).then(function(resultModel) {
  user = resultModel;  
  user.get('USERNAME'); // example
  user.set('USERNAME', 'alice');
  return user.save();
}).then(function() {
  user.get('USERNAME'); // alice
});
            
```