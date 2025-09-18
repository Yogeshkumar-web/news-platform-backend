import express, { Application } from "express";
import articleRoute from "./routes/articlesRoute";
import cors from "cors";

const app: Application = express();

// port
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api", articleRoute);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default app;
