require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

mongoose.connect('mongodb+srv://admin:sanskriti@indstock.pszxu.mongodb.net/kiranaDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});

const shopSchema = new mongoose.Schema({
    name: String,
    address: String,
    locality: String,
    inventory: {
        products: Array,
        stock: Array
    }
})

const Shop = new mongoose.model("Shop",shopSchema);

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

//Creating a Local Login Strategy
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });
 
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dashboard",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
    res.render("home")
})

app.get("/auth/google", passport.authenticate('google', {
    scope: ['profile']
}));

app.get('/auth/google/dashboard', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to dashboard.
    res.redirect('/location');
});

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


app.post("/register",function(req,res){
    
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register")
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/location")
            })
        }
    })
    
});

app.post("/login", passport.authenticate("local"), function(req, res){
    res.redirect("/location");
});

app.post("/shop",function(req,res){
    const shop = new Shop({
        name: req.body.shopName,
        address: req.body.shopAddress,
        locality: req.body.locality,
        inventory: {
            products: req.body.products.toLocaleLowerCase().split(" "),
            stock: req.body.stock.split(" ")
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

app.post("/productsearch",function(req,res){
    const productNeeded = req.body.productSearch.toLocaleLowerCase();
    Shop.find({"inventory.products": productNeeded},function(err, foundShops){
        if(!err){
            console.log(foundShops);
            if(foundShops.length > 0){
                res.render("shops",{foundShops:foundShops});
            }
            else{
                res.render("404");
            }
            
        }
        else{
            
            res.render("404");
        }
    })
})



app.listen(3000 || process.env.PORT, function() {
    console.log("Server started");
    });