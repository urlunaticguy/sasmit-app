require('dotenv').config();

// Check if the API key is loaded correctly
const { MongoClient, ServerApiVersion } = require('mongodb');
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

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    await client.db('your_database_name').collection('users').createIndex({ points: -1 });
    return client.db('your_database_name');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw new Error('Error connecting to database: ' + error.message);
  }
}

export function closeDatabase() {
  return client.close();
}

export async function addUser(email, password, name) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const existingUser = await collection.findOne({ email: email });

    if (existingUser) {
      throw new Error('Email already exists. Please choose a different email.');
    }

    const newUser = {
      email: email,
      password: password,
      name: name
    };

    const result = await collection.insertOne(newUser);
    console.log('User added successfully:', result.insertedId);
    return result;
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
    const user = await collection.findOne({ email, password });
    if (user) {
      console.log('User found:', user);
      return user;
    } else {
      console.log('User not found');
      return null;
    }
  } catch (error) {
    throw new Error('Error logging in: ' + error);
  } finally {
    closeDatabase();
  }
}

export default async function handler(req, res) {

  //cors function
  await new Promise((resolve, reject) => {
    cors(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  console.log(req.body)

  let { val, name, password, email, question, conversation, language, level, questions } = req.body;

  try {
    if (val === "signup") {
      const ress = await addUser(email, password, name);
      if (ress !== null) {
        if (ress.acknowledged === true) {
          res.status(200).json({userCreated: true});
        }
      } else {
        res.status(200).json({userCreated: false});
      }
    } else if (val === "login") {
      const ress = await loginUser(email, password);
      console.log(ress);
      if (ress === null) {
        res.status(403).json({ user : null, message : "Not Found or Unauthorised", loggedIn: false})
      }
      res.status(200).json({ user : ress, message : "Success in Login", loggedIn: true});
    } else if (val === "ho") {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: `this is the previous conversation if any ${conversation} and this is the current question ${question}. generate the reply in ${language}` }],
        model: "gpt-3.5-turbo"
      });
    
      console.log(completion.choices[0]);
      res.status(200).json(completion.choices[0]);
    } else if (val === "mo") {
      let questionLocal = '';
      if (level === 0) {
        questionLocal = 'Generate a set of five questions on Simple Harmonics Motion along with their correct answers.'
      }
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: `Ask one question on simple harmonic motion. Keep the question short and the answer should be one word or two words maximum. Provide the answer after the question in a format like Question : <your question> ? Answer : <your answer>. Try unique questions` }],
          model: "gpt-3.5-turbo"
        });
      
      // console.log(completion.choices[0]);
      res.status(200).json(completion.choices[0]);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to database', error });
  }
}

