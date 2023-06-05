const express = require('express');
const userRouter = require('./routes/user.js')
require('dotenv').config();
const adminRouter = require('./routes/admin.js')
const path = require('path')
const app = express();
const connectDB = require('./db.js');

const port = process.env.PORT || 3000;

const mongoURI = process.env.MongoURI;

connectDB(mongoURI);

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.use(express.static("public"))

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

app.use('/admin',adminRouter)
app.use('/',userRouter);


app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
})