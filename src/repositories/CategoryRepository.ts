import db from "../config/database";
import { categoryKey } from "../utils/category";

export interface CreateCategoryData {
    label: string;
    key: string;
}

export interface UpdateCategoryData {
    label?: string;
    key?: string;
}

const CATEGORY_SELECT = {
    id: true,
    key: true,
    label: true,
    createdAt: true,
    updatedAt: true,
};

export class CategoryRepository {
    // 1. Create
    async create(data: CreateCategoryData) {
        return db.category.create({
            data: data,
            select: CATEGORY_SELECT,
        });
    }

    // 2. Find By Key
    async findByKey(key: string) {
        return db.category.findUnique({
            where: { key: categoryKey(key) },
            select: CATEGORY_SELECT,
        });
    }

    // 3. Find By ID
    async findById(id: string) {
        return db.category.findUnique({
            where: { id },
            select: CATEGORY_SELECT,
        });
    }

    // 4. Find All (Admin list)
    async findAll() {
        return db.category.findMany({
            select: CATEGORY_SELECT,
            orderBy: { label: "asc" },
        });
    }

    // 5. Update
    async update(id: string, data: UpdateCategoryData) {
        return db.category.update({
            where: { id },
            data: data,
            select: CATEGORY_SELECT,
        });
    }

    // 6. Delete
    async delete(id: string) {
        // Zaroori: ArticleCategory entries ko pehle delete karein
        await db.articleCategory.deleteMany({
            where: { categoryId: id },
        });

        return db.category.delete({
            where: { id },
            select: { id: true },
        });
    }

    async getAllFromCategoryTable() {
        return db.category.findMany({
            orderBy: [{ count: "desc" }, { label: "asc" }],
            select: { key: true, label: true, count: true, isHidden: true },
        });
    }
    async getTagCountsFromArticles(limit = 10000) {
        const rows = await db.article.findMany({
            where: { status: "PUBLISHED" },
            select: {
                articleCategories: {
                    include: { category: { select: { label: true } } },
                },
            },
            take: limit,
        });
        return rows;
    }
    async upsertCategory(key: string, label: string) {
        return db.category.upsert({
            where: { key },
            create: { key, label, count: 0 },
            update: { label },
        });
    }
}
