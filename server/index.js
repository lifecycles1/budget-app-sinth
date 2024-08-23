const express = require("express");
require("dotenv").config();
const app = express();
app.use(express.json());
const spreadsheetId = process.env.GOOGLE_SPREADSHEET;
const { google } = require("googleapis");
const getauthenticatedclient = async () => {
  const authclient = new google.auth.GoogleAuth({ keyFile: "ADC.json", scopes: "https://www.googleapis.com/auth/spreadsheets" });
  const auth = await authclient.getClient();
  const client = google.sheets({ version: "v4", auth });
  return client;
};
const authenticate = getauthenticatedclient();
const { scrypt, createCipheriv, scryptSync, createDecipheriv } = require("node:crypto");
const { Buffer } = require("node:buffer");
const algorithm = "aes-192-cbc";
const salt_password = process.env.SALT_PASSWORD;
const iv = Buffer.alloc(16, 0);
const { MongoClient } = require("mongodb");
const url = process.env.MONGO_URL;
const mongo = new MongoClient(url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// this is the signup route
app.all("/signup", async (req, res) => {
  // "OPTIONS" method plus headers settings are added to overcome CORS Preflight restrictions
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
    // cors preflight settings end here then starts the normal "POST" request which is enabled for this route
  } else if (req.method === "POST") {
    console.log("signup", req.body);
    //
    const firstname = req.body?.firstname;
    const lastname = req.body?.lastname;
    const fullname = `${firstname} ${lastname}`;
    const telephone = req.body?.telephone;
    const email = req.body?.email;
    const password = req.body?.password;
    let passwordHash;

    scrypt(salt_password, "salt", 24, (err, key) => {
      if (err) throw err;
      const cipher = createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(password, "utf8", "hex");
      passwordHash = encrypted + cipher.final("hex");
    });

    try {
      authenticate.then((client) => {
        client.spreadsheets.values.get({ spreadsheetId, range: "sinthuja budget app!A:H", majorDimension: "rows" }).then((response) => {
          const arr = response.data.values;
          var r;
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i][4] === email) {
              r = i;
              break;
            }
          }
          sleep(2000).then((v) => {
            // user already exists
            if (r > 0) {
              res.status(200).json("duplicate");
              // create user
            } else {
              client.spreadsheets.values
                .append({
                  spreadsheetId,
                  range: "sinthuja budget app!A:H",
                  valueInputOption: "RAW",
                  resource: { values: [[firstname, lastname, fullname, telephone, email, password, passwordHash]] },
                })
                .then((response) => {
                  res.status(200).json("User added");
                });
            }
          });
        });
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// this is the signin route
app.all("/signin", async (req, res) => {
  // "OPTIONS" method plus headers settings are added to overcome CORS Preflight restrictions
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
    // cors preflight settings end here then starts the normal "POST" request which is enabled for this route
  } else if (req.method === "POST") {
    console.log("signin", req.body);
    const email = req.body?.email;
    const password = req.body?.password;

    try {
      authenticate.then((client) => {
        client.spreadsheets.values
          .get({ spreadsheetId, range: "sinthuja budget app!A:N", majorDimension: "rows" })
          .then((response) => {
            // console.log(response.data.values);
            const arr = response.data.values;
            var r;
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i][4] === email) {
                r = i;
                break;
              }
            }
            sleep(2000).then((v) => {
              if (r > 0) {
                const key = scryptSync(salt_password, "salt", 24);
                const decipher = createDecipheriv(algorithm, key, iv);
                let decrypted = decipher.update(arr[r][6], "hex", "utf8");
                decrypted += decipher.final("utf8");
                if (decrypted === password) {
                  if (arr[r][9] !== "yes") {
                    res.status(200).json("not launched");
                  } else if (arr[r][9] === "yes" && arr[r][10] !== "yes") {
                    res.status(200).json("launched");
                  } else if (arr[r][9] === "yes" && arr[r][10] === "yes" && arr[r][13] !== "yes") {
                    res.status(200).json("launched with banks checked");
                  } else if (arr[r][9] === "yes" && arr[r][10] === "yes" && arr[r][13] === "yes") {
                    res.status(200).json("launched with banks checked and income set");
                  }
                } else {
                  res.status(200).json("wrong password");
                }
              } else {
                res.status(200).json("user not found");
              }
            });
          })
          .catch((err) => {
            console.log("error while fetching the user", err);
          });
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// this is the preferences route which collects information from the first set of questionnaires (capturing user goals and statstics)
app.all("/preferences", async (req, res) => {
  // "OPTIONS" method plus headers settings are added to overcome CORS Preflight restrictions
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
    // cors preflight settings end here then starts the normal "POST" request which is enabled for this route
  } else if (req.method === "POST") {
    console.log("preferences", req.body);
    const email = req.body?.user;
    const preferences = req.body?.goals;
    const statistics = req.body?.statistics;
    try {
      authenticate.then((client) => {
        client.spreadsheets.values
          .get({ spreadsheetId, range: "sinthuja budget app!A:H", majorDimension: "rows" })
          .then((response) => {
            console.log(response);
            const arr = response.data.values;
            var r;
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i][4] === email) {
                r = i + 1;
                break;
              }
            }
            client.spreadsheets.values
              .update({ spreadsheetId, range: `sinthuja budget app!H${r}:J${r}`, valueInputOption: "RAW", resource: { values: [[JSON.stringify(preferences), statistics, "yes"]] } })
              .then((res) => {
                console.log("updated user's preferences, statistics and launched status");
              })
              .catch((err) => {
                console.log("error while updating the user preferences", err);
              });
          })
          .catch((err) => {
            console.log("error while fetching the user", err);
          });
      });
      res.status(200).json("saved");
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// this is the banksChecked route. This is used for the next set of questionnaire screens
// banks page - collects information of which bank the user prefers to use
// investments page - collects information about which investment does the user want to choose
app.all("/banksChecked", async (req, res) => {
  // "OPTIONS" method plus headers settings are added to overcome CORS Preflight restrictions
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
    // cors preflight settings end here then starts the normal "POST" request which is enabled for this route
  } else if (req.method === "POST") {
    console.log("adding banksChecked to the user in the database", req.body);
    const email = req.body?.user;
    const bank = req.body?.bank;
    const investment = req.body?.investment;

    try {
      authenticate.then((client) => {
        client.spreadsheets.values
          .get({ spreadsheetId, range: "sinthuja budget app!A:H", majorDimension: "rows" })
          .then((response) => {
            console.log(response);
            const arr = response.data.values;
            var r;
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i][4] === email) {
                r = i + 1;
                break;
              }
            }
            client.spreadsheets.values
              .update({ spreadsheetId, range: `sinthuja budget app!K${r}:M${r}`, valueInputOption: "RAW", resource: { values: [["yes", bank, investment]] } })
              .then((res) => {
                console.log("updated user's banks, investments and banksChecked flag");
              })
              .catch((err) => {
                console.log("error while updating the user's banksChecked", err);
              });
          })
          .catch((err) => {
            console.log("error while fetching the user", err);
          });
      });
      res.status(200).json("saved");
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// this is the setIncome route. This is used for the 3rd set of questionnaires in the app.
app.all("/setIncome", async (req, res) => {
  // "OPTIONS" method plus headers settings are added to overcome CORS Preflight restrictions
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
    // cors preflight settings end here then starts the normal "POST" request which is enabled for this route
  } else if (req.method === "POST") {
    console.log("details", req.body);
    const doc = {
      email: req.body?.email,
      income: parseInt(req.body?.income),
      "mortgage/rent": parseInt(req.body?.mortgage),
      groceries: parseInt(req.body?.groceries),
      insurance: parseInt(req.body?.insurance),
      "council tax": parseInt(req.body?.councilTax),
      electricity: parseInt(req.body?.electricity),
      gas: parseInt(req.body?.gas),
      water: parseInt(req.body?.water),
      other: parseInt(req.body?.other),
    };

    try {
      // connecting to mongodb
      // use mongo to insert income info
      await mongo.connect();
      const db = mongo.db("test");
      const collection = db.collection("charts");
      await collection.insertOne(doc);
      // use google sheets to update user's "income" flag to "yes" so we don't display the income form again
      authenticate.then((client) => {
        client.spreadsheets.values
          .get({ spreadsheetId, range: "sinthuja budget app!A:H", majorDimension: "rows" })
          .then((response) => {
            console.log(response);
            const arr = response.data.values;
            var r;
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i][4] === doc.email) {
                r = i + 1;
                break;
              }
            }
            client.spreadsheets.values
              .update({ spreadsheetId, range: `sinthuja budget app!N${r}:O${r}`, valueInputOption: "RAW", resource: { values: [["yes"]] } })
              .then((res) => {
                console.log("updated sheets with the user's income flag");
              })
              .catch((err) => {
                console.log("error while updating the user's income flag", err);
              });
          })
          .catch((err) => {
            console.log("error while fetching the user", err);
          });
      });
      res.status(200).json("Income added");
    } catch (e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await mongo.close();
    }
  }
});

// this route is used when the client finally (after the questionnaires) loads a file called "HomePage.jsx", in its useEffect hook function
app.all("/getIncome", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
  } else if (req.method === "POST") {
    const email = req.body?.email;
    try {
      // await connect to mongo
      await mongo.connect();
      // set to "test" database in the online cluster
      const db = mongo.db("test");
      // set to "charts" collection in the "test" database
      const collection = db.collection("charts");
      // retrieve one document with the users email
      const doc = await collection.findOne({ email });
      // adds a status of "success" to the retrieved object
      const data = { status: "success", ...doc };
      // sends the new object back to the client
      res.status(200).json(data);
    } catch (e) {
      // if error , returns the error message to the client
      return res.status(500).json({ error: e.message });
    } finally {
      // finally (the "finally" block runs regardless of whether there is an error or success) closes the mongo connection
      await mongo.close();
    }
  }
});

