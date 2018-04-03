const sage = require('../../../build/sage');

const Schema = sage.Schema;

const PostSchema = new Schema(
  {
    POST_ID: {
      type: 'number',
      readonly: true,
    },
    USER_ID: {
      type: 'number',
    },
    POST_BODY: {
      type: 'varchar',
    },
  },
  {
    primaryKey: 'POST_ID',
  }
);

module.exports = sage.model('SAGE_TEST.POSTS', PostSchema);
