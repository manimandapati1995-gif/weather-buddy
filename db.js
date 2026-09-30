import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "weatherbuddy",
  password: "123456", // <-- Ikada nee Postgres password pettu, Movie project lo edhi pettavo ade
  port: 5432,
});

db.connect();
export default db;