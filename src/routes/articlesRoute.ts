import { Router } from "express";
import { ArticleController } from "../controllers/ArticleController";

const router = Router();
const controller = new ArticleController();

router.get("/", controller.getArticles);
router.get("/category/:categoryName", controller.getArticlesByCategory);
router.get("/:slug", controller.getArticleBySlug);

export default router;
