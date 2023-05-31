const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{type:String, unique:true},
    firstname:{type:String, default:""},
    lastname:{type:String, default:""},
    email:{type:String, unique:true},
    password:{type:String},
    mobile:{type:Number},
    blocked:{type:Boolean,default:false},
    address:{
        addressline1:{type:String,default:""},
        addressline2:{type:String,default:""},
        city:{type:String,default:""},
        state:{type:String,default:""},
        pin:{type:String,default:""},
        country:{type:String,default:""},
    }
})

const User = mongoose.model('User',userSchema);

module.exports = User;
