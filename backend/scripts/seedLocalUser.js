require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedLocalUser() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'test@darkscan.local';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`User already exists: ${existing._id} ${existing.email}`);
    await mongoose.disconnect();
    return;
  }

  const user = await User.create({
    email,
    passwordHash: 'test123',
    name: 'Local Tester'
  });

  console.log(`Created local test user: ${user._id} ${user.email}`);
  await mongoose.disconnect();
}

seedLocalUser()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch (_) {
      // ignore disconnect error
    }
    process.exit(1);
  });
