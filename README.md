# twitter-clone-api
A fully functional Twitter-like backend built with Node.js and Express. Includes user authentication with JWT, tweet management, followers system, and likes/replies APIs using SQLite.

# 🐦 Twitter Clone API

A full-featured **Twitter Clone Backend API** built with **Node.js**, **Express**, **SQLite**, and **JWT Authentication**.  
This project implements core Twitter functionalities like user registration, login, following, tweeting, liking, replying, and secure access control.

---

## 🚀 Features

✅ User registration and login  
✅ Password hashing using **bcrypt**  
✅ Authentication and authorization with **JWT**  
✅ Follow and unfollow relationships  
✅ Create, read, and delete tweets  
✅ Like and reply to tweets  
✅ View feeds from followed users  
✅ SQLite database with pre-defined schema  
✅ RESTful API structure with Express.js  

---

## 🏗️ Tech Stack

| Technology | Purpose |
|-------------|----------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **SQLite** | Lightweight relational database |
| **bcrypt** | Password hashing |
| **jsonwebtoken (JWT)** | Secure authentication |
| **sqlite & sqlite3** | Database connection driver |

---

## 📂 Project Structure

```bash
twitter-clone-api/
│
├── app.js # Main server and route definitions
├── twitterCloneApi.db # SQLite database file
├── package.json # Dependencies and scripts
├── package-lock.json
└── README.md # Project documentation

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/anuradhahazra/twitter-clone-api.git
cd twitter-clone-api

2️⃣ Install Dependencies
npm install

3️⃣ Create Database (if not already exists)
sqlite3 twitterCloneApi.db

