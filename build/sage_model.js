'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _sage_util = require('../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var model = function model(name, schema, sage) {
  return (function () {
    function Model(props, initName, initSchema) {
      _classCallCheck(this, Model);

      // Name and schema will inherit off function
      // Create uses the constructor as well so naming has to be different
      this._name = initName || name;

      this._schema = initSchema || schema;

      this._props = props || {};
      this._dirtyProps = {};

      this.errors = [];
    }

    _createClass(Model, [{
      key: 'mergeProps',
      value: function mergeProps() {
        this._props = _lodash2.default.assign(this._props, this._dirtyProps);
        this._dirtyProps = {};
      }

      // **** BEGIN STATIC
      // Uses the primary key definition and returns the first row on that

    }, {
      key: 'save',

      // **** END STATIC   

      value: function save() {
        var _this = this;

        return new _bluebird2.default(function (resolve, reject) {
          if (_this.valid) {
            // save it to the database
            var pk = schema.primaryKey;

            var result = _sage_util2.default.getUpdateSQL(_this.dirtyProps);
            var sql = 'UPDATE ' + name + ' SET ' + result.sql + ' WHERE ' + pk + '=:' + pk;
            sql = _sage_util2.default.amendDateFields(_this.schema, sql);
            result.values[pk] = _this.get(pk);

            sage.connection.execute(sql, result.values, function (err, result) {
              if (err) {
                console.log(err);
                reject();
              } else {
                sage.connection.commit(function (err, result) {
                  if (err) {
                    console.log(err);
                    reject();
                  } else {
                    _this.mergeProps();
                    resolve();
                  }
                });
              }
            });
          } else {
            reject();
          }
        });
      }

      // Goes through and returns an object with non-entries filled with NULL

    }, {
      key: 'get',

      // Return a property
      value: function get(key) {
        return this._dirtyProps[key] || this._props[key];
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
    }, {
      key: 'clearErrors',
      value: function clearErrors() {
        this.errors = [];
      }

      // Check against schema if it is valid

    }, {
      key: 'dirtyProps',
      get: function get() {
        return this._dirtyProps;
      }
    }, {
      key: 'normalized',
      get: function get() {
        var result = {};
        for (var key in this.schema.definition) {
          var value = this.get(key);
          // if(value === undefined) {
          //   value = undefined;
          // }
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
          var value = this.get(key);

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
            case "clob":
              valid = true;
              error = key + ' is not a clob';
            case "char":
              valid = typeof value === "string";
              error = key + ' is not a char';
            case "date":
              valid = (0, _moment2.default)(value, schemaProps.format).isValid();
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
        var self = this;
        var pk = schema.primaryKey;
        var data = {
          value: value
        };
        var sql = 'SELECT * FROM ' + name + ' WHERE ' + pk + '=:value ORDER BY ' + pk + ' DESC FETCH FIRST 1 ROWS ONLY';
        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(sql, data, function (err, result) {
            if (err) {
              console.log(err);
              reject();
            } else {
              var row = null;
              if (result.length) {
                row = new self(result[0], name, schema);
              }
              resolve(row);
            }
          });
        });
      }

      // **** BEGIN STATIC
      // AND'd find, returns the first result

    }, {
      key: 'findOne',
      value: function findOne() {
        var values = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var self = this;
        var pk = schema.primaryKey;
        var result = _sage_util2.default.getSelectANDSQL(values);
        var sql = 'SELECT * FROM ' + name + ' WHERE ' + result.sql + ' ORDER BY ' + pk + ' DESC FETCH FIRST 1 ROWS ONLY';
        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(sql, result.values, function (err, result) {
            if (err) {
              console.log(err);
              reject();
            } else {
              var row = null;
              if (result.length) {
                row = new self(result[0], name, schema);
              }
              resolve(row);
            }
          });
        });
      }

      // Raw SQL query

    }, {
      key: 'query',
      value: function query(_query) {
        var values = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(_query, values, function (err, result) {
            if (err) {
              console.log(err);
              reject();
            } else {
              resolve(result);
            }
          });
        });
      }
    }, {
      key: 'create',
      value: function create() {
        var props = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var m = new this(props, name, schema);
        return new _bluebird2.default(function (resolve, reject) {
          if (!m.valid) {
            reject();
          } else {
            var sql = _sage_util2.default.getInsertSQL(m.name, m.schema);
            var values = m.normalized;

            sage.connection.execute(sql, values, function (err, result) {
              if (err) {
                console.log(err);
                reject();
              } else {
                sage.connection.commit(function (err, result) {
                  if (err) {
                    console.log(err);reject();
                  }
                  resolve(true);
                });
              }
            });
          }
        });
      }
    }]);

    return Model;
  })();
};
module.exports = model;