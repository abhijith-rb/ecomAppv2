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
        res.redirect('/otplogin');
    
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


usrCtrl.getLoginPage = async(req,res)=>{
    const categories = await Category.find()
    res.render('user/login.ejs',{categories,userPresent:false});
}

usrCtrl.getRegisterPage = async(req,res)=>{
    // res.render('user/ureg.ejs');
    const categories = await Category.find()
    res.render('user/register.ejs',{categories,userPresent:false});
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

usrCtrl.getOtpPage = async(req,res)=>{
  // res.render('user/otpPage.ejs')
  const categories = await Category.find()
  res.render('user/forgotPage.ejs',{categories,userPresent:false})
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

usrCtrl.getChangePwd = (req,res)=>{
  const userId = req.params.id;
  res.render('user/changepwd.ejs',{userId})
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
  // res.render('user/smsOtp.ejs')
  const categories = await Category.find();
  res.render('user/mobileOtp.ejs',{categories,userPresent:false})
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
    res.send('Otp send successfullyBE');
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

  if(product.quantity > 0){
    try {
      if(cart){
        const cartId = cart._id;
        const newItem = {productId,name,price,image,quantity,subTotal}
        const updatedCart = await Cart.findByIdAndUpdate(cartId,{
          $push:{items:newItem},
          $inc:{total:newItem.subTotal}
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
  if(cart){
    if(cart.items.length>0){
        
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
    const productId = found.items[0].productId;
    const updtCart = await Cart.findOneAndUpdate({userId},{
      $pull:{items:{_id:itemId}},
      $inc:{total:-found.items[0].subTotal}
    },{new:true})
    await Product.findByIdAndUpdate(productId,{
      $inc:{quantity:found.items[0].quantity}
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
  res.render('user/checkoutPage.ejs',{user,userId,cart,categories})
  // res.render('user/checkout.ejs',{user,userId,cart,categories})
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

  if(product.quantity > 0){
    try {
      const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
        $set:{'items.$.quantity':qty,'items.$.subTotal':newSubTotal},
        $inc:{total:price}
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

  try {
    const updtCart = await Cart.findOneAndUpdate({userId, 'items._id':itemid},{
      $set:{'items.$.quantity':qty,'items.$.subTotal':newSubTotal},
      $inc:{total:-price}
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

usrCtrl.getMngAddress = async(req,res)=>{
  const userId = req.session.userId;
  const user = await User.findById(userId)
  const categories = await Category.find()
  res.render('user/manageAddress.ejs',{user,userId,categories})
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
    $set:{items:[],total:0}
  });
  console.log("cart cleared")
}

const generateRazorpay = (orderId,total)=>{
  return new Promise((resolve,reject)=>{
      const deliveryCharge = 10;
      const options={
          amount:(total+deliveryCharge)*100,
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
  const {address,paymentMethod} = req.body;
  console.log("Address:")
  console.log(address)
  console.log(typeof address)
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

usrCtrl.checkStock = async(req,res)=>{
  const productId = req.params.id;
  const product = await Product.findById(productId);
  const quantity = product.quantity;
  res.json({quantity:quantity})
}

usrCtrl.listCoupons = async(req,res)=>{
  const userId = req.session.userId;
  try {
    const coupons = await Coupon.find();
    const categories = await Category.find()
    const user = await User.findById(userId);
  
    res.render('user/coupons.ejs',{coupons,categories,user,userId})
  } catch (error) {
    console.log(error)
  }

}

usrCtrl.applyCoupon = async(req,res)=>{
    const {couponCode,cartId,userId} = req.body;
    const coupon  = await Coupon.findOne({code:couponCode})
    if(!coupon){
      res.status(400).json({msg:"coupon not found"})
    }

    const currentDate = new Date();
    if(coupon.expiryDate < currentDate){
      res.status(400).json({msg:"Coupon has expired"})
    }

    if(coupon.usedBy.includes(userId)){
      res.status(409).json({msg:"Coupon already used"})
    }

    const discount = coupon.discount;
    console.log(discount)
    const cart = await Cart.findById(cartId);
    const newTotal = (cart.total - discount) > 0 ? (cart.total - discount) : 0;
    console.log(newTotal);
    try {
      await Coupon.findByIdAndUpdate(coupon._id,{
        $push:{usedBy:userId}
      })
      await Cart.findByIdAndUpdate(cartId,{
        $set:{total:newTotal}
      })
      
      res.status(200).json({newTotal:newTotal,discount:discount}) 
    } catch (error) {
      res.status(500).json({msg:"Something went wrong"})
    }
}

usrCtrl.filterByPrice = async(req,res)=>{
      const {checkedInputs,category} = req.body;
      const updatedProducts = []
      if (checkedInputs.includes('price-all')) {
        let prds = await Product.find({category:category})
        updatedProducts.push(...prds)
      } else {

        if (checkedInputs.includes('price-1')) {
          let prds = await Product.find({
            category: category,
            $expr: {
              $and: [
                { $gte: ['$price', 0] },
                { $lte: ['$price', 1000] }
              ]
            }
          });
          updatedProducts.push(...prds)
        }

        if (checkedInputs.includes('price-2')) {
          let prds = await Product.find({
            category: category,
            $expr: {
              $and: [
                { $gte: ['$price', 1000] },
                { $lte: ['$price', 2000] }
              ]
            }
          });
          updatedProducts.push(...prds)
        }
        if (checkedInputs.includes('price-3')) {
          let prds = await Product.find({
            category: category,
            $expr: {
              $and: [
                { $gte: ['$price', 2000] },
                { $lte: ['$price', 3000] }
              ]
            }
          });
          updatedProducts.push(...prds)
        }
        if (checkedInputs.includes('price-4')) {
          let prds = await Product.find({
            category: category,
            $expr: {
              $and: [
                { $gte: ['$price', 3000] },
                { $lte: ['$price', 4000] }
              ]
            }
          });
          updatedProducts.push(...prds)
        }
        if (checkedInputs.includes('price-5')) {
          let prds = await Product.find({
            category: category,
            $expr: {
              $and: [
                { $gte: ['$price', 4000] },
                { $lte: ['$price', 100000] }
              ]
            }
          });
          updatedProducts.push(...prds)
        }
      }
      console.log('filterConditions:')
      try {
        console.log('updatedProducts:')
        console.log(updatedProducts)
        res.status(200).json(updatedProducts);
      } catch (error) {
        console.error(error);
        res.status(500).json({msg:'Error retrieving products'});
      }
}

module.exports = usrCtrl;

