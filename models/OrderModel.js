const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
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
            itemDiscount:{type:Number,default:0,required:true},
        }
        ],default:[]},
    address:{type:{
        name:{type:String,required:true},
        mobile:{type:String,required:true},
        addressline1:{type:String,required:true},
        addressline2:{type:String,required:true},
        city:{type:String,required:true},
        state:{type:String,required:true},
        country:{type:String,required:true},
        pin:{type:String,required:true},
    },default:{},required:true},
    total:{type:Number,required:true},
    discount:{type:Number},
    couponDiscount:{type:Number},
    paymentMethod:{type:String,required:true},
    createdAt:{type:Date,default:Date.now},
    date:{type:Date,default:Date.now},
    status:{type:String,required:true},
    paymentStatus:{type:String,default:'Pending'},
})

const Order = mongoose.model('Order',orderSchema);

module.exports=Order;