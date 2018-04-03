import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

module.exports = function (modelClass, name, schema, sage) {
  modelClass.count = function (values = {}, options = {}) {
    const self = this;
    const result = sageUtil.getSelectANDSQL(values);

    let sql = `SELECT COUNT(*) FROM ${name}`;

    if (result.sql != '') {
      sql += ` WHERE ${result.sql}`;
    }

    let count;

    return new Promise((resolve, reject) => {
      let connection;

      async.series(
        [
          // Establish Connection
          function (next) {
            sage
              .getConnection({ transaction: options.transaction })
              .then((c) => {
                connection = c;
                return next();
              })
              .catch(next);
          },
          // Perform operation
          function (next) {
            sage.logger.debug(sql, result.values);

            connection.execute(sql, result.values, (err, result) => {
              if (!err) {
                try {
                  count = result.rows[0][0];
                } catch (e) {
                  next(e);
                }
              }
              next(err);
            });
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
              return resolve(count);
            })
            .catch(reject);
        },
      );
    });
  };
};
