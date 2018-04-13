const sage = require('../../../build/sage');

const Schema = sage.Schema;

const UserSchema = new Schema(
  {
    USER_ID: {
      type: 'number',
      readonly: true,
    },
    CREATED_AT: {
      type: 'timestamp',
      readonly: true,
    },
    USERNAME: {
      type: 'varchar',
    },
    AGE: {
      type: 'number',
    },
    POSTS: {
      type: 'association',
      joinType: 'hasMany',
      joinsWith: 'SAGE_TEST.POSTS',
      foreignKeys: {
        mine: 'USER_ID',
        theirs: 'USER_ID',
      },
      model: 'SAGE_TEST.POSTS',
    },
    PROFILE: {
      type: 'association',
      joinType: 'hasOne',
      joinsWith: 'SAGE_TEST.PROFILES',
      foreignKeys: {
        mine: 'USER_ID',
        theirs: 'USER_ID',
      },
      model: 'SAGE_TEST.PROFILES',
    },
  },
  {
    primaryKey: 'USER_ID',
  }
);

module.exports = sage.model('SAGE_TEST.USERS', UserSchema);
