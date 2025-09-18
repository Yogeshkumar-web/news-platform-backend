import express, { Application } from "express";
import articleRoute from "./routes/articlesRoute";
import cors from "cors";

const app: Application = express();

// port
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://news-platform-backend.onrender.com",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Routes
app.use("/api", articleRoute);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default app;
