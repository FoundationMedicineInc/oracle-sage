import Promise from 'bluebird';
import moment from 'moment';
import sageUtil from '../build/sage_util';
import _ from 'lodash';

let model = function(name, schema, sage) {
  return class Model {
    constructor(props, initName, initSchema) {
      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;
      
      this._schema = initSchema || schema;

      this._props = props || {};
      this._dirtyProps = {};

      this.errors = [];
    }

    mergeProps() {
      this._props = _.assign(this._props, this._dirtyProps);
      this._dirtyProps = {};
    }

    // **** BEGIN STATIC
    // Uses the primary key definition and returns the first row on that
    static findById(value) {
      let self = this;
      let pk = schema.primaryKey;
      let data = {
        value: value
      }
      let sql = `SELECT * FROM ${name} WHERE ${pk}=:value ORDER BY ${pk} DESC FETCH FIRST 1 ROWS ONLY`
      return new Promise(function(resolve, reject) {
        sage.connection.query(sql, data, function(err, result) {
          if(err) {
            console.log(err);
            reject();
          } else {
            let row = null;
            if(result.length) { row = new self(result[0], name, schema); }
            resolve(row)
          }
        })
      })
    }

    // **** BEGIN STATIC
    // AND'd find, returns the first result
    static findOne(values = {}) {
      let self = this;
      let pk = schema.primaryKey;
      let result = sageUtil.getSelectANDSQL(values);
      let sql = `SELECT * FROM ${name} WHERE ${result.sql} ORDER BY ${pk} DESC FETCH FIRST 1 ROWS ONLY`
      return new Promise(function(resolve, reject) {
        sage.connection.query(sql, result.values, function(err, result) {
          if(err) {
            console.log(err);
            reject();
          } else {
            let row = null;
            if(result.length) { row = new self(result[0], name, schema); }
            resolve(row)
          }

        })
      })
    }    

    // Raw SQL query
    static query(query, values = []) {
      return new Promise(function(resolve, reject) {
        sage.connection.query(query, values, function(err, result) {
          if(err) {
            console.log(err);
            reject();
          } else {
            resolve(result)
          }
        })
      })      
    }

    static create(props = {}) {
      let m = new this(props, name, schema);
      return new Promise(function(resolve, reject) {
        if(!m.valid) {
          reject();
        } else {
          let sql = sageUtil.getInsertSQL(m.name, m.schema);
          let values = m.normalized;

          sage.connection.execute(sql, values, function(err, result) {
            if(err) {
              console.log(err);
              reject();
            } else {
              sage.connection.commit(function(err, result) {
                if(err) { console.log(err); reject(); }
                resolve(true);
              })
            }
          });
        }
      })
    }
    // **** END STATIC    

    save() {
      return new Promise((resolve, reject) => {
        if(this.valid) {
          // save it to the database
          let pk = schema.primaryKey;

          let result = sageUtil.getUpdateSQL(this.dirtyProps);
          let sql = `UPDATE ${name} SET ${result.sql} WHERE ${pk}=:${pk}`
          sql = sageUtil.amendDateFields(this.schema, sql);
          result.values[pk] = this.get(pk);

          sage.connection.execute(sql, result.values, (err, result) => {
            if(err) {
              console.log(err);
              reject()
            } else {
              sage.connection.commit((err, result) => {
                if(err) { 
                  console.log(err); 
                  reject();
                } else {
                  this.mergeProps();
                  resolve();
                }
              })
            }
          });
        } else {
          reject();
        }
      });
    }

    // Goes through and returns an object with non-entries filled with NULL
    get dirtyProps() {
      return this._dirtyProps;
    }
    get normalized() {
      let result = {};
      for(let key in this.schema.definition) {
        let value = this.get(key);
        // if(value === undefined) {
        //   value = undefined;
        // }
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
      return this._dirtyProps[key] || this._props[key];
    }

    // Set a property
    set(key, value) {
      if(typeof key === 'object') {
        for(let k in key) {
          this._dirtyProps[k] = key[k];
        }
      } else {
        this._dirtyProps[key] = value;
      }
    }
    
    clearErrors() {
      this.errors = [];
    }

    // Check against schema if it is valid
    get valid() {
      this.clearErrors();
      let isValid = true;
      for(let key in this.schema.definition) {
        let schemaProps = this.schema.definition[key];
        let value = this.get(key);

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
          case "clob":
            valid = true;
            error = `${key} is not a clob`            
          case "char":
            valid = typeof(value) === "string";
            error = `${key} is not a char`
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