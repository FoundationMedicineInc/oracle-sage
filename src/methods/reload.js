import Promise from 'bluebird'
import sageUtil from '../../build/sage_util'

module.exports = function(self, name, schema, sage) {
  self.reload = function(options = {}) {
    var self = this;
    return new Promise((resolve, reject) => {
      if(!this.get(this._schema.primaryKey)) {
        sage.log("No primary key. I don't know who to reload.")
        reject()
      }
  
      let pk = schema.primaryKey

      var query = {};
      query[pk] = self.get(pk);

      sage.models[name].model.findOne(query, options).then(function(model) {
        self._props = model._props;
        self.resetDirtyProps();
        resolve();
      });
    });
  }
}