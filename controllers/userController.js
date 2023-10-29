const Category = require('../models/CategoryModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel')
const OtpModel = require('../models/OtpModel')
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const Cart = require('../models/CartModel');
const Order = require('../models/OrderModel');
const Razorpay=require('razorpay')
const mongoose = require('mongoose'); 
const Coupon = require('../models/CouponModel');
const instance = new Razorpay({
    key_id: 'rzp_test_6JFoZx1fYTkS3n', 
    key_secret: 'Q15DfBbJFIrDy1K1FTsDE7CA', });

const PDFDocument = require('pdfkit');
const Offer = require('../models/OfferModel ');
const Banner = require('../models/BannerModel');
const Wallet = require('../models/WalletModel');


const usrCtrl = {};

const objectId = mongoose.Types.ObjectId;

usrCtrl.isLoggedIn = async(req,res,next)=>{
  if(req.session.userId){
    const userId = req.session.userId;
    const user = await User.findById(userId);
    if(user.blocked){
      req.session.destroy((err)=>{
        if(err){
            console.log(err)
            res.status(500).send('Error destroying session')
        }
        else{
            res.clearCookie('user.sid')
            res.redirect('/blockedpage')
        }
    })
    } 
    else{
      res.redirect('/');
    }
  }
  else{
    next();
  }
}


usrCtrl.isLoggedOut = async(req,res,next)=>{
  if(!req.session.userId){
    res.redirect('/');
  }
  else{
    const userId = req.session.userId;
    const user = await User.findById(userId);
    if(user.blocked){
      req.session.destroy((err)=>{
        if(err){
            console.log(err)
            res.status(500).send('Error destroying session')
        }
        else{
            res.clearCookie('user.sid')
            res.redirect('/blockedpage');
        }
      })
    }else{
      next();
    }
  }
}


usrCtrl.createCart = async(userId)=>{
  try {
    const newCart = new Cart({userId,items:[],total:0})
    await newCart.save();
    
  } catch (error) {
    console.log(error)
  }
}

usrCtrl.createWallet = async(userId)=>{
  try {
    const newWallet = new Wallet({userId})
    await newWallet.save();
    
  } catch (error) {
    console.log(error)
  }
}

usrCtrl.createUser = async(req,res)=>{
    const {username,email,password,mobile} = req.body;
    const user = await User.findOne({username,email})
    if(user) return res.redirect('/register');
    
    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)
        const newUser = new User({username,email,mobile,password:hashedPassword});
    
        const user = await newUser.save();
        console.log(user)
        usrCtrl.createCart(user._id)
        usrCtrl.createWallet(user._id)
        res.redirect('/login');
    
    } catch (error) {
        console.log(error)
        res.status(500).send('Error creating new user')
    } 
}


usrCtrl.userAuth = async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json(errMsg);
      }

      if(user.blocked){
         res.status(400).json({msg:"You are blocked"})
         return;
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if(!validPassword){
        return res.status(400).json({msg:'Invalid username or password'}) 
      }
        const userId = user._id;
        req.session.userId = userId;
        req.session.username = username;
        
        res.status(200).json({msg:"logged in successfully"})
    } catch (err) {
      console.error(err);
      return res.status(500).json({msg:'Server Error'});
    }
  };
  

usrCtrl.getHome = async(req,res)=>{
  const categories = await Category.find()
  const banners = await Banner.find();
  const largeBanners = banners.filter((banner,i)=>{
    return banner.size === 'large'
  })
  const mediumBanners = banners.filter((banner,i)=>{
    return banner.size === 'medium'
  })
  const Products = await Product.aggregate([
    {
      $match:{deleted:false}
    },
    {
      $lookup:{
        from:'offers',
        localField:'category',
        foreignField:'category',
        as:'offerInfo'
      },
    },
    {  
      $project:{
        _id:1,
        name:1,
        price:1,
        image:1,
        deleted:1,
        category:1,
        color:1,
        description:1,
        quantity:1,
        createdAt:1,
        offerDiscount:{
          $arrayElemAt:['$offerInfo.discount',0]
        },
      }
    }
  ]);
  const recentProducts = Products.slice(8,16).reverse();
  const featuredProducts = Products.slice(0,8);
  if(req.session.userId){
    const userId = req.session.userId;
    const user = await User.findById(userId);
    if(user.blocked){
      req.session.destroy((err)=>{
        if(err){
            console.log(err)
            res.status(500).send('Error destroying session')
        }
        else{
            res.clearCookie('user.sid')
            res.redirect('/blockedpage')
        }
      })
    }else{
      res.render('user/home.ejs',{recentProducts,featuredProducts,categories,userPresent:true,largeBanners:largeBanners.reverse(),mediumBanners})
    }
  }
  else{
    res.render('user/home.ejs',{recentProducts,featuredProducts,categories,userPresent:false,largeBanners:largeBanners.reverse(),mediumBanners})
  }
}

