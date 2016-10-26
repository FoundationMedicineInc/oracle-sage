import Promise from 'bluebird'
import _ from 'lodash'
import async from 'async'

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
          });
        },
        // Perform operation
        function(next) {
          var sql = self.knex.toString()

          // Fix: [Error: ORA-01756: quoted string not properly terminated]
          sql = sql.replace(/\\'/g, "''")

          self.sage.log(sql);
          connection.query(sql, (err, results) => {
            if(err) {
                self.sage.log(err);
            } else {
              _.each(results, (result) => {
                models.push(new self.model(result))
              })
              next();
            }
          });
        }
      ], function() {
        self.sage.afterExecute(connection).then(function() {
          resolve(models);
        });
      });
    });
  }
}

module.exports = SelectQuery