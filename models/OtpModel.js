const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email:{type:String},
    otp:{type:String},
    createdAt: { type: Date, default: Date.now, expires:'5m' },
})

const OtpModel = mongoose.model('Otp',otpSchema);

module.exports = OtpModel;