usrCtrl.getBlockpage = (req,res)=>{
  res.render('user/blockedpage.ejs')
}


usrCtrl.getLoginPage = async(req,res)=>{
    let userPresent;
    if(req.session.userId){
      userPresent = true;
    }else{
      userPresent = false;
    }
    const categories = await Category.find()
    res.render('user/login.ejs',{categories,userPresent});
}

usrCtrl.getRegisterPage = async(req,res)=>{
    let userPresent;
    if(req.session.userId){
      userPresent = true;
    }else{
      userPresent = false;
    }
    const categories = await Category.find()
    res.render('user/register.ejs',{categories,userPresent});
}

usrCtrl.getEditProfile = async(req,res)=>{
  const userId = req.session.userId
  const categories = await Category.find()
  const user = await User.findOne({_id:userId})
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/editProfile.ejs',{user,userId,categories,userPresent})
}

usrCtrl.logoutUser = (req,res)=>{
  req.session.destroy((err)=>{
      if(err){
          console.log(err)
          res.status(500).send('Error destroying session')
      }
      else{
          res.clearCookie('user.sid')
          res.redirect('/')
      }
  })
}

usrCtrl.getOtpPage = async(req,res)=>{
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  const categories = await Category.find()
  res.render('user/forgotPage.ejs',{categories,userPresent})
}

function generateOTP() {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

usrCtrl.sendOtp = async(req,res)=>{
  const email = req.body.email;
  console.log(email)
  const user = await User.findOne({email})
  if(!user){
    return res.status(404).json({msg:"You are not registered with us please sign up"})
  }
  const otpExisting = await OtpModel.findOne({email})
  if(otpExisting){
    await OtpModel.findByIdAndDelete(otpExisting._id);
  }
  try {
    const OTP = generateOTP(); 

    const otpDoc = new OtpModel({email,otp:OTP})
    await otpDoc.save();
    console.log(process.env.SENDGRID_API_KEY)

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
      to: email, 
      from: 'abhijithrb91@gmail.com', 
      subject: 'Your OTP to change password',
      text: `Your OTP is ${OTP}`,
    }
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
      })
      .catch((error) => {
        console.error(error)
      })

    res.status(200).json({msg:'Otp Sent successfully'})
  
  } catch (error) {
      console.error(error);
      res.status(500).json({msg:'Something went wrong'})
  }

}

usrCtrl.verifyOtp = async(req,res)=>{
  const otp = req.body.otp;
  const email = req.body.email;
  const validOtp = await OtpModel.findOne({email,otp})
  if(!validOtp){
    res.status(403).json({msg:'Invalid Otp number'})
    return;
  }
  const user = await User.findOne({email});
  const userId = user._id;
  await OtpModel.findByIdAndDelete(validOtp._id)
  
  return res.status(200).json({userId});
}

usrCtrl.getChangePwd = async(req,res)=>{
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if(!user){
      const error = new Error('404 not found');
      error.statusCode = 404;
      throw error;
    }
    const categories = await Category.find()
    let userPresent;
    if(req.session.userId){
      userPresent = true;
    }else{
      userPresent = false;
    }
    res.render('user/changepwd.ejs',{userId,userPresent,categories})
    
  } catch (error) {
    console.log(error)
    res.render('404page.ejs')
  }
}

