'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _sage_util = require('../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _sage_select_query = require('../build/sage_select_query');

var _sage_select_query2 = _interopRequireDefault(_sage_select_query);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var knex = require('knex')({ client: 'oracle' });
var _methods = {};

var model = function model(name, schema, sage) {
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

      // apply extensions`
      _lodash2.default.extend(this, _methods);
    }

    _createClass(Model, [{
      key: 'mergeProps',
      value: function mergeProps() {
        this._props = _lodash2.default.assign(this._props, this._dirtyProps);
        this._dirtyProps = {};
      }
    }, {
      key: 'populate',

      // **** END STATIC   

      value: function populate() {
        var _this = this;

        if (!this._associations.length) {
          this._associations = this._schema.associations;
        }

        if (this._associations.length) {
          return new _bluebird2.default(function (resolve, reject) {
            _this._populate().then(function () {
              resolve();
            });
          });
        } else {
          return new _bluebird2.default(function (resolve, reject) {
            resolve();
          });
        }
      }
    }, {
      key: '_populate',
      value: function _populate() {
        var _this2 = this;

        return new _bluebird2.default(function (resolve, reject) {
          var association = _this2._associations.shift();
          _this2.populateOne(association).then(function () {
            if (_this2._associations.length) {
              _this2._populate().then(function () {
                resolve();
              });
            } else {
              resolve();
            }
          });
        });
      }
    }, {
      key: 'populateOne',
      value: function populateOne(association) {
        var _this3 = this;

        var self = this;
        var value = association.value;
        var model = sage.models[value.model];
        var associationModel = model.model;
        var associationSchema = model.schema;

        var sql = null;

        switch (value.joinType) {
          case "hasMany":
            sql = knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine)).toString();
            break;
          case "hasAndBelongsToMany":
            sql = knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).innerJoin(function () {
              this.select('*').from(value.joinTable).where(value.foreignKeys.mine, self.get(self._schema.primaryKey)).as('t1');
            }, value.joinsWith + '.' + associationSchema.primaryKey, 't1.' + value.foreignKeys.theirs).toString();
            break;
          case "hasManyThrough":
            sql = knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).innerJoin(function () {
              this.select('*').from(value.joinTable).where(value.foreignKeys.mine, self.get(self._schema.primaryKey)).as('t1');
            }, value.joinsWith + '.' + associationSchema.primaryKey, 't1.' + value.foreignKeys.theirs).toString();
            break;
          default:
            throw 'unrecognized association';
        }

        return new _bluebird2.default(function (resolve, reject) {
          var self = _this3;
          sage.connection.query(sql, function (err, results) {
            if (err) {
              sage.log(err);
              reject();
            } else {
              (function () {
                var models = [];
                // _.each(results, (result) => {
                //   models.push(new associationModel(result))
                // })

                // Deep populate the results
                var populateResults = function populateResults() {
                  var result = results.shift();
                  if (result) {
                    (function () {
                      var model = new associationModel(result);
                      model.populate().then(function () {
                        models.push(model);
                        populateResults();
                      });
                    })();
                  } else {
                    self._directSet(association.key, models);
                    resolve();
                  }
                };
                populateResults();
              })();
            }
          });
        });
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        var _this4 = this;

        return new _bluebird2.default(function (resolve, reject) {
          var pk = _this4.get(_this4._schema.primaryKey);
          if (!pk) {
            sage.log("Missing primary key on destroy. Who do I destroy?");
            reject();
          }

          var sql = knex(_this4._name).where(_this4._schema.primaryKey, pk).del().toString();
          sage.connection.execute(sql, function (err, results) {
            if (err) {
              sage.log(err);
              reject();
            } else {
              sage.connection.commit(function (err, result) {
                if (err) {
                  sage.log(err);
                  reject();
                } else {
                  resolve();
                }
              });
            }
          });
        });
      }
    }, {
      key: 'save',
      value: function save() {
        var _this5 = this;

        return new _bluebird2.default(function (resolve, reject) {
          if (!_this5.get(_this5._schema.primaryKey)) {
            sage.log("No primary key. Use");
            reject();
          }

          if (_this5.valid) {
            // save it to the database
            var pk = schema.primaryKey;

            var result = _sage_util2.default.getUpdateSQL(_this5.dirtyProps);
            var sql = 'UPDATE ' + name + ' SET ' + result.sql + ' WHERE ' + pk + '=:' + pk;

            sql = _sage_util2.default.amendDateFields(_this5.schema, sql);
            result.values[pk] = _this5.get(pk);

            // sage.log(sql, result.values)
            sage.connection.execute(sql, result.values, function (err, result) {
              if (err) {
                sage.log(err);
                reject();
              } else {
                sage.connection.commit(function (err, result) {
                  if (err) {
                    sage.log(err);
                    reject();
                  } else {
                    _this5.mergeProps();
                    resolve();
                  }
                });
              }
            });
          } else {
            sage.log("cannot save");
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
          var modelsJSON = [];
          _lodash2.default.each(models, function (model) {
            modelsJSON.push(model.toJSON());
          });
          result[key] = modelsJSON;
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
      get: function get() {
        return this._dirtyProps;
      }
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
                // try {
                //   value = moment(date, format).format(format)
                // } catch(e) {
                //   value = moment(date).format(format)
                // }
                value = (0, _moment2.default)(date).format(format);
              }
              break;
            case "number":
              value = parseInt(this.get(key));
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
        var _this6 = this;

        this.clearErrors();
        var isValid = true;

        var _loop = function _loop(key) {
          var schemaProps = _this6.schema.definition[key];
          var value = _this6.get(key);
          var validators = [];

          // Required check
          if (schemaProps.required) {
            validators.push({
              validator: function validator(value) {
                return value != null && value != undefined;
              },
              message: key + ' is required'
            });
          } else if (value == null || value == undefined) {
            // Don't check if the value is null
            // We continue because for example, number is null but not required.
            // It would fail the type check below if allowed to continue
            return 'continue';
          }

          switch (schemaProps.type) {
            case "timestamp":
              break;
            case "number":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "number";
                },
                message: key + ' is not a number'
              });

              if (schemaProps.min) {
                validators.push({
                  validator: function validator(value) {
                    return value >= schemaProps.min;
                  },
                  message: key + ' must be at least ' + schemaProps.min
                });
              }

              if (schemaProps.max) {
                validators.push({
                  validator: function validator(value) {
                    return value <= schemaProps.max;
                  },
                  message: key + ' must be at most ' + schemaProps.max
                });
              }
              break;
            case "clob":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: key + ' is not a valid clob'
              });
              validators.push({
                validator: function validator(value) {
                  return value.length < 1000000;
                },
                message: key + ' must be shorter than 1,000,000 characters'
              });
              if (schemaProps.minlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length > schemaProps.minlength;
                  },
                  message: key + ' must be longer than ' + schemaProps.minlength + ' characters'
                });
              }

              if (schemaProps.maxlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length < schemaProps.maxlength;
                  },
                  message: key + ' must be shorter than ' + schemaProps.maxlength + ' characters'
                });
              }
              break;
            case "char":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: key + ' is not a char'
              });
              break;
            case "date":
              validators.push({
                validator: function validator(value) {
                  return (0, _moment2.default)(value).isValid();
                },
                message: key + ' is not a date'
              });
              break;
            case "varchar":
              validators.push({
                validator: function validator(value) {
                  return typeof value === "string";
                },
                message: key + ' is not a varchar'
              });

              if (schemaProps.enum) {
                validators.push({
                  validator: function validator(value) {
                    return schemaProps.enum.values.indexOf(value) > -1;
                  },
                  message: key + ' is not in enum'
                });
              }

              if (schemaProps.minlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length > schemaProps.minlength;
                  },
                  message: key + ' must be longer than ' + schemaProps.minlength + ' characters'
                });
              }

              if (schemaProps.maxlength) {
                validators.push({
                  validator: function validator(value) {
                    return value.length < schemaProps.maxlength;
                  },
                  message: key + ' must be shorter than ' + schemaProps.maxlength + ' characters'
                });
              }
              break;
            default:
              _this6.errors.push(key + ' has undefined error, ' + schemaProps.type);
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
              _this6.errors.push(v.message);
            }
          });

          if (_this6.errors.length > 0) {
            isValid = false;
          }
        };

        for (var key in this.schema.definition) {
          var _ret3 = _loop(key);

          if (_ret3 === 'continue') continue;
        }
        return isValid;
      }
    }], [{
      key: 'count',
      value: function count() {
        var values = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var self = this;
        var result = _sage_util2.default.getSelectANDSQL(values);

        var sql = 'SELECT COUNT(*) FROM ' + name;

        if (result.sql != "") {
          sql = sql + (' WHERE ' + result.sql);
        }

        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.execute(sql, result.values, function (err, result) {
            if (err) {
              sage.log(err);
              reject();
            } else {
              var count;
              try {
                count = result.rows[0][0];
              } catch (e) {
                sage.log(e);
                reject();
              }
              resolve(count);
            }
          });
        });
      }
    }, {
      key: 'statics',
      value: function statics(object) {
        (0, _objectAssign2.default)(this, object);
      }
    }, {
      key: 'methods',
      value: function methods(object) {
        _methods = object;
      }

      // **** BEGIN STATIC
      // Uses the primary key definition and returns the first row on that

    }, {
      key: 'findById',
      value: function findById(value) {
        var self = this;
        var pk = schema.primaryKey;
        var data = {
          value: value
        };

        var sql = 'select * from (\n          select a.*, ROWNUM rnum from (\n            SELECT ' + self._selectAllStringStatic() + ' FROM ' + name + ' WHERE ' + pk + '=:value ORDER BY ' + pk + ' DESC\n          ) a where rownum <= 1\n        ) where rnum >= 0';

        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(sql, data, function (err, result) {
            if (err) {
              sage.log(err);
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

        var sql = 'select * from (\n          select a.*, ROWNUM rnum from (\n            SELECT ' + self._selectAllStringStatic() + ' FROM ' + name + ' WHERE ' + result.sql + ' ORDER BY ' + pk + ' DESC\n          ) a where rownum <= 1\n        ) where rnum >= 0';

        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(sql, result.values, function (err, result) {
            if (err) {
              sage.log(err);
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

      // Raw SQL query

    }, {
      key: 'query',
      value: function query(_query) {
        var values = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

        return new _bluebird2.default(function (resolve, reject) {
          sage.connection.query(_query, values, function (err, result) {
            if (err) {
              sage.log(err);
              reject();
            } else {
              resolve(result);
            }
          });
        });
      }
    }, {
      key: 'select',
      value: function select(columns) {
        // Always pass in columns
        if (!columns) {
          columns = this._selectAllStringStatic().split(',');
        }
        return new _sage_select_query2.default(sage, name, this, columns);
      }
    }, {
      key: 'create',
      value: function create() {
        var props = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var m = new this(props, name, schema);
        return new _bluebird2.default(function (resolve, reject) {
          if (!m.valid) {
            sage.log(m.errors);
            reject(m.errors);
          } else {
            var sql = _sage_util2.default.getInsertSQL(m.name, m.schema);
            var values = m.normalized;

            sage.connection.execute(sql, values, function (err, result) {
              if (err) {
                sage.log(err);
                resolve(err);
              } else {
                sage.connection.commit(function (err, result) {
                  if (err) {
                    sage.log(err);
                    resolve(err);
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

  // Store them in sage as they get created
  sage.models[name] = {
    model: modelClass,
    schema: schema
  };

  // Allow access to schema from model
  modelClass.schema = schema;

  return modelClass;
};

module.exports = model;