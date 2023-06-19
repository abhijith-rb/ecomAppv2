const mongoose = require('mongoose');

const offerShema = new mongoose.Schema({
    title:{type:String,required:true},
    discount:{type:Number,required:true},
    startDate:{type:Date,required:true},
    endDate:{type:Date,required:true},
    description:{type:String},
    category:{type:mongoose.Schema.Types.ObjectId,required:true}
})

const Offer = mongoose.model('Offer',offerShema);

module.exports = Offer;