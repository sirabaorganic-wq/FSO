const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to DB");
    const email = "testuser@example.com";
    const password = "Password123!";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    let user = await User.findOne({ email });
    if (user) {
        user.password = hashedPassword;
        user.failedLoginAttempts = 0;
        user.accountLockUntil = null;
        user.isBlocked = false;
        await user.save();
        console.log("Test user updated: testuser@example.com / Password123!");
    } else {
        await User.create({
        name: "Test User",
        email: email,
        password: hashedPassword,
        isAdmin: false,
        isEmailVerified: true,
        isPhoneVerified: true
        });
        console.log("Test user created: testuser@example.com / Password123!");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
