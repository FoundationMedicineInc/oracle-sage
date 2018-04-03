var sage = require("../../../build/sage");
var Schema = sage.Schema;

var ProfileSchema = new Schema(
  {
    USER_ID: {
      type: "number"
    },
    BIO: {
      type: "varchar"
    }
  },
  {
    primaryKey: "USER_ID"
  }
);

module.exports = sage.model("SAGE_TEST.PROFILES", ProfileSchema);