usrCtrl.updatePwd = async(req,res)=>{
    const userId = req.params.id;
    const {password} = req.body;
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password,salt);
      await User.findByIdAndUpdate(userId,{
        $set:{password:hashedPassword}
      })
      
      res.status(200).json({msg:"Password updated"})
    } catch (error) {
      console.log(error)
      res.status(500).json({msg:"Something went wrong"})
    }
}

// sms otp...

usrCtrl.getSmsOtpPage = async(req,res)=>{
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  const categories = await Category.find();
  res.render('user/mobileOtp.ejs',{categories,userPresent})
}

usrCtrl.sendSmsOtp = async (req, res) => {
  const mobile = req.body.mobile;
  const user = await User.findOne({mobile})
  if(!user){
    return res.status(404).json({msg:"You are not registered with us please sign up"})
  }

  try {

    const OTP = generateOTP(); 

    const otpDoc = new OtpModel({mobile,otp:OTP})
    await otpDoc.save();
    const accountSid = process.env.ACCOUNT_SID;
    const authToken = process.env.AUTH_TOKEN;
    const client = require("twilio")(accountSid, authToken);
    console.log("before client")
    client.messages
      .create({ body: `Your otp is ${OTP}`, from: "+16812461783", to: `+91${mobile}` })
        .then(message => console.log(message.sid));
    
    console.log("after client")
    res.send('Otp send successfully');
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).send('Error sending OTP');
  }
}

usrCtrl.smsVerify = async(req,res)=>{
  const otp = req.body.otp;
  const mobile = req.body.mobile;
  const valid = await OtpModel.findOne({mobile,otp})
  if(!valid){
    res.status(403).json({msg:'Invalid Otp number'})
    return;
  }
  const user = await User.findOne({mobile});
  const userId = user._id;
  req.session.userId = userId;
  req.session.username = user.username;
  await OtpModel.deleteOne({mobile});

  res.status(200).json({userId});
  
}

usrCtrl.sendCode = async(req,res)=>{
  const {email} = req.body;
  console.log("req success",email)

  const otpExisting = await OtpModel.findOne({email})
if(otpExisting){
  await OtpModel.findByIdAndDelete(otpExisting._id);
}
try {
  const OTP = generateOTP(); 

  const otpDoc = new OtpModel({email,otp:OTP})
  await otpDoc.save();
  console.log(process.env.SENDGRID_API_KEY)

    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
      to: email, 
      from: 'abhijithrb91@gmail.com', 
      subject: 'Your OTP to verify Email',
      text: `Your OTP is ${OTP}`,
    }
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
      })
      .catch((error) => {
        console.error(error)
      })

    res.status(200).json({msg:'Otp Sent successfully'})

    } catch (error) {
      console.error(error);
      res.status(500).json({msg:'Something went wrong'})
    }
}

usrCtrl.verifyEmail = async (req,res)=>{
  const otp = req.body.otp;
  const email = req.body.email;
  try {
    const validOtp = await OtpModel.findOne({email,otp})
    console.log("Validotp",validOtp)
    if(validOtp === null){
      console.log("Invalid")
      return res.status(401).json({msg:"Invalid Otp number"})
    }
  
    await OtpModel.findByIdAndDelete(validOtp._id)
  
    res.status(200).json({msg:"Email verified"});
    
  } catch (error) {
    res.status(500).json({msg:"Something went wrong"})
  }
}

usrCtrl.getCatPrdts = async(req,res)=>{
  try {
    const category = await Category.findById(req.params.id)
    if (!category) {
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }
    const userId = req.session.userId
    const categories = await Category.find()
    let Products=[];
    Products = await Product.aggregate([
      {
        $match:{category:category._id,deleted:false}
      },
      {
        $lookup:{
          from:'offers',
          localField:'category',
          foreignField:'category',
          as:'offerInfo'
        },
      },
      {  
        $project:{
          _id:1,
          name:1,
          price:1,
          image:1,
          deleted:1,
          category:1,
          color:1,
          description:1,
          quantity:1,
          createdAt:1,
          offerDiscount:{
            $arrayElemAt:['$offerInfo.discount',0]
          },
        }
      }
    ]);
    if(req.session.userId){
      res.render('user/category.ejs',{Products,userPresent:true,userId,categories,category})
    }else{
      res.render('user/category.ejs',{Products,userPresent:false,categories,category})
    }
    
  } catch (error) {
    console.log(error)
    res.render('404page.ejs')
  }
}


