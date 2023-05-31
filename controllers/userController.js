const Category = require('../models/CategoryModel');
const Product = require('../models/ProductModel');
const User = require('../models/UserModel')
const OtpModel = require('../models/OtpModel')
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const Cart = require('../models/CartModel');
const Order = require('../models/OrderModel');
const Razorpay=require('razorpay')
const mongoose = require('mongoose') 
const instance = new Razorpay({
    key_id: 'rzp_test_6JFoZx1fYTkS3n', 
    key_secret: 'Q15DfBbJFIrDy1K1FTsDE7CA', });

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
  const newCart = new Cart({userId,items:[],total:0})
  await newCart.save();
}

usrCtrl.createUser = async(req,res)=>{
    const {username,email,password,mobile} = req.body;
    const user = await User.findOne({username,email})
    if(user) return res.redirect('/register');
    
    try {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)
        const newUser = new User({username,email,mobile,password:hashedPassword});
    
        await newUser.save();
        res.redirect('/login');
    
    } catch (error) {
        console.log(error)
        res.status(500).send('Error creating new user')
    } 
    }


    usrCtrl.userAuth = async (req, res) => {
    const { username, password } = req.body;
    try {
      let errMsg = 'Invalid username or password';
      let blockMsg = 'You are Blocked'
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json(errMsg);
      }

      if(user.blocked){
        return res.status(400).json(blockMsg)
      }

      const validPassword = await bcrypt.compare(password, user.password)
      if(!validPassword){
        return res.status(400).json(errMsg) 
      }
        const userId = user._id;
        req.session.userId = userId;
        req.session.username = username;
        return res.status(200).json(userId);
    } catch (err) {
      console.error(err);
      return res.status(500).json('Server Error');
    }
  };
  

usrCtrl.getHome = async(req,res)=>{
  const categories = await Category.find()
  const Products = await Product.find().limit(16);
  const recentProducts = Products.slice(0,8);
  const featuredProducts = Products.slice(8,16);
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
      res.render('user/home.ejs',{recentProducts,featuredProducts,categories,userPresent:true})
    }
  }
  else{
    res.render('user/home.ejs',{recentProducts,featuredProducts,categories,userPresent:false})
  }
}

usrCtrl.getBlockpage = (req,res)=>{
  res.render('user/blockedpage.ejs')
}


usrCtrl.getLoginPage = (req,res)=>{
    res.render('user/ulogin.ejs');
}

usrCtrl.getRegisterPage = (req,res)=>{
    res.render('user/ureg.ejs');
}

