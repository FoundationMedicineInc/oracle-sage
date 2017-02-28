'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (self, name, schema, sage) {
  self.populate = function () {
    var _this = this;

    if (!this._associations.length) {
      this._associations = this._schema.associations;
    }

    if (this._associations.length) {
      return new _bluebird2.default(function (resolve, reject) {
        _this._populate().then(function () {
          return resolve();
        }).catch(function (err) {
          sage.logger.error(err);
          return reject(err);
        });
      });
    } else {
      return _bluebird2.default.resolve();
    }
  };

  self._populate = function () {
    var _this2 = this;

    return new _bluebird2.default(function (resolve, reject) {
      var association = _this2._associations.shift();
      _this2.populateOne(association).then(function () {
        if (_this2._associations.length) {
          _this2._populate().then(function () {
            return resolve();
          }).catch(reject);
        } else {
          return resolve();
        }
      }).catch(reject);
    });
  };

  self.populateOne = function (association) {
    var _this3 = this;

    var self = this;
    var value = association.value;
    var model = sage.models[value.model];
    var associationModel = model.model;
    var associationSchema = model.schema;

    var sql = null;

    (function () {
      switch (value.joinType) {
        case "hasOne":
          sql = sage.knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine)).toString();
          break;
        case "hasMany":
          sql = sage.knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine)).toString();
          break;
        case "hasAndBelongsToMany":
          sql = sage.knex(value.joinsWith).select(associationModel._selectAllStringStatic().split(',')).innerJoin(function () {
            this.select('*').from(value.joinTable).where(value.foreignKeys.mine, self.get(self._schema.primaryKey)).as('t1');
          }, value.joinsWith + '.' + associationSchema.primaryKey, 't1.' + value.foreignKeys.theirs).toString();
          break;
        case "hasManyThrough":
          var throughModel = sage.models[value.joinTable];
          var throughFields = [];
          // We do not want to get the join keys twice
          _lodash2.default.each(throughModel.schema.definition, function (definition, key) {
            if (key != value.foreignKeys.mine && key != value.foreignKeys.theirs) {
              if (definition.type != 'association') {
                throughFields.push('t1.' + key);
              }
            }
          });
          var associationModelSelect = associationModel._selectAllStringStatic().split(',');
          var selectFields = throughFields.concat(associationModelSelect);

          sql = sage.knex(value.joinsWith).select(selectFields).innerJoin(function () {
            this.select('*').from(value.joinTable).where(value.foreignKeys.mine, self.get(self._schema.primaryKey)).as('t1');
          }, value.joinsWith + '.' + associationSchema.primaryKey, 't1.' + value.foreignKeys.theirs).toString();

          break;
        default:
          throw 'unrecognized association';
      }
    })();

    sage.logger.debug(sql);

    return new _bluebird2.default(function (resolve, reject) {
      var self = _this3;
      var connection;
      _async2.default.series([function (next) {
        sage.getConnection().then(function (c) {
          connection = c;
          return next();
        }).catch(function (err) {
          return next(err);
        });
      },
      // Perform operation
      function (next) {
        connection.execute(sql, [], { maxRows: 99999 }).then(function (result) {
          return _sage_util2.default.resultToJSON(result);
        }).then(function (results) {
          var models = [];

          // Deep populate the results
          var populateResults = function populateResults() {
            var result = results.shift();
            if (result) {
              (function () {
                var model = new associationModel(result);
                model.populate().then(function () {
                  models.push(model);
                  populateResults();
                }).catch(function (err) {
                  return next(err);
                });
              })();
            } else {
              if (association.value.joinType === "hasOne") {
                self._directSet(association.key, models[0]);
              } else {
                self._directSet(association.key, models);
              }
              return next();
            }
          };
          populateResults();
        }).catch(next);
      }], function (err) {
        if (err) {
          sage.logger.error(err);
          return reject(err);
        }
        sage.afterExecute(connection).then(function () {
          return resolve();
        }).catch(reject);
      });
    });
  };
};