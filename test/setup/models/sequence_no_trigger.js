var sage = require('../../../build/sage');
var Schema = sage.Schema;

var SequenceNoTrigger = new Schema({
  SEQUENCE_NO_TRIGGER_ID: {
    type: "number",
    readonly: true
  }
}, {
  primaryKey: "SEQUENCE_NO_TRIGGER_ID"
});   

module.exports = sage.model("SAGE_TEST.SEQUENCE_NO_TRIGGER", SequenceNoTrigger);  