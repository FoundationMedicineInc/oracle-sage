import Promise from 'bluebird';
import moment from 'moment';
import sageUtil from '../build/sage_util';
import sageSelectQuery from '../build/sage_select_query';
import _ from 'lodash';

var knex = require('knex')({ client: 'oracle' });

let model = function(name, schema, sage) {
  let modelClass = class Model {
    constructor(props, initName, initSchema) {
      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;
      
      this._schema = initSchema || schema;

      this._props = props || {};
      this._dirtyProps = {};

      this.errors = [];

      // queue for pending associations to be populated
      this._associations = []; 
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

    static select(columns) {
      return new sageSelectQuery(sage, name, this, columns);
    }

    static create(props = {}) {
      let m = new this(props, name, schema);
      return new Promise(function(resolve, reject) {
        if(!m.valid) {
          reject(m.errors);
        } else {
          let sql = sageUtil.getInsertSQL(m.name, m.schema);
          let values = m.normalized;

          sage.connection.execute(sql, values, function(err, result) {
            if(err) {
              console.log(err);
              reject(err);
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

    populate() {
      if(!this._associations.length) {
        this._associations = this._schema.associations;
      }

      if(this._associations.length) {
        return new Promise((resolve, reject) => {
          this._populate().then(function() {
            resolve();
          })        
        });
      } else {
        return new Promise(function(resolve, reject) {
          resolve();
        });
      }
    }

    _populate() {
      return new Promise((resolve, reject) => {
        let association = this._associations.shift();
        this.populateOne(association).then(()=> {
          if(this._associations.length) {
            this._populate().then(function() {
              resolve();
            });
          } else {
            resolve();
          }
        })        
      })
    }

    populateOne(association) {
      let self = this;
      let value = association.value;
      let model = sage.models[value.model];
      let associationModel = model.model;
      let associationSchema = model.schema;

      let sql = null;

      switch(value.joinType) {
        case "hasMany":
          sql = knex(value.joinsWith)
          .select('*')
          .where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine))
          .toString();
          break;
        case "hasAndBelongsToMany":
          sql = knex(value.joinsWith)
          .select('*').innerJoin(function() {
            this.select('*').
            from(value.joinTable).
            where(value.foreignKeys.mine, self.get(self._schema.primaryKey))
            .as('t1')
          }, `${value.joinsWith}.${associationSchema.primaryKey}`, `t1.${value.foreignKeys.theirs}`)
          .toString();
          break
        case "hasManyThrough":
          sql = knex(value.joinsWith)
          .select('*').innerJoin(function() {
            this.select('*').
            from(value.joinTable).
            where(value.foreignKeys.mine, self.get(self._schema.primaryKey))
            .as('t1')
          }, `${value.joinsWith}.${associationSchema.primaryKey}`, `t1.${value.foreignKeys.theirs}`)
          .toString();          
          break
        default:
          throw('unrecognized association'); 
      }

      return new Promise((resolve, reject) => {
        sage.connection.query(sql, (err, results) => {
          if(err) {
            console.log(err);
            reject();
          } else {
            let models = [];
            _.each(results, (result) => {
              models.push(new associationModel(result));
            });
            this._directSet(association.key, models)
            resolve();
          }
        })  
      })      
         
      
    }

    destroy() {
      return new Promise((resolve, reject) => {
        let pk = this.get(this._schema.primaryKey);
        if(!pk) { reject(); }
        
        let sql = knex(this._name)
        .where(this._schema.primaryKey, pk)
        .del()
        .toString();
        sage.connection.execute(sql, (err, results) => {
          if(err) {
            console.log(err);
            reject();
          } else {
            resolve();
          }
        })
      })
    }
    save() {
      return new Promise((resolve, reject) => {
        if(!this.get(this._schema.primaryKey)) {
          console.log("No primary key. Use")
          reject();
        }

        if(this.valid) {
          // save it to the database
          let pk = schema.primaryKey;

          let result = sageUtil.getUpdateSQL(this.dirtyProps);
          let sql = `UPDATE ${name} SET ${result.sql} WHERE ${pk}=:${pk}`

          sql = sageUtil.amendDateFields(this.schema, sql);
          result.values[pk] = this.get(pk);

          // console.log(sql, result.values)
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
        let value;

        switch(this.schema.definition[key].type) {
          case 'date':
            let format = this.schema.definition[key].format;
            let date = this.get(key);
            if(date) {
              try {
                value = moment(date, format).format(format);
              } catch(e) {
                value = moment(date).format(format);
              }
            } 
            break;
          default: 
            value = this.get(key)
        }

        if(this.schema.definition[key].type != 'association') {
          result[key] = value;
        }
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

    unset(key) {
      this._dirtyProps[key] = undefined;
      this._props[key] = undefined; 
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

    // Set a property directly to props
    _directSet(key, value) {
      this._props[key] = value;
    }    
    
    clearErrors() {
      this.errors = [];
    }

    // Special JSON that sends lowercase
    // and will recieve lowercase and convert to uppercase
    toJSON() {
      var result = {};
      for(let k in this._props) {
        result[k.toLowerCase()] = this._props[k];
      }
      
      // translate population
      _.each(this._schema.associations, function(association) {
        let key = association.key.toLowerCase();
        let models = result[key];
        let modelsJSON = [];
        _.each(models, function(model) {
          modelsJSON.push(model.toJSON());
        });
        result[key] = modelsJSON;        
      });
      
      return result;
    }

    setFromJSON(json) {
      for(let k in json) {
        let value = json[k];
        this.set(k.toUpperCase(), value);
      }
    }

    // get json() {
    //   var result = {};
    //   for(let k in this._props) {
    //     result[k.toLowerCase()] = this._props[k];
    //   }
      
    //   // translate population
    //   _.each(this._schema.associations, function(association) {
    //     let key = association.key.toLowerCase();
    //     let models = result[key];
    //     let modelsJSON = [];
    //     _.each(models, function(model) {
    //       modelsJSON.push(model.json);
    //     });
    //     result[key] = modelsJSON;        
    //   });
      
    //   return result;
    // }
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
            error = `${key} is not a clob`;
            break;           
          case "char":
            valid = typeof(value) === "string";
            error = `${key} is not a char`
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

  // Store them in sage as they get created
  sage.models[name] = {
    model: modelClass,
    schema: schema
  }

  return(modelClass);
}

module.exports = model;