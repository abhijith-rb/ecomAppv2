const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title:{type:String},
    image:{type:String},
    description:{type:String},
    buttonText:{type:String},
    buttonUrl:{type:String},
    size:{type:String},
})

const Banner = mongoose.model('Banner',bannerSchema);

module.exports = Banner;