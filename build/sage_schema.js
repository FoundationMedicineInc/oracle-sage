"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Schema = function () {
  function Schema() {
    var definition = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Schema);

    var tempDefinition = {};
    for (var key in definition) {
      var value = definition[key];
      if (typeof value === "string") {
        definition[key] = {
          type: value
        };
      }
    }
    this._definition = definition;

    this.primaryKey = config.primaryKey || null;
    this.errors = [];
  }

  _createClass(Schema, [{
    key: "getDefinition",
    value: function getDefinition(key) {
      return this._definition[key];
    }
  }, {
    key: "definition",
    get: function get() {
      return this._definition;
    }
  }, {
    key: "associations",
    get: function get() {
      var associations = [];
      _lodash2.default.each(this._definition, function (item, key) {
        if (item.type === "association") {
          associations.push({
            key: key,
            value: item
          });
        }
      });
      return associations;
    }
  }]);

  return Schema;
}();

module.exports = Schema;