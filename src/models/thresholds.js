import mongoose from 'mongoose';

const thresholdSchema = new mongoose.Schema({
  yaw: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  roll: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  pitch: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  samplingTime: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  period: {
    type: Number
  },
  gsat: {
    type: String
  },
  selectedPid: {
    type: String
  },
  id: {
    type: String
  }
});

const Threshold = mongoose.model('Threshold', thresholdSchema);
export default Threshold;
