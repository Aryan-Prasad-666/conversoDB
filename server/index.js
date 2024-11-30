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
    CREATE TABLE IF NOT EXISTS Customers (
        CustomerID INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(250),
        Phone VARCHAR(20)
    )
    `  ,
   `
    CREATE TABLE IF NOT EXISTS Bills (
        BillID INT AUTO_INCREMENT PRIMARY KEY,
        BillDate DATETIME,
        CustomerID INT,
        TotalAmount DECIMAL(10, 2),
        PaymentStatus VARCHAR(250),
        FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
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

await initializeTables();



const manager = new NlpManager({ languages: ["en"] });

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
  manager.addDocument("en", "add a new bill for [Customer Name], [TotalAmount], [PaymentStatus]");
  manager.addDocument("en", "save a new bill for", "add.bill");
  manager.addDocument("en", "create a new bill for", "add.bill");
manager.addAnswer("en", "add.bill", "Please provide the bill details in the format: [CustomerName], [TotalAmount], [PaymentStatus]");

  // display bills 
  manager.addDocument("en", "display bills", "get.bills");
  manager.addDocument("en", "show me bills", "get.bills");
  manager.addDocument("en", "display latest bills", "get.bills");
  manager.addAnswer("en", "get.bills", "Fetching your latest bills...");

  //to get customer details
  manager.addDocument("en", "get customer details of [name]", "get.customer");
manager.addDocument("en", "show me customer details of [name]", "get.customer");
manager.addAnswer("en", "get.customer", "Fetching customer details...");

// to add  new customer
manager.addDocument("en", "add a new customer", "add.customer");
manager.addDocument("en", "create a new customer", "add.customer");
manager.addDocument("en", "save customer details", "add.customer");
manager.addAnswer("en", "add.customer", "Please provide the customer details in the format: [CustomerName], [Phone]");

// to update phone
manager.addDocument("en", "update phone for [CustomerName], [NewPhone]", "update.customer.phone");
manager.addDocument("en", "change phone for [CustomerName], [NewPhone]", "update.customer.phone");
manager.addDocument("en", "modify contact info for [CustomerName], [NewPhone]", "update.customer.phone");
manager.addAnswer("en", "update.customer.phone", "Updating the phone number...");

//to view bills of a particular date
manager.addDocument("en", "show me the bills for [Date]", "get.bills.by.date");
manager.addDocument("en", "display the bills of [Date]", "get.bills.by.date");
manager.addDocument("en", "fetch the bills for [Date]", "get.bills.by.date");
manager.addDocument("en", "get bills dated [Date]", "get.bills.by.date");
manager.addDocument("en", "bills from [Date]", "get.bills.by.date");
manager.addAnswer("en", "get.bills.by.date", "Fetching bills for the specified date...");




  

  await manager.train();
  manager.save();
};

await trainNLPModel();

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const response = await manager.process("en", userMessage);

  let botMessage = response.answer;

  try {
    if (response.intent === "get.bills") {
      const dateMatch = userMessage.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
      if (dateMatch) {
        response.intent = "get.bills.by.date"; 
      }
    }

    if (response.intent === "get.bills") {
      const [rows] = await db.query(`
        SELECT 
          Bills.BillID,
          Customers.Name AS CustomerName,
          Bills.TotalAmount,
          Bills.BillDate
        FROM 
          Bills
        JOIN 
          Customers
        ON 
          Bills.CustomerID = Customers.CustomerID
        LIMIT 10
      `);
      botMessage = formatBillsTable(rows);
    } else if (response.intent === "get.customer") {
      botMessage = await getCustomerDetails(userMessage);
    } else if (response.intent === "update.customer.phone") { 
      botMessage = await updateCustomerPhone(userMessage);
    } else if (response.intent === "greeting") {
      botMessage = response.answer || "Hello! How can I assist you today?";
    } else if (response.intent === "add.bill") {
      botMessage = await addBill(userMessage);
    } else if (response.intent === "get.bills.by.date") {
      botMessage = await getBillsByDate(userMessage);
    } else if (response.intent === "add.customer") {
      botMessage = await addCustomer(userMessage);
    } else {
      botMessage = "Sorry, I didn't understand that. Can you please clarify your request?";
    }
  } catch (error) {
    console.error("Error interacting with database:", error);
    botMessage = "Sorry, I encountered an error while interacting with the database.";
  }

  res.json({ message: botMessage });
});


// this fucntion is to add new bills
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

    const [existingCustomer] = await db.query(
      "SELECT * FROM Customers WHERE Name = ? LIMIT 1", 
      [customerName.trim()]
    );

    let customerID;
    if (existingCustomer.length > 0) {
      customerID = existingCustomer[0].CustomerID;
    } else {
      const [result] = await db.query(
        `INSERT INTO Customers (Name) VALUES (?)`,
        [customerName.trim()]
      );
      customerID = result.insertId;
    }

    const [billResult] = await db.query(
      `INSERT INTO Bills (BillDate, CustomerID, TotalAmount, PaymentStatus) VALUES (?, ?, ?, ?)`,
      [billDate, customerID, totalAmount, paymentStatus.trim()]
    );

    if (billResult.affectedRows > 0) {
      return `New bill added successfully! Bill ID: ${billResult.insertId}`;
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
          <th>Bill ID</th>
          <th>Customer Name</th>
          <th>Amount</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  bills.forEach((bill) => {
    table += `
      <tr>
        <td>${bill.BillID}</td>
        <td>${bill.CustomerName}</td>
        <td>${bill.TotalAmount}</td>
        <td>${new Date(bill.BillDate).toLocaleString()}</td>
      </tr>
    `;
  });

  table += `</tbody></table>`;
  return `Here are your latest bills:<br>${table}`;
};

