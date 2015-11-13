```
var sage = require('../build/sage');
sage.connect().then(function() {
  // Define Schema
  var studySchema = new sage.Schema({
    DOWNLOAD_DATE: {
      type: "date",
      format: "MM/DD/YYYY"
    },
    NCT_ID: {
      type: "varchar",
      validator: function(v) {
        return /1/.test(v);
      },
    },
    PHASE: {
      type: "varchar",
      enum: {
        values: '1 1/2 2 2/3 3 4'.split(' '),
      }
    }
    MINIMUM_AGE: "number"
  }, {
    primaryKey: "ID"
  });

  // Make model
  var Study = sage.model("rocket.clinical_study", studySchema);

  // Make record
  var study = new Study({ 
    NCT_ID: "NCT12345", 
    CURRENT: "Y", 
    PHASE: "1" 
  });

  study.set('PHASE', '2/3');
  study.set({
    'NCT_ID': "NCT4567",
    "MINIMUM_AGE": 18
  });

  study.insert().then(function(study) {
    // do something
  });
  
})
```