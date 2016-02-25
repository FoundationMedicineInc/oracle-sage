<p align="center">
  <img src="http://i.imgur.com/TR5LYwo.png" alt="sagee"/>
</p>

<h1 align="center">Oracle Sage</h1>
<p align="center">Promise driven OracleDB object modeling for node.js</p>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Install & Require](#install-&-require)
- [Debugging](#debugging)
- [Connect](#connect)
- [Defining Schemas](#defining-schemas)
- [Schema Validations](#schema-validations)
- [Initialize](#initialize)
- [Creation](#creation)
- [Updating](#updating)
- [Querying](#querying)
      - [findById(value)](#findbyidvalue)
      - [findOne({})](#findone)
      - [count({})](#count)
      - [select()](#select)
- [Model Methods](#model-methods)
      - [get](#get)
      - [set](#set)
      - [unset](#unset)
      - [toJSON/setFromJSON](#tojsonsetfromjson)
      - [destroy](#destroy)
- [Model Properties](#model-properties)
      - [id](#id)
      - [valid](#valid)
      - [errors](#errors)
- [Extending Models](#extending-models)
      - [statics({})](#statics)
      - [methods({})](#methods)
- [Associations and Population](#associations-and-population)
  - [hasOne](#hasone)
  - [hasMany](#hasmany)
  - [hasManyThrough](#hasmanythrough)
  - [hasAndBelongsToMany](#hasandbelongstomany)
- [Going Raw](#going-raw)
      - [Connection](#connection)
      - [Knex](#knex)
- [Other Examples](#other-examples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install & Require

`$ npm install oracle-sage`

```javascript
var sage = require('oracle-sage');
```

## Debugging

For more verbose outputs, set `sage.debug` to true.

```javascript
var sage = require('oracle-sage');
sage.debug = true;
```

## Connect

```javascript
var auth = {
  user: "system",
  password: "oracle"
}
sage.connect("127.0.0.1:1521/orcl", auth).then(function() {
  // do something...
});

```

## Defining Schemas

```javascript
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

Methods:

- getDefinition(field) - Returns a the definition for a given field


## Schema Validations

The following validation properties are supported:
    
- all types
  - `required` - do not use this on PK due to a bug for now
  - `validator(value)` - a custom function validator

- number
  - `min`
  - `max`
- varchar
  - `minlength`
  - `maxlength` 
- clob
  - `minlength`
  - `maxlength`
  
```javascript
var userSchema = sage.Schema({
  ID: "number",
  USERNAME: {
    required: true,
    type: "varchar",
    maxlength: 12,
    minlength: 4,
    validator: function(value) {
      return /^[a-zA-Z]+$/.test(value); // test only letters
    }    
  }
})
``` 

## Initialize

```javascript
var userTable = "users"; // use the table name in the database
var User = sage.model(userTable, userSchema);
```

## Creation

```javascript
User.create({ USERNAME: "example" });
```

Notes: 

In the schema you can set a field to be `readonly`. This will disable it from being written to on creation.

There is a special case for autoincrement where you might not be able to use triggers to toggle autoincrement fields (eg. if you use Hibernate). The circumvent this, add a `sequenceName` property.

eg.

```javascript
sage.Schema({
  ID: {
    type: "number",
    sequenceName: "SAGE_TEST.SEQUENCE_NO_TRIGGER_SEQUENCE_N",
    readonly: true
  }
  ...
});
```

## Updating

Updating will only update modified fields.

```javascript
User.findOne({ username: "example" }).then(function(user) {
  user.set("username", "bob");
  user.save().then(function() {
    // do something
  });
})
```

## Querying

A list of current querying options. Note that querying returns models.

##### findById(value)

Finds model based on `value` against the schema primary key

##### findOne({})

Accepts `{}` which transforms into **AND** conditions. Returns the first item, and the SELECT is ORDERED BY the schema primary key.

Returns `null` if nothing is found. Otherwise returns a result represented in the model.

```javascript
User.findOne({ USERNAME: example, GENDER: 'M'}).then(function(resultModel) {
  var user = resultModel;
  user.get('GENDER') // value is "M"
})
```

##### count({})

Accepts optional `{}` which transforms into **AND** conditions. Returns the count.

```javascript
User.count({ USERNAME: example }).then(function(count) { ... })
```

##### select()

A chainable query builder based off Knex. See [Knex](http://knexjs.org/) for the full API usage.

```javascript
User.select() // same as select('*')
.where('USERNAME', 'example')
.limit(1)
.exec().then(function(resultsAsModels) {
  resultsAsModels[0].get('USERNAME') // value is "example"
})
```

## Model Methods

##### get

Get a property. 

```javascript
user.get('USERNAME'); // returns "example" (based off above schema)
```

##### set

Set a property.

```javascript
user.set('USERNAME', 'alice');
user.set({ 'USERNAME': 'alice', 'GENDER': 'F');
```
##### unset

Sets the attribute value to `undefined`. Does NOT delete the attribute.

```javascript
user.unset('USERNAME') // username is now undefined
```

##### toJSON/setFromJSON

Sends a lowercased version to client, and will set from a JSON and convert all key fields to uppercase. This are two useful things because OracleDBs are typically uppercase, yet client work is usually lowercase.

```javascript
user.toJSON() // outputs json with uppercased keys
user.setFromJSON() // will set props based and will uppercase the keys
```

##### destroy

Delete the record from database

```javascript
user.destroy().then(function(){});
```

## Model Properties

##### id

Quick way to see the primary key ID of a model.

```javascript
user.id // Whatever the primary key value is set to
```

##### valid

```javascript
user.set('USERNAME', 12345);
user.valid // false
user.set('USERNAME', 'example');
user.valid // true
```

##### errors

```javascript
user.errors // []
user.set({'USERNAME': 12345, GENDER: 'xyz');
user.valid // false
user.errors // ['USERNAME fails validator', 'GENDER is not in enum']
```

## Extending Models

You can add methods both on the constructor and instances of a model.

##### statics({})

Add functions directly to the constructor.

```javascript
var User = sage.model("user");
User.statics({
  findByEmail: function(email) {
    return new Promise(function(resolve, reject) {
      User.findOne({ email: email }).then(function(result) { 
        resolve(result);
      });
    }); 
  }
})

User.findByEmail("mrchess@example.com").then(...)
```

##### methods({})


Add functions directly to an instance.

```javascript
var User = sage.model("user");
User.methods({
  fullname: function() {
    return(this.get('first') + this.get('last'));
  }
})

user = new User({ first: "Mr", last: "chess" });
user.fullname(); // Mrchess
```

## Associations and Population

- Associations and naming conventions are Rails inspired.
- You must `.populate()` a model in order to load the associations.
- Saving will only save the original schema, and does not impact associations.

Supports:
- [hasOne](http://guides.rubyonrails.org/association_basics.html#has-one-association-reference)
- [hasMany](http://guides.rubyonrails.org/association_basics.html#the-has-many-association)
- [hasManyThrough](http://guides.rubyonrails.org/association_basics.html#the-has-many-through-association)
- [hasAndBelongsToMany](http://guides.rubyonrails.org/association_basics.html#the-has-and-belongs-to-many-association)

The following examples satisfies the displayed database designs. The pictures are from rails so the field types in the pictures are not the exact Oracles equivilant.

### hasOne

![](http://i.imgur.com/YSv19qq.png)


```javascript
var supplierSchema = new sage.Schema({ 
  id: "number",
  name: "varchar"
  // Note this that you can really call this whatever you want. account, accounts, meta, whatever.
  account: { 
    type: "association",
    joinType: "hasOne",
    joinsWith: "accounts",
    foreignKeys: {
      mine: "id",
      theirs: "supplier_id"
    },
    model: 'accounts'
}, {
  primaryKey: "id"
});

var accountSchema = new sage.Schema({
  id: "number",
  supplier_id: "number",
  account_number: "varchar
});

```

### hasMany

![](http://i.imgur.com/t3e1YFf.png)

```javascript
var customersSchema = new sage.Schema({ 
  id: "number",
  name: "varchar"
  orders: {
    type: "association",
    joinType: "hasMany",
    joinsWith: "orders",
    foreignKeys: {
      mine: "id",
      theirs: "customer_id"
    },
    model: 'orders'
}, {
  primaryKey: "id"
});

var ordersSchema = new sage.Schema({
  id: "number",
  customer_id: "number",
  order_date: {
    type: "date",
  format: "MM/DD/YYYY"
  }
});

```

### hasManyThrough

![](http://i.imgur.com/Bb05jN1.png)

```javascript
var physicianSchema = new sage.Schema({ 
  id: "number",
  name: "varchar"
  patients: {
    type: "association",
    joinType: "hasManyThrough",
    joinTable: "appointments",
    joinsWith: "patients",
    foreignKeys: { // foreign keys in the association table
      mine: 'physician_id',
      theirs: 'patient_id'
    },
    model: 'patients' // what model to cast in to when results are returned
  }
}, {
  primaryKey: "id"
});

// It is not necessary to put the association here unless you want to populate 
// physicians on a patient model
var patientSchema = new sage.Schema({
  id: "number",
  name: "varchar"
}, {
  primaryKey: "id"
})

// Create the models
var Physician = sage.model("physicians", physicianSchema);
var Patient = sage.model("patients", patientSchema);

// Example usage
Physician.findById(1).then(function(physician) {
  physician.populate().then(function() {
    physician.get('patients').length; // value would be how ever many patients were returned
    var patient = physician.get('patients')[0]; // get the first patient
    patient.get('name') // return patient name
  })
})

```

### hasAndBelongsToMany

![](http://i.imgur.com/fj6KKBB.png)

```javascript
var assemblySchema = new sage.Schema({ 
  id: "number",
  name: "varchar"
  parts: {
    type: "association",
    joinType: "hasAndBelongsToMany",
    joinTable: "assemblies_parts",
    joinsWith: "parts",
    foreignKeys: { // foreign keys in the association table
      mine: 'assembly_id',
      theirs: 'part_id'
    },
    model: 'parts' // what model to cast in to when results are returned
  }
}, {
  primaryKey: "id"
});

// It is not necessary to put the association here unless you want to populate 
// assemblies on a parts model
var partsSchema = new sage.Schema({
  id: "number",
  part_number: "varchar"
}, {
  primaryKey: "id"
})

// Create the models
var Assembly = sage.model("assemblies", assemblySchema);
var Part = sage.model("parts", partsSchema);

// Example usage
Assembly.findById(1).then(function(assemblyModel) {
  assemblyModel.populate().then(function() {
    assemblyModel.get('parts'); // array of Part models
  })
)}

```

## Going Raw

##### Connection

You can directly access the `node-oracledb` connection at:

`sage.connection`.

This is a direct exposure of:
https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-42-connection-methods


##### Knex

Knex is directly exposed in sage as well through `sage.knex`. 
See [Knex](http://knexjs.org/) for the full API usage.

Knex is strictly used for query building. You can use it with the raw connection. For example:

```javascript
var query = sql sage.knex.select().from('user').toString();
sage.connection.execute(query, function() { ... })
```

See [Knex](http://knexjs.org/) for the full API usage.

## Other Examples

Basic example of some common functionality.
```javascript
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