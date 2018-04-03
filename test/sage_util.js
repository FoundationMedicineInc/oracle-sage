const Promise = require("bluebird");
const assert = require('assert');
const expect = require('chai').expect;
const sage = require('../build/sage');
const sageUtil = require('../build/sage_util');
const TestHelpers = require('./test_helpers');
const Comment = require('./setup/models/comment');

const userSchema = new sage.Schema({
  ID: 'number',
  SECRET: {
    type: 'varchar',
    readonly: true,
  },
  CREATED_AT: {
    type: 'date',
    format: 'MM/DD/YYYY',
  },
});

const customCommentSchema = new sage.Schema(
  {
    COMMENT_ID: {
      type: 'raw',
      transform: buffer => buffer.toString('utf8')
    },
    LIKE_COUNT: {
      type: 'raw',
    },
    BODY: {
      type: 'blob',
      transform: value => {
        return new Promise(resolve => {
          const chunks = [];
          value.on('data', chunk => {
            chunks.push(chunk.toString());
          });
          value.on('end', () => {
            resolve(`${chunks.join('')} No you may not.`);
          });
        });
      }
    },
  },
  {
    primaryKey: 'COMMENT_ID',
  }
);

const CustomCommentModel = sage.model('SAGE_TEST.COMMENTS', customCommentSchema);

describe('utilities', () => {
  // Reset Db
  before(done => {
    TestHelpers.initdb().then(() => {
      done();
    });
  });
  // Connect to sage
  before(done => {
    TestHelpers.connect()
      .then(() => {
        done();
      })
      .catch(err => {
        console.log(err);
      });
  });

  it('should build sql correctly', () => {
    var sql = sageUtil.schemaToString(userSchema);
    assert.equal(sql, 'ID,CREATED_AT');

    var sql = sageUtil.schemaToString(userSchema, { prefix: ':' });
    assert.equal(sql, ':ID,:CREATED_AT');
  });

  it('should amend date fields', () => {
    let sql = sageUtil.schemaToString(userSchema, { prefix: ':' });
    sql = sageUtil.amendDateFields(userSchema, sql);
    const expected = ":ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS')";
    assert.equal(sql, expected);
  });

  it('should build a full query', () => {
    const sql = sageUtil.getInsertSQL('test', userSchema);
    const expected =
      "INSERT INTO test (ID,CREATED_AT) VALUES (:ID,TO_DATE(:CREATED_AT,'MM/DD/YYYY HH24:MI:SS'))";
    assert.equal(sql, expected);
  });

  it('should not have readonly fields in INSERT', () => {
    const sql = sageUtil.getInsertSQL('test', userSchema);
    assert.equal(sql.indexOf('SECRET'), -1);
  });

  it('should handle results with 0 and null values', () => {
    // Sample result from node-oracledb
    const result = {
      rows: [[1, 0, null, 1]],
      metaData: [
        { name: 'USER_ID' },
        { name: 'BIO' },
        { name: 'AGE' },
        { name: 'RNUM' },
      ],
    };

    return sageUtil.resultToJSON(result).then(results => {
      const result = results[0];
      assert.equal(result.USER_ID, 1);
      assert.equal(result.BIO, 0);
      assert.equal(result.AGE, null);
    });
  });

  it('should convert RAW data types to hex with uppercase letters', done => {
    const id = Buffer.from('Hello World').toString('hex');
    Comment.create({
      COMMENT_ID: id,
      LIKE_COUNT: '25',
      BODY: 'I can haz cheezburger pleaze?',
    }).then(result => {
      expect(result.get('COMMENT_ID')).to.equal(`48656C6C6F20576F726C64`);
      result.destroy().then(done);
    });
  });

  it('should convert to the expected output when using a transform function', done => {
    const id = Buffer.from('Hello World', 'utf8');
    CustomCommentModel.create({
      COMMENT_ID: id,
      LIKE_COUNT: '25',
      BODY: 'I can haz cheezburger pleaze?',
    }).then(result => {
      expect(result.get('COMMENT_ID')).to.equal('Hello World');
      done();
    });
  });

  it('should allow Promises as transform functions', done => {
    const id = new Date().getTime().toString();
    CustomCommentModel.create({
      COMMENT_ID: id,
      LIKE_COUNT: '25',
      BODY: 'I can haz cheezburger pleaze?',
    }).then(result => {
      expect(result.get('BODY')).to.equal('I can haz cheezburger pleaze? No you may not.');
      done();
    });
  });
});
