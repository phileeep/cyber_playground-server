// pulls in the express library
const express = require("express");
const morgan = require("morgan");
const passport = require("passport");
const passportLocal = require("passport-local").Strategy;
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/user");
const Photo = require("./models/photo");
const { restart } = require("nodemon");
// const { noExtendLeft } = require('sequelize/types/lib/operators');
const cloudinary = require("./utils/cloudinary");

mongoose.connect(
  "mongodb+srv://admin:adminpassword@cluster0.xu6qx.mongodb.net/cyberPlayground?retryWrites=true&w=majority",
  {
    userNewParser: true,
    useUnifiedTopology: true,
  },
  () => {
    console.log("Mongoose is Connected");
  }
);

// allows us to write app and the crud action we want ex. app.get | app.post | app.delete etc...
const app = express();

// boiler plate on all the images to stop giant images.

// middleware

app.use(express.json()); // =>  allows us to read the request or req body
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("tiny"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
  })
);

require("./utils/passportConfig")(passport);
app.use(cookieParser("secretcode"));
app.use(passport.initialize());
app.use(passport.session());

//------------------------END OF MIDDLEWARE----------------------------

// define what localhost port we want our server to run on
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
//-----------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send(`Server is connected on port ${PORT}`);
});

// create a user
app.post("/signup", (req, res) => {
  User.findOne({ username: req.body.username }, async (err, doc) => {
    if (err) throw err;
    if (doc) res.send("User Already Exists");
    if (!doc) {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        publicId: req.body.publicId,
        job: req.body.job,
      });
      await newUser.save();
      res.send("User Created");
    }
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw err;
    if (!user) res.send("No User Exists");
    else {
      req.logIn(user, (err) => {
        if (err) throw err;
        res.send("Successfully Authenticated");
        console.log(req.user);
      });
    }
  })(req, res, next);
});

app.get("/user", (req, res) => {
  res.send(req.user);
  // The req.user stores the entire user that has been authenticated inside of it.
});

app.get("/userl", function (req, res) {
  User.find({}, function (err, users) {
    const userMap = {};
    users.forEach(function (user) {
      userMap[user] = user;
    });
    res.send(userMap);
  });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.send("success");
});

// get only one user
app.get("/users/:id", async (req, res) => {
  console.log(req.params);
  const { id } = req.params;
  try {
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    // $1 is a placeholder, then the 2nd argument is what that variable is
    //going to be
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
  }
});

app.get("/images", async (req, res) => {
  const { resources } = await cloudinary.search
    .expression("folder: cyber_photos")
    .sort_by("public_id", "desc")
    .max_results(30)
    .execute();
  const publicIds = resources.map((file) => file.public_id);
  // gets a array response of all the public ids we can use to put on the page
  res.send(publicIds);
});

app.post("/upload", async (req, res) => {
  res.send(req.user);
  try {
    const newPhoto = new Photo({
      publicId: req.body.imageUrl,
      hashtag: req.body.hashtag,
      caption: req.body.caption,
      location: req.body.location,
      description: req.body.description,
      coordinates: req.body.coordinates,
      author: req.user.username,
    });
    console.log(req.user.images);
    req.user.images << newPhoto;
    await newPhoto.save();
    res.json(newPhoto.imageUrl);
  } catch (err) {
    console.error("Something went wrong", err);
  }
});

app.get("/photos", function (req, res) {
  Photo.find({}, function (err, photos) {
    const photoMap = [];
    photos.forEach(function (photo) {
      photoMap.push(photo);
    });
    res.send(photoMap);
  });
});

app.get("/getLatest", async (req, res) => {
  const getPhoto = await Photo.findOne().sort({ _id: -1 });
  res.json(getPhoto.imageUrl);
});

app.get("/user/username/:username", (req, res) => {
  User.findOne({ username: req.params.username })
    .then((user) => {
      if (!user) {
        res.status(404).send();
      }
      res.send(user);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});
