var sage = require("../../../build/sage");
var Schema = sage.Schema;

var CommentSchema = new Schema(
  {
    COMMENT_ID: {
      type: "raw"
    },
    LIKE_COUNT: {
      type: "raw"
    },
    BODY: {
      type: "blob"
    }
  },
  {
    primaryKey: "COMMENT_ID"
  }
);

module.exports = sage.model("SAGE_TEST.COMMENTS", CommentSchema);