usrCtrl.getDetail = async(req,res)=>{
  try {
    const userId = req.session.userId;
    const prodId = req.params.id;
    const product = await Product.findById(prodId);
    if(!product){
      const error = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }
    const categories = await Category.find()
    const pcString = product.category.toString()
    const similar = await Product.find({category:pcString}).limit(4);
    let userPresent;
    if(req.session.userId){
      userPresent = true;
    }else{
      userPresent = false;
    }
    if(req.session.userId){ 
      const userId=req.session.userId
      const cart = await Cart.findOne({userId},{items:{$elemMatch:{productId:prodId}}})
      console.log("pp" + cart);
      if(cart.items.length>0){
        res.render('user/detail.ejs',{userPresent,product,added:true,userId,categories,similar})
      }else{
        res.render('user/detail.ejs',{userPresent,product,added:false,userId,categories,similar})
      }
    }else{
      res.render('user/detail.ejs',{userPresent,product,added:false,categories,similar})
    }
    
  } catch (error) {
    console.log(error)
    res.render('404page.ejs')
  }
}

usrCtrl.addToCart = async(req,res)=>{
  const userId = req.session.userId;
  const productId = req.params.id;
  const product = await Product.findById(productId)
  const name = product.name;
  const price = product.price;
  const image = product.image[0].filename;
  const quantity = 1;
  const subTotal = price * quantity;
  const cart = await Cart.findOne({userId})
  const offer = await Offer.findOne({category:product.category})
  const itemDiscount = Math.floor(price * (offer.discount)/100);

  if(product.quantity > 0){
    try {
      if(cart){
        const cartId = cart._id;
        const newItem = {productId,name,price,image,quantity,subTotal,itemDiscount}
        const updatedCart = await Cart.findByIdAndUpdate(cartId,{
          $push:{items:newItem},
          $inc:{total:newItem.subTotal,discount:itemDiscount}
        },{new:true})
        console.log("Cart Update Success",updatedCart)
        await Product.findByIdAndUpdate(productId,{
          $inc:{quantity:-1}
        })
        res.redirect('/cart')   
      }else{
        usrCtrl.createCart(userId);
        res.redirect('/cart')   
      } 
    } catch (error) {
        console.log(error)
    }

  }
}

usrCtrl.getCart = async(req,res)=>{
  const userId = req.session.userId;
  const categories = await Category.find()
  const cart = await Cart.findOne({userId})
  console.log("cart:")
  console.log(cart)
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  if(cart){
    if(cart.items.length>0){
      console.log(cart)
      res.render('user/cart.ejs',{cart,isEmpty:false,categories,userId,userPresent});
    }else{
      res.render('user/cart.ejs',{cart,isEmpty:true,categories,userId,userPresent});
    }
  }
  
}

