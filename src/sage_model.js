import Promise from 'bluebird'
import moment from 'moment'
import sageUtil from '../build/sage_util'
import sageSelectQuery from '../build/statics/select'
import _ from 'lodash'
import objectAssign from 'object-assign'
import async from 'async'

let model = function(name, schema, sage) {
  var _methods = {};
  let modelClass = class Model {
    constructor(props, initName, initSchema) {
      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name
      
      this._schema = initSchema || schema

      this._props = props || {}
      this._dirtyProps = {}

      this.errors = []

      // queue for pending associations to be populated
      this._associations = [] 

      // apply extensions
      objectAssign(this, _methods)

      require('./methods/populate')(this, name, schema, sage);
    }

    mergeProps() {
      this._props = _.assign(this._props, this._dirtyProps)
      this._dirtyProps = {}
    }

    static statics(object) {
      objectAssign(this, object)
    }

    static methods(object) {
      _methods = _.extend(_methods, object)
    }

    // Generates a string of all the fields defined in the schema to replace a * in a SELECT *
    // We do this because tables with SDO_GEOMETRY fields or custom fields cannot currently be understood by Sage
    static _selectAllStringStatic() {
      let fields = []
      for(let key in schema.definition) {
        if(schema.definition[key].type != 'association') {
          fields.push(`${name}.${key}`)
        }
      }
      return fields.join(',')
    }

    static select(columns) {
      // Always pass in columns
      if(!columns) {
        columns = this._selectAllStringStatic().split(',')
      }
      return new sageSelectQuery(sage, name, this, columns)
    }
    // **** END STATIC    

    destroy() {
      return new Promise((resolve, reject) => {
        let pk = this.get(this._schema.primaryKey)
        if(!pk) { 
          sage.log("Missing primary key on destroy. Who do I destroy?")
          reject() 
        }
        
        let sql = sage.knex(this._name)
        .where(this._schema.primaryKey, pk)
        .del()
        .toString()
        sage.connection.execute(sql, (err, results) => {
          if(err) {
            sage.log(err)
            reject()
          } else {
            sage.connection.commit((err, result) => {
              if(err) { 
                sage.log(err) 
                reject()
              } else {
                resolve()
              }
            })            
          }
        })
      })
    }
    save() {
      return new Promise((resolve, reject) => {
        if(!this.get(this._schema.primaryKey)) {
          sage.log("No primary key. Use")
          reject()
        }

        if(this.valid) {
          // save it to the database
          let pk = schema.primaryKey

          let result = sageUtil.getUpdateSQL(this.dirtyProps)
          let sql = `UPDATE ${name} SET ${result.sql} WHERE ${pk}=:${pk}`

          sql = sageUtil.amendDateFields(this.schema, sql)
          sql = sageUtil.amendTimestampFields(this.schema, sql)
          result.values[pk] = this.get(pk)

          sage.log(sql, result.values);
          sage.connection.execute(sql, result.values, (err, result) => {
            if(err) {
              sage.log(err)
              reject()
            } else {
              sage.connection.commit((err, result) => {
                if(err) { 
                  sage.log(err) 
                  reject()
                } else {
                  this.mergeProps()
                  resolve()
                }
              })
            }
          })
        } else {
          sage.log("cannot save");
          reject()
        }
      })
    }

    // Goes through and returns an object with non-entries filled with NULL
    get dirtyProps() {
      return this._dirtyProps
    }

    get normalized() {
      let result = {}
      for(let key in this.schema.definition) {

        // Do not normalize read only fields
        if(this.schema.definition[key].readonly) {
          continue
        }

        let value

        switch(this.schema.definition[key].type) {
          case 'date':
            var format = this.schema.definition[key].format
            var date = this.get(key)
            if(date) {
              value = moment(date, format).format(format)
              if(value === "Invalid date") {
                value = moment(date).format(format) 
              }
            } 
            break
          case "timestamp":
            var format = this.schema.definition[key].format
            var date = this.get(key)
            if(date) {
              value = moment(date, format).format(format)
              if(value === "Invalid date") {
                value = moment(date).format(format) 
              }
            }
            break

          case "number":
            // Need this IF statement because what if the person does not have a 
            // read only primary key and is creating a new model? Usually they would pass
            // down NULL as the PK, and if we didn't have this it would parseInt(NULL)
            if(this.get(key) != null || this.get(key) != undefined) {
              value = parseInt(this.get(key))
            }
            break
          default: 
            value = this.get(key)
        }

        if(this.schema.definition[key].type != 'association') {
          if(!this.schema.definition[key].readonly) {
            result[key] = value
          }
        }
      }
      return result
    }

    get schema() {
      return this._schema
    }
    get name() {
      return this._name
    }

    get id() {
      return this.get(schema.primaryKey)
    }    

    // Return a property
    get(key) {
      return this._dirtyProps[key] || this._props[key]
    }

    unset(key) {
      this._dirtyProps[key] = undefined
      this._props[key] = undefined 
    }
    
    // Set a property
    set(key, value) {
      if(typeof key === 'object') {
        for(let k in key) {
          this._dirtyProps[k] = key[k]
        }
      } else {
        this._dirtyProps[key] = value
      }
    }

    // Set a property directly to props
    _directSet(key, value) {
      this._props[key] = value
    }    
    
    clearErrors() {
      this.errors = []
    }

    // Special JSON that sends lowercase
    // and will recieve lowercase and convert to uppercase
    toJSON() {
      var result = {}
      for(let k in this._props) {
        result[k.toLowerCase()] = this._props[k]
      }
      
      // translate population
      _.each(this._schema.associations, function(association) {
        let key = association.key.toLowerCase()
        let models = result[key]

        if(association.value.joinType === "hasOne") {
          if(models) {
            result[key] = models.toJSON();
          } else {
            result[key] = undefined;
          }
        } else {
          let modelsJSON = []
          _.each(models, function(model) {
            modelsJSON.push(model.toJSON())
          })
          result[key] = modelsJSON        
        }

      })
      
      return result
    }

    setFromJSON(json) {
      for(let k in json) {
        let value = json[k]
        this.set(k.toUpperCase(), value)
      }
    }

    // get json() {
    //   var result = {}
    //   for(let k in this._props) {
    //     result[k.toLowerCase()] = this._props[k]
    //   }
      
    //   // translate population
    //   _.each(this._schema.associations, function(association) {
    //     let key = association.key.toLowerCase()
    //     let models = result[key]
    //     let modelsJSON = []
    //     _.each(models, function(model) {
    //       modelsJSON.push(model.json)
    //     })
    //     result[key] = modelsJSON        
    //   })
      
    //   return result
    // }
    // Check against schema if it is valid
    get valid() {
      this.clearErrors()
      let isValid = true
      for(let key in this.schema.definition) {
        let schemaProps = this.schema.definition[key]
        let value = this.get(key)
        let validators = []

        // Required check
        if(schemaProps.required) {
          validators.push({
            validator: function(value) {
              return (value != null && value != undefined)
            },
            message: `${key} is required`
          })
        } else if(value == null || value == undefined) {
          // Don't check if the value is null
          // We continue because for example, number is null but not required.
          // It would fail the type check below if allowed to continue
          continue
        }
        
        switch(schemaProps.type) {
          case "timestamp":
            break
          case "number":
            validators.push({
              validator: function(value) {
                return typeof(value) === "number"
              },
              message: `${key} is not a number`
            })

            if(schemaProps.min) {
              validators.push({
                validator: function(value) {
                  return (value >= schemaProps.min)
                },
                message: `${key} must be at least ${schemaProps.min}`
              })
            }

            if(schemaProps.max) {
              validators.push({
                validator: function(value) {
                  return (value <= schemaProps.max)
                },
                message: `${key} must be at most ${schemaProps.max}`
              })
            }            
            break
          case "clob":
            validators.push({
              validator: function(value) {
                return typeof(value) === "string"      
              },
              message: `${key} is not a valid clob`
            })       
            validators.push({
              validator: function(value) {
                return value.length < 1000000
              },
              message: `${key} must be shorter than 1,000,000 characters`
            })  
            if(schemaProps.minlength) {
              validators.push({
                validator: function(value) {
                  return (value.length > schemaProps.minlength)
                },
                message: `${key} must be longer than ${schemaProps.minlength} characters`
              })                        
            }

            if(schemaProps.maxlength) {
              validators.push({
                validator: function(value) {
                  return (value.length < schemaProps.maxlength)
                },
                message: `${key} must be shorter than ${schemaProps.maxlength} characters`
              })                        
            }                             
            break           
          case "char":
            validators.push({
              validator: function(value) {
                return typeof(value) === "string"      
              },
              message: `${key} is not a char`
            })
            if(schemaProps.enum) {
              validators.push({
                validator: function(value) {
                  return _.indexOf(schemaProps.enum.values, value) > -1
                },
                message: `${key} is not in enum`
              })              
            }                         
            break
          case "date":
            validators.push({
              validator: function(value) {
                return moment(value).isValid()
              },
              message: `${key} is not a date`
            })                 
            break     
          case "varchar":
            validators.push({
              validator: function(value) {
                return typeof(value) === "string"      
              },
              message: `${key} is not a varchar`
            })          

            if(schemaProps.enum) {
              validators.push({
                validator: function(value) {
                  return _.indexOf(schemaProps.enum.values, value) > -1
                },
                message: `${key} is not in enum`
              })              
            }

            if(schemaProps.minlength) {
              validators.push({
                validator: function(value) {
                  return (value.length > schemaProps.minlength)
                },
                message: `${key} must be longer than ${schemaProps.minlength} characters`
              })                        
            }

            if(schemaProps.maxlength) {
              validators.push({
                validator: function(value) {
                  return (value.length < schemaProps.maxlength)
                },
                message: `${key} must be shorter than ${schemaProps.maxlength} characters`
              })                        
            }            
            break
          default:
            this.errors.push(`${key} has undefined error, ${schemaProps.type}`)
        }

        // Custom Validator Checks
        if(schemaProps.validator) {
          validators.push({
            validator: schemaProps.validator,
            message: `${key} is not vaild`
          })
        }

        // Check all validators
        _.each(validators, (v) => {
          var valid = v.validator(value)
          if(!valid) {
            this.errors.push(v.message)
          }
        })

        if(this.errors.length > 0) { 
          isValid = false
        }

      }
      return isValid
    }
  }

  // Store them in sage as they get created
  sage.models[name] = {
    model: modelClass,
    schema: schema
  }

  require('./statics/count')(modelClass, name, schema, sage);
  require('./statics/create')(modelClass, name, schema, sage);
  require('./statics/findById')(modelClass, name, schema, sage);
  require('./statics/findOne')(modelClass, name, schema, sage);
  // require('./statics/query')(modelClass, name, schema, sage);

  // Allow access to schema from model
  modelClass.schema = schema
  
  return(modelClass)
}

module.exports = model