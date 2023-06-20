const Admin = require('../models/AdminModel')
const User = require('../models/UserModel')
const Product = require('../models/ProductModel')
const Category = require('../models/CategoryModel');
const bcrypt = require('bcrypt');
const Cart = require('../models/CartModel');
const Order = require('../models/OrderModel');
const Coupon = require('../models/CouponModel');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Offer = require('../models/OfferModel ');
const mongoose = require('mongoose');
const Banner = require('../models/BannerModel');
const ObjectId = mongoose.Types.ObjectId;
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const admnCtrl = {}

admnCtrl.isLoggedin = (req, res, next) => {
    if (req.session.adminId) {
        res.redirect('/admin/dashboard');
    }
    else {
        next();
    }
}

admnCtrl.isAdmin = (req, res, next) => {
    if (req.session.adminId) {
        next();
    }
    else {
        res.redirect('/admin/login');
    }
}

admnCtrl.getAdminLogin = (req, res) => {
    res.render('admin/login.ejs');
}

admnCtrl.adminAuth = async (req, res) => {

    let errMsgAd = 'Invalid adminname or password';

    const { adminname, password } = req.body;
    const admin = await Admin.findOne({ adminname });
    if (!admin) return res.status(400).json(errMsgAd);

    try {

        const validPassword = await bcrypt.compare(password, admin.password)
        if (!validPassword) return res.status(400).json(errMsgAd);

        const adminId = admin._id
        req.session.adminId = adminId;
        req.session.adminname = adminname;
        res.status(200).json(adminId);
    } catch (error) {
        res.status(500).json('Invalid admin name or password');
    }
}

admnCtrl.getAdminDashboard = async (req, res) => {
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)
    const sales = await Order.find({status:"Delivered"})
    let revenue;
    if(sales){
        revenue = sales.reduce((accumulator,sale)=>{
            return accumulator + (sale.total - sale.discount)
        },0)
    }else{
        revenue = 0;
    }
    if (req.session.adminId) {
        res.render('admin/index.ejs', { adminId, admin,revenue });
    }
    else {
        res.redirect('/admin/login')
    }
}

admnCtrl.adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err)
            res.status(500).send('Error destroying Admin session')
        }
        else {
            res.clearCookie('admin.sid')
            res.redirect('/admin/login');
        }
    })
}


//CRUD operations on User Data;

admnCtrl.getUserManage = async (req, res) => {
    let Users = []
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)

    const squery = req.query.search;
    if (squery) {
        const regex = new RegExp(squery, 'i');
        Users = await User.find({ username: { $regex: regex } })
        const noUser = 'No Matching Search results'
        if (Users.length > 0) {
            res.render('admin/usrMng.ejs', { Users, adminId, admin });
        } else {
            res.render('admin/usrMng.ejs', { Users, noUser, adminId, admin });
        }
    }
    else {
        Users = await User.find();
        res.render('admin/usrMng.ejs', { Users: Users, adminId, admin })
    }
}

admnCtrl.blockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { blocked: true })
        res.status(200).json({ msg: 'User blocked' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: 'Something went wrong' })
    }
}

admnCtrl.unblockUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { blocked: false })
        res.status(200).json({ msg: 'User unblocked' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: 'Something went wrong' })
    }
}


// Products section

admnCtrl.getProductManage = async (req, res) => {
    let Products = []
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)

    const squery = req.query.search;
    if (squery) {
        const regex = new RegExp(squery, 'i');
        Products = await Product.find({ name: { $regex: regex } })
        const noProduct = 'No Matching Search results'
        if (Products.length > 0) {
            console.log(Products)
            res.render('admin/proMng.ejs', { Products, adminId, admin });
        } else {
            res.render('admin/proMng.ejs', { Products, noProduct, adminId, admin });
        }
    }
    else {
        Products = await Product.find();
        res.render('admin/proMng.ejs', { Products: Products, adminId, admin })
    }
}

