import _ from 'lodash';
import sageUtil from '../../build/sage_util';

const knex = require('knex')({ client: 'oracle' });

class SelectQuery {
  constructor(sage, tableName, model, columns) {
    this.sage = sage;
    this.knex = knex(tableName);

    this.model = model; // needed to convert results into models

    this.knex.select(columns || '*');

    this.knex.exec = (options = {}) => this.exec(options);

    return this.knex;
  }

  exec(options = {}) {
    const models = [];
    const self = this;

    let connection;

    return self.sage
      .getConnection({ transaction: options.transaction })
      .then((c) => {
        connection = c;
      })
      .then(() => {
        let sql = self.knex.toString();
        // Fix: [Error: ORA-01756: quoted string not properly terminated]
        sql = sql.replace(/\\'/g, "''");

        self.sage.logger.debug(sql);
        return connection.execute(sql);
      })
      .then(result => sageUtil.resultToJSON(result))
      .then((results) => {
        _.each(results, (result) => {
          models.push(new self.model(result));
        });
        return models;
      })
      .catch((err) => {
        if (err) {
          self.sage.logger.error(err);
        }
        throw err;
      })
      .finally(() => self.sage.afterExecute(connection));
  }
}

module.exports = SelectQuery;
