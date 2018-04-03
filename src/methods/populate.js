import Promise from 'bluebird';
import async from 'async';
import _ from 'lodash';
import sageUtil from '../../build/sage_util';

module.exports = function (self, name, schema, sage) {
  self.populate = function (options = {}) {
    if (!this._associations.length) {
      this._associations = this._schema.associations;
    }

    if (this._associations.length) {
      return new Promise((resolve, reject) => {
        this._populate(options)
          .then(() => resolve())
          .catch((err) => {
            sage.logger.error(err);
            return reject(err);
          });
      });
    }
    return Promise.resolve();
  };

  self._populate = function (options = {}) {
    return new Promise((resolve, reject) => {
      const association = this._associations.shift();
      this.populateOne(association, options)
        .then(() => {
          if (this._associations.length) {
            this._populate(options)
              .then(() => resolve())
              .catch(reject);
          } else {
            return resolve();
          }
        })
        .catch(reject);
    });
  };

  self.populateOne = function (association, options = {}) {
    const self = this;
    const value = association.value;
    const model = sage.models[value.model];
    const associationModel = model.model;
    const associationSchema = model.schema;

    let sql = null;
    switch (value.joinType) {
      case 'hasOne':
        sql = sage
          .knex(value.joinsWith)
          .select(associationModel._selectAllStringStatic().split(','))
          .where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine))
          .toString();
        break;
      case 'hasMany':
        sql = sage
          .knex(value.joinsWith)
          .select(associationModel._selectAllStringStatic().split(','))
          .where(value.foreignKeys.theirs, self.get(value.foreignKeys.mine))
          .toString();
        break;
      case 'hasAndBelongsToMany':
        sql = sage
          .knex(value.joinsWith)
          .select(associationModel._selectAllStringStatic().split(','))
          .innerJoin(
            function () {
              this.select('*')
                .from(value.joinTable)
                .where(
                  value.foreignKeys.mine,
                  self.get(self._schema.primaryKey),
                )
                .as('t1');
            },
            `${value.joinsWith}.${associationSchema.primaryKey}`,
            `t1.${value.foreignKeys.theirs}`,
          )
          .toString();
        break;
      case 'hasManyThrough':
        const throughModel = sage.models[value.joinTable];
        const throughFields = [];
        // We do not want to get the join keys twice
        _.each(throughModel.schema.definition, (definition, key) => {
          if (
            key != value.foreignKeys.mine &&
            key != value.foreignKeys.theirs
          ) {
            if (definition.type != 'association') {
              throughFields.push(`t1.${key}`);
            }
          }
        });
        const associationModelSelect = associationModel
          ._selectAllStringStatic()
          .split(',');
        const selectFields = throughFields.concat(associationModelSelect);

        sql = sage
          .knex(value.joinsWith)
          .select(selectFields)
          .innerJoin(
            function () {
              this.select('*')
                .from(value.joinTable)
                .where(
                  value.foreignKeys.mine,
                  self.get(self._schema.primaryKey),
                )
                .as('t1');
            },
            `${value.joinsWith}.${associationSchema.primaryKey}`,
            `t1.${value.foreignKeys.theirs}`,
          )
          .toString();

        break;
      default:
        throw 'unrecognized association';
    }

    sage.logger.debug(sql);

    return new Promise((resolve, reject) => {
      const self = this;
      let connection;
      async.series(
        [
          function (next) {
            sage
              .getConnection({ transaction: options.transaction })
              .then((c) => {
                connection = c;
                return next();
              })
              .catch(err => next(err));
          },
          // Perform operation
          function (next) {
            connection
              .execute(sql, [], { maxRows: 99999 })
              .then(result => sageUtil.resultToJSON(result))
              .then((results) => {
                const models = [];

                // Deep populate the results
                const populateResults = function () {
                  const result = results.shift();
                  if (result) {
                    const model = new associationModel(result);
                    model
                      .populate(options)
                      .then(() => {
                        models.push(model);
                        populateResults();
                      })
                      .catch(err => next(err));
                  } else {
                    if (association.value.joinType === 'hasOne') {
                      self._directSet(association.key, models[0]);
                    } else {
                      self._directSet(association.key, models);
                    }
                    return next();
                  }
                };
                populateResults();
              })
              .catch(next);
          },
        ],
        (err) => {
          if (err) {
            sage.logger.error(err);
          }
          sage
            .afterExecute(connection)
            .then(() => {
              if (err) {
                return reject(err);
              }

              return resolve();
            })
            .catch(reject);
        },
      );
    });
  };
};
