'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _sage_util = require('../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _select = require('../build/statics/select');

var _select2 = _interopRequireDefault(_select);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var model = function model(name, schema, sage) {
  var _methods = {};
  var modelClass = (function () {
    function Model(props, initName, initSchema) {
      _classCallCheck(this, Model);

      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;

      this._schema = initSchema || schema;

      this._props = props || {};
      this._dirtyProps = {};

      this.errors = [];

      // queue for pending associations to be populated
      this._associations = [];

      // apply extensions
      (0, _objectAssign2.default)(this, _methods);

      require('./methods/populate')(this, name, schema, sage);
      require('./methods/save')(this, name, schema, sage);
      require('./methods/destroy')(this, name, schema, sage);
      require('./methods/reload')(this, name, schema, sage);
    }

    _createClass(Model, [{
      key: 'mergeProps',
      value: function mergeProps() {
        this._props = _lodash2.default.assign(this._props, this._dirtyProps);
        this.resetDirtyProps();
      }
    }, {
      key: 'resetDirtyProps',
      value: function resetDirtyProps() {
        this._dirtyProps = {};
      }
    }, {
      key: 'get',

      // Return a property
      value: function get(key) {
        return this._dirtyProps[key] || this._props[key];
      }
    }, {
      key: 'unset',
      value: function unset(key) {
        this._dirtyProps[key] = undefined;
        this._props[key] = undefined;
      }

      // Set a property

    }, {
      key: 'set',
      value: function set(key, value) {
        if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
          for (var k in key) {
            this._dirtyProps[k] = key[k];
          }
        } else {
          this._dirtyProps[key] = value;
        }
      }

      // Set a property directly to props

    }, {
      key: '_directSet',
      value: function _directSet(key, value) {
        this._props[key] = value;
      }
    }, {
      key: 'clearErrors',
      value: function clearErrors() {
        this.errors = [];
      }

      // Special JSON that sends lowercase
      // and will recieve lowercase and convert to uppercase

    }, {
      key: 'toJSON',
      value: function toJSON() {
        var result = {};
        for (var k in this._props) {
          result[k.toLowerCase()] = this._props[k];
        }

        // translate population
        _lodash2.default.each(this._schema.associations, function (association) {
          var key = association.key.toLowerCase();
          var models = result[key];

          if (association.value.joinType === "hasOne") {
            if (models) {
              result[key] = models.toJSON();
            } else {
              result[key] = undefined;
            }
          } else {
            (function () {
              var modelsJSON = [];
              _lodash2.default.each(models, function (model) {
                modelsJSON.push(model.toJSON());
              });
              result[key] = modelsJSON;
            })();
          }
        });

        return result;
      }
    }, {
      key: 'setFromJSON',
      value: function setFromJSON(json) {
        for (var k in json) {
          var value = json[k];
          this.set(k.toUpperCase(), value);
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

    }, {
      key: 'dirtyProps',

      // **** END STATIC

      // Goes through and returns an object with non-entries filled with NULL
      get: function get() {
        return this._dirtyProps;
      }

      /**
       * Returns an object of key/value pairs that are "Oracle safe".
       * @return {Object}
       */

    }, {
      key: 'normalized',
      get: function get() {
        var result = {};
        for (var key in this.schema.definition) {

          // Do not normalize read only fields
          if (this.schema.definition[key].readonly) {
            continue;
          }

          var value = undefined;

          switch (this.schema.definition[key].type) {
            case 'date':
              var format = this.schema.definition[key].format;
              var date = this.get(key);
              if (date) {
                value = (0, _moment2.default)(date, format).format(format);
                if (value === "Invalid date") {
                  sage.logger.warn('Could not decipher value: ' + date + ', using Date() value ' + new Date(date));
                  value = (0, _moment2.default)(new Date(date)).format(format);
                }
              }
              break;
            case "timestamp":
              var format = this.schema.definition[key].format;
              var date = this.get(key);
              if (date) {
                value = (0, _moment2.default)(date, format).format(format);
                if (value === "Invalid date") {
                  sage.logger.warn('Could not decipher value: ' + date + ', using Date() value ' + new Date(date));
                  value = (0, _moment2.default)(new Date(date)).format(format);
                }
              }
              break;

            case "number":
              // Need this IF statement because what if the person does not have a
              // read only primary key and is creating a new model? Usually they would pass
              // down NULL as the PK, and if we didn't have this it would parseInt(NULL)
              if (this.get(key) != null || this.get(key) != undefined) {
                value = parseInt(this.get(key));
              }
              break;

            // Blobs must be converted to a buffer before inserting into Oracle
            case "blob":
              value = new Buffer(this.get(key));
              break;

            default:
              value = this.get(key);
          }

          if (this.schema.definition[key].type != 'association') {
            if (!this.schema.definition[key].readonly) {
              result[key] = value;
            }
          }
        }
        return result;
      }
    }, {
      key: 'schema',
      get: function get() {
        return this._schema;
      }
    }, {
      key: 'name',
      get: function get() {
        return this._name;
      }
    }, {
      key: 'id',
      get: function get() {
        return this.get(schema.primaryKey);
      }
    }, {
      key: 'valid',
      get: function get() {
        var _this = this;

        this.clearErrors();
        var isValid = true;

        var _loop = function _loop(key) {
          var schemaProps = _this.schema.definition[key];
          var value = _this.get(key);
          var validators = [];

          // Dont validate association
          if (schemaProps.type === "association") {
            return 'continue';
          }

          // Required check
          if (schemaProps.required) {
            validators.push({
              validator: function validator(value) {
                return value != null && value != undefined;
              },
              message: key + ' is required'
            });
          } else if (value === null || value === undefined) {
            // Don't check if the value is null
            // We continue because for example, number is null but not required.
            // It would fail the type check below if allowed to continue
            return 'continue';
          }

          switch (schemaProps.type) {
            case "timestamp":
              break;
            case "raw":
              break;
            case "blob":
              break;

            case "number":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "number";
                },
                message: 'key: ' + key + ', value: ' + value + ', is not a number'
              });

              if (schemaProps.min) {
                validators.push({
                  validator: function validator(value) {
                    return value >= schemaProps.min;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be at least ' + schemaProps.min
                });
              }

              if (schemaProps.max) {
                validators.push({
                  validator: function validator(value) {
                    return value <= schemaProps.max;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be at most ' + schemaProps.max
                });
              }
              break;
            case "clob":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: 'key: ' + key + ', value: ' + value + ', is not a valid clob'
              });
              validators.push({
                validator: function validator(value) {
                  return value.length < 1000000;
                },
                message: 'key: ' + key + ', value: ' + value + ', must be shorter than 1,000,000 characters'
              });
              if (schemaProps.minlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length > schemaProps.minlength;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be longer than ' + schemaProps.minlength + ' characters'
                });
              }

              if (schemaProps.maxlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length < schemaProps.maxlength;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be shorter than ' + schemaProps.maxlength + ' characters'
                });
              }
              break;
            case "char":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: 'key: ' + key + ', value: ' + value + ', is not a char'
              });
              if (schemaProps.enum) {
                validators.push({
                  validator: function validator(value) {
                    return _lodash2.default.indexOf(schemaProps.enum.values, value) > -1;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', is not in enum'
                });
              }
              break;
            case "date":
              validators.push({
                validator: function validator(value) {
                  // If moment fails, fallback to Date()
                  var isMoment = (0, _moment2.default)(value, schemaProps.format).isValid();
                  var isDate = new Date(value).toString() !== 'Invalid Date';
                  return isMoment || isDate;
                },
                message: 'key: ' + key + ', value: ' + value + ', is not a date'
              });
              break;
            case "varchar":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: 'key: ' + key + ', value: ' + value + ', is not a varchar'
              });

              if (schemaProps.enum) {
                validators.push({
                  validator: function validator(value) {
                    return _lodash2.default.indexOf(schemaProps.enum.values, value) > -1;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', is not in enum'
                });
              }

              if (schemaProps.minlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length > schemaProps.minlength;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be longer than ' + schemaProps.minlength + ' characters'
                });
              }

              if (schemaProps.maxlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length < schemaProps.maxlength;
                  },
                  message: 'key: ' + key + ', value: ' + value + ', must be shorter than ' + schemaProps.maxlength + ' characters'
                });
              }
              break;
            default:
              _this.errors.push('key: ' + key + ', value: ' + value + ', has undefined error, ' + schemaProps.type);
          }

          // Custom Validator Checks
          if (schemaProps.validator) {
            validators.push({
              validator: schemaProps.validator,
              message: key + ' is not vaild'
            });
          }

          // Check all validators
          _lodash2.default.each(validators, function (v) {
            var valid = v.validator(value);
            if (!valid) {
              _this.errors.push(v.message);
            }
          });

          if (_this.errors.length > 0) {
            isValid = false;
          }
        };

        for (var key in this.schema.definition) {
          var _ret2 = _loop(key);

          if (_ret2 === 'continue') continue;
        }
        return isValid;
      }
    }], [{
      key: 'statics',
      value: function statics(object) {
        (0, _objectAssign2.default)(this, object);
      }
    }, {
      key: 'methods',
      value: function methods(object) {
        _methods = _lodash2.default.extend(_methods, object);
      }

      // Generates a string of all the fields defined in the schema to replace a * in a SELECT *
      // We do this because tables with SDO_GEOMETRY fields or custom fields cannot currently be understood by Sage

    }, {
      key: '_selectAllStringStatic',
      value: function _selectAllStringStatic() {
        var fields = [];
        for (var key in schema.definition) {
          if (schema.definition[key].type != 'association') {
            fields.push(name + '.' + key);
          }
        }
        return fields.join(',');
      }
    }, {
      key: 'select',
      value: function select(columns) {
        // Always pass in columns
        if (!columns) {
          columns = this._selectAllStringStatic().split(',');
        }
        return new _select2.default(sage, name, this, columns);
      }
    }]);

    return Model;
  })();

  // Store them in sage as they get created
  sage.models[name] = {
    model: modelClass,
    schema: schema
  };

  require('./statics/count')(modelClass, name, schema, sage);
  require('./statics/create')(modelClass, name, schema, sage);
  require('./statics/findById')(modelClass, name, schema, sage);
  require('./statics/findOne')(modelClass, name, schema, sage);
  // require('./statics/query')(modelClass, name, schema, sage);

  // Allow access to schema from model
  modelClass.schema = schema;

  return modelClass;
};

module.exports = model;