import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController";

const router = Router();
const controller = new CategoryController();

router.get("/", controller.getCategories);

export default router;