admnCtrl.getAddProduct = async (req, res) => {
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)
    const categories = await Category.find();

    res.render('admin/addPdt.ejs', { adminId, admin, categories })
}

admnCtrl.addProduct = async (req, res) => {
    const { name, price, color, category, description, quantity } = req.body;
    const categorySelected = await Category.findOne({name:category})
    const catId = categorySelected._id;
    console.log(req.body)
    console.log(req.files)
    try {
        if (req.files) {
            console.log(req.files)
            const image = req.files;

            const newProduct = new Product({ name, price, color, category:catId, image, description, quantity })
            await newProduct.save();
        }
        else {

            const newProduct = new Product({ name, price, color, category:catId, description, quantity })
            await newProduct.save();
        }
        res.redirect(`/admin/productManage`)
    } catch (error) {
        console.log(error)
        res.redirect(`/admin/addProduct`)
    }
}

admnCtrl.getEditProduct = async (req, res) => {
    try {
        const prodId = req.params.id;
        const product = await Product.findOne({ _id: prodId })
        if(!product){
            const error = new Error('404 not found');
            error.statusCode = 404;
            throw error;
          }
        const adminId = req.session.adminId;
        const admin = await Admin.findById(adminId)
        const categories = await Category.find();
        const prodCat = await Category.findById(product.category);
    
        res.render('admin/edtPdt.ejs', { product, adminId, admin, categories,prodCat })
        
    } catch (error) {
        console.log(error)
        res.render('404page.ejs')
    }
}

admnCtrl.editProduct = async (req, res) => {
    const { name, price, color, category, description, quantity } = req.body;
    const prodId = req.params.id;
    try {
        if (req.files) {
            const images = req.files;
            console.log(images)
            await Product.findByIdAndUpdate({ _id: prodId }, {
                $set: { name, price, color, category, description, quantity },
                $push:{image:{$each:images}}
            })
        }
        else {
            await Product.findByIdAndUpdate({ _id: prodId }, {
                $set: { name, price, color, category, description, quantity }
            })

        }
        res.redirect(`/admin/productManage`)
    } catch (error) {
        console.log(error)
        res.redirect(`/admin/editProduct/${prodId}`)
    }

}

admnCtrl.deleteProduct = async (req, res) => {
    await Product.findByIdAndUpdate(req.params.id, { deleted: true })
    res.status(200).json({ msg: 'Product deleted' });
}

admnCtrl.recoverProduct = async (req, res) => {
    await Product.findByIdAndUpdate(req.params.id, { deleted: false })
    res.status(200).json({ msg: "Recovered Product" });
}


//Category section

admnCtrl.getCategoryManage = async (req, res) => {
    let Categories = []
    let adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)

    const squery = req.query.search;
    if (squery) {
        const regex = new RegExp(squery, 'i');
        Categories = await Category.find({ name: { $regex: regex } })
        const noCategory = 'No Matching Search results'
        if (Categories.length > 0) {
            res.render('admin/catMng.ejs', { Categories, adminId, admin });
        } else {
            res.render('admin/catMng.ejs', { Categories, noCategory, adminId, admin });
        }
    }
    else {
        Categories = await Category.find();
        res.render('admin/catMng.ejs', { Categories: Categories, adminId, admin })
    }
}

admnCtrl.getAddCategory = async (req, res) => {
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)

    res.render('admin/addCat.ejs', { adminId, admin });
}

admnCtrl.addCategory = async (req, res) => {
    const adminId = req.session.adminId;
    const { name, description } = req.body;
    const cat = await Category.findOne({ name });
    if (cat) return res.status(400).json({ msg: 'Category already exists' })
    try {
        if (req.file) {
            const image = req.file.originalname;
            const newCategory = new Category({ name, description, image })
            await newCategory.save();
        }
        else {
            console.log('Here is no req.file')
            const newCategory = new Category({ name, description })
            await newCategory.save();
        }
        res.status(200).json({ adminId: adminId })
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }

}

