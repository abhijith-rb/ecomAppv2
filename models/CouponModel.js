const mongoose = require('mongoose');

const couponShema = new mongoose.Schema({
    code:{type:String,required:true},
    discount:{type:Number,default:0},
    couponDiscount:{type:Number,default:0},
    expiryDate:{type:Date,required:true},
    description:{type:String,},
    usedBy:{type:[mongoose.Schema.Types.ObjectId],default:[]}
})

const Coupon = mongoose.model('Coupon',couponShema);

module.exports = Coupon;