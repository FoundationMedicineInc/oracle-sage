'use strict';

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _sage_util = require('../../build/sage_util');

var _sage_util2 = _interopRequireDefault(_sage_util);

var _logger = require('../logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (self, name, schema, sage) {
  self.reload = function () {
    var _this = this;

    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var self = this;
    return new _bluebird2.default(function (resolve, reject) {
      if (!_this.get(_this._schema.primaryKey)) {
        _logger2.default.warn("No primary key. I don't know who to reload.");
        return reject();
      }

      var pk = schema.primaryKey;

      var query = {};
      query[pk] = self.get(pk);

      sage.models[name].model.findOne(query, options).then(function (model) {
        self._props = model._props;
        self.resetDirtyProps();
        return resolve();
      }).catch(reject);
    });
  };
};