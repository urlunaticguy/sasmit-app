require('dotenv').config();

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
      name: name,
      points: 0,
      pointsToGo: 300,
      level: 1,
      weaknessQuestions: [],
      chatHistories: [],
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

export async function updateUserPointsByEmail(email, pointsToAdd) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const levelToUpdateTo = Math.floor(pointsToAdd / 300);
    const remainingPointsForNextLevel = pointsToAdd - (levelToUpdateTo * 300);
    const updatedUser = await collection.findOneAndUpdate(
      { email: email },
      { $set: { points: pointsToAdd, pointsToGo: 300 - remainingPointsForNextLevel, level: levelToUpdateTo + 1 } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      throw new Error('User not found with the given email.');
    }

    console.log('User points updated successfully:', updatedUser);
    return updatedUser;
  } catch (error) {
    throw new Error('Error updating user points: ' + error);
  } finally {
    closeDatabase();
  }
}

export async function updateUserLevelByEmail(email, levelToChange) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const updatedUser = await collection.findOneAndUpdate(
      { email: email },
      { $set: { level: levelToChange } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      throw new Error('User not found with the given email.');
    }

    console.log('User Level updated successfully:', updatedUser);
    return updatedUser;
  } catch (error) {
    throw new Error('Error updating user Level: ' + error);
  } finally {
    closeDatabase();
  }
}

export async function getTopUsers() {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    const topUsers = await collection.find().sort({ points: -1 }).limit(10).toArray();

    const formattedTopUsers = topUsers.map(user => ({
      name: user.name, // Replace with the actual field name for user's name
      points: user.points,
      level: user.level
    }));

    console.log('Top 10 users:', formattedTopUsers);
    return formattedTopUsers;
  } catch (error) {
    throw new Error('Error fetching top users: ' + error);
  } finally {
    closeDatabase();
  }
}

export async function addWeaknessQuestionByEmail(email, newQuestion) {
  const db = await connectToDatabase();
  const collection = db.collection('users');

  try {
    if (newQuestion === "") {
      const user = await collection.findOne({
        email: email
      })
      return user;
    }
    const updatedUser = await collection.findOneAndUpdate(
      { email: email },
      { $push: { weaknessQuestions: {side: 0, text: newQuestion} } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      throw new Error('User not found with the given email.');
    }

    console.log('User updated with new weakness question:', updatedUser);
    return updatedUser;
  } catch (error) {
    throw new Error('Error updating user with new weakness question: ' + error);
  } finally {
    closeDatabase();
  }
}

export async function addChatMessageByEmail(email, chatTitle, newMessage) {
  const db = await connectToDatabase();
  const collection = db.collection('users');


  try {
    const existingUser = await collection.findOne({ email: email });

    if (!existingUser) {
      throw new Error('User not found with the given email.');
    }

    console.log("SD")

    const existingChat = existingUser.chatHistories.find(chat => chat.title === chatTitle);
    console.log("MD")
    if (existingChat) {
      console.log("HELLoooo")

      // If chat history with the same title exists, append new message
      const updatedUser = await collection.findOneAndUpdate(
        { email: email, 'chatHistories.title': chatTitle },
        { $push: { 'chatHistories.$.messages': newMessage } },
        { returnDocument: 'after' }
      );

      console.log('New message added to existing chat:', updatedUser);
      return updatedUser;
    } else {

      console.log("SDJNDSJND")
      // If chat history with the title doesn't exist, create a new one
      const updatedUser = await collection.findOneAndUpdate(
        { email: email },
        { $push: { chatHistories: { title: chatTitle, messages: [newMessage] } } },
        { returnDocument: 'after' }
      );

      console.log('New chat history created with message:', updatedUser);
      return updatedUser;
    }
  } catch (error) {
    throw new Error('Error adding chat message: ' + error);
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

  let { val, name, password, email, question, conversation, language, level, pointsUpdate, levelUpdate, weaknessQuestion, chatTitle, newMessage } = req.body;

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
      if (ress === null) {
        res.status(403).json({ user : null, message : "Not Found or Unauthorised", loggedIn: false})
      }
      res.status(200).json({ user : ress, message : "Success in Login", loggedIn: true});
    } else if (val === "askChatGPT") {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: `this is the previous conversation if any ${conversation} and this is the current question ${question}. generate the reply in ${language}` }],
        model: "gpt-3.5-turbo"
      });
    
      console.log(completion.choices[0]);
      res.status(200).json(completion.choices[0]);
    } else if (val === "missionExam") {
      let questionLocal = '';
      if (level === 0) {
        questionLocal = 'Generate a set of five questions on Simple Harmonics Motion along with their correct answers.'
      }
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: `Ask one question on simple harmonic motion. Keep the question short and the answer should be one word or two words maximum. Provide the answer after the question in a format like Question : <your question> ? Answer : <your answer>. Try unique questions` }],
          model: "gpt-3.5-turbo"
        });
      res.status(200).json(completion.choices[0]);
    } else if (val === "updatePoints") {
      const response = await updateUserPointsByEmail(email, pointsUpdate);
      res.status(200).json(response);
    } else if (val === "updateLevel") {
      const response = await updateUserLevelByEmail(email, levelUpdate);
      res.status(200).json(response);
    } else if (val === "getLeaderboard") {
      const response = await getTopUsers();
      res.status(200).json(response);
    } else if (val === "updateWeaknessQuestion") {
      const response = await addWeaknessQuestionByEmail(email, weaknessQuestion);
      res.status(200).json(response);
    } else if (val === "updateChatHistory") {
      console.log("HELLO")
      const response = await addChatMessageByEmail(email, chatTitle, newMessage);
      res.status(200).json(response);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to database', error });
  }
}