usrCtrl.removeItem = async(req,res)=>{
  try {
    const userId = req.session.userId;
    const itemId = req.params.id;
    const found = await Cart.findOne({userId},{items:{$elemMatch:{_id:itemId}}})
    const productId = found.items[0].productId;
    const quantity = found.items[0].quantity;
    const product = await Product.findById(productId);
    const price = product.price;
    const offer = await Offer.findOne({category:product.category});
    const discountDec = Math.floor(price*quantity*(offer.discount)/100);

    const updtCart = await Cart.findOneAndUpdate({userId},{
      $pull:{items:{_id:itemId}},
      $inc:{total:-found.items[0].subTotal,discount:-discountDec}
    },{new:true})
    await Product.findByIdAndUpdate(productId,{
      $inc:{quantity:quantity}
    })
    res.status(200).json({updtCart})
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
}

usrCtrl.getCheckout = async(req,res)=>{
  const userId = req.session.userId
  const categories = await Category.find()
  const user = await User.findById(userId)
  const cart = await Cart.findOne({userId})
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/checkoutPage.ejs',{user,userId,cart,categories,userPresent})
  
}

usrCtrl.incQty = async(req,res)=>{
  const userId = req.session.userId;
  const qty = req.query.qty;
  const price = req.query.price;
  const itemid = req.params.id;
  const newSubTotal = price * qty;
  const found = await Cart.findOne({userId}, {items:{$elemMatch:{_id:itemid}}})
  const productId = found.items[0].productId;
  const product = await Product.findById(productId);
  const offer = await Offer.findOne({category:product.category});
  const discountInc = Math.floor(price*(offer.discount)/100);
  const itemDiscount = Math.floor(newSubTotal*(offer.discount)/100);

  if(product.quantity > 0){
    try {
      const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
        $set:{'items.$.quantity':qty,
        'items.$.subTotal':newSubTotal,
        'items.$.itemDiscount':itemDiscount,
      },
        $inc:{total:price,discount:discountInc}
      },{new:true});

      await Product.findByIdAndUpdate(productId,{
        $inc:{quantity:-1}
      })
      res.status(200).json({item:found,updtCart});
    } catch (error) {
      console.log(error)
      res.status(500);
    }
  }
  else{
    res.json({msg:"Insufficient quantity"})
  }
  
}

usrCtrl.decQty = async(req,res)=>{
  const userId = req.session.userId;
  const qty = req.query.qty;
  const price = req.query.price;
  const itemid = req.params.id;
  const newSubTotal = price * qty;
  const found = await Cart.findOne({userId}, {items:{$elemMatch:{_id:itemid}}})
  const productId = found.items[0].productId;
  const product = await Product.findById(productId);
  const offer = await Offer.findOne({category:product.category});
  const discountDec = Math.floor(price*(offer.discount)/100);
  const itemDiscount = Math.floor(newSubTotal*(offer.discount)/100);

  try {
    const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
      $set:{'items.$.quantity':qty,
      'items.$.subTotal':newSubTotal,
      'items.$.itemDiscount':itemDiscount,},
      $inc:{total:-price,discount:-discountDec}
    },{new:true})
    await Product.findByIdAndUpdate(productId,{
      $inc:{quantity:1}
    })
    res.status(200).json({item:found,updtCart});
  } catch (error) {
    console.log(error);
    res.status(500);
  } 
}

usrCtrl.getProfile = async(req,res)=>{
  const userId = req.session.userId;
  const categories = await Category.find()
  const user = await User.findById(userId)
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/profile.ejs',{user,userId,categories,userPresent})
}

usrCtrl.getEditProfile = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/editProfile.ejs',{user,userId,categories,userPresent})
}

usrCtrl.editProfile = async(req,res)=>{
  const userId = req.session.userId;
  const {username,email,mobile} = req.body
  await User.findByIdAndUpdate(userId,{username,email,mobile})
  res.redirect('/profile')
}

usrCtrl.getMngAddress = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/manageAddress.ejs',{user,userId,categories,userPresent})
}

usrCtrl.addAddress = async(req,res)=>{
  const userId = req.session.userId;
  const address = req.body;
  try {
    await User.findByIdAndUpdate(userId,{
      $push:
      {address:
        {
        name:address.name,
        mobile:address.mobile,
        addressline1:address.addressline1,
        addressline2:address.addressline2,
        country:address.country,
        city:address.city,
        state:address.state,
        pin:address.pin,
        }
      }
    })
    res.status(200).json({msg:"Address added Successfully"})
  } catch (error) {
    console.log(error)
    res.status(500).json({msg:"Something went wrong"})
  }
}


const clearCart = async(userId)=>{
  await Cart.findOneAndUpdate({userId},{
    $set:{items:[],total:0,discount:0,couponDiscount:0}
  });
  console.log("cart cleared")
}

const generateRazorpay = (orderId,total)=>{
  return new Promise((resolve,reject)=>{
      
      const options={
          amount:(total)*100,
          currency:"INR",
          receipt:''+orderId
      };

      instance.orders.create(options, function(err,order){
          if(err){
              console.log(err)
          }else{
            console.log(order)
              resolve(order)
          }
              
          })
  })
}

