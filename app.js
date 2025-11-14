const Express = require('express');
const cors = require('cors');
const Mongoose = require('mongoose');
const Session = require('express-session');
const AuthRouter = require('./routes/AuthRouter');
const MongoDbSession = require('connect-mongodb-session')(Session);
require('dotenv').config();

const app = Express();
const port = process.env.Port || 4000;   

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://sv4khplh-3000.inc1.devtunnels.ms'],
    credentials: true
}));
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

// app.set("trust proxy", 1)

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})

Mongoose.connect(process.env.MongoDBURI) 
.then(()=>{
    console.log('MongoDB connected succesfully!');
})
.catch((err)=>{
    console.log("Error in connecting to MongoDB:",err);
})

const store = new MongoDbSession({
    uri: process.env.MongoDBURI,
    collection: 'sessions'
})

app.use(Session({
    secret: process.env.SessionKey, 
    resave: false,
    saveUninitialized: false,
    store: store,
    // cookie: {
    //     secure: true,
    //     sameSite: 'none',
    //     httpOnly: false
    // }
}))

app.use(AuthRouter)