admnCtrl.getEditCategory = async (req, res) => {
    try {
        const catId = req.params.id;
        const category = await Category.findOne({ _id: catId })
        if(!category){
            const error = new Error('404 not found');
            error.statusCode = 404;
            throw error;
          }
        const adminId = req.session.adminId;
        const admin = await Admin.findById(adminId)
    
        res.render('admin/edtCat.ejs', { category, adminId, admin })
        
    } catch (error) {
        console.log(error)
        res.render('404page.ejs')
    }
}

admnCtrl.editCategory = async (req, res) => {
    const adminId = req.session.adminId;
    const { name, description } = req.body;
    const catId = req.params.id;
    try {
        if (req.file) {
            const image = req.file.originalname;

            await Category.findByIdAndUpdate({ _id: catId }, {
                $set: { name, image, description }
            })
        }
        else {
            await Category.findByIdAndUpdate({ _id: catId }, {
                $set: { name, description }
            })

        }
        res.status(200).json({ adminId: adminId })

    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Something went wrong' })
    }

}

admnCtrl.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id)
    } catch (error) {
        console.log(error)
    }
    res.redirect(`/admin/categoryManage`)

}

admnCtrl.getOrders = async (req, res) => {
    try {
        const admin = await Admin.findById(req.session.adminId)
        const orders = await Order.find()
        const squery = req.query.search;

        const orderList = [];
        let multi;
        if (orders.length > 0) {
            orders.reverse().forEach((order, i) => {
                const date = order.date.toString().slice(0,15);
                const orderId = order._id.toString();
                multi = order.items.length > 1 ;
                orderList.push({ item:order.items[0], name: order.address.name, status: order.status,date, orderId, multi});
            })
            if(squery){
                const regex = new RegExp(squery, 'i');
                const result =  orderList.filter((order,i)=>{
                    if(regex.test(order.name)){
                        return order;
                    }
                })
                
                res.render('admin/ordrMng.ejs', { orderList, hasOrders: true, admin, result, searched:true})
            }else{
                res.render('admin/ordrMng.ejs', { orderList, hasOrders: true, admin, searched:false })
            }
        } else {
            res.render('admin/ordrMng.ejs', { hasOrders: false, admin,searched:false })
        }
    } catch (error) {

    }
}


admnCtrl.orderDetail = async(req,res)=>{
    try {
        const orderid = req.params.id;
        const order = await Order.findById(orderid);
        if(!order){
            const error = new Error('404 not found');
            error.statusCode = 404;
            throw error;
        }
        const adminId = req.session.adminId;
        const admin = await Admin.findById(adminId)
        const user = await User.findById(order.userId)
        console.log(order)
        res.render('admin/orderDetail.ejs',{order,admin,user})
        
    } catch (error) {
        console.log(error)
        res.render('404page.ejs')
        
    }
}

admnCtrl.changeStatus = async(req,res)=>{
    console.log(req.body)
    const status = req.body.status;
    console.log(status)
    const orderid = req.body.orderid;
    console.log(orderid)
    const date = Date.now();
    try {
        const order = await Order.findByIdAndUpdate(orderid,{
            $set:{status:status,date:date}
        },{new:true})
        console.log(order)
        res.status(200).json(order)
    } catch (error) {
        console.log(error)
    }
}

admnCtrl.getCouponMng = async(req,res)=>{
    try {
        const admin = await Admin.findById(req.session.adminId)
        const squery = req.query.search;
        let coupons = [];
        if (squery) {
            const regex = new RegExp(squery, 'i');
            coupons = await Coupon.find({ code: { $regex: regex } })
            const noCoupon = 'No Matching Search results'
            if (coupons.length > 0) {
                console.log(coupons)
                res.render('admin/couponMng.ejs', { coupons, adminId:admin._id, admin });
            } else {
                res.render('admin/couponMng.ejs', { coupons, noCoupon, adminId:admin._id, admin });
            }
        }
        else {
            coupons = await Coupon.find();
            res.render('admin/couponMng.ejs', { coupons, adminId:admin._id, admin })
        }
        

    } catch (error) {
        console.log(error)
    }
    
} 

