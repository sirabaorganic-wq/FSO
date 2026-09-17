const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findOne({ email: "testuser@example.com" });
    if (user && user.lastLogin) {
        console.log(`SUCCESS: User lastLogin is set to ${user.lastLogin}`);
    } else {
        console.log("FAIL: lastLogin not set or user not found.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
