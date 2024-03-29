const express = require('express');
const router = express.Router();
const session = require('express-session');
const axios = require('axios');
const usrCtrl = require('../controllers/userController.js');
const User = require('../models/UserModel.js');
const OtpModel = require('../models/OtpModel.js');

router.use(session({
    name:'user.sid',
    secret:'hello123',
    saveUninitialized:false,
    resave:false,
    cookie:{
        maxAge:24*60*60*1000,
        httpOnly:true,
        secure:false
    }
}))


router.get('/', usrCtrl.getHome)

router.get('/blockedpage', usrCtrl.getBlockpage)
//OTP through Email
router.get('/forgotpassword',usrCtrl.isLoggedIn,usrCtrl.getOtpPage)

router.post('/reqOtp',usrCtrl.sendOtp)

router.post('/otpVerify',usrCtrl.verifyOtp)

router.get('/changepwd/:id', usrCtrl.getChangePwd)

router.post('/newpwd/:id', usrCtrl.updatePwd)

//email verification for register

router.post('/send-code',usrCtrl.sendCode)
router.post('/verify-code',usrCtrl.verifyEmail)

//Otp through Sms

router.get('/otplogin',usrCtrl.isLoggedIn, usrCtrl.getSmsOtpPage)

router.post('/sendSms', usrCtrl.sendSmsOtp);

router.post('/smsVerify', usrCtrl.smsVerify);

//getRegisterPage
router.get('/register',usrCtrl.isLoggedIn,usrCtrl.getRegisterPage)

//create user
router.post('/register', usrCtrl.createUser)

//getLoginPage
router.get('/login',usrCtrl.isLoggedIn,usrCtrl.getLoginPage)

//authenticate user
router.post('/login', usrCtrl.userAuth)

// router.get('/editProfile',usrCtrl.isLoggedOut,usrCtrl.getEditProfile)

router.get('/logout',usrCtrl.logoutUser )

router.get("/category/:id",usrCtrl.getCatPrdts)
//product details
router.get('/detail/:id',usrCtrl.getDetail)

//Cart
router.get('/addToCart/:id',usrCtrl.isLoggedOut, usrCtrl.addToCart);

router.get('/cart',usrCtrl.isLoggedOut,usrCtrl.getCart)

router.get('/removeItem/:id',usrCtrl.isLoggedOut,usrCtrl.removeItem)

router.get('/incQty/:id',usrCtrl.isLoggedOut, usrCtrl.incQty)
router.get('/decQty/:id', usrCtrl.isLoggedOut,usrCtrl.decQty)

//Checkout
router.get('/checkout',usrCtrl.isLoggedOut,usrCtrl.getCheckout);
router.post('/placeorder',usrCtrl.isLoggedOut,usrCtrl.placeOrder)

router.get('/profile',usrCtrl.isLoggedOut,usrCtrl.getProfile)
router.get('/editProfile',usrCtrl.isLoggedOut,usrCtrl.getEditProfile)
router.post('/editProfile',usrCtrl.isLoggedOut,usrCtrl.editProfile)

router.get('/manageAddress',usrCtrl.isLoggedOut,usrCtrl.getMngAddress)

router.post('/addAddress',usrCtrl.isLoggedOut,usrCtrl.addAddress)
router.delete('/delete-address',usrCtrl.isLoggedOut,usrCtrl.deleteAddress)

router.get('/myorders',usrCtrl.isLoggedOut,usrCtrl.getMyOrders)

router.get('/myOrderDetail/:id',usrCtrl.isLoggedOut,usrCtrl.myOrderDetail)

router.post('/cancelOrder',usrCtrl.isLoggedOut, usrCtrl.cancelOrder)

router.post('/returnOrder',usrCtrl.isLoggedOut, usrCtrl.returnOrder)

router.get('/success',usrCtrl.isLoggedOut, usrCtrl.getSuccess)

router.post('/verifyPayment',usrCtrl.isLoggedOut,usrCtrl.checkVerified)

router.get('/checkStock/:id',usrCtrl.isLoggedOut,usrCtrl.checkStock)

router.get('/coupons',usrCtrl.isLoggedOut,usrCtrl.listCoupons)

router.post('/applyCoupon',usrCtrl.isLoggedOut,usrCtrl.applyCoupon)

router.get('/invoice/:id', usrCtrl.downloadInvoice)

router.get('/searchproducts',usrCtrl.searchProducts)

router.get('/men',usrCtrl.isLoggedOut, usrCtrl.getMenPage)
router.get('/women',usrCtrl.isLoggedOut, usrCtrl.getWomenPage)
router.get('/kids',usrCtrl.isLoggedOut, usrCtrl.getKidsPage)

router.get('/wallet',usrCtrl.isLoggedOut, usrCtrl.getWallet)

module.exports = router;



