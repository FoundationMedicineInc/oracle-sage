// this test only works if you have a database spawned up and populated by the ctworker initdb
var assert = require('assert');
var sage = require('../build/sage');
var _ = require('lodash');

var studySchema = new sage.Schema({
  CLINICAL_TRIAL_ID: "number",
  NCT_ID: { 
    type: "varchar"
  },
  PHASE: {
    type: "varchar",
    enum: {
      values: '1 1/2 2 2/3 3 4'.split(' '),
    }    
  },
  EXPIRED_DATE: {
    type: "date",
    format: "MM/DD/YYYY"
  },
  SPONSORS: {
    type: "association",
    joinType: "hasManyThrough",
    joinTable: "ROCKET.TRIAL_SPONSOR",
    joinsWith: "ROCKET.SPONSORS",
    foreignKeys: {
      mine: "CLINICAL_TRIAL_ID",
      theirs: "SPONSOR_ID",
    },
    model: "ROCKET.SPONSORS"
  },
  INTERVENTIONS: {
    type: "association",
    joinType: "hasAndBelongsToMany",
    joinTable: "ROCKET.TRIAL_INTERVENTION",
    joinsWith: "ROCKET.INTERVENTIONS",
    foreignKeys: {
      mine: "CLINICAL_TRIAL_ID",
      theirs: "INTERVENTION_ID"
    },
    model: "ROCKET.INTERVENTIONS"
  },  
  FACILITIES: {
    type: "association",
    joinType: "hasManyThrough",
    joinTable: "ROCKET.TRIAL_FACILITY",
    joinsWith: "ROCKET.FACILITIES",
    foreignKeys: {
      mine: "CLINICAL_TRIAL_ID",
      theirs: "FACILITY_ID"
    },
    model: "ROCKET.FACILITIES"
  }  
}, {
  primaryKey: "CLINICAL_TRIAL_ID"
});

var studySponsorSchema = new sage.Schema({
  "CLINICAL_TRIAL_ID": "number",
  "SPONSOR_ID": "varchar",
  "SPONSOR_TYPE": "varchar"
});

var sponsorSchema = new sage.Schema({
  "SPONSOR_ID": "varchar",
  "AGENCY": "varchar",
  "AGENCY_CLASS": "varchar",
  "JUNK": {
    type: "association",
    joinType: "hasMany",
    joinsWith: "ROCKET.TRIAL_SPONSOR",
    foreignKeys: {
      mine: "SPONSOR_ID",
      theirs: "SPONSOR_ID"
    },
    model: 'ROCKET.TRIAL_SPONSOR'
  }
}, {
  primaryKey: "SPONSOR_ID"
});

var interventionSchema = new sage.Schema({
  "INTERVENTION_ID": "varchar",
  "INTERVENTION_TYPE": "varchar",
  "INTERVENTION_NAME": "varchar",
  "DESCRIPTION": "varchar"
}, {
  primaryKey: "INTERVENTION_ID"
});

var facilitySchema = new sage.Schema({
  "FACILITY_ID": "varchar",
  "NAME": "varchar",
  "CITY": "varchar",
  "STATE": "varchar",
  "ZIP": "varchar",
  "COUNTRY": "varchar"
}, {
  primaryKey: "FACILITY_ID"
});

var Study = sage.model("ROCKET.CLINICAL_TRIALS", studySchema);
var StudySponsor = sage.model("ROCKET.TRIAL_SPONSOR", studySponsorSchema);
var Sponsor = sage.model("ROCKET.SPONSORS", sponsorSchema);
var Facility = sage.model("ROCKET.FACILITIES", facilitySchema);
var Intervention = sage.model("ROCKET.INTERVENTIONS", interventionSchema);

var NCT_ID = 'NCT00670358'
describe("relation tests", function() {
  it("should connect", function(done) {
    sage.connect().then(function() {
      assert(sage.connection);
      done();
    })
  })

  it("should populate hasMany", function(done) {
    Sponsor.findById('608c672efb3e823a483790ecedcb6211').then(function(model) {
      model.populate().then(function() {
        assert.equal(model.get('JUNK').length, 1);
        done();
      })
    })
  });

  it("should populate hasMany :through", function(done) {
    Study.findOne({NCT_ID: NCT_ID}).then(function(study) {
      study.populate().then(function() {
        console.log(study.get("SPONSORS").length, 'sponsors')
        console.log(study.get("FACILITIES").length, 'facilities')
        // assert.equal(study.get('SPONSORS').length, 4)
        // assert.equal(study.get('FACILITIES').length, 3)
        done();
      })
    })
  });

  it("should populate hasAndBelongsToMany", function(done) {
    Study.findOne({NCT_ID: NCT_ID}).then(function(study) {
      study.populate().then(function() {
        // assert.equal(study.get('INTERVENTIONS').length, 3);
        console.log(study.get("INTERVENTIONS").length, 'interventions')
        done();
      })
    })
  });  


  it("should format json correctly", function(done) {
    Study.findOne({NCT_ID: NCT_ID}).then(function(study) {
      study.populate().then(function() {
        // assert.equal(study.get('INTERVENTIONS').length, 3);
        // study.json
        console.log(study.json);
        done();
      })
    })
  });    
})