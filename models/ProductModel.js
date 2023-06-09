const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:{type:String,required:true},
    price:{type:Number,float:true,required:true},
    color:{type:String},
    category:{type:mongoose.Schema.Types.ObjectId,required:true},
    image:{type:Array},
    description:{type:String},
    quantity:{type:Number},
    deleted:{type:Boolean,default:false},
    createdAt:{type:Date,default:Date.now()}
})

const Product = mongoose.model('Product',productSchema);

module.exports = Product;
