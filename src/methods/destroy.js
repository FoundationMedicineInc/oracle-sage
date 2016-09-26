import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'
import logger from '../logger'

module.exports = function(self, name, schema, sage) {
  self.destroy = function(options = {}) {
    var self = this;

    return new Promise((resolve, reject) => {
      let pk = this.get(this._schema.primaryKey);
      if(!pk) {
        logger.warn('Missing primary key on destroy. Who do I destroy?');
        return reject('Missing primary key.');
      }

      let sql = sage
        .knex(this._name)
        .where(this._schema.primaryKey, pk)
        .del()
        .toString();

      var connection;

      async.series([
        // Get connection
        function(next) {
          sage.getConnection({transaction: options.transaction}).then(function(c) {
            connection = c;
            next();
          }).catch(function(err) {
            next(err);
          });
        },
        // Perform operation
        function(next) {
          logger.debug(sql);

          connection.execute(sql, (err, results) => {
            if(err) {
              logger.error('Could not destroy.');
            }
            next(err);
          })
        }
      ], function(err) {
        if(err) {
          logger.error(err);
        }

        sage.afterExecuteCommitable(connection).then(function() {
          resolve();
        }).catch(reject);

      });


    })
  }
}