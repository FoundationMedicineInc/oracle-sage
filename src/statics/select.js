import Promise from 'bluebird';
import _ from 'lodash';
import async from 'async';
import sageUtil from '../../build/sage_util';

var knex = require('knex')({ client: 'oracle' })

class SelectQuery {
  constructor(sage, tableName, model, columns) {
    this.sage = sage
    this.knex = knex(tableName)

    this.model = model // needed to convert results into models

    columns = columns || "*"
    this.knex.select(columns)

    this.knex.exec = (options = {}) => {
      return this.exec(options)
    }

    return this.knex
  }

  exec(options = {}) {
    var models = [];
    var self = this;
    return new Promise(function(resolve, reject) {
      var connection;
      async.series([
        // Establish Connection
        function(next) {
          self.sage.getConnection({transaction: options.transaction}).then(function(c) {
            connection = c;
            next();
          }).catch(next);
        },
        // Perform operation
        function(next) {
          var sql = self.knex.toString()

          // Fix: [Error: ORA-01756: quoted string not properly terminated]
          sql = sql.replace(/\\'/g, "''")

          self.sage.logger.debug(sql);

          // TODO I think this will cap at returning 100 rows despite setting a limit
          // in the SELECT statement.
          connection.execute(sql)
            .then((result) => sageUtil.resultToJSON(result))
            .then((results) => {
              _.each(results, (result) => {
                models.push(new self.model(result))
              })
              next();
            })
            .catch(next);
        }
      ], function(err) {
        if(err) {
          self.sage.logger.error(err);
        }
        self.sage.afterExecute(connection).then(function() {
          if(err) {
            return reject(err);
          }

          return resolve(models);
        }).catch(reject);

      });
    });
  }
}

module.exports = SelectQuery
