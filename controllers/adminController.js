const Admin = require('../models/AdminModel')
const User = require('../models/UserModel')
const Product = require('../models/ProductModel')
const Category = require('../models/CategoryModel');
const bcrypt = require('bcrypt');
const Cart = require('../models/CartModel');
const Order = require('../models/OrderModel');
const Coupon = require('../models/CouponModel');


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

    if (req.session.adminId) {
        res.render('admin/index.ejs', { adminId, admin });
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
    const prodId = req.params.id;
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)
    const product = await Product.findOne({ _id: prodId })
    const categories = await Category.find();

    res.render('admin/edtPdt.ejs', { product, adminId, admin, categories })
}

admnCtrl.editProduct = async (req, res) => {
    const { name, price, color, category, description, quantity } = req.body;
    const prodId = req.params.id;
    try {
        if (req.file) {
            const image = req.file.originalname;

            await Product.findByIdAndUpdate({ _id: prodId }, {
                $set: { name, price, color, category, image, description, quantity }
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
    const catId = req.params.id;
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)

    const category = await Category.findOne({ _id: catId })
    res.render('admin/edtCat.ejs', { category, adminId, admin })
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
        if (orders.length > 0) {
            orders.reverse().forEach((order, i) => {
                const date = order.date.toString().slice(0,15);
                const orderId = order._id.toString()
                orderList.push({ item:order.items[0], email: order.billAddress.email, status: order.status,date, orderId});
            })
            if(squery){
                const regex = new RegExp(squery, 'i');
                const result =  orderList.filter((order,i)=>{
                    if(regex.test(order.email)){
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
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId)
    const orderid = req.params.id;
    const order = await Order.findById(orderid);
    const user = await User.findById(order.userId)
    console.log(order)
    res.render('admin/orderDetail.ejs',{order,admin,user})
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
    const admin = await Admin.findById(req.session.adminId);
    const couponId = req.params.id;
    const coupon = await Coupon.findById(couponId);
    res.render('admin/editCoupon.ejs',{admin,coupon})
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

module.exports = admnCtrl;
