const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;



// Middleware for logging
const logger = (req, res, next) => {
  console.log('called', req.hostname, req.originalUrl);
  next();
};



// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'unauthorized access' });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: 'unauthorized access' });
      }
      console.log(decoded);

      req.user = decoded;
      next();
    });
  }
};

app.use(cors({
    origin: [
      'http://localhost:5173', 
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use(logger);

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
    await client.connect();
    
    const volunteersCollection = client.db('Assignment11').collection('VolunteersPost');
    const requestCollection = client.db('Assignment11').collection('VolunteersRequest');
    
    
  // jwt generate
app.post('/jwt', async (req, res) => {
  const email = req.body;
  const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d',
  });
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ success: true });
});
 
// Clear token on logout
app.get('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 0,
    })
    .send({ success: true });
});

    // for new a new post Need Volunteer
    app.post('/addVolunteers', async (req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await volunteersCollection.insertOne(item);
      res.send(result);
    });

    // for volunteer request
    app.post('/volunteer-request',verifyToken, async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await requestCollection.insertOne(item);
      res.send(result);
    });

    // for details page showing each card
    app.get('/detailsPage/:id',verifyToken, async (req, res) => {
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

    // get data for organizer personal gmail
    app.get('/my-posts',verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { 'organizer.email': email };
      console.log(query);
      const result = await volunteersCollection.find(query).toArray();
      res.send(result);
    });

    // My request (r=organizer) from volunteer
    app.get('/myRequest/:email', verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { organizer_email: email };
      console.log(query);
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });
    

    // status handle part for organizer
    app.patch('/myRequestApprove/:id', async (req, res) => {
      const id = req.params.id;
      const updateDoc = { $set: { status: 'Approved' } };
      const query = { _id: new ObjectId(id) };
    
      try {
        const requestResult = await requestCollection.updateOne(query, updateDoc);
        
        if (requestResult.modifiedCount === 1) {
          const request = await requestCollection.findOne(query);
          console.log( 'request', request)
          if (request) {
            const postId = request.postId;  // Assuming your request document has a field named post_id
            const postQuery = { _id: new ObjectId(postId) };
            console.log('postquery', postQuery);
            const postUpdateDoc = { $inc: { volunteersNeeded: -1 } };
            console.log('postUpdateDoc', postUpdateDoc)
    
            const postResult = await volunteersCollection.updateOne(postQuery, postUpdateDoc);
            console.log("post result", postResult)
            if (postResult.modifiedCount === 1) {
              res.send({ message: 'Volunteer request approved and volunteerNeeded count updated successfully.' });
            } else {
              res.status(500).send({ message: 'Volunteer request approved but failed to update volunteerNeeded count.' });
            }
          } 
        } 
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error while approving volunteer request.' });
      }
    });
    




// for status reject
    app.patch('/myRequest/:id/reject', async (req, res) => {
      const id = req.params.id;
      const updateDoc = { $set: { status: 'Rejected' } };
      const query = { _id: new ObjectId(id) };

      const result = await requestCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get('/update/:id', async (req, res) => {
      const id = req.params.id;
      const post = await volunteersCollection.findOne({ _id: new ObjectId(id) });
      if (post) {
        res.json(post);
      } else {
        res.status(404).send('Post not found');
      }
    });

    // My post update 
    app.put('/update/:id', async (req, res) => {
      const id = req.params.id;
      const updateCard = req.body;
      
      const updateDoc = {
        $set: {
          postTitle: updateCard.postTitle,
          description: updateCard.description,
          location: updateCard.location,
          volunteersNeeded: updateCard.volunteersNeeded,
          deadline: updateCard.deadline,
          category: updateCard.category,
          thumbnail: updateCard.thumbnail
        }
      };
    
      const query = { _id: new ObjectId(id) };
      
      const result = await volunteersCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    
    app.delete('/posts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
    
      const result = await volunteersCollection.deleteOne(query);
      res.status(200).send(result);
    });

    // for Volunteer
    app.get('/volunteer-requests/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      const query = {  email };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running...')
});

app.listen(port, () => {
  console.log(`Server is running port: ${port}\nLink: http://localhost:${port}`);
});
