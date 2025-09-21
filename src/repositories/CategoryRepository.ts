import db from "../config/database";

export class CategoryRepository {
  async getAllFromCategoryTable() {
    return db.category.findMany({
      orderBy: { count: "desc", label: "asc" },
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
