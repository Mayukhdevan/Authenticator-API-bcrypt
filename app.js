const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt"); // Helps to hash and compare pw.

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Register API
app.post("/register", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}"`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser) {
    // If user exists
    res.status(400);
    res.send("User already exists");
  } else {
    // If pw length is less than 5 char
    if (password.length < 5) {
      res.status(400);
      res.send("Password is too short");
    } else {
      const createUserQuery = `
				INSERT INTO
					user (username, name, password, gender, location)
				VALUES
					("${username}", "${name}", "${hashedPassword}", "${gender}", "${location}");`;
      await db.run(createUserQuery);
      res.send("User created successfully");
    }
  }
});

// Login API
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const dbUser = await db.get(getUserQuery);
  if (!dbUser) {
    res.status(400);
    res.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordMatched) {
      res.status(400);
      res.send("Invalid password");
    } else {
      res.send("Login success!");
    }
  }
});

// Change Password API
app.put("/change-password", async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}";`;
  const dbUser = await db.get(getUserQuery);
  const isOldPwCorrect = await bcrypt.compare(oldPassword, dbUser.password);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (!isOldPwCorrect) {
    res.status(400);
    res.send("Invalid current password");
  } else {
    if (newPassword.length < 5) {
      res.status(400);
      res.send("Password is too short");
    } else {
      const updatePasswordQuery = `
				UPDATE
					user
				SET
					password = "${hashedPassword}"
				WHERE
					username = "${username}";`;
      await db.run(updatePasswordQuery);
      res.send("Password updated");
    }
  }
});

module.exports = app;
