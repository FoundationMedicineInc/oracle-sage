const _ = require('lodash');
const moment = require('moment');
const TestHelpers = require('./test_helpers');
const expect = require('chai').expect;

const User = require('./setup/models/user');
const Profile = require('./setup/models/profile');
const Post = require('./setup/models/post');

const sage = TestHelpers.sage;
sage.logger.transports.console.level = 'debug';

let user;
describe('transactions', () => {
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

  it('should not read if not commited', done => {
    sage.transaction().then(t => {
      const username = new Date().getTime().toString();
      User.create({ USERNAME: username }, { transaction: t })
        .then(() =>
          // User not yet commit. Check on different connection
          User.findOne({ USERNAME: username })
        )
        .then(userModel => {
          expect(userModel).to.not.be.ok;
          return t.rollback();
        })
        .then(() => {
          done();
        });
    });
  });

  it('should read if on same connection', done => {
    sage.transaction().then(t => {
      const username = new Date().getTime().toString();
      User.create({ USERNAME: username }, { transaction: t })
        .then(() =>
          // User not yet commit. Check on different connection
          User.findOne({ USERNAME: username }, { transaction: t })
        )
        .then(userModel => {
          expect(userModel).to.be.ok;
          return t.rollback();
        })
        .then(() => {
          done();
        });
    });
  });

  it('should commit using a promise transaction', done => {
    sage.transaction().then(t => {
      const username = new Date().getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username }, { transaction: t })
        .then(() => t.commit())
        .then(() => User.findOne({ USERNAME: username }))
        .then(userModel => {
          expect(userModel).to.be.ok;
          done();
        });
    });
  });

  it('should commit using a function transaction', done => {
    const username = new Date().getTime().toString() + _.random(0, 99999);
    sage
      .transaction(t => {
        User.create({ USERNAME: username }, { transaction: t }).then(() => {
          t.commit();
        });
      })
      .then(() => User.findOne({ USERNAME: username }))
      .then(userModel => {
        expect(userModel).to.be.ok;
        done();
      })
      .catch(err => {
        console.log(err);
      });
  });

  it('should create a bunch in one connection', done => {
    const username = new Date().getTime().toString() + _.random(0, 99999);

    let user;
    sage.transaction().then(t => {
      User.create({ USERNAME: username }, { transaction: t })
        .then(() => User.findOne({ USERNAME: username }, { transaction: t }))
        .then(userModel => {
          user = userModel;
          return Profile.create(
            { USER_ID: user.id, BIO: 'I code.' },
            { transaction: t }
          );
        })
        .then(() =>
          Post.create(
            { USER_ID: user.id, POST_BODY: 'My transaction post' },
            { transaction: t }
          )
        )
        .then(() =>
          Post.create(
            { USER_ID: user.id, POST_BODY: 'My second post' },
            { transaction: t }
          )
        )
        .then(() => t.commit())
        .then(() => user.populate())
        .then(() => {
          const json = user.toJSON();
          expect(json.posts.length).to.equal(2);
          done();
        })
        .catch(err => {
          console.log(err);
        });
    });
  });

  describe('count', () => {
    let user;
    before(done => {
      const username = new Date().getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username }).then(() => {
        done();
      });
    });
    it('should count', done => {
      User.count().then(count => {
        expect(count > 0).to.be.ok;
        done();
      });
    });
    it('should count in transaction', done => {
      sage.transaction().then(t => {
        User.count(null, { transaction: t }).then(count => {
          expect(count > 0).to.be.ok;
          t.rollback().then(() => {
            done();
          });
        });
      });
    });
  });

  describe('findById', () => {
    it('should find by id', done => {
      User.findById(3).then(userModel => {
        expect(userModel).to.be.ok;
        done();
      });
    });
    it('should find by id in transaction', done => {
      sage.transaction().then(t => {
        // Just use ID 3 here because a previous test created this user
        User.findById(3, { transaction: t }).then(userModel => {
          expect(userModel).to.be.ok;
          t.rollback().then(() => {
            done();
          });
        });
      });
    });
  });

  describe('select', () => {
    it('should select', done => {
      User.select()
        .exec()
        .then(models => {
          expect(models.length).to.be.above(2);
          done();
        });
    });
    it('should select in transaction', done => {
      sage.transaction().then(t => {
        // Just use ID 3 here because a previous test created this user
        User.select()
          .exec({ transaction: t })
          .then(models => {
            expect(models.length).to.be.above(2);
            t.rollback().then(() => {
              done();
            });
          });
      });
    });
    it('should select in transaction', done => {
      sage.transaction().then(t => {
        User.create({ USERNAME: 'selectUser' }, { transaction: t })
          .then(() =>
            User.select()
              .where({ USERNAME: 'selectUser' })
              .exec({ transaction: t })
          )
          .then(results => {
            expect(results.length).to.equal(1);
            t.rollback().then(() => {
              done();
            });
          });
      });
    });
  });

  describe('reload', () => {
    let user;
    before(done => {
      const username = new Date().getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username }).then(() => {
        User.findOne({ USERNAME: username }).then(userModel => {
          user = userModel;
          done();
        });
      });
    });

    it('should reload', done => {
      let outOfSyncUser;
      User.findOne({ USERNAME: user.get('USERNAME') }).then(userModel => {
        outOfSyncUser = userModel;
        sage
          .transaction(t => {
            user.set('USERNAME', 'gumby');
            user.save({ transaciton: t }).then(() => {
              expect(outOfSyncUser.get('USERNAME')).to.not.equal('gumby');
              outOfSyncUser.reload({ transaciton: t }).then(() => {
                expect(outOfSyncUser.get('USERNAME')).to.equal('gumby');
                t.rollback();
              });
            });
          })
          .then(() => {
            done();
          });
      });
    });
  });

  describe('save', () => {
    let user;
    before(done => {
      const username = new Date().getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username }).then(() => {
        User.findOne({ USERNAME: username }).then(userModel => {
          user = userModel;
          done();
        });
      });
    });

    it('should save', done => {
      user.set('USERNAME', 'gumby');
      user.save().then(() => {
        done();
      });
    });

    it('should save in transactions', done => {
      user.set('USERNAME', 'transGumby');

      sage.transaction().then(t => {
        user
          .save({ transaction: t })
          .then(() =>
            // Outside of transaction so it should not show change
            User.findOne({ USERNAME: 'transGumby' })
          )
          .then(userModel => {
            expect(userModel).to.not.be.ok;
            // Look inside the transaction
            return User.findOne({ USERNAME: 'transGumby' }, { transaction: t });
          })
          .then(userModel => {
            expect(userModel.get('USERNAME')).to.equal('transGumby');
            return t.commit();
          })
          .then(() => User.findOne({ USERNAME: 'transGumby' }))
          .then(userModel => {
            expect(userModel.get('USERNAME')).to.equal('transGumby');
            done();
          });
      });
    });

    describe('destroy', () => {
      let user;
      const username = new Date().getTime().toString() + _.random(0, 99999);
      before(done => {
        User.create({ USERNAME: username }).then(() => {
          User.findOne({ USERNAME: username }).then(userModel => {
            user = userModel;
            done();
          });
        });
      });

      it('should destroy in transaction', done => {
        sage
          .transaction(t => {
            user.destroy({ transaction: t }).then(() => {
              t.rollback();
            });
          })
          .then(() => {
            User.findOne({ USERNAME: username }).then(userModel => {
              expect(userModel).to.be.ok;
              done();
            });
          })
          .catch(err => {
            console.log(err);
          });
      });

      it('should destroy', done => {
        user
          .destroy()
          .then(() => {
            User.findOne({ USERNAME: username }).then(userModel => {
              expect(userModel).to.not.be.ok;
              done();
            });
          })
          .catch(err => {
            console.log(err);
          });
      });
    });
  });

  describe('a user with posts', () => {
    // Create and set user
    before(done => {
      User.create({ USERNAME: 'mrchess' })
        .then(err => {
          User.findOne({ USERNAME: 'mrchess' }).then(userModel => {
            user = userModel;
            console.log('found user', user.id);
            done();
          });
        })
        .catch(err => {
          console.log('err', err);
        });
    });

    // Create a profile for user - hasOne
    before(done => {
      Profile.create({
        USER_ID: user.id,
        BIO: 'I write software.',
      }).then(() => {
        done();
      });
    });

    // Create a few posts for the user - hasMany
    before(done => {
      Post.create({
        USER_ID: user.id,
        POST_BODY: 'My first post.',
      }).then(() => {
        done();
      });
    });
    before(done => {
      Post.create({
        USER_ID: user.id,
        POST_BODY: 'My second post.',
      }).then(() => {
        done();
      });
    });

    it('should populate', done => {
      user.populate().then(() => {
        // console.log(user)
        const json = user.toJSON();
        // console.log(json)
        expect(json.posts.length).to.equal(2);
        done();
      });
    });
  });
});
