const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
      'http://localhost:5173',
     
    ],
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  
//   const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nzdhwhu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nzdhwhu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;






  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
  
      
    //   const bookCollection = client.db('bookSphereDB').collection('books');
    const volunteersCollection = client.db('Assignment11').collection('VolunteersPost');
    const requestCollection = client.db('Assignment11').collection('VolunteersRequest');
  
      // for new a new post Need Volunteer
      app.post('/addVolunteers', async (req, res) => {
        const item = req.body;
        console.log(item);
        const result = await volunteersCollection.insertOne(item);
        res.send(result);
      });
    //  for vlunteer req
      app.post('/volunteer-request', async (req, res) => {
        const item = req.body;
        console.log(item);
        const result = await volunteersCollection.insertOne(item);
        res.send(result);
      });


   // for details page showing each card
      app.get('/detailsPage/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await volunteersCollection.findOne(query);
      res.send(result);
    });
    
    
    // for finding all posts
     app.get('/posts', async (req, res) => {
        const cursor = volunteersCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      });
  
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    }
  }
  run().catch(console.dir);
  
  
  // Create a MongoClient with a MongoClientOptions object to set the



app.get('/',  (req, res) => {
  res.send('Server is running...')
});

app.listen(port, ()=>{
  console.log(`Server is running port: ${port}
  Link: http://localhost:${port}`);
});