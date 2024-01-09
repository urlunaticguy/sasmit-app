require('dotenv').config();

// Check if the API key is loaded correctly
const { MongoClient, ServerApiVersion } = require('mongodb');
const translate = require('google-translate-api');
import OpenAI from "openai";
import Cors from 'cors';

const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE']});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: 'org-xsDgtmsKXXeuuBAmtTaXLpBd',
});

const uri = "mongodb+srv://souvik:souvik@edujourney.nelhmvw.mongodb.net/?retryWrites=true&w=majority";

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
    await client.db("admin").command({ ping: 1 });
    return { message: 'Successfully connected to MongoDB' };
  } finally {
    await client.close();
  }
}

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db('your_database_name');
  } catch (error) {
    throw new Error('Error connecting to database: ' + error);
  }
}

export function closeDatabase() {
  return client.close();
}

export async function addUser(email, password, name) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const newUser = {
      email: email,
      password: password, // Note: In production, ensure to hash the password for security
      name: name
    };

    const result = await collection.insertOne(newUser);
    console.log('User added successfully:', result.insertedId);
    return result.insertedId; // Return the ID of the inserted user
  } catch (error) {
    throw new Error('Error adding user: ' + error);
  } finally {
    closeDatabase();
  }
}

export async function loginUser (email, password) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const user = await collection.find({});
    if (!user) {
      return null; // Return null if user not found or credentials are invalid
    }

    // const { name, email: userEmail, password: userPassword } = user;
    // return { name, email: userEmail, password: userPassword };
    return user;
  } catch (error) {
    throw new Error('Error logging in: ' + error);
  } finally {
    // closeDatabase();
  }
}

export default async function handler(req, res) {

  await new Promise((resolve, reject) => {
    cors(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
  console.log(req.body)
  let { val, name, password, email, question, conversation, language } = req.body;

  try {
    // const result = await run();
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    // return { message: 'Successfully connected to MongoDB' };
    if (val === "hey") {
      const res = addUser(email, password, name);
      res.status(200).json(res);
    } else if (val === "ho") {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: `this is the previous conversation if any ${conversation} and this is the current question ${question}. generate the reply in ${language}` }],
        model: "gpt-3.5-turbo"
      });
    
      console.log(completion.choices[0]);
      res.status(200).json(completion.choices[0]);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to database', error });
  } finally {
    await client.close();
  }
}

