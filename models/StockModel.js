const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    productId:{type:mongoose.Schema.Types.ObjectId,required:true},
    productName:{type:String,required:true},
    quantity:{type:Number,required:true,default:0}
})

const Stock = mongoose.model('Stock',stockSchema);

module.exports = Stock;