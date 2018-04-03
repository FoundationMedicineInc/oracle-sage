import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

module.exports = function (self, name, schema, sage) {
  self.destroy = function (options = {}) {
    const self = this;

    return new Promise((resolve, reject) => {
      const pk = this.get(this._schema.primaryKey);
      if (!pk) {
        sage.logger.warn('Missing primary key on destroy. Who do I destroy?');
        return reject('Missing primary key.');
      }

      const sql = sage
        .knex(this._name)
        .where(this._schema.primaryKey, pk)
        .del()
        .toString();

      let connection;

      async.series(
        [
          // Get connection
          function (next) {
            sage
              .getConnection({ transaction: options.transaction })
              .then((c) => {
                connection = c;
                next();
              })
              .catch((err) => {
                next(err);
              });
          },
          // Perform operation
          function (next) {
            sage.logger.debug(sql);

            connection.execute(sql, (err, results) => {
              if (err) {
                sage.logger.error('Could not destroy.');
              }
              next(err);
            });
          },
        ],
        (err) => {
          if (err) {
            sage.logger.error(err);
            return sage.afterExecute(connection).then(() => {
              reject(err);
            });
          }

          sage
            .afterExecuteCommitable(connection)
            .then(() => {
              resolve();
            })
            .catch(reject);
        },
      );
    });
  };
};