// this function is to add new customers
const addCustomer = async (userMessage) => {
  try {
    let sanitizedMessage = userMessage.replace(/\s*comma\s*/gi, ',');  
    sanitizedMessage = sanitizedMessage.replace(/[.!?-]/g, '');  

    const match = sanitizedMessage.match(/customer\s+([A-Za-z\s]+)(?:,\s*|\s+)(\d{10,15})/i);

    if (!match) {
      return "Please provide the customer details in the format: Add a customer [CustomerName], [Phone].";
    }

    const [_, customerName, phone] = match;

    const [existingCustomer] = await db.query(
      "SELECT CustomerID FROM Customers WHERE Name = ? LIMIT 1",
      [customerName.trim()]
    );

    if (existingCustomer.length > 0) {
      return `Customer already exists with Customer ID: ${existingCustomer[0].CustomerID}`;
    }

    const [result] = await db.query(
      `INSERT INTO Customers (Name, Phone) VALUES (?, ?)`,
      [customerName.trim(), phone.trim()]
    );

    if (result.affectedRows > 0) {
      return `New customer added successfully! Customer Name: ${customerName}`;
    } else {
      return "Failed to add the customer. Please try again.";
    }
  } catch (error) {
    console.error("Error adding customer:", error);
    return "An error occurred while adding the customer. Please try again.";
  }
};

// this function is to display customer's details
const getCustomerDetails = async (userMessage) => {
  try {
    const match = userMessage.match(/of\s+([A-Za-z\s]+)/i);
    if (!match) {
      return "Please specify a valid customer name.";
    }

    const customerName = match[1].trim();

    const [customerDetails] = await db.query(
      "SELECT * FROM Customers WHERE LOWER(Name) = LOWER(?) LIMIT 1",
      [customerName]
    );

    if (customerDetails.length > 0) {
      const phone = customerDetails[0].Phone || "not provided"; 
      
      let table = `
        <table>
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${customerDetails[0].CustomerID}</td>
              <td>${customerDetails[0].Name}</td>
              <td>${phone}</td>
            </tr>
          </tbody>
        </table>
      `;
      return `Here are the customer details:<br>${table}`;
    } else {
      return "Customer not found.";
    }
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return "An error occurred while fetching customer details. Please try again.";
  }
};


// this function is for updating phone number  of a customer
const updateCustomerPhone = async (userMessage) => {
  try {
    let sanitizedMessage = userMessage.replace(/\s*comma\s*/gi, ',');  
    sanitizedMessage = sanitizedMessage.replace(/[.!?-]/g, '');  

    const match = sanitizedMessage.match(/(?:for|of)\s+([A-Za-z\s]+)(?:,\s*|\s+)(\d{10,15})/i);

    if (!match) {
      return "Please provide the details in the format: Update phone for [CustomerName], [NewPhone].";
    }

    const [_, customerName, newPhone] = match;

    const [customerDetails] = await db.query(
      "SELECT CustomerID FROM Customers WHERE LOWER(Name) = LOWER(?) LIMIT 1",
      [customerName.trim()]
    );

    if (customerDetails.length === 0) {
      return `Customer with name "${customerName}" not found.`;
    }

    const [result] = await db.query(
      "UPDATE Customers SET Phone = ? WHERE CustomerID = ?",
      [newPhone.trim(), customerDetails[0].CustomerID]
    );

    if (result.affectedRows > 0) {
      return `Phone number updated successfully for ${customerName}!`;
    } else {
      return "Failed to update the phone number. Please try again.";
    }
  } catch (error) {
    console.error("Error updating customer phone number:", error);
    return "An error occurred while updating the phone number. Please try again.";
  }
};

const getBillsByDate = async (userMessage) => {
  try {
    const match = userMessage.match(/of\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);

    if (!match) {
      return "Please provide a valid date in the format: DD/MM/YYYY.";
    }

    const [_, dateString] = match;
    const [day, month, year] = dateString.split("/").map((part) => parseInt(part, 10));
    const queryDate = new Date(year, month - 1, day);

    if (isNaN(queryDate)) {
      return "The provided date is invalid. Please use the format DD/MM/YYYY.";
    }

    const [rows] = await db.query(
      `
      SELECT 
        Bills.BillID,
        Customers.Name AS CustomerName,
        Bills.TotalAmount,
        Bills.BillDate
      FROM 
        Bills
      JOIN 
        Customers
      ON 
        Bills.CustomerID = Customers.CustomerID
      WHERE 
        DATE(Bills.BillDate) = DATE(?)
      `,
      [queryDate]
    );

    if (rows.length === 0) {
      return `No bills were found for the date ${dateString}.`;
    }

    let table = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>Bill ID</th>
            <th>Customer Name</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((bill) => {
      table += `
        <tr>
          <td>${bill.BillID}</td>
          <td>${bill.CustomerName}</td>
          <td>${bill.TotalAmount}</td>
          <td>${new Date(bill.BillDate).toLocaleString()}</td>
        </tr>
      `;
    });

    table += `</tbody></table>`;
    return `Here are the bills of ${dateString}:<br>${table}`;
  } catch (error) {
    console.error("Error fetching bills by date:", error);
    return "An error occurred while fetching bills. Please try again.";
  }
};




// test ends here
app.listen(PORT, ()=>{
    console.log("app is listening");
});