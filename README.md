<p align="center">
  <img src="http://i.imgur.com/TR5LYwo.png" alt="sagee"/>
</p>

<h1 align="center">Oracle Sage</h1>
<p align="center">Promise driven object modeling for OracleDB.</p>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Install & Require](#install-&-require)
- [Connect](#connect)
- [Defining Schemas](#defining-schemas)
- [Initialize](#initialize)
- [Creation](#creation)
- [Updating](#updating)
- [Querying](#querying)
      - [findById(value)](#findbyidvalue)
      - [findOne({})](#findone)
      - [select()](#select)
- [Model Methods](#model-methods)
      - [get](#get)
      - [set](#set)
- [Model Properties](#model-properties)
      - [valid](#valid)
      - [errors](#errors)
- [Associations and Population](#associations-and-population)
  - [hasMany](#hasmany)
  - [hasManyThrough](#hasmanythrough)
  - [hasAndBelongsToMany](#hasandbelongstomany)
- [Other Examples](#other-examples)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Install & Require

`$ npm install oracle-sage`

```javascript
var sage = require('oracle-sage');
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

## Initialize

```javascript
var userTable = "users"; // use the table name in the database
var User = sage.model(userTable, userSchema);
```

## Creation

```javascript
User.create({ USERNAME: "example" });
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

Finds model based on `value` against the set primary key

##### findOne({})

Accepts `{}` which transforms into **AND** conditions.

```javascript
User.findOne({ USERNAME: example, GENDER: 'M'}).then(function(resultModel) {
  var user = resultModel;
  user.get('GENDER') // value is M
})
```

##### select()

A chainable query builder based off Knex. See [Knex](http://knexjs.org/) for the full API usage.

```javascript
User.select("*").where('USERNAME', 'example').limit(1).then(function(resultsAsModels) {
  resultsAsModels[0].get('USERNAME') // value is example
})
```

## Model Methods

##### get

```javascript
user.get('USERNAME'); // returns "example" (based off above schema)
```

##### set

```javascript
user.set('USERNAME', 'alice');
user.set({ 'USERNAME': 'alice', 'GENDER': 'F');
```

## Model Properties


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

## Associations and Population

- Associations and naming conventions are Rails inspired.
- You must `.populate()` a model in order to load the associations.
- Saving will only save the original schema, and does not impact associations.

Supports:

- [hasMany](http://guides.rubyonrails.org/association_basics.html#the-has-many-association)
- [hasManyThrough](http://guides.rubyonrails.org/association_basics.html#the-has-many-through-association)
- [hasAndBelongsToMany](http://guides.rubyonrails.org/association_basics.html#the-has-and-belongs-to-many-association)

The following examples satisfies the displayed database designs. The pictures are from rails so the field types in the pictures are not the exact Oracles equivilant.

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