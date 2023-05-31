const express = require('express');
// const session = require('express-session');
const userRouter = require('./routes/user.js')
const adminRouter = require('./routes/admin.js')
const mongoose = require('mongoose');
const multer = require("multer")
const path = require('path')
const app = express();

const PORT = 3000;

const MongoURI = "mongodb://127.0.0.1:27017/taskdb";

mongoose.connect(MongoURI).then(console.log('Connected to mongodb'))
.catch((err)=>console.log('failed connecting mongodb',err))

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.use(express.static("public"))


app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});


// app.use(session({
//     secret:'hello123',
//     saveUninitialized:false,
//     resave:false,
//     cookie:{
//         maxAge:60*60*1000,
//         httpOnly:true,
//         secure:false
//     }
// }))


app.use('/admin',adminRouter)
app.use('/',userRouter);

app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
})