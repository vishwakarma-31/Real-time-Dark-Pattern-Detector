require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedDemoUser() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/darkscan';
  await mongoose.connect(mongoUri);

  const email = 'demo@darkscan.io';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log('Demo user already exists.');
    await mongoose.disconnect();
    return;
  }

  await User.create({
    email,
    passwordHash: 'demo123!',
    name: 'DarkScan Demo User',
    organization: 'DarkScan',
    role: 'user'
  });

  console.log('Demo user created: demo@darkscan.io / demo123!');
  await mongoose.disconnect();
}

seedDemoUser().catch(async (err) => {
  console.error('Failed to seed demo user:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  process.exit(1);
});
