class Schema {
  constructor(definition = {}, config = {}) {
    let tempDefinition = {};
    for(let key in definition) {
      let value = definition[key];
      if(typeof(value) === "string") {
        definition[key] = {
          type: value
        }
      }
    }
    this._definition = definition;

    this.primaryKey = config.primaryKey || null;
    this.errors = [];
  }
  get definition() {
    return this._definition;
  }
}

module.exports = Schema;