usrCtrl.placeOrder = async(req,res)=>{
  
  const userId = req.session.userId;
  const cart = await Cart.findOne({userId});
  const items = cart.items;
  const deliveryCharge = 0;
  const total = cart.total-(cart.discount + cart.couponDiscount + deliveryCharge);
  const {address,paymentMethod} = req.body;
 
  const newOrder = new Order({
    userId:userId,
    items:[...items],
    address:{
      name:address.name,
      mobile:address.mobile,
      addressline1:address.addressline1,
      addressline2:address.addressline2,
      city:address.city,
      state:address.state,
      country:address.country,
      pin:address.pin,
    },
    total:total,
    discount:cart.discount,
    couponDiscount:cart.couponDiscount,
    paymentMethod,
    status:'Processing', 
  })
  try {
  
    const order = await newOrder.save();
    const orderId = order._id;
    clearCart(userId);
    if(paymentMethod === 'COD'){
      await Order.findByIdAndUpdate(orderId,{
        $set:{paymentStatus:'Success'}
      })
      res.status(200).json({codSuccess:true});
    }else{
      const response = await generateRazorpay(orderId,total);
      res.json(response);
    }

  } catch (error) {
    console.log(error)
    res.status(500).json({msg:'Something went wrong'})

  }

}


usrCtrl.getMyOrders= async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId);
  const categories = await Category.find()
  const ordersOrg = await Order.find({userId})
  const orders = ordersOrg.reverse();
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  if(orders.length > 0){
    res.render('user/myOrders.ejs',{orders,hasOrders:true,user,userId,categories,userPresent})
  }else{
    res.render('user/myOrders.ejs',{hasOrders:false,user,userId,categories,userPresent})
  }
  
}

usrCtrl.myOrderDetail = async(req,res)=>{
  try {
      const orderId = req.params.id;
      const order = await Order.findById(orderId)
      if(!order){
        const error = new Error('Order not found');
        error.statusCode = 404;
        throw error;
      }
      const userId = req.session.userId;
      const user = await User.findById(userId);
      const categories = await Category.find()
      let userPresent;
      if(req.session.userId){
        userPresent = true;
      }else{
        userPresent = false;
      }
      if(order.status === "Delivered"){
        res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:true,returned:false,cancelled:false,userPresent})
      }
      else if(order.status === "Returned"){
        res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:true,cancelled:false,userPresent})
      }
      else if(order.status === "Cancelled"){
        res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:true,cancelled:true,userPresent})
      }
      else{
        res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:false,cancelled:false,userPresent})
      }
    
  } catch (error) {
    console.log(error)
    res.render('404page.ejs')
  }
}

usrCtrl.cancelOrder = async(req,res)=>{
  const userId = req.session.userId;
  const status = req.body.status;
  const orderid = req.body.orderid;
  const date = Date.now();
  console.log("order cancelled")
  try {
      const order = await Order.findByIdAndUpdate(orderid,{
          $set:{status:status,date:date}
      },{new:true})

      if(order.paymentMethod !== "COD"){
        const amountPaid = order.total - order.discount;
        await Wallet.updateOne({userId:userId},
          {$push:{ordersArray:order._id},
           $inc:{balance:amountPaid}
          }
          )
      }

      res.status(200).json(order)
  } catch (error) {
      console.log(error)
  }
}

usrCtrl.returnOrder = async(req,res)=>{
  const userId = req.session.userId;
  const status = req.body.status;
  const orderid = req.body.orderid;
  const date = Date.now();
  try {
      const order = await Order.findByIdAndUpdate(orderid,{
          $set:{status:status,date:date}
      },{new:true})

      if(order.paymentMethod !== "COD"){
        const amountPaid = order.total - order.discount;
        await Wallet.updateOne({userId:userId},
          {$push:{ordersArray:order._id},
           $inc:{balance:amountPaid}
          }
          )
      }

      res.status(200).json(order)
  } catch (error) {
      console.log(error)
  }
}

