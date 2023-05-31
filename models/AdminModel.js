const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    adminname:{type:String, unique:true},
    password:{type:String}
})

const Admin = mongoose.model('Admin',adminSchema);

module.exports = Admin;
