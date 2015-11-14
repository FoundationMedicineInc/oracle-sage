<h1 align="center">Oracle Sage</h1>
<p align="center">
  <img src="http://i.imgur.com/TR5LYwo.png" alt="sagee"/>
</p>

*WARNING (11/14/2015): DO NOT USE THIS PACKAGE. I put it here so I can continue to test it. This is a skeleton of an idea, and I'm not even sure if it all works. Wait until this message is removed before using.*

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


## Associations and Population

Associations and naming conventions are Rails inspired.

You must `.populate()` a model in order to load the associations.

*Saving will only save the original schema, and does not impact associations.*

Supports:

- [hasMany :through](http://guides.rubyonrails.org/association_basics.html#the-has-many-through-association)

##### hasMany :through

The following example satisfies this database. This picture is from rails, but I am just replacing it with the equivilant Oracle type values.

![](http://i.imgur.com/Bb05jN1.png)

```
var physicianSchema = new sage.Schema({ 
  id: "number",
  name: "varchar"
  patients: {
    type: "association",
    hasMany: "patients",
    through: "appointments",
    foreignKeys: { // foreign keys in the association table
      mine: 'physician_id',
      theirs: 'patient_id'
    },
    model: 'Patient' // what model to cast in to when results are returned
  }
}, {
  primaryKey: "id"
});

// It is not necessary to put the association here unless you want to populate physicians on a patient model
var patientSchema = new sage.Schema({
  id: "number",
  name: "varchar"
}, {
  primaryKey: "id"
})

// Create the models
var Physician = sage.model("physicians", physicianSchema);
var Patient = sage.model("patients", patientSchema);

// Example fetch

Physician.findById(1).then(function(physician) {
  physician.populate().then(function() {
    physician.get('patients').length; // value would be how ever many patients were returned
    var patient = physician.get('patients')[0]; // get the first patient
    patient.get('name') // return patient name
  })
})


```

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

Querying returns a new model.

##### findBydId(value)

Finds model based on `value` against the set primary key

##### findOne({})

Accepts `{}` which transforms into **AND** conditions.

```
User.findOne({ USERNAME: example, GENDER: 'M'}).then(function(result) {
  var user = result;
  user.get('GENDER') // value is M
})
```

##### select()

A chainable query builder based off Knex. See [Knex](http://knexjs.org/) for the full API usage.

```
User.select("*").where('USERNAME', 'example').limit(1).then(function(results) {
  results[0].get('USERNAME') // value is example
})
```

##### sage.connection 
*!DANGER*

Last resort. You can get access to the raw connection here, and then perform operations as documented in the `node-oracledb` API. You probably don't want to use this though. This is NOT wrapped in a Promise.

```
sage.connection.execute("SELECT * FROM users", function(err, result) {
  // do something
});
```
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