admnCtrl.getAddCoupon = async(req,res)=>{
    const admin = await Admin.findById(req.session.adminId)

    res.render('admin/addCoupon.ejs',{admin})
}

admnCtrl.postAddCoupon = async(req,res)=>{
    const admin = await Admin.findById(req.session.adminId)
    const {code,discount,expiryDate,description} = req.body;
    const newCoupon = new Coupon({code,discount,expiryDate,description})

    await newCoupon.save();

    res.redirect('/admin/couponManage')
}

admnCtrl.getEditCoupon = async(req,res)=>{
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        if(!coupon){
            const error = new Error('404 not found');
            error.statusCode = 404;
            throw error;
          }
        const admin = await Admin.findById(req.session.adminId);
        res.render('admin/editCoupon.ejs',{admin,coupon})
        
    } catch (error) {
        console.log(error)
        res.render('404page.ejs')
    }
}

admnCtrl.postEditCoupon = async(req,res)=>{
    const couponId = req.params.id;
    console.log(req.body)
    const {code,discount,expiryDate,description} = req.body;
    try {
        console.log("qwerty")
        const updtdCoupon = await Coupon.findByIdAndUpdate({_id:couponId},{
            $set:{code,discount,expiryDate,description}
        },{new:true});
        console.log("upd"+updtdCoupon);

        res.status(200).json({msg:"Coupon Updated"})
        
    } catch (error) {
        res.status(500).json({msg:"Something went wrong"})
    }
}

admnCtrl.deleteCoupon = async(req,res)=>{
    const couponId = req.params.id;
    try {
        await Coupon.findByIdAndDelete(couponId)
        res.status(200).json({msg:"deleted coupon"})
    } catch (error) {
        console.log(error)
    }
}

admnCtrl.getSalesChart = async(req,res)=>{
    let labels=[];
    let data=[];
    const currentTime = Date.now();
    const date = new Date(currentTime);
    const currentDate = date.toDateString();
    const currentYear = parseInt(date.toDateString().split(' ')[3]);
    const currentMonth = date.toDateString().split(' ')[1];
    const currentDay = date.toDateString().split(' ')[0];
    
    const interval = req.query.interval;
    if(interval === "year"){
        data = [0, 0, 0, 0, 0, 0];
        let startYear = currentYear - 6;
        for(let i=1; i<= 6; i++){
            labels.push((startYear+i).toString());
        }
    }
    else if(interval === "month"){
        const monthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul','Aug','Sep','Oct','Nov','Dec'];
        const indexOfMonth = monthsArray.indexOf(currentMonth);  
        for(let i=0; i<= indexOfMonth; i++){
            labels.push(monthsArray[i]);
            data.push(0);
        }  
    }
    else if(interval === "week"){
        data = [0, 0, 0, 0, 0, 0, 0];
        const weekArray = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const indexOfDay = weekArray.indexOf(currentDay);
        for(let j=indexOfDay+1; j<weekArray.length; j++){
            labels.push(weekArray[j])
        }

        for(let k=0; k<=indexOfDay; k++){
            labels.push(weekArray[k])
        }
    }
    const orders = await Order.find({status:'Delivered'});
    try {
        orders.forEach(order=>{
            const year = order.date.toDateString().split('-')[0].split(' ')[3];
            const month = order.date.toDateString().split('-')[0].split(' ')[1];
            const week = order.date.toDateString().split('-')[0].split(' ')[0];

            if(interval === "year"){
                for(let i=0; i<labels.length; i++){
                    if(year === labels[i]){
                        data[i] += 1;
                    }
                }
            }else if(interval === "month"){
                for(let i=0; i<labels.length; i++){
                    if(month === labels[i]){
                        data[i] += 1;
                    }
                }
            }else if(interval === "week"){
                for(let i=0; i<labels.length; i++){
                    if(week === labels[i]){
                        data[i] += 1;
                    }
                }
            }
        })
        console.log({labels,data})
        res.status(200).json({labels,data})
    } catch (error) {
        console.log(error)
        res.status(200).json({})
    }
    
}

