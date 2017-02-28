import Promise from 'bluebird';
import async from 'async';
import _ from 'lodash';
import sageUtil from '../../build/sage_util';

module.exports = function(self, name, schema, sage) {
  self.populate = function() {
    if(!this._associations.length) {
      this._associations = this._schema.associations
    }

    if(this._associations.length) {
      return new Promise((resolve, reject) => {
        this._populate().then(function() {
          return resolve()
        }).catch(function(err) {
          sage.logger.error(err);
          return reject(err);
        });
      })
    } else {
      return Promise.resolve();
    }
  }

  self._populate = function() {
    return new Promise((resolve, reject) => {
      let association = this._associations.shift()
      this.populateOne(association).then(()=> {
        if(this._associations.length) {
          this._populate().then(function() {
            return resolve()
          }).catch(reject);
        } else {
          return resolve();
        }
      }).catch(reject);
    })
  }

  self.populateOne = function(association) {
    let self = this
    let value = association.value
    let model = sage.models[value.model]
    let associationModel = model.model
    let associationSchema = model.schema

    let sql = null
    switch(value.joinType) {
      case "hasOne":
        sql = sage.knex(value.joinsWith)
        .select(associationModel._selectAllStringStatic().split(','))
        .where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine))
        .toString()
        break
      case "hasMany":
        sql = sage.knex(value.joinsWith)
        .select(associationModel._selectAllStringStatic().split(','))
        .where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine))
        .toString()
        break
      case "hasAndBelongsToMany":
        sql = sage.knex(value.joinsWith)
        .select(associationModel._selectAllStringStatic().split(',')).innerJoin(function() {
          this.select('*').
          from(value.joinTable).
          where(value.foreignKeys.mine, self.get(self._schema.primaryKey))
          .as('t1')
        }, `${value.joinsWith}.${associationSchema.primaryKey}`, `t1.${value.foreignKeys.theirs}`)
        .toString()
        break
      case "hasManyThrough":
        let throughModel = sage.models[value.joinTable]
        let throughFields = []
        // We do not want to get the join keys twice
        _.each(throughModel.schema.definition, function(definition, key) {
          if(key != value.foreignKeys.mine && key != value.foreignKeys.theirs) {
            if(definition.type != 'association') {
              throughFields.push(`t1.${key}`)
            }
          }
        })
        let associationModelSelect = associationModel._selectAllStringStatic().split(',')
        let selectFields = throughFields.concat(associationModelSelect)

        sql = sage.knex(value.joinsWith)
        .select(selectFields).innerJoin(function() {
          this.select('*').
          from(value.joinTable).
          where(value.foreignKeys.mine, self.get(self._schema.primaryKey))
          .as('t1')
        }, `${value.joinsWith}.${associationSchema.primaryKey}`, `t1.${value.foreignKeys.theirs}`)
        .toString();

        break
      default:
        throw('unrecognized association')
    }

    sage.logger.debug(sql);

    return new Promise((resolve, reject) => {
      var self = this
      var connection;
      async.series([
        function(next) {
          sage.getConnection().then(function(c) {
            connection = c;
            return next();
          }).catch(function(err) {
            return next(err);
          });
        },
        // Perform operation
        function(next) {
          connection.execute(sql, [], { maxRows: 99999 })
            .then((result) => sageUtil.resultToJSON(result))
            .then((results) => {
              let models = []

              // Deep populate the results
              let populateResults = function() {
                let result = results.shift();
                if(result) {
                  let model = new associationModel(result)
                  model.populate().then(function() {
                    models.push(model);
                    populateResults();
                  }).catch(function(err) {
                    return next(err);
                  });
                } else {
                  if(association.value.joinType === "hasOne") {
                    self._directSet(association.key, models[0]);
                  } else {
                    self._directSet(association.key, models);
                  }
                  return next();
                }
              }
              populateResults();
            })
            .catch(next)
        }
      ], function(err) {
        if(err) {
          sage.logger.error(err);
          return reject(err);
        }
        sage.afterExecute(connection).then(function() {
          return resolve();
        }).catch(reject);
      });
    });

  }
}
