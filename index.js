const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//   "mongodb+srv://<username>:<password>@cluster0.w8gsdns.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w8gsdns.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
    // Send a ping to confirm a successful connection

    const database = client.db("cafeRioDb");
    const menuCollection = database.collection("menu");
    const reviewsCollection = client.db("cafeRioDb").collection("reviews");
    const cartsCollection = database.collection("carts");
    const usersCollection = database.collection("users");

    //create jwt

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares
    const verifyJWT = (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorized access" });
      }

      // bearer token
      const token = authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .send({ error: true, message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verify token
    const verifyAdmin = async (req,res,next)=>{
        const email= req.decoded.email;
        const query={email: email}
        const user= await usersCollection.findOne(query)
        const isAdmin= user?.role === 'admin';
        if(!isAdmin){
          return res.status(403).send({ error: true, message: "forbidden access" });
        }
        next();
    }



    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // users api create
    app.post("/users", async (req, res) => {
      const user = req.body;
      //insert email if user doesn't exist
      //
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      //  console.log( 'existing user',  existingUser)
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // make user as a admin

    app.patch("/users/admin/:id", verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // delete users
    app.delete("/users/:id", verifyJWT,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // get cart item from database
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // cart collection

    app.post("/carts", async (req, res) => {
      const item = req.body;
      //  console.log(item);
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    });

    // cart item delete

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("restuarnt server is running");
});

app.listen(port, () => {
  console.log(`server running on : ${port}`);
});