usrCtrl.getSuccess = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  res.render('user/success.ejs',{user,userId,categories,userPresent})
}


const changePaymentStatus=(orderId)=>{
  return new Promise((resolve,reject)=>{
    const orderid =  new objectId(orderId);
      Order.updateOne({_id:orderid},
      {
          $set:{
              paymentStatus:'Success'
          }
      }).then(()=>{
          resolve()
      })
  })
}

const verifyPayment = (payment) => {
  return new Promise((resolve, reject) => {
    const crypto = require('crypto');
    let hmac = crypto.createHmac('sha256', 'Q15DfBbJFIrDy1K1FTsDE7CA');

    hmac.update(payment['razorpay_order_id'] + '|' + payment['razorpay_payment_id']);
    hmac = hmac.digest('hex');

    if (hmac === payment['razorpay_signature']) {
      resolve();
    } else {
      reject();
    }
  });
};


usrCtrl.checkVerified = (req,res)=>{
  const payment = req.body.payment;
  const order = req.body.order;
  verifyPayment(payment).then(()=>{
    
    changePaymentStatus(order.receipt).then(()=>{
        res.json({status:true})
        })
    }).catch((err)=>{
       
        res.json({status:false,errMsg:''})
  })
  }

usrCtrl.checkStock = async(req,res)=>{
  const productId = req.params.id;
  const product = await Product.findById(productId);
  const quantity = product.quantity;
  res.json({quantity:quantity})
}

usrCtrl.listCoupons = async(req,res)=>{
  const userId = req.session.userId;
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }
  try {
    const coupons = await Coupon.find();
    const categories = await Category.find()
    const user = await User.findById(userId);
  
    res.render('user/coupons.ejs',{coupons,categories,user,userId,userPresent})
  } catch (error) {
    console.log(error)
  }

}

usrCtrl.applyCoupon = async(req,res)=>{
    const {couponCode,cartId,userId} = req.body;
    const coupon  = await Coupon.findOne({code:couponCode})
    if(!coupon){
      res.status(400).json({msg:"coupon not found"})
      return;
    }

    const currentDate = new Date();
    if(coupon.expiryDate < currentDate){
      res.status(400).json({msg:"Coupon has expired"})
      return;
    }

    if(coupon.usedBy.includes(userId)){
      res.status(409).json({msg:"Coupon already used"})
      return;
    }

    const cart = await Cart.findById(cartId);
    
    if(cart.total < 500){
      res.status(409).json({msg:"Coupon not applicable below 500"})
      return;
    }

    const couponDiscount = coupon.discount;
    console.log("couponDiscount:")
    console.log(couponDiscount)
    
    try{
      await Coupon.findByIdAndUpdate(coupon._id,{
        $push:{usedBy:userId}
      })


      const updatedCart = await Cart.findByIdAndUpdate(cart._id,{
        $inc:{couponDiscount:couponDiscount}
      },{new:true})

      console.log("updatedCart:")
      console.log(updatedCart)
      res.status(200).json({couponDiscount:couponDiscount,total:cart.total,discount:cart.discount}) 
    }catch(error){
      res.status(500).json({msg:"Something went wrong"})
    }
}