usrCtrl.getEditProfile = async(req,res)=>{
  const userId = req.session.userId
  const categories = await Category.find()
  const user = await User.findOne({_id:userId})
  res.render('user/editProfile.ejs',{user,userId,categories})
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

usrCtrl.getOtpPage = (req,res)=>{
  res.render('user/otpPage.ejs')
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
  const user = await User.findOne({email})
  if(!user){
    return res.status(404).json({msg:"You are not registered with us please sign up"})
  }
  
  try {
    const OTP = generateOTP(); 

    const otpDoc = new OtpModel({email,otp:OTP})
    await otpDoc.save();

    sgMail.setApiKey('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')
    const msg = {
      to: 'rbabhijith@gmail.com', 
      from: 'abhijithrb91@gmail.com', 
      subject: 'Your OTP for login',
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

    res.send('Otp Sent successfully')
  
  } catch (error) {
      console.error(error);
      res.send('Something went wrong');
  }

}

usrCtrl.verifyOtp = async(req,res)=>{
  const otp = req.body.otp;
  const email = req.body.email;
  const valid = await OtpModel.findOne({email,otp})
  if(!valid){
    res.status(403).json({msg:'Invalid Otp number'})
    return;
  }
  const user = await User.findOne({email});
  const userId = user._id;
  req.session.userId = userId;
  req.session.username = user.username;
  await OtpModel.deleteOne({email});

  return res.status(200).json(userId);
  
}

usrCtrl.getCatPrdts = async(req,res)=>{
  const category = await Category.findById(req.params.id)
  const userId = req.session.userId
  const categories = await Category.find()
  const Products = await Product.find({category:category._id}).limit(9)
  if(req.session.userId){
    res.render('user/category.ejs',{Products,userPresent:true,userId,categories,category})
  }else{
    res.render('user/category.ejs',{Products,userPresent:false,categories,category})
  }
}


usrCtrl.getDetail = async(req,res)=>{
  const userId = req.session.userId;
  const prodId = req.params.id;
  const categories = await Category.find()
  const product = await Product.findById(prodId);
  const pcString = product.category.toString()
  const similar = await Product.find({category:pcString}).limit(4);
  if(req.session.userId){ 
    const userId=req.session.userId
    const cart = await Cart.findOne({userId},{items:{$elemMatch:{productId:prodId}}})
    console.log("pp" + cart);
    if(cart.items.length>0){
      res.render('user/detail.ejs',{userPresent:true,product,added:true,userId,categories,similar})
    }else{
      res.render('user/detail.ejs',{userPresent:true,product,added:false,userId,categories,similar})
    }
  }else{
    res.render('user/detail.ejs',{userPresent:false,product,added:false,categories,similar})
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
  try {
    if(cart){
      const cartId = cart._id;
      const newItem = {productId,name,price,image,quantity,subTotal}
      const updatedCart = await Cart.findByIdAndUpdate(cartId,{
        $push:{items:newItem},
        $inc:{total:newItem.subTotal}
      },{new:true})
      console.log("Cart Update Success",updatedCart)
      res.redirect('/cart')   
    }else{
      usrCtrl.createCart(userId);
      res.redirect('/cart')   
    } 
  } catch (error) {
      console.log(error)
  }
}

usrCtrl.getCart = async(req,res)=>{
  const userId = req.session.userId;
  const categories = await Category.find()
  const cart = await Cart.findOne({userId})
  if(cart){
    const items = cart.items;
    if(items.length>0){
      res.render('user/cart.ejs',{cart,isEmpty:false,categories,userId});
    }else{
      res.render('user/cart.ejs',{cart,isEmpty:true,categories,userId});
    }
  }else{
    usrCtrl.createCart(userId);    
    res.render('user/cart.ejs',{isEmpty:true,categories,userId});
  }
}

usrCtrl.removeItem = async(req,res)=>{
  try {
    const userId = req.session.userId;
    const itemId = req.params.id;
    const found = await Cart.findOne({userId},{items:{$elemMatch:{_id:itemId}}})
    const updtCart = await Cart.findOneAndUpdate({userId},{
      $pull:{items:{_id:itemId}},
      $inc:{total:-found.items[0].subTotal}
    },{new:true})
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
  res.render('user/checkout.ejs',{user,userId,cart,categories})
}

usrCtrl.incQty = async(req,res)=>{
  const userId = req.session.userId;
  const qty = req.query.qty;
  const price = req.query.price;
  const itemid = req.params.id;
  const newSubTotal = price * qty;
  try {
    const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
      $set:{'items.$.quantity':qty,'items.$.subTotal':newSubTotal},
      $inc:{total:price}
    },{new:true});
    const item = await Cart.findOne({userId}, {items:{$elemMatch:{_id:itemid}}})
    res.status(200).json({item,updtCart});
  } catch (error) {
    console.log(error)
    res.status(500);
  }
  
}

usrCtrl.decQty = async(req,res)=>{
  const userId = req.session.userId;
  const qty = req.query.qty;
  const price = req.query.price;
  const itemid = req.params.id;
  const newSubTotal = price * qty;
  try {
    const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
      $set:{'items.$.quantity':qty,'items.$.subTotal':newSubTotal},
      $inc:{total:-price}
    },{new:true})
    const item = await Cart.findOne({userId}, {items:{$elemMatch:{_id:itemid}}})
    res.status(200).json({item,updtCart});
  } catch (error) {
    console.log(error);
    res.status(500);
  } 
}

