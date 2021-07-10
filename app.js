require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-find-or-create');

//To Avoid Deprecation Warnings
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const app = express();
 
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'Hello There Mate',
    resave: false,
    saveUninitialized: true
  }))

//Managing Sessions with Passport
app.use(passport.initialize());  
app.use(passport.session());

//Connecting Database to Server
mongoose.connect('mongodb+srv://admin:sanskriti@indstock.pszxu.mongodb.net/kiranaDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});

//Schema for Users
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});

//Schema for Shops
const shopSchema = new mongoose.Schema({
    name: String,
    address: String,
    locality: String,
    contact: String,
    email: String,
    password: String,
    crn: String,
    inventory: {
        products: Array,
        stock: Array
    },
    search: Array,
    reviews: Array,
    visits: Array
})


const Shop = new mongoose.model("Shop",shopSchema);

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
shopSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

//Creating a Local Login Strategy
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
 

app.get("/",function(req,res){
    res.render("home")
})

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/register",function(req,res){
    res.render("register");
})

app.get("/login",function(req,res){
    if(req.isAuthenticated()){
        res.render("location");
    }
    else{
        res.redirect("/login");
    }
})

app.get("/location",function(req,res){

    if(req.isAuthenticated()){
        res.render("location");
    }
    else{
        res.redirect("/login");
    }
})

app.get("/dashboard/:area",function(req,res){
    var area = req.params.area;
    area = area.replace("-delhi","");
    var areaName = req.params.area;
    areaName = areaName.replace(/-/g, ' ').toLocaleUpperCase();
    if(req.isAuthenticated){
        Shop.find({locality: area},function(err,foundShops){
            if(!err){
                res.render("shops",{areaName:areaName, foundShops:foundShops});
            }
        })
    }
    else{
        res.redirect("/login");
    }

})

app.get("/shop",function(req,res){
    res.render("shop");
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/")
})

app.get("/shop-login",function(req,res){
    res.render("shop-login");
})

app.get("/shop-dashboard",function(req,res){
    res.send("Please Login as a Shop");
})

app.get("/shop/:shopId",function(req,res){
    if(req.isAuthenticated()){
        const shopId = req.params.shopId;
        Shop.findById(shopId,function(err,foundShop){
            if(!err){
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0'); 
                var yyyy = today.getFullYear();
                var visitDate = dd + "/" + mm + "/" + yyyy;
                Shop.updateOne({_id: foundShop.id},{$push: {visits: {date: visitDate }}},function(err,result){
                    if(!err){
                        console.log("Page Visited")
                    }
                    else{
                        console.log(err)
                    }
                })
                res.render("shop-page",{foundShop:foundShop})
            }
            else{
                console.log(err)
            }
        })
    }
    else{
        res.redirect("/login")
    }
    

})

app.post("/register",function(req,res){
    if(req.body.password === req.body.confirmPassword){
        User.register({username: req.body.username}, req.body.password, function(err, user){
            if(err){
                console.log(err)
                res.redirect("/register")
            }
            else{
                const state = "register"
                passport.authenticate("local")(req,res,function(){
                    res.render("location",{state:state})
                })
            }
        })
    }
    else{
        res.redirect("/register")
    }
    
    
});

app.post("/login", passport.authenticate("local"), function(req, res){
    const state = "login"
    res.render("location",{state: state});
});

app.post("/shop",function(req,res){
    const productsArray = req.body.product
    const lowerCaseArray = productsArray.map(product => product.toLocaleLowerCase())
    const shop = new Shop({
        name: req.body.shopName,
        email: req.body.shopEmail,
        contact : req.body.shopNumber,
        password: req.body.shopPassword,
        address: req.body.shopAddress,
        locality: req.body.locality,
        crn: req.body.shopCRN,
        inventory: {
            products: lowerCaseArray,
            stock: req.body.stock
        }
       
    
    });
    shop.save(function(err){
        if(err){
            console.log(err);
            res.redirect("/shop");
        }
        else{
            res.send("You have succesfully registered");
        }
    })
    
})

app.post("/shop-login",function(req,res){
    Shop.findOne({email: req.body.shopEmail},function(err,foundShop){
        if(!err){
            if(req.body.shopPassword === foundShop.password){
                res.render("shop-dashboard",{foundShop:foundShop})
            }
            else{
                res.redirect("/shop-login")
            }
        }
    })
})


app.post("/productsearch",function(req,res){
    const productNeeded = req.body.productSearch.toLocaleLowerCase();
    Shop.find({"inventory.products": productNeeded},function(err, foundShops){
        if(!err){
            if(foundShops.length > 0){
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0'); 
                var yyyy = today.getFullYear();
                var searchDate = dd + "/" + mm + "/" + yyyy;
                for (var i = 0; i < foundShops.length; i++){
                    Shop.updateOne({_id: foundShops[i].id},{$push: {search: {user: req.user, time: searchDate, product: productNeeded }}},function(err,result){
                        if(!err){
                            console.log("Search Added")
                            console.log(result);
                        }
                        else{
                            console.log(err);
                        }
                    })
                }
                
                res.render("shops",{foundShops:foundShops});
            }
            else{
                res.render("404");
            }
            
        }
        else{
            console.log(err);
            res.render("404")
        }
    })
})


app.post("/update-inventory",function(req,res){
    const products = req.body.product;
    const stock = req.body.stock;
    const id = req.body.id;
    Shop.findByIdAndUpdate(id,{"inventory.products": products,"inventory.stock": stock},function(err,result){
        if(err){
            console.log(err)
        }
        else{
            res.send("Updated your Inventory")
        }
    })
   
})

app.post("/shop/:shopId",function(req,res){
    console.log("Review Submitted")
    const newReview = req.body.review;
    const username = req.user.username;
    const shopId = req.params.shopId;
    Shop.findByIdAndUpdate(shopId,{$push: {reviews: {newReview,username}}},function(err,result){
        if(!err){

            res.redirect("/shop/" + shopId)
        }
        else{
            console.log(err)
        }
    })
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
 
app.listen(port, function() {
  console.log("Server started succesfully");
}); 