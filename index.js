const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from Hay Day Server');
});

function varifyJwt(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send('Unauthorized Access');
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tzinyke.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    const servicesCollection = client.db('hayday-db').collection('services');
    const reviewsCollection = client.db('hayday-db').collection('reviews');

    app.get('/services', async (req, res) => {
        let query = {};
        const cursor = servicesCollection.find(query).sort({ insertDate: -1 });
        if (req.query.quantity == 3) {
            const result = await cursor.limit(3).toArray();
            res.send(result);
        }
        else {
            const result = await cursor.toArray();
            res.send(result);
        }
    });

    app.post('/services', varifyJwt, async (req, res) => {
        const service = req.body;
        service.insertDate = new Date();
        const result = await servicesCollection.insertOne(service);
        console.log(result);
        res.send(result);
    });

    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const service = await servicesCollection.findOne(query);
        res.send(service);
    });

    app.get('/reviews', varifyJwt, async (req, res) => {

        const decoded = req.decoded;

        if (decoded.email !== req.query.email) {
            return res.status(403).send({ message: 'Unauthorized Access' })
        }

        let query = {};
        if (req.query.email) {
            query = { email: req.query.email };
        }
        const cursor = reviewsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });

    app.get('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        console.log(req.query.email);
        const query = { _id: ObjectId(id) };
        const result = await reviewsCollection.findOne(query);
        res.send(result);
    });

    app.get('/servicereviews/:serviceid', async (req, res) => {
        const serviceid = req.params.serviceid;
        const query = { serviceId: serviceid };
        const cursor = reviewsCollection.find(query).sort({ date: -1 });
        const result = await cursor.toArray();
        res.send(result);
    });

    app.post('/servicereviews/:serviceid', async (req, res) => {
        const review = req.body;
        review.date = new Date();
        const result = await reviewsCollection.insertOne(review);
        console.log(result);
        res.send(result);
    });

    app.delete('/reviews/:id', varifyJwt, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        console.log(result);
        res.send(result);
    });

    app.delete('/reviews', varifyJwt, async (req, res) => {
        const query = { email: req.query.email };
        const result = await reviewsCollection.deleteMany(query);
        console.log(result);
        res.send(result);
    });

    app.put('/reviews/:id', varifyJwt, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const updatingReview = req.body;
        const option = { upsert: true };
        const updatedReview = {
            $set: {
                text: updatingReview.text,
            }
        };

        const result = await reviewsCollection.updateOne(query, updatedReview, option);
        res.send(result);
    });

    app.post('/jwt', (req, res) => {
        const user = req.body;
        console.log(user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
    })

}

run().catch(err => console.error(err));


app.listen(port, () => {
    console.log('Hay Day server is running on port :', port);
});