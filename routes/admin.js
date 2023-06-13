const express = require('express');
const router = express.Router();
const multer = require("multer")
const User = require('../models/UserModel')
const Product = require('../models/ProductModel')
const session = require('express-session');

router.use(session({
    name:'admin.sid',
    secret:'itsAdmin789',
    saveUninitialized:false,
    resave:false,
    cookie:{
        maxAge:24*60*60*1000,
        httpOnly:true,
        secure:false
    }
}))

const admnCtrl = require('../controllers/adminController'); 

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'public/images')
    },
    filename:(req,file,cb)=>{
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null,file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1])
    }
})

const upload = multer({storage})

router.get('/login',admnCtrl.isLoggedin, admnCtrl.getAdminLogin)

//adminAuth
router.post('/login', admnCtrl.adminAuth)

router.get('/adminLogout', admnCtrl.adminLogout)

//getAdminDashboard
router.get('/dashboard',admnCtrl.isAdmin, admnCtrl.getAdminDashboard)

router.get('/userManage',admnCtrl.isAdmin, admnCtrl.getUserManage)

router.get('/productManage',admnCtrl.isAdmin, admnCtrl.getProductManage)

router.get('/categoryManage',admnCtrl.isAdmin, admnCtrl.getCategoryManage)

//Block User
router.get('/blockUser/:id',admnCtrl.isAdmin,admnCtrl.blockUser)
router.get('/unblockUser/:id',admnCtrl.isAdmin,admnCtrl.unblockUser)

//Products CRUD
//get addproduct page
router.get('/addProduct',admnCtrl.isAdmin, admnCtrl.getAddProduct)

//post new Products
router.post('/addProduct',admnCtrl.isAdmin, upload.array("images"), admnCtrl.addProduct)

//get Product edit page
router.get('/editProduct/:id',admnCtrl.isAdmin, admnCtrl.getEditProduct)

router.post("/editProduct/:id",admnCtrl.isAdmin,upload.array("images"), admnCtrl.editProduct)

//Soft delete product
router.get('/deleteProduct/:id',admnCtrl.isAdmin, admnCtrl.deleteProduct)
//recover product
router.get('/recoverProduct/:id',admnCtrl.isAdmin, admnCtrl.recoverProduct)

//Category CRUD
//get addCategory page
router.get('/addCategory',admnCtrl.isAdmin, admnCtrl.getAddCategory)

//post new Category
router.post('/addCategory',admnCtrl.isAdmin, upload.single("image"), admnCtrl.addCategory)

//get Category edit page
router.get('/editCategory/:id',admnCtrl.isAdmin, admnCtrl.getEditCategory)

//post Category edits
router.post("/editCategory/:id",admnCtrl.isAdmin,upload.single("image"), admnCtrl.editCategory)

//Delete Category
router.get('/deleteCategory/:id',admnCtrl.isAdmin, admnCtrl.deleteCategory)

//Order Management
router.get('/getOrders',admnCtrl.isAdmin,admnCtrl.getOrders);

// router.get('/stocks', admnCtrl.getStockManage)

router.get('/order/:id',admnCtrl.isAdmin, admnCtrl.orderDetail)

router.post('/changeStatus',admnCtrl.isAdmin, admnCtrl.changeStatus)

router.get('/couponManage',admnCtrl.isAdmin, admnCtrl.getCouponMng)

router.get('/addCoupon',admnCtrl.isAdmin, admnCtrl.getAddCoupon)

router.post('/addCoupon',admnCtrl.isAdmin, admnCtrl.postAddCoupon)

router.get('/editCoupon/:id',admnCtrl.isAdmin, admnCtrl.getEditCoupon )

router.post('/editCoupon/:id',admnCtrl.isAdmin, admnCtrl.postEditCoupon )

router.get('/deleteCoupon/:id',admnCtrl.isAdmin, admnCtrl.deleteCoupon)

router.get('/saleschart',admnCtrl.getSalesChart)

router.get('/getreport', admnCtrl.getReport)

router.get('/removeimg', admnCtrl.removeImg)

module.exports = router;