// save the user's todo list to the database
app.all("/todos", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
  } else if (req.method === "POST") {
    const doc = {
      email: req.body?.email,
      id: req.body?.todo?.id,
      inputValue: req.body?.todo?.inputValue,
    };
    console.log(doc);
    // post this to mongo db here
    // -------------------------->
    try {
      await mongo.connect();
      const db = mongo.db("test");
      const collection = db.collection("todos");
      await collection.insertOne(doc);
      res.status(200).json("todo saved");
    } catch (e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await mongo.close();
    }
  }
});

// get todos from mongo db
app.all("/getTodos", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
  } else if (req.method === "POST") {
    const email = req.body?.email;
    try {
      // await connect to mongo
      await mongo.connect();
      // set to "test" database in the online cluster
      const db = mongo.db("test");
      // set to "charts" collection in the "test" database
      const collection = db.collection("todos");
      // retrieve one document with the users email
      const doc = await collection.find({ email }).toArray();
      // change and delete the "inputValue" key to "text" because the react-todo-list package uses "text" as the key
      const newDoc = doc.map((item) => {
        item.text = item.inputValue;
        delete item.inputValue;
        return item;
      });
      // adds a status of "success" to the retrieved object
      const data = { status: "success", ...newDoc };
      // sends the new object back to the client
      res.status(200).json(data);
    } catch (e) {
      // if error , returns the error message to the client
      return res.status(500).json({ error: e.message });
    }
  }
});

