var _ = require('lodash');
var moment = require('moment');
var TestHelpers = require('./test_helpers');
var expect = require('chai').expect;


var User = require('./setup/models/user');
var Profile = require('./setup/models/profile');
var Post = require('./setup/models/post');

sage = TestHelpers.sage;
sage.debug = true;

var user;
describe('transactions',function() {
  // Reset Db
  before(function(done) {
    TestHelpers.initdb().then(function() {
      done();
    });
  });;
  // Connect to sage
  before(function(done) {
    TestHelpers.connect().then(function() {
      done();
    }).catch(function(err) {
      console.log(err);
    });
  });  

  it("should not read if not commited", function(done) {
    sage.transaction().then(function(t) {
      var username = (new Date()).getTime().toString();
      User.create({ USERNAME: username }, { transaction: t })
      .then(function() {
        // User not yet commit. Check on different connection
        return User.findOne({ USERNAME: username })
      }).then(function(userModel) {
        expect(userModel).to.not.be.ok;
        return t.rollback();
      }).then(function() {
        done();
      });
    });
  });

  it("should read if on same connection", function(done) {
    sage.transaction().then(function(t) {
      var username = (new Date()).getTime().toString();
      User.create({ USERNAME: username }, { transaction: t })
      .then(function() {
        // User not yet commit. Check on different connection
        return User.findOne({ USERNAME: username }, { transaction: t })
      }).then(function(userModel) {
        expect(userModel).to.be.ok;
        return t.rollback();
      }).then(function() {
        done();
      });
    });
  });

  it("should commit using a promise transaction", function(done) {
    sage.transaction().then(function(t) {
      var username = (new Date()).getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username }, { transaction: t })
      .then(function() {
        return t.commit();
      }).then(function() {
        return User.findOne({ USERNAME: username });
      }).then(function(userModel) {
        expect(userModel).to.be.ok;
        done();
      });
    });
  });


  it("should commit using a function transaction", function(done) {
    var username = (new Date()).getTime().toString() + _.random(0, 99999);
    sage.transaction(function(t) {
      User.create({ USERNAME: username }, { transaction: t }).then(function() {
        t.commit();
      });
    }).then(function() {
      return User.findOne({ USERNAME: username });
    }).then(function(userModel) {
      expect(userModel).to.be.ok;
      done();
    }).catch(function(err) {
      console.log(err)
    });
  });


  it("should create a bunch in one connection", function(done) {
    var username = (new Date()).getTime().toString() + _.random(0, 99999);

    var user;
    sage.transaction().then(function(t) {
      User.create({ USERNAME: username }, { transaction: t }).then(function() {
        return User.findOne({ USERNAME: username }, { transaction: t });
      }).then(function(userModel) {
        user = userModel;
        return Profile.create({ USER_ID: user.id, BIO: "I code." }, { transaction: t });
      }).then(function() {
        return Post.create({ USER_ID: user.id, POST_BODY: "My transaction post" }, { transaction: t });
      }).then(function() {      
        return Post.create({ USER_ID: user.id, POST_BODY: "My second post" }, { transaction: t });
      }).then(function() {
        return t.commit();
      }).then(function() {
        return user.populate();
      }).then(function() {
        var json = user.toJSON();
        expect(json.posts.length).to.equal(2);
        done();        
      }).catch(function(err) { console.log(err) });
    });
  });
  
  describe("count", function() {
    var user;
    before(function(done) {
      var username = (new Date()).getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username}).then(function() {
        done();
      });
    })
    it("should count", function(done) {
      User.count().then(function(count) {
        expect(count > 0).to.be.ok;
        done();
      });      
    });  
    it("should count in transaction", function(done) {
      sage.transaction().then(function(t) {
        User.count(null, { transaction: t }).then(function(count) {
          expect(count > 0).to.be.ok;
          t.rollback().then(function() {
            done();
          });
        });
      });
    });      
  });


  describe("findById", function() {
    it("should find by id", function(done) {
      User.findById(3).then(function(userModel) {
        expect(userModel).to.be.ok;
        done();
      });
    });      
    it("should find by id in transaction", function(done) {
      sage.transaction().then(function(t) {
        // Just use ID 3 here because a previous test created this user
        User.findById(3, { transaction: t }).then(function(userModel) {
          expect(userModel).to.be.ok;
          t.rollback().then(function() {
            done();
          });          
        });
      });
    });      
  });

  describe("select", function() {
    it("should select", function(done) {
      User.select().exec().then(function(models) {
        expect(models.length).to.be.above(2);
        done();
      });
    });      
    it("should select in transaction", function(done) {
      sage.transaction().then(function(t) {
        // Just use ID 3 here because a previous test created this user
        User.select().exec({ transaction: t }).then(function(models) {
          expect(models.length).to.be.above(2);
          t.rollback().then(function() {
            done();
          });
        });
      });
    });      
    it("should select in transaction", function(done) {
      sage.transaction().then(function(t) {
        User.create({ "USERNAME": "selectUser" }, { transaction: t }).then(function() {
          return User.select().where({ USERNAME: "selectUser" }).exec({ transaction: t });
        }).then(function(results) {
          expect(results.length).to.equal(1);
          t.rollback().then(function() {
            done();
          });          
        });
      });
    });      
  });  

  describe("reload", function() {
    var user;
    before(function(done) {
      var username = (new Date()).getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username}).then(function() {
        User.findOne({ USERNAME: username }).then(function(userModel) {
          user = userModel;
          done();
        });
      });
    })

    it("should reload", function(done) {
      var outOfSyncUser;
      User.findOne({ USERNAME: user.get('USERNAME') }).then(function(userModel) {
        outOfSyncUser= userModel;
        sage.transaction(function(t) {
          user.set("USERNAME", "gumby");
          user.save({ transaciton: t }).then(function() {
            expect(outOfSyncUser.get("USERNAME")).to.not.equal("gumby");
            outOfSyncUser.reload({ transaciton: t }).then(function() {
              expect(outOfSyncUser.get("USERNAME")).to.equal("gumby");
              t.rollback();
            });
          });
        }).then(function() {
          done();
        });
      });
    });
  });

  describe("save", function() {
    var user;
    before(function(done) {
      var username = (new Date()).getTime().toString() + _.random(0, 99999);
      User.create({ USERNAME: username}).then(function() {
        User.findOne({ USERNAME: username }).then(function(userModel) {
          user = userModel;
          done();
        });
      });
    })

    it("should save", function(done) {
      user.set("USERNAME", "gumby");
      user.save().then(function() {
        done();
      });
    });

    it("should save in transactions", function(done) {
      user.set("USERNAME", "transGumby");

      sage.transaction().then(function(t) {
        user.save({ transaction: t}).then(function() {
          // Outside of transaction so it should not show change
          return User.findOne({ USERNAME: "transGumby"});
        }).then(function(userModel) {
          expect(userModel).to.not.be.ok;
          // Look inside the transaction
          return User.findOne({ USERNAME: "transGumby"}, { transaction: t });
        }).then(function(userModel) {
          expect(userModel.get('USERNAME')).to.equal('transGumby');
          return t.commit();
        }).then(function() {
          return User.findOne({ USERNAME: "transGumby"});
        }).then(function(userModel) {
          expect(userModel.get("USERNAME")).to.equal('transGumby');
          done();
        })
      });
    })    

    describe('destroy', function() {
      var user;
      var username = (new Date()).getTime().toString() + _.random(0, 99999);
      before(function(done) {
        User.create({ USERNAME: username}).then(function() {
          User.findOne({ USERNAME: username }).then(function(userModel) {
            user = userModel;
            done();
          });
        });
      });

      it("should destroy in transaction", function(done) {
        sage.transaction(function(t) {
          user.destroy({ transaction: t }).then(function() {
            t.rollback();
          });
        }).then(function() {
          User.findOne({ USERNAME: username }).then(function(userModel) {
            expect(userModel).to.be.ok;
            done();
          });
        }).catch(function(err) {
          console.log(err);
        });
      });

      it("should destroy", function(done) {
        user.destroy().then(function() {
          User.findOne({ USERNAME: username }).then(function(userModel) {
            expect(userModel).to.not.be.ok;
            done();
          });
        }).catch(function(err) {
          console.log(err);
        });
      });      

    });

  })
  
  // // Create and set user
  // before(function(done) {
  //   User.create({ USERNAME: "mrchess" }).then(function(err) {
  //     User.findOne({ USERNAME: "mrchess" }).then(function(userModel) {
  //       user = userModel;
  //       console.log('found user', user.id)
  //       done();
  //     });
  //   }).catch(function(err) { console.log('err', err) });
  // });

  // // Create a profile for user - hasOne
  // before(function(done) {
  //   Profile.create({
  //     USER_ID: user.id,
  //     BIO: "I write software."
  //   }).then(function() {
  //     done();
  //   });
  // });

  // // Create a few posts for the user - hasMany
  // before(function(done) {
  //   Post.create({
  //     USER_ID: user.id,
  //     POST_BODY: "My first post."
  //   }).then(function() {
  //     done();
  //   });
  // })
  // before(function(done) {
  //   Post.create({
  //     USER_ID: user.id,
  //     POST_BODY: "My second post."
  //   }).then(function() {
  //     done();
  //   });
  // })  

  // it('should populate', function(done) {
  //   user.populate().then(function() {
  //     // console.log(user)
  //     var json = user.toJSON();
  //     // console.log(json)
  //     expect(json.posts.length).to.equal(2);
  //     done();
  //   });
  // });
});