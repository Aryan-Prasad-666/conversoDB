import express from 'express';
import { NlpManager } from "node-nlp"; 
import cors from 'cors';

import mysql from "mysql2/promise";

const app = express();


import dotenv from 'dotenv';
dotenv.config();

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT

const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});
//add test part here

const initializeTables = async () => {
  const createTables = [
    `
    CREATE TABLE IF NOT EXISTS Bills (
        BillID INT AUTO_INCREMENT PRIMARY KEY,
        BillDate DATETIME,
        CustomerName VARCHAR(250),
        TotalAmount DECIMAL(10, 2),
        PaymentStatus VARCHAR(250)
    )
    `    
  ];

  try {
    for (const query of createTables) {
      await db.query(query);
    }
    console.log("Tables initialized successfully.");
  } catch (error) {
    console.error("Error initializing tables:", error);
  }
};

// Initialize tables before starting the server
await initializeTables();



const manager = new NlpManager({ languages: ["en"] });

// Train the NLP model with intents and responses
const trainNLPModel = async () => {

  //greetings
  manager.addDocument('en', 'Hello', 'greeting');
  manager.addDocument('en', 'Hey', 'greeting');
  manager.addDocument('en', 'Hi', 'greeting');
  manager.addDocument('en', 'sup', 'greeting');
  manager.addDocument('en', 'yo', 'greeting');
  manager.addAnswer('en', 'greeting', 'I\'m here to assist you. How can I help?');
  manager.addAnswer('en', 'greeting', 'Hello! Ready to assist your business needs.');
  manager.addAnswer('en', 'greeting', 'Hello! How can I help you today?');
  manager.addAnswer('en', 'greeting', 'Hi there! What can I do for you?');

  // adding new bills 
  manager.addDocument("en", "add a new bill", "add.bill");
  manager.addDocument("en", "save a new bill", "add.bill");
  manager.addDocument("en", "create a new bill", "add.bill");
manager.addAnswer("en", "add.bill", "Please provide the bill details in the format: [CustomerID], [TotalAmount], [PaymentStatus]");

  // display bills 
  manager.addDocument("en", "display bills", "get.bills");
  manager.addDocument("en", "show me bills", "get.bills");
  manager.addAnswer("en", "get.bills", "Fetching your latest bills...");
  

  await manager.train();
  manager.save();
};

await trainNLPModel();

// Chat endpoint
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const response = await manager.process("en", userMessage);

  let botMessage = response.answer;

  try {
    if (response.intent === "get.bills") {
      const [rows] = await db.query("SELECT BillID, CustomerName, TotalAmount, BillDate FROM Bills LIMIT 10");
      botMessage = formatBillsTable(rows);
    } else if (response.intent === "greeting") {
      botMessage = response.answer || "Hello! How can I assist you today?";
    } else if (response.intent === "add.bill") {
      botMessage = await addBill(userMessage);
    } else {
      botMessage = "Sorry, I didn't understand that. Can you please clarify your request?";
    }
  } catch (error) {
    console.error("Error interacting with database:", error);
    botMessage = "Sorry, I encountered an error while interacting with the database.";
  }

  res.json({ message: botMessage });
});

//sql funtcions are :

// to add new bills
const addBill = async (userMessage) => {
  try {
    let sanitizedMessage = userMessage.replace(/\s*comma\s*/gi, ',');

    sanitizedMessage = sanitizedMessage.replace(/[.!?]/g, '');

    const match = sanitizedMessage.match(/for\s+([\w\s]+?)[,\s]+([\d,]+)[,\s]+(.+)/i);

    if (!match) {
      return "Please provide the details in the format: Add a bill for [CustomerName], [TotalAmount], [PaymentStatus]";
    }

    const [_, customerName, totalAmountRaw, paymentStatus] = match;

    const totalAmount = parseFloat(totalAmountRaw.replace(/,/g, ''));

    if (isNaN(totalAmount)) {
      return "TotalAmount must be numeric.";
    }

    const billDate = new Date();

    const [result] = await db.query(
      `INSERT INTO Bills (BillDate, CustomerName, TotalAmount, PaymentStatus) VALUES (?, ?, ?, ?)`,
      [billDate, customerName.trim(), totalAmount, paymentStatus.trim()]
    );

    if (result.affectedRows > 0) {
      return `New bill added successfully! Bill ID: ${result.insertId}`;
    } else {
      return "Failed to add the bill. Please try again.";
    }
  } catch (error) {
    console.error("Error adding bill:", error);
    return "An error occurred while adding the bill. Please try again.";
  }
};

const formatBillsTable = (bills) => {
  if (bills.length === 0) {
    return "No bills found.";
  }

  let table = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Bill ID</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Customer Name</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Amount</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  bills.forEach((bill) => {
    table += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${bill.BillID}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${bill.CustomerName}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${bill.TotalAmount}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(bill.BillDate).toLocaleString()}</td>
      </tr>
    `;
  });

  table += `</tbody></table>`;
  return `Here are your latest bills:<br>${table}`;
};








// test ends here
app.listen(PORT, ()=>{
    console.log("app is listening");
});