const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log(`[db] connected to MongoDB at ${env.MONGO_URI}`);
  } catch (err) {
    console.error('[db] connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected from MongoDB');
  });
}

module.exports = connectDB;
