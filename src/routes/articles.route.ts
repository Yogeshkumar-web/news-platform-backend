import { Router, Request, Response } from "express";

const newsRouter: Router = Router();

// Dummy data for a list of news articles
const dummyNews = [
  {
    id: 1,
    title: "Breaking News Title",
    content: "Full article content...",
    excerpt: "Short description...",
    category: "Politics",
    image_url:
      "https://plus.unsplash.com/premium_photo-1688561384438-bfa9273e2c00?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    created_at: "2025-01-15T10:30:00Z",
    is_premium: false,
  },
  {
    id: 2,
    title: "Local Sports Championship",
    content: "Detailed coverage of the final match.",
    excerpt: "Highlights of the championship game.",
    category: "Sports",
    image_url:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    created_at: "2025-01-14T18:00:00Z",
    is_premium: false,
  },
  {
    id: 3,
    title: "Technology Showcase",
    content: "A look at the latest tech innovations.",
    excerpt: "New gadgets and software trends.",
    category: "Technology",
    image_url:
      "https://images.unsplash.com/photo-1508921340878-ba53e1f016ec?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    created_at: "2025-01-13T09:15:00Z",
    is_premium: true,
  },
];

// API endpoint to get all news articles
newsRouter.get("/articles", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: dummyNews,
    total: dummyNews.length,
  });
});

export default newsRouter;
