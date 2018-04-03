const sage = require('../../../build/sage');

const Schema = sage.Schema;

const ProfileSchema = new Schema(
  {
    USER_ID: {
      type: 'number',
    },
    BIO: {
      type: 'varchar',
    },
  },
  {
    primaryKey: 'USER_ID',
  }
);

module.exports = sage.model('SAGE_TEST.PROFILES', ProfileSchema);
