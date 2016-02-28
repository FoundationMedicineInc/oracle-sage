import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'
import async from 'async'

module.exports = function(self, name, schema, sage) {
  self.destroy = function(options = {}) {
    var self = this;

    return new Promise((resolve, reject) => {
      let pk = this.get(this._schema.primaryKey)
      if(!pk) { 
        sage.log("Missing primary key on destroy. Who do I destroy?")
        reject() 
      }
      let sql = sage
        .knex(this._name)
        .where(this._schema.primaryKey, pk)
        .del()
        .toString()      

      var connection;
      async.series([
        // Get connection
        function(next) {
          sage.getConnection({transaction: options.transaction}).then(function(c) {
            connection = c;
            next();
          });
        },
        // Perform operation
        function(next) {
          sage.log(sql);
          connection.execute(sql, (err, results) => {
            if(err) {
              sage.log(err)           
            }
            next();
          })
        }
      ], function() {
        sage.afterExecuteCommitable(connection).then(function() {
          resolve();
        });
      });


    })
  }
}