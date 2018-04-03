import Promise from 'bluebird';
import async from 'async';
import sageUtil from '../../build/sage_util';

module.exports = function (modelClass, name, schema, sage) {
  modelClass.findOne = function (values = {}, options = {}) {
    const self = this;
    const pk = schema.primaryKey;
    const result = sageUtil.getSelectANDSQL(values);

    const sql = `select * from (
        select a.*, ROWNUM rnum from (
          SELECT ${self._selectAllStringStatic()} FROM ${name} WHERE ${
  result.sql
} ORDER BY ${pk} DESC
        ) a where rownum <= 1
      ) where rnum >= 0`;

    let finalResult;

    return new Promise((resolve, reject) => {
      let connection;
      async.series(
        [
          // Get connection
          function (next) {
            sage
              .getConnection({ transaction: options.transaction })
              .then((c) => {
                connection = c;
                return next();
              })
              .catch(next);
          },
          function (next) {
            sage.logger.debug(sql, values);
            connection
              .execute(sql, values)
              .then(result => sageUtil.resultToJSON(result))
              .then((results) => {
                if (results.length) {
                  finalResult = new self(results[0], name, schema);
                }
                next();
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
              return resolve(finalResult);
            })
            .catch(reject);
        },
      );
    });
  };
};