admnCtrl.getOrdersChart = async(req,res)=>{
    let labels=[];
    let data=[];
    const currentTime = Date.now();
    const date = new Date(currentTime);
    const currentDate = date.toDateString();
    const currentYear = parseInt(date.toDateString().split(' ')[3]);
    const currentMonth = date.toDateString().split(' ')[1];
    const currentDay = date.toDateString().split(' ')[0];
    
    const interval = req.query.interval;
    if(interval === "year"){
        data = [0, 0, 0, 0, 0, 0];
        let startYear = currentYear - 6;
        for(let i=1; i<= 6; i++){
            labels.push((startYear+i).toString());
        }
    }
    else if(interval === "month"){
        const monthsArray = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul','Aug','Sep','Oct','Nov','Dec'];
        const indexOfMonth = monthsArray.indexOf(currentMonth);  
        for(let i=0; i<= indexOfMonth; i++){
            labels.push(monthsArray[i]);
            data.push(0);
        }  
    }
    else if(interval === "week"){
        data = [0, 0, 0, 0, 0, 0, 0];
        const weekArray = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const indexOfDay = weekArray.indexOf(currentDay);
        for(let j=indexOfDay+1; j<weekArray.length; j++){
            labels.push(weekArray[j])
        }

        for(let k=0; k<=indexOfDay; k++){
            labels.push(weekArray[k])
        }
    }
    const orders = await Order.find();
    try {
        orders.forEach(order=>{
            const year = order.date.toDateString().split('-')[0].split(' ')[3];
            const month = order.date.toDateString().split('-')[0].split(' ')[1];
            const week = order.date.toDateString().split('-')[0].split(' ')[0];

            if(interval === "year"){
                for(let i=0; i<labels.length; i++){
                    if(year === labels[i]){
                        data[i] += 1;
                    }
                }
            }else if(interval === "month"){
                for(let i=0; i<labels.length; i++){
                    if(month === labels[i]){
                        data[i] += 1;
                    }
                }
            }else if(interval === "week"){
                for(let i=0; i<labels.length; i++){
                    if(week === labels[i]){
                        data[i] += 1;
                    }
                }
            }
        })
        console.log({labels,data})
        res.status(200).json({labels,data})
    } catch (error) {
        console.log(error)
        res.status(200).json({})
    }
    
}


