import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT;

const db = new pg.Client({
  connectionString:process.env.DATABASE_URL
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express .static("public"));

let currentUserId = 1;

let users = await db.query("SELECT * FROM users");

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1",[currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const color = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId]);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users.rows,
    color: color.rows[0].color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  currentUserId = req.body.user;
  console.log(currentUserId);
  if(!currentUserId)
    res.render("new.ejs");
  else
    res.redirect("/");
});

app.post("/new", async (req, res) => {
  console.log(req.body);
  if(req.body.name && req.body.color){
    await db.query("INSERT INTO users(name, color) VALUES ($1, $2)",[req.body.name, req.body.color]);
    const id = await db.query("SELECT id FROM  users WHERE name = $1",[req.body.name])
    currentUserId = id.rows[0].id;
    users = await db.query("SELECT * FROM users");
    res.redirect("/");
  }
  else{
    currentUserId = 1;
    res.redirect("/");  
  }
  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
