import Promise from 'bluebird';
import _ from 'lodash';

var knex = require('knex')({ client: 'oracle' });

class SelectQuery {
  constructor(sage, tableName, model, columns) {
    this.sage = sage;
    this.knex = knex(tableName);

    this.model = model; // needed to convert results into models

    columns = columns || "*";
    this.knex.select(columns);

    this.knex.exec = () => {
      return this.exec();
    }

    return this.knex;
  }

  exec() {
    return new Promise((resolve, reject) => {
      var sql = this.knex.toString();
      this.sage.connection.query(sql, (err, results) => {
        if(err) { 
          console.log(err); reject(); 
        } else {
          let models = [];
          _.each(results, (result) => {
            models.push(new this.model(result));
          });
          resolve(models);
        }
      });
    })
  }
}

module.exports = SelectQuery;