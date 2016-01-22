// // this test only works if you have a database spawned up and populated by the ctworker inittestdb

// var assert = require('assert');
// var sage = require('../build/sage');

// var studySchema = new sage.Schema({
//   CLINICAL_TRIAL_ID: "number",
//   NCT_ID: { 
//     type: "varchar"
//   },
//   MD5: "varchar",
//   PHASE: {
//     type: "varchar",
//     enum: {
//       values: '1 1/2 2 2/3 3 4'.split(' '),
//     }    
//   },
//   EXPIRED_DATE: {
//     type: "date",
//     format: "MM/DD/YYYY"
//   },
//   IS_CURRENT: "char"
// }, {
//   primaryKey: "CLINICAL_TRIAL_ID"
// });

// var Study = sage.model("ROCKET_TEST.CLINICAL_TRIALS", studySchema);

// describe("rocket test", function() {
//   it("should connect", function(done) {
//     sage.connect().then(function() {
//       assert(sage.connection);
//       done();
//     })
//   })

//   it("should create", function(done) {
//     Study.create({NCT_ID: "a123", MD5: 'abcdefg', IS_CURRENT: "N"}).then(function(result) {
//       assert.equal(result, true);
//       done();
//     })
//   });

//   it("should destroy", function(done) {
//     Study.create({NCT_ID: "adestroy", MD5: 'abcdefg', IS_CURRENT: "N"}).then(function(result) {
//       Study.findOne({NCT_ID: "adestroy"}).then(function(study) {
//         study.destroy().then(function() {
//           done();
//         })
//       })
//     })
//   });  

//   it("should create with dates", function(done) {
//     Study.create({NCT_ID: "a123", EXPIRED_DATE: "10/29/2015", MD5: 'abcdefg', IS_CURRENT: "N"}).then(function(result) {
//       assert.equal(result, true);
//       done();
//     })
//   });

//   var ID = null

//   it("should findOne", function(done) {
//     Study.findOne({ NCT_ID: "a123" }).then(function(result) {
//       assert.equal(result.get('NCT_ID'), 'a123');
//       ID = result.get("CLINICAL_TRIAL_ID");
//       done();
//     })
//   })

//   it("should findById", function(done) {
//     Study.findById(ID).then(function(result) {
//       assert.equal(result.get('NCT_ID'), 'a123');
//       done();
//     })
//   })  

//   it("should select using knex", function(done) {
//     Study.select()
//     .limit(10)
//     .exec()
//     .then(function(results) {
//       done();
//     });
//   })

//   describe("when saving", function() {
//     var study = null;

//     before(function(done) {
//       Study.create({NCT_ID: "savetest", MD5: 'abcdefg', IS_CURRENT: "N"}).then(function() {
//         Study.findOne({NCT_ID: "savetest"}).then(function(s) {
//           study = s;
//           done();
//         });
//       });
//     });

//     it("should save", function(done) {
//       assert.equal(study.get('NCT_ID'), "savetest");
//       study.set({"NCT_ID": "a4567", "PHASE": "1/2"});
//       study.save().then(function() {
//         assert.equal(study.get('NCT_ID'), "a4567");
//         assert.equal(study.get('PHASE'), "1/2");
//         done();
//       });
//     });  

//     it("should save dates", function(done) {
//       study.set('EXPIRED_DATE', '10/25/2015');
//       study.save().then(function() {
//         assert(study.get('EXPIRED_DATE'), '10/25/2015');
//         done();
//       });
//     });      
//   })

// })