const express = require('express');
const app = express();
const port = process.env.PORT_ONE || 8080;
const mongoose = require('mongoose');
const Product = require('./Product');
const amqp = require('amqplib');
const isAuthenticated = require('../isAuthenticated');
let order;

let channel, connection;

app.use(express.json());

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/product-service');
        console.log('Product service DB connected');
    } catch (error) {
        console.log(error);
        console.error('Product service connected DB failed!!');
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    console.log('You are performing a server shutdown!');
    await mongoose.connection.close();
    process.exit(0);
});

async function connect() {
    const amqpServer = 'amqp://localhost';
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue('PRODUCT');
}

connect();

app.post('/product/buy', isAuthenticated, async (req, res) => {
    const { ids } = req.body;
    const products = await Product.find({ _id: { $in: ids } });
    // Gửi đi
    channel.sendToQueue(
        'ORDER',
        Buffer.from(
            JSON.stringify({
                products,
                userEmail: req.user.email,
            }),
        ),
    );
    channel.consume('PRODUCT', (data) => {
        order = JSON.parse(data.content);
        // Xác nhận để xóa khỏi hàng đợi
        channel.ack(data);
    });
    return res.json(order);
});

app.post('/product/create', isAuthenticated, async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});

app.listen(port, async () => {
    try {
        await connectDB();
        console.log(`Product service listening on http://localhost:${port}`);
    } catch (error) {
        console.log(error);
    }
}).on('error', (e) => {
    console.log(e);
    process.exit(1);
});
