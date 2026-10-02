import express from "express";
import axios from "axios";
import db from "./db.js";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY; // <-- PUT KEY HERE

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

function getSuggestion(weatherMain, temp, city) {
  weatherMain = weatherMain.toLowerCase();
  if (weatherMain.includes("rain") || weatherMain.includes("drizzle") || weatherMain.includes("thunderstorm")) {
    return `🌧️ Carry Umbrella! It's raining in ${city}.`;
  } else if (weatherMain.includes("clear") && temp > 32) {
    return `☀️ Very Hot (${temp}°C) in ${city}! Take umbrella for sun + water bottle.`;
  } else if (weatherMain.includes("clear")) {
    return `😎 Clear sky in ${city}! No umbrella needed.`;
  } else if (weatherMain.includes("clouds")) {
    return `☁️ Cloudy in ${city}. Might rain later, carry umbrella just in case.`;
  } else {
    return `Carry umbrella to be safe in ${city}!`;
  }
}

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM weather_history ORDER BY searched_at DESC LIMIT 6");
    res.render("index", { weather: null, suggestion: null, history: result.rows, error: null });
  } catch (e) {
    res.render("index", { weather: null, suggestion: null, history: [], error: null });
  }
});

app.post("/weather", async (req, res) => {
  let city = req.body.city;
  const cityMap={"vizag": "Visakhapatnam", "hyd": "Hyderabad"};
  if(cityMap[city.toLowerCase()]) city=cityMap[city.toLowerCase()]
  try {
    const API_KEY = process.env.API_KEY || process.env.OPENWEATHER_API_KEY || "17d7628cd05a876ca3eee154c777b573";
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
    const data = response.data;
    const weatherMain = data.weather[0].main;
    const temp = data.main.temp;
    const suggestion = getSuggestion(weatherMain, temp, data.name);

    try {
      await db.query("INSERT INTO weather_history (city, temp, weather_main, suggestion) VALUES ($1,$2,$3,$4)", [data.name, temp, weatherMain, suggestion]);
    } catch(dbErr){
      console.log("DB save failed, but will show weather:", dbErr.message);
    }

    const history = await db.query("SELECT * FROM weather_history ORDER BY searched_at DESC LIMIT 10");
    res.render("index", { weather: data, suggestion: suggestion, history: history.rows, error: null });
  } catch (err) {
    console.log("Weather error:", err.message);
    try {
      const history = await db.query("SELECT * FROM weather_history ORDER BY searched_at DESC LIMIT 10");
      res.render("index", { weather: null, suggestion: null, history: history.rows, error: "City not found!" });
    } catch(e){
      res.render("index", { weather: null, suggestion: null, history: [], error: "City not found!" });
    }
  }
});

// DELETE history
app.post("/delete/:id", async (req, res) => {
  await db.query("DELETE FROM weather_history WHERE id = $1", [req.params.id]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Weather Buddy running at http://localhost:${port}`);
});