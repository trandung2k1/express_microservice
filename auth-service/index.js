const express = require('express');
const app = express();
const port = process.env.PORT_ONE || 7070;
const mongoose = require('mongoose');
const User = require('./User');
const jwt = require('jsonwebtoken');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/auth-service');
        console.log('Auth service DB connected');
    } catch (error) {
        console.log(error);
        console.error('Auth service connected DB failed!!');
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    console.log('You are performing a server shutdown!');
    await mongoose.connection.close();
    process.exit(0);
});

app.use(express.json());

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.json({ message: "User doesn't exist" });
    } else {
        if (password !== user.password) {
            return res.json({ message: 'Password Incorrect' });
        }
        const payload = {
            email,
            name: user.name,
        };
        jwt.sign(payload, 'secret', (err, token) => {
            if (err) console.log(err);
            else return res.json({ token: token });
        });
    }
});

app.post('/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.json({ message: 'User already exists' });
    } else {
        const newUser = new User({
            email,
            name,
            password,
        });
        newUser.save();
        return res.json(newUser);
    }
});

app.listen(port, async () => {
    try {
        await connectDB();
        console.log(`Auth service listening on http://localhost:${port}`);
    } catch (error) {
        console.log(error);
    }
}).on('error', (e) => {
    console.log(e);
    process.exit(1);
});
