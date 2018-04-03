import _ from "lodash";
class Schema {
  constructor(definition = {}, config = {}) {
    let tempDefinition = {};
    for (let key in definition) {
      let value = definition[key];
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
  get definition() {
    return this._definition;
  }
  get associations() {
    let associations = [];
    _.each(this._definition, (item, key) => {
      if (item.type === "association") {
        associations.push({
          key: key,
          value: item
        });
      }
    });
    return associations;
  }
  getDefinition(key) {
    return this._definition[key];
  }
}

module.exports = Schema;
