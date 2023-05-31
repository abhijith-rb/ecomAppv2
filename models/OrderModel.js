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
        }
        ],default:[]},
    billAddress:{type:{
        firstname:{type:String,required:true},
        lastname:{type:String,required:true},
        mobile:{type:Number},
        email:{type:String},
        addressline1:{type:String,required:true},
        addressline2:{type:String,required:true},
        city:{type:String,required:true},
        state:{type:String,required:true},
        country:{type:String,required:true},
        pin:{type:Number,required:true},
    },default:{},required:true},
    shipAddress:{type:{
        firstname:{type:String,required:true},
        lastname:{type:String,required:true},
        mobile:{type:Number},
        email:{type:String},
        addressline1:{type:String,required:true},
        addressline2:{type:String,required:true},
        city:{type:String,required:true},
        state:{type:String,required:true},
        country:{type:String,required:true},
        pin:{type:Number,required:true},
    },default:{},required:true},
    total:{type:Number,required:true},
    paymentMethod:{type:String,required:true},
    date:{type:Date,default:Date.now},
    status:{type:String,required:true},
    paymentStatus:{type:String,default:'Pending'},
})

const Order = mongoose.model('Order',orderSchema);

module.exports=Order;