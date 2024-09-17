import mongoose from 'mongoose';

const satelliteSchema = new mongoose.Schema({
  gsat: { type: String, required: true },
  pids: [Object]
});

const Satellite = mongoose.model('Satellite', satelliteSchema);
export default Satellite;
