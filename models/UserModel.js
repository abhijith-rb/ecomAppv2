const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{type:String, unique:true},
    firstname:{type:String, default:""},
    lastname:{type:String, default:""},
    email:{type:String, unique:true},
    password:{type:String},
    mobile:{type:Number},
    blocked:{type:Boolean,default:false},
    address:{type:[
        {   
            name:{type:String},
            mobile:{type:String},
            addressline1:{type:String},
            addressline2:{type:String},
            city:{type:String},
            state:{type:String},
            pin:{type:String},
            country:{type:String},
        }
    ],default:[]
    }
})

const User = mongoose.model('User',userSchema);

module.exports = User;