usrCtrl.getProfile = async(req,res)=>{
  const userId = req.session.userId;
  const categories = await Category.find()
  const user = await User.findById(userId)
  res.render('user/profile.ejs',{user,userId,categories})
}

usrCtrl.getEditProfile = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  res.render('user/editProfile.ejs',{user,userId,categories})
}

usrCtrl.editProfile = async(req,res)=>{
  const userId = req.session.userId;
  const {username,email,mobile} = req.body
  await User.findByIdAndUpdate(userId,{username,email,mobile})
  res.redirect('/profile')
}

const clearCart = async(userId)=>{
  await Cart.findOneAndUpdate({userId},{
    $set:{items:[],total:0}
  });
  console.log("cart cleared")
}

const generateRazorpay = (orderId,total)=>{
  return new Promise((resolve,reject)=>{
    
      const options={
          amount:(total+10)*100,
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
  console.log(req.body);
  const {billAddress,shipAddress,paymentMethod} = req.body;
  const newOrder = new Order({
    userId:userId,
    items:[...items],
    billAddress:{
      firstname:billAddress.firstname,
      lastname:billAddress.lastname,
      mobile:billAddress.mobile,
      email:billAddress.email,
      addressline1:billAddress.addressline1,
      addressline2:billAddress.addressline2,
      city:billAddress.city,
      state:billAddress.state,
      country:billAddress.country,
      pin:billAddress.pin,
    },
    shipAddress:{
      firstname:shipAddress.firstname,
      lastname:shipAddress.lastname,
      mobile:shipAddress.mobile,
      email:shipAddress.email,
      addressline1:shipAddress.addressline1,
      addressline2:shipAddress.addressline2,
      city:shipAddress.city,
      state:shipAddress.state,
      country:shipAddress.country,
      pin:shipAddress.pin,
    },
    total:cart.total,
    paymentMethod,
    status:'Processing', 
  })
  try {
  
    const order = await newOrder.save();
    const orderId = order._id;
    const total = cart.total;
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
  if(orders.length > 0){
    
    res.render('user/myOrders.ejs',{orders,hasOrders:true,user,userId,categories})
  }else{
    res.render('user/myOrders.ejs',{hasOrders:false,user,userId,categories})
  }
  
}

usrCtrl.myOrderDetail = async(req,res)=>{
  const orderId = req.params.id;
  const userId = req.session.userId;
  const user = await User.findById(userId);
  const categories = await Category.find()
  const order = await Order.findById(orderId)
  if(order.status === "Delivered"){
    res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:true,returned:false,cancelled:false})
  }
  else if(order.status === "Returned"){
    res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:true,cancelled:false})
  }
  else if(order.status === "Cancelled"){
    res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:true,cancelled:true})
  }
  else{
    res.render('user/myOrderDetail.ejs',{order,user,userId,categories,delivered:false,returned:false,cancelled:false})
  }
}

usrCtrl.cancelOrder = async(req,res)=>{
  const status = req.body.status;
  const orderid = req.body.orderid;
  const date = Date.now();
  try {
      const order = await Order.findByIdAndUpdate(orderid,{
          $set:{status:status,date:date}
      },{new:true})
      res.status(200).json(order)
  } catch (error) {
      console.log(error)
  }
}

usrCtrl.returnOrder = async(req,res)=>{
  const status = req.body.status;
  const orderid = req.body.orderid;
  const date = Date.now();
  try {
      const order = await Order.findByIdAndUpdate(orderid,{
          $set:{status:status,date:date}
      },{new:true})
      res.status(200).json(order)
  } catch (error) {
      console.log(error)
  }
}

usrCtrl.getSuccess = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  res.render('user/success.ejs',{user,userId,categories})
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



module.exports = usrCtrl;