// delete a todo from the database
app.all("/deleteTodo", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
  } else if (req.method === "POST") {
    const doc = {
      email: req.body?.email,
      id: req.body?.todo?.id,
    };
    try {
      await mongo.connect();
      const db = mongo.db("test");
      const collection = db.collection("todos");
      await collection.deleteOne(doc);
      res.status(200).json("todo deleted");
    } catch (e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await mongo.close();
    }
  }
});

// update a todo in the database
app.all("/updateTodo", async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", req.header("access-control-request-headers"));
  if (req.method === "OPTIONS") {
    res.send();
  } else if (req.method === "POST") {
    const doc = {
      email: req.body?.email,
      id: req.body?.todo,
      inputValue: req.body?.todo?.inputValue,
    };
    console.log(doc);
    try {
      await mongo.connect();
      const db = mongo.db("test");
      const collection = db.collection("todos");
      // update the todo with the new input value
      // the $set operator replaces the value of a field with the specified value
      await collection.updateOne({ email: doc.email, id: doc.id.id }, { $set: { inputValue: doc.inputValue } });
      res.status(200).json("todo updated");
    } catch (e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await mongo.close();
    }
  }
});

app.set("port", process.env.PORT || 8080);
app.listen(app.get("port"), () => console.log(`Server started on port ${app.get("port")}`));
