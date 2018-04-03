import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';
import async from 'async';

module.exports = function(modelClass, name, schema, sage) {
  modelClass.findById = function(value, options = {}) {
    const self = this;
    const pk = schema.primaryKey;
    const data = {
      value,
    };

    const sql = `select * from (
        select a.*, ROWNUM rnum from (
          SELECT ${self._selectAllStringStatic()} FROM ${name} WHERE ${pk}=:value ORDER BY ${pk} DESC
        ) a where rownum <= 1
      ) where rnum >= 0`;

    let resultModel;

    return new Promise((resolve, reject) => {
      let connection;
      async.series(
        [
          // Get connection
          function(next) {
            sage
              .getConnection({ transaction: options.transaction })
              .then(c => {
                connection = c;
                return next();
              })
              .catch(next);
          },
          function(next) {
            sage.logger.debug(sql, data);
            connection
              .execute(sql, data)
              .then(result => sageUtil.resultToJSON(result))
              .then(results => {
                if (results.length) {
                  resultModel = new self(results[0], name, schema);
                }
                next();
              })
              .catch(next);
          },
        ],
        err => {
          if (err) {
            sage.logger.error(err);
          }
          sage
            .afterExecute(connection)
            .then(() => {
              if (err) {
                return reject(err);
              }
              return resolve(resultModel);
            })
            .catch(reject);
        }
      );
    });
  };
};
