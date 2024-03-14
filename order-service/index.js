const express = require('express');
const app = express();
const port = process.env.PORT_ONE || 9090;
const mongoose = require('mongoose');
const Order = require('./Order');
const amqp = require('amqplib');
const isAuthenticated = require('../isAuthenticated');

let channel, connection;

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/order-service');
        console.log('Order service DB connected');
    } catch (error) {
        console.log(error);
        console.error('Order service connected DB failed!!');
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    console.log('You are performing a server shutdown!');
    await mongoose.connection.close();
    process.exit(0);
});

app.use(express.json());

function createOrder(products, userEmail) {
    let total = 0;
    for (let t = 0; t < products.length; ++t) {
        total += products[t].price;
    }
    const newOrder = new Order({
        products,
        user: userEmail,
        total_price: total,
    });
    newOrder.save();
    return newOrder;
}

async function connect() {
    const amqpServer = 'amqp://localhost';
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue('ORDER');
}

connect().then(() => {
    channel.consume('ORDER', (data) => {
        //Tiêu thụ
        console.log('Consuming ORDER service');
        const { products, userEmail } = JSON.parse(data.content);
        const newOrder = createOrder(products, userEmail);
        // Xác nhận để xóa khỏi hàng đợi
        channel.ack(data);
        channel.sendToQueue('PRODUCT', Buffer.from(JSON.stringify({ newOrder })));
    });
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
