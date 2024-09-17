import mongoose from 'mongoose';

const thresholdBreachSchema = new mongoose.Schema({
  breachStart: { type: Date, required: true },  // Time when the breach started
  breachEnd: { type: Date, required: true },    // Time when the breach ended
  change: { 
    yaw: { type: Number },
    pitch: { type: Number },
    roll: { type: Number }
  },                                            // The value with which it changed from the threshold
  breachParameter: { type: String, required: true } // Parameter that breached the threshold
});

const inactivityPeriodSchema = new mongoose.Schema({
  inactiveStart: { type: Date, required: true },  // Time when inactivity started
  inactiveEnd: { type: Date, required: true },    // Time when inactivity ended
  duration: { type: String, required: true }      // Duration of inactivity in minutes
});

const dataModelSchema = new mongoose.Schema({
  startDate: { type: String, required: true },    // Start date of the query
  startTime: { type: String, required: true },    // Start time of the query
  endDate: { type: String, required: true },      // End date of the query
  endTime: { type: String, required: true },      // End time of the query
  thresholdBreaches: [thresholdBreachSchema],     // Array of threshold breach objects
  inactivePeriods: [inactivityPeriodSchema],      // Array of inactivity period objects
  createdAt: { type: Date, default: Date.now }    // Timestamp when the data was processed
});

const DataModel = mongoose.model('DataModel', dataModelSchema);

export { DataModel };
