const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

dotenv.config();

// herCareerHub
// 4fQey3v6TJW1AnXo

// middleware

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// middleware for JWT
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("verify token", token);
  console.log("cookies and token", token);
  if (!token) {
    return res.status(401).send({ message: "unaccessed authorization" });
  }
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unaccessed authorization" });
      }
      console.log("decoded", decoded);
      req.user = decoded;
      next();
    });
  }
};

// mongodb connection

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASS}@cluster0.n6xqxfj.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("herCareerHubDB").collection("userDB");
    const bookingCollection = client
      .db("herCareerHubDB")
      .collection("bookingDB");
    const blogCollection = client.db("herCareerHubDB").collection("blogDB");
    const feedbackCollection = client
      .db("herCareerHubDB")
      .collection("feedbackDB");

    const groupCollection = client.db("herCareerHubDB").collection("groupDB");
    // JWT related----

    // jwt token client side e pathano and show kora
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // cookie theke token remove with log out
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    //POST USER SIGN UP
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // GET ALL MENTORS from users
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // GET SINGLE MENTOR information from users
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // get user info using email
    app.get("/user/:email", async (req, res) => {
      const emailUser = req.params.email;
      // const tokenMail = req?.user?.email;
      // console.log(tokenMail, emailUser, "token and user");

      const query = {
        email: emailUser,
      };
      // console.log("query", query);
      const result = await userCollection.findOne(query);
      // console.log("user profile", result);
      res.send(result);
    });
    // admin verifies user
    app.patch("/verifyUser/:id", async (req, res) => {
      const id = req.params.id;
      const verification = req.body;
      console.log(id, verification, "verify");
      const query = { _id: new ObjectId(id) };
      const verifiedUser = {
        $set: verification,
      };
      const result = await userCollection.updateOne(query, verifiedUser);
      res.send(result);
    });
    // create group
    app.get("/groups", async (req, res) => {
      const result = await groupCollection.find().toArray();
      res.send(result);
    });
    app.get("/groups/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email, "email in specific");
      const query = { creator: email };
      const result = await groupCollection.find(query).toArray();
      res.send(result);
    });
    // group creation
    app.post("/groups", async (req, res) => {
      const groupData = req.body;
      const query = { email: groupData.creator };
      const user = await userCollection.findOne(query);

      if (
        !user ||
        user?.verification !== "verified" ||
        user?.role !== "mentor"
      ) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      console.log("fhhhh");
      //create group
      const result = await groupCollection.insertOne(groupData);
      res.send(result);
    });

    app.post("/groups/:id", async (req, res) => {
      const id = req.params.id;
      const topicData = req.body;
      const query = { _id: new ObjectId(id) };
      const response = await groupCollection.findOneAndUpdate(query, {
        $push: { topics: topicData },
      });
      console.log(response, "response");
      res.send(response);
    });

    //  update mentor profile using post
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const userToBeUpdated = req.body;

      const filter = { _id: new ObjectId(id) };

      const options = { upsert: true };

      const updatedUser = {
        $set: {
          ...userToBeUpdated,
          // name: userToBeUpdated.name,
          // email: userToBeUpdated.email,
          // photoURL: userToBeUpdated.photoURL,
          // phone: userToBeUpdated.phone,
          // graduation: userToBeUpdated.graduation,
          // subject: userToBeUpdated.subject,
          // work: userToBeUpdated.work,
          // mentoringSubject: userToBeUpdated.mentoringSubject,
          // fees: userToBeUpdated.fees,
          // courseDetails: userToBeUpdated.courseDetails,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedUser,
        options
      );

      res.send(result);
    });

    // update learner profile using post
    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const userToBeUpdated = req.body;

      const filter = { _id: new ObjectId(id) };

      const options = { upsert: true };

      const updatedUser = {
        $set: {
          ...userToBeUpdated,
          // name: userToBeUpdated.name,
          // email: userToBeUpdated.email,
          // photoURL: userToBeUpdated.photoURL,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedUser,
        options
      );

      res.send(result);
    });

    // send a mentor a request using post
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log("booking info", booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    // get sent requests according to learners email
    app.get("/bookings", verifyToken, async (req, res) => {
      let query = {};

      if (req.query?.learnerEmail) {
        query = {
          learnerEmail: req.query?.learnerEmail,
        };
      }

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get learner request according to mentor
    app.get("/bookingrequest", verifyToken, async (req, res) => {
      let query = {};

      if (req?.query?.mentorEmail)
        query = {
          mentorEmail: req.query?.mentorEmail,
        };

      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // learner post a feedback
    app.post("/feedback", async (req, res) => {
      const feedback = req.body;
      console.log("feedback", feedback);
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });
    // get all feedback
    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    });
    //mentor accept or reject learners request using patch
    app.patch("/updateRequest/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: status,
      };
      console.log(updateStatus, "update status");
      const result = await bookingCollection.updateOne(query, updateStatus);
      console.log("result of reques accept or reject", result);
      res.send(result);
    });

    // delete a request
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    // get blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();

      res.send(result);
    });
    // get single blog
    app.get("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(id, query, "blog id");
      const result = await blogCollection.findOne(query);

      res.send(result);
    });

    // post a blog
    app.post("/blogs", async (req, res) => {
      const blog = req.body;
      console.log("blog details", blog);
      const result = await blogCollection.insertOne(blog);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// port finding and local host running
app.get("/", (req, res) => {
  res.send("HerCareerHub server side");
});

app.listen(port, () => {
  console.log(`HerCareerHub running on port ${port}`);
});
