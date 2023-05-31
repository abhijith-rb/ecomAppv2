const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,required:true},
    items:{
        type:[
        {
            productId:{type:mongoose.Schema.Types.ObjectId,required:true},
            name:{type:String,required:true},
            price:{type:Number,required:true},
            image:{type:String},
            quantity:{type:Number,required:true},
            subTotal:{type:Number,required:true},
        }
        ],default:[]},
    total:{type:Number,required:true}
})

const Cart = mongoose.model('Cart',cartSchema);

module.exports=Cart;