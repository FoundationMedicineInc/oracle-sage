import Promise from 'bluebird';
import sageUtil from '../../build/sage_util';

module.exports = function(self, name, schema, sage) {
  self.reload = function(options = {}) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (!this.get(this._schema.primaryKey)) {
        sage.logger.warn("No primary key. I don't know who to reload.");
        return reject();
      }

      const pk = schema.primaryKey;

      const query = {};
      query[pk] = self.get(pk);

      sage.models[name].model
        .findOne(query, options)
        .then(model => {
          self._props = model._props;
          self.resetDirtyProps();
          return resolve();
        })
        .catch(reject);
    });
  };
};
