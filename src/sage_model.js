import sage from '../build/sage';
import sageUtil from '../build/sage_util';

var model = function(name, schema) {
  return class Model {
    constructor(props, initName, initSchema) {
      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;
      
      this._schema = initSchema || schema;

      this._props = props || {};

      this.errors = [];
    }

    // **** BEGIN STATIC
    static findById(value) {
      var pk = schema.primaryKey;
      var data = {
        value: value
      }
      let sql = `SELECT * FROM ${name} WHERE ${pk}=:value ORDER BY ID DESC FETCH FIRST 1 ROWS ONLY`

      console.log(sql)
      return new Promise(function(resolve, reject) {
        resolve();
      })
      // let template = _.template('SELECT * ${table} (${fields}) VALUES (${keys})');
    }

    static create(props = {}) {
      let m = new this(props, name, schema);
      return new Promise(function(resolve, reject) {
        if(!m.valid) {
          reject(m);
        } else {
          let sql = sageUtil.getInsertSQL(m.name, m.schema);
          let values = m.normalized
          console.log(values)
          console.log(sql)

          // sage.connection.execute(sql, values, function(err, result) {
          //   if(err) {
          //     console.log(err);
          //     reject();
          //   } else {
          //     sage.connection.commit(function(err, result) {
          //       if(err) { console.log(err); reject(); }
          //       fulfill();
          //     })
          //   }
          // })
          // console.log()
          // console.log(m.normalized);
          // console.log(sage.connection)
          resolve(m);
        }
      })
    }
    // **** END STATIC    
    get normalized() {
      let result = {};
      for(let key in this.schema.definition) {
        let value = this._props[key];
        if(value === undefined) {
          value = null;
        }
        result[key] = value;
      }
      return result;
    }

    get schema() {
      return this._schema;
    }
    get name() {
      return this._name;
    }
    // Return a property
    get(key) {
      return this._props[key];
    }
    // Set a property
    set(key, value) {
      if(typeof key === 'object') {
        for(let k in key) {
          this._props[k] = key[k];
        }
      } else {
        this._props[key] = value;
      }
    }
    clearErrors() {
      this.errors = [];
    }

    errorPromise() {
     return new Promise(function(resolve, reject) {
        reject(this.errors);
      })      
    }

    save() {
      // Insert if there is no ID set.
      if(!this.valid) { return this.errorPromise };

    }
    // Check against schema if it is valid
    get valid() {
      this.clearErrors();
      let isValid = true;
      for(let key in this.schema.definition) {
        let schemaProps = this.schema.definition[key];
        let value = this._props[key];

        // Don't check if the value is null
        if(value == null) {
          continue;
        }

        // Basic Type Checks
        let valid = null;
        let error = null;        
        switch(schemaProps.type) {
          case "number":
            valid = typeof(value) === "number";
            error = `${key} is not a number`;
            break;
          case "date":
            valid = moment(value, schemaProps.format).isValid();
            error = `${key} is not a date`;
            break;     
          case "varchar":
            valid = typeof(value) === "string";       
            error = `${key} is not a varchar`
            if(schemaProps.enum) {
              valid = schemaProps.enum.values.indexOf(value) > -1;
              error = `${key} is not in enum`
            }
            break;
        }
        // Make invalid if it fails type check
        if(!valid) { 
          this.errors.push(error); 
          isValid = false;
        }

        // Custom Validator Checks
        if(schemaProps.validator) {
          let valid = schemaProps.validator(value);

          // Make invalid if it fails validator
          if(!valid) {
            this.errors.push(`${key} fails validator`);
            isValid = false; 
          }
        }
      }
      return isValid;
    }
  }
}
module.exports = model;