const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,required:true},
    items:{
        type:[
        {
            productId:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
            name:{type:String,required:true},
            price:{type:Number,required:true},
            image:{type:String},
            quantity:{type:Number,required:true},
            subTotal:{type:Number,required:true},
            itemDiscount:{type:Number,default:0,required:true},
        }
        ],default:[]},
    total:{type:Number,required:true},
    discount:{type:Number,default:0},
    couponDiscount:{type:Number,default:0},
})

const Cart = mongoose.model('Cart',cartSchema);

module.exports=Cart;