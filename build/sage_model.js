'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _sage = require('../build/sage');

var _sage2 = _interopRequireDefault(_sage);

var _sage_util = require('../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var model = function model(name, schema) {
  return (function () {
    function Model(props, initName, initSchema) {
      _classCallCheck(this, Model);

      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;

      this._schema = initSchema || schema;

      this._props = props || {};

      this.errors = [];
    }

    // **** BEGIN STATIC

    _createClass(Model, [{
      key: 'get',

      // Return a property
      value: function get(key) {
        return this._props[key];
      }
      // Set a property

    }, {
      key: 'set',
      value: function set(key, value) {
        if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
          for (var k in key) {
            this._props[k] = key[k];
          }
        } else {
          this._props[key] = value;
        }
      }
    }, {
      key: 'clearErrors',
      value: function clearErrors() {
        this.errors = [];
      }
    }, {
      key: 'errorPromise',
      value: function errorPromise() {
        return new Promise(function (resolve, reject) {
          reject(this.errors);
        });
      }
    }, {
      key: 'save',
      value: function save() {
        // Insert if there is no ID set.
        if (!this.valid) {
          return this.errorPromise;
        };
      }
      // Check against schema if it is valid

    }, {
      key: 'normalized',

      // **** END STATIC   
      get: function get() {
        var result = {};
        for (var key in this.schema.definition) {
          var value = this._props[key];
          if (value === undefined) {
            value = null;
          }
          result[key] = value;
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
      key: 'valid',
      get: function get() {
        this.clearErrors();
        var isValid = true;
        for (var key in this.schema.definition) {
          var schemaProps = this.schema.definition[key];
          var value = this._props[key];

          // Don't check if the value is null
          if (value == null) {
            continue;
          }

          // Basic Type Checks
          var valid = null;
          var error = null;
          switch (schemaProps.type) {
            case "number":
              valid = typeof value === "number";
              error = key + ' is not a number';
              break;
            case "date":
              valid = moment(value, schemaProps.format).isValid();
              error = key + ' is not a date';
              break;
            case "varchar":
              valid = typeof value === "string";
              error = key + ' is not a varchar';
              if (schemaProps.enum) {
                valid = schemaProps.enum.values.indexOf(value) > -1;
                error = key + ' is not in enum';
              }
              break;
          }
          // Make invalid if it fails type check
          if (!valid) {
            this.errors.push(error);
            isValid = false;
          }

          // Custom Validator Checks
          if (schemaProps.validator) {
            var _valid = schemaProps.validator(value);

            // Make invalid if it fails validator
            if (!_valid) {
              this.errors.push(key + ' fails validator');
              isValid = false;
            }
          }
        }
        return isValid;
      }
    }], [{
      key: 'findById',
      value: function findById(value) {
        var pk = schema.primaryKey;
        var data = {
          value: value
        };
        var sql = 'SELECT * FROM ' + name + ' WHERE ' + pk + '=:value ORDER BY ID DESC FETCH FIRST 1 ROWS ONLY';

        console.log(sql);
        return new Promise(function (resolve, reject) {
          resolve();
        });
        // let template = _.template('SELECT * ${table} (${fields}) VALUES (${keys})');
      }
    }, {
      key: 'create',
      value: function create() {
        var props = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var m = new this(props, name, schema);
        return new Promise(function (resolve, reject) {
          if (!m.valid) {
            reject(m);
          } else {
            var sql = _sage_util2.default.getInsertSQL(m.name, m.schema);
            var values = m.normalized;
            console.log(values);
            console.log(sql);

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
        });
      }
    }]);

    return Model;
  })();
};
module.exports = model;