usrCtrl.downloadInvoice = async(req,res)=>{
  const doc = new PDFDocument();
  const orderId = req.params.id;
  const order = await Order.findById(orderId)
  const date = new Date(Date.now()).toDateString();
  const createdAt = order.createdAt.toDateString();

  doc.text('Tax Invoice', { align: 'center', fontSize: 30 });
  doc.moveDown();
  doc.text('Order details:', { fontSize: 22 });
  doc.text(`Order ID:${orderId}`, { fontSize: 16 });
  doc.text(`Ordered Date:${createdAt}`, { fontSize: 16 });
  doc.text(`Invoice Date:${date}`, { fontSize: 16 });
  
  const clientAddress = `${order.address.addressline1}`+','
  +`${order.address.addressline2}`+','+`${order.address.city}`+','
  +`${order.address.pin}`+','+`${order.address.state}`+','
  +`${order.address.country}`;
  doc.moveDown();
  doc.text('Deliver to:', { fontSize: 22 });
  doc.text(`${order.address.name}`, { fontSize: 16 });
  doc.text(clientAddress, { fontSize: 12 });
  doc.text(`Phone:${order.address.mobile}`, { fontSize: 16 });
  doc.text(`Total items:${order.items.length}`, { fontSize: 14 });

  doc.strokeColor('black').lineWidth(1).moveTo(50, 250).lineTo(550, 250).stroke();

  let rowsArray = [];
  order.items.forEach((item,i)=>{
    const itemTotal = parseInt(item.subTotal - item.itemDiscount);
   
    rowsArray.push([item.name, item.quantity,`Rs.${item.subTotal}`,`Rs.${item.itemDiscount}`,`Rs.${itemTotal}`])
  })

  const table = {
    headers: ['Item', 'Quantity', 'Amount','Discount','Total'],
    rows: rowsArray,
  };
  
  
  const tableTop = 270; 
  const tableLeft = 80; 
  const cellPadding = 10; 

  const columnWidths = [150, 100, 100, 100, 100]; 

 
  doc.font('Helvetica-Bold').fontSize(12);

  
  let currentY = tableTop;
  table.headers.forEach((header, columnIndex) => {
  doc.text(header, tableLeft + columnIndex * columnWidths[columnIndex], currentY);
  doc.strokeColor('black').lineWidth(1).moveTo(50, currentY+13).lineTo(550, currentY+13).stroke();

  });

  
  doc.font('Helvetica').fontSize(10);

  table.rows.forEach((row, rowIndex) => {
  currentY += 20;

  row.forEach((cell, columnIndex) => {
      doc.text(cell, tableLeft + columnIndex * columnWidths[columnIndex], currentY, {
        width: columnWidths[columnIndex],
        align: 'left',
      });
      });
  
      doc.strokeColor('black').lineWidth(1).moveTo(50, currentY+11).lineTo(550, currentY+11).stroke();

  });

  doc.moveDown();

  doc.text('Grand Total: Rs.' + `${order.total}`, { fontSize: 30 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');

  await doc.pipe(res);

  doc.end();
  res.end();
}

usrCtrl.searchProducts = async(req,res)=>{
  let products = []
  const userId = req.session.userId
  const categories = await Category.find()
  const squery = req.query.searchQuery;
  let userPresent;
  if(req.session.userId){
    userPresent = true;
  }else{
    userPresent = false;
  }

    const regex = new RegExp(squery, 'i');
    products = await Product.aggregate([
      {
        $match:{name: { $regex: regex },deleted:false}
      },
      {
        $lookup:{
          from:'offers',
          localField:'category',
          foreignField:'category',
          as:'offerInfo'
        },
      },
      {  
        $project:{
          _id:1,
          name:1,
          price:1,
          image:1,
          deleted:1,
          category:1,
          color:1,
          description:1,
          quantity:1,
          createdAt:1,
          offerDiscount:{
            $arrayElemAt:['$offerInfo.discount',0]
          },
        }
      }
    ]);
        console.log(products)
        res.render('user/search.ejs', { products,userPresent,userId,categories});
   
  }
  
usrCtrl.getMenPage = async(req,res)=>{
  const category = await Category.findOne({name:"Men"})
  res.redirect(`/category/${category._id}`)
}
usrCtrl.getWomenPage = async(req,res)=>{
  const category = await Category.findOne({name:"Women"})
  res.redirect(`/category/${category._id}`)
}
usrCtrl.getKidsPage = async(req,res)=>{
  const category = await Category.findOne({name:"Kids"})
  res.redirect(`/category/${category._id}`)
}

usrCtrl.getWallet = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId);
  const username = user.name;
  const categories = await Category.find()
  const wallet = await Wallet.findOne({userId:userId})
 
  console.log("wallet:")
  console.log(wallet)
  const orders = await Order.find({
    _id: { $in: wallet.ordersArray }
  });
  res.render('user/wallet.ejs',{wallet,user,username,categories,orders,userPresent:true})
}

module.exports = usrCtrl;