admnCtrl.getReport = async(req,res)=>{
    const report = req.query.report;
    const doctype = req.query.doctype;
    const sales = await Order.find({status:'Delivered'});
    const products = await Product.find();
    const cancels = await Order.find({status:'Cancelled'})

    if(doctype === 'pdf'){
        try {
            const doc = new PDFDocument();
            res.setHeader('Content-Type' , 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"')
            let table;

            if(report === 'sales'){
                doc.text('Sales Report', { align: 'center', fontSize: 20 });
                doc.moveDown();
                let rowsArray = [];
                sales.forEach((order,i)=>{
                    const date = order.createdAt.toString().slice(0,15);
                    rowsArray.push([order._id,date,order.status,order.total,order.paymentMethod])
                })
                table = {
                    headers: ['Order ID','Date','Status', 'Total','Payment'],
                    rows: rowsArray,
                };
            }
            else if(report === 'stock'){
                doc.text('Stock Report', { align: 'center', fontSize: 20 });
                doc.moveDown();
                let rowsArray = [];
                products.forEach((product,i)=>{
                    const date = product.createdAt.toString().slice(0,15);
                    rowsArray.push([product._id,date,product.name,product.price,product.quantity])
                })
                table = {
                    headers: ['Product ID','Date Received','Name', 'Price','Quantity'],
                    rows: rowsArray,
                };
            }
            else if(report === 'cancelled'){
                doc.text('Cancel Report', { align: 'center', fontSize: 20 });
                doc.moveDown();
                let rowsArray = [];
                cancels.forEach((order,i)=>{
                    const createdDate = order.createdAt.toString().slice(0,15);
                    const cancelledDate = order.date.toString().slice(0,15);
                    rowsArray.push([order._id,createdDate,cancelledDate,order.total,order.paymentMethod])
                })
                table = {
                    headers: ['Order ID','Ordered Date','Cancelled Date', 'Total','Payment'],
                    rows: rowsArray,
                };
            }
            
            doc.strokeColor('black').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();
            const tableTop = 100; 
            const tableLeft = 10; 
          
            const columnWidths = [50, 190, 300, 400, 470]; 
          
            doc.font('Helvetica-Bold').fontSize(12);
            
            let currentY = tableTop;
            table.headers.forEach((header, columnIndex) => {
                doc.text(header, tableLeft + columnWidths[columnIndex], currentY);
                doc.strokeColor('black').lineWidth(1).moveTo(50, currentY+13).lineTo(550, currentY+13).stroke();
            });
            
            doc.font('Helvetica').fontSize(10);
          
            table.rows.forEach((row, rowIndex) => {
                currentY += 23;
            
                row.forEach((cell, columnIndex) => {
                    doc.text(cell, tableLeft + columnWidths[columnIndex], currentY, {
                    width: 100,
                    align: 'left',
                    });
                    });
            
                doc.strokeColor('black').lineWidth(1).moveTo(50, currentY+21).lineTo(550, currentY+21).stroke();
          
            });
            doc.strokeColor('black').lineWidth(1).moveTo(50, 95).lineTo(50, currentY+21).stroke();
            doc.strokeColor('black').lineWidth(1).moveTo(550, 95).lineTo(550, currentY+21).stroke();
            doc.pipe(res)
            doc.end();
        } catch (error) {
            console.log(error)
        }
    }
    else if (doctype === 'excel'){

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');
            let headers;
            let data;
    
            if(report === 'sales'){
                let rowsArray = [];
                sales.forEach((order,i)=>{
                    const date = order.createdAt.toString().slice(0,15);
                    rowsArray.push([order._id,date,order.status,order.total,order.paymentMethod])
                })
                headers = ['Order ID','Date','Status', 'Total','Payment'];
                data = rowsArray;
            }
            else if(report === 'stock'){
                let rowsArray = [];
                products.forEach((product,i)=>{
                    const date = product.createdAt.toString().slice(0,15);
                    rowsArray.push([product._id,date,product.name,product.price,product.quantity])
                })
                headers = ['Product ID','Date Received','Name', 'Price','Quantity'];
                data = rowsArray;
            }
            else if(report === 'cancelled'){
                let rowsArray = [];
                cancels.forEach((order,i)=>{
                    const createdDate = order.createdAt.toString().slice(0,15);
                    const cancelledDate = order.date.toString().slice(0,15);
                    rowsArray.push([order._id,createdDate,cancelledDate,order.total,order.paymentMethod])
                })
                headers = ['Order ID','Ordered Date','Cancelled Date', 'Total','Payment'];
                data = rowsArray;
            }
    
            worksheet.addRow(headers);
            
            console.log(data)

            data.forEach(row => {
            worksheet.addRow(row);
            });
    
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    
            workbook.xlsx.write(res)
            .then(() => {
                console.log('Report generated successfully');
                res.end();
            })
            .catch(error => {
                console.log('Error:', error);
            });
            
        } catch (error) {
            console.log(error)
        }

      }

    }

    admnCtrl.removeImg = async(req,res)=>{
        const prodId = req.query.prodId;
        const baseDirectory = process.cwd();
        const filename = req.query.filename;
        const imgPath = `/images/${filename}`
        const filePath = path.join(baseDirectory,'public',imgPath)
        try {
            await Product.findByIdAndUpdate(prodId,{
                $pull:{image:{filename:filename}}
            })

            if(fs.existsSync(filePath)){
                fs.unlink(filePath,(error)=>{
                    if(error){
                        console.log(error)
                    }else{
                        console.log("Image deleted")
                    }
                })
            }else{
                console.log('Image not found')
            }
            
            res.status(200).json({})
        } catch (error) {
            res.status(500).json({})
        }
        
    }

    admnCtrl.getOfferMng = async(req,res)=>{
        try {
            const admin = await Admin.findById(req.session.adminId)
            const squery = req.query.search;
            let offers = [];
            if (squery) {
                const regex = new RegExp(squery, 'i');
                offers = await Offer.aggregate([
                    {
                      $match: {
                        title: { $regex: regex }
                      }
                    },
                    {
                      $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        title: 1,
                        discount: 1,
                        startDate: 1,
                        endDate: 1,
                        description: 1,
                        category: {
                          $arrayElemAt: ['$categoryInfo.name', 0]
                        }
                      }
                    }
                  ]);
                  
                  
                const noOffer = 'No Matching Search results'
                if (offers.length > 0) {
                    console.log(offers)
                    res.render('admin/offerMng.ejs', { offers, adminId:admin._id, admin });
                } else {
                    res.render('admin/offerMng.ejs', { offers, noOffer, adminId:admin._id, admin });
                }
            }
            else {
                offers = await Offer.aggregate([
                    {
                      $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        title: 1,
                        discount: 1,
                        startDate: 1,
                        endDate: 1,
                        description: 1,
                        category: {
                          $arrayElemAt: ['$categoryInfo.name', 0]
                        }
                      }
                    }
                  ]);
                console.log(offers)
                res.render('admin/offerMng.ejs', { offers, adminId:admin._id, admin })
            }
            
    
        } catch (error) {
            console.log(error)
        }
    }

    admnCtrl.getAddOffer = async(req,res)=>{
        const admin = await Admin.findById(req.session.adminId)
        const categories = await Category.find();
        res.render('admin/addOffer.ejs',{admin,categories})
    }
    
    admnCtrl.postAddOffer = async(req,res)=>{
        const {title,discount,startDate,endDate,description,category} = req.body;
        const categorySelected = await Category.findOne({name:category})
        const newOffer = new Offer({title,discount,startDate,endDate,description,category:categorySelected._id})
    
        await newOffer.save();
    
        res.redirect('/admin/offermanage');
    }

    admnCtrl.getEditOffer = async(req,res)=>{
        try {
            const admin = await Admin.findById(req.session.adminId);
            const OfferId = req.params.id;
            const categories = await Category.find();
            console.log(OfferId)
            const offerArray = await Offer.aggregate([
                {
                    $match: {
                      _id:new ObjectId(OfferId)
                    }
                  },
                {
                  $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                  }
                },
                {
                  $project: {
                    _id: 1,
                    title: 1,
                    discount: 1,
                    startDate: 1,
                    endDate: 1,
                    description: 1,
                    category: {
                      $arrayElemAt: ['$categoryInfo.name', 0]
                    },
                    categoryId: {
                      $arrayElemAt: ['$categoryInfo._id', 0]
                    },
                  }
                }
              ]);
            
            const offer = offerArray[0]
            if(!offer){
                const error = new Error('404 not found');
                error.statusCode = 404;
                throw error;
              }
            console.log("offer:")
            console.log(offer)
            res.render('admin/editOffer.ejs',{admin,offer,categories})
            
        } catch (error) {
            console.log(error)
            res.render('404page.ejs')
        }
    }
    
    admnCtrl.postEditOffer = async(req,res)=>{
        const OfferId = req.params.id;
        console.log(req.body)
        const {title,discount,startDate,endDate,description,category} = req.body;
        try {
            console.log("qwertyoffer")
            const updtdOffer = await Offer.findByIdAndUpdate({_id:OfferId},{
                $set:{title,discount,startDate,endDate,description,category}
            },{new:true});
            console.log("upd"+updtdOffer);
    
            res.status(200).json({msg:"Offer Updated"})
            
        } catch (error) {
            res.status(500).json({msg:"Something went wrong"})
        }
    }
    
    admnCtrl.deleteOffer = async(req,res)=>{
        const OfferId = req.params.id;
        try {
            await Offer.findByIdAndDelete(OfferId)
            res.status(200).json({msg:"deleted Offer"})
        } catch (error) {
            console.log(error)
        }
    }

    admnCtrl.getBannerMng = async(req,res)=>{
        const adminId = req.session.adminId;
        const admin = await Admin.findById(adminId)
        const Banners = await Banner.find();
        res.render('admin/banMng.ejs',{admin,Banners})
    }

    admnCtrl.getAddBanner = async (req, res) => {
        const adminId = req.session.adminId;
        const admin = await Admin.findById(adminId)
    
        res.render('admin/addBanner.ejs', { adminId, admin });
    }
    
    admnCtrl.addBanner = async (req, res) => {
        const adminId = req.session.adminId;
        const { title, description,buttonText,buttonUrl,size } = req.body;
        console.log("check it:")
        console.log(req.body)
        try {
            if (req.file) {
                const image = req.file.originalname;
                const newBanner = new Banner({image, title, description, buttonText,buttonUrl,size })
                await newBanner.save();
            }
            else {
                console.log('Here is no req.file')
                const newBanner = new Banner({ title, description,buttonText,buttonUrl,size })
                await newBanner.save();
            }
            res.status(200).json({ adminId: adminId })
        } catch (error) {
            console.log(error)
            res.status(500).json({ msg: 'Something went wrong' })
        }
    
    }

    admnCtrl.deleteBanner = async(req,res)=>{
        const bannerId = req.params.id;
        try {
            await Banner.findByIdAndDelete(bannerId)
            res.status(200).json({msg:"Banner deleted successfully"})
        } catch (error) {
            console.log(error)
            res.status(500).json(error)
        }
    }

    admnCtrl.getEditBanner = async(req,res)=>{
        try {
            const bannerId = req.params.id;
            const banner = await Banner.findById(bannerId);
            if(!banner){
                const error = new Error('404 not found');
                error.statusCode = 404;
                throw error;
              }
            const adminId = req.session.adminId;
            const admin = await Admin.findById(adminId)
            res.render('admin/editBanner.ejs',{admin,banner})
        } catch (error) {
            console.log(error)
            res.render('404page.ejs')
        }
    }

    admnCtrl.editBanner = async (req, res) => {
        const adminId = req.session.adminId;
        const bannerid = req.params.id;
        const { title, description,buttonText,buttonUrl,size } = req.body;
        
        try {
            if (req.file) {
                const image = req.file.originalname;
                await Banner.findByIdAndUpdate(bannerid,
                    {$set:{image, title, description, buttonText,buttonUrl,size }})
                
            }
            else {
                console.log('Here is no req.file')
                await Banner.findByIdAndUpdate(bannerid,
                    {$set:{title, description, buttonText,buttonUrl,size }})
                
            }
            res.status(200).json({ adminId: adminId })
        } catch (error) {
            console.log(error)
            res.status(500).json({ msg: 'Something went wrong' })
        }
    
    }

    admnCtrl.cropImage = async(req,res)=>{
        try {
            console.log(req.body)
            const {x,y,width,height} = req.body.cropData;
            const imgPath = req.body.imgPath;
            const baseDirectory = process.cwd();
            const filePath = path.join(baseDirectory,'public',imgPath)
            console.log(filePath)
            const image = await Jimp.read(filePath);
            console.log(image)
            image.crop(x,y,width,height);
            console.log(image)

            if(fs.existsSync(filePath)){
                fs.unlink(filePath,(error)=>{
                    if(error){
                        console.log(error)
                    }else{
                        console.log("Image deleted")
                    }
                })
            }else{
                console.log('Image not found')
            }
    
            await image.writeAsync(filePath);
    
            res.status(200).json({msg:"Image cropped successfully"})

        } catch (error) {
            console.error('Error cropping image:', error);
            res.status(500).json({ msg: 'Error occurred while cropping the image.' });
        }
    }


module.exports = admnCtrl;
