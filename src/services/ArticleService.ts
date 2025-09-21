import { ArticleRepository } from "../repositories/ArticleRepository";
import { normalizePageParams, buildPaginationMeta } from "../utils/pagination";
import { categoryKey } from "../utils/category";
import logger from "../utils/logger";
import { Prisma } from "@prisma/client";

// Default fields to select for articles
const DEFAULT_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  thumbnail: true,
  isPremium: true,
  viewCount: true,
  createdAt: true,
  author: { select: { id: true, name: true, profileImage: true } },
  _count: { select: { likes: true, comments: true } },
  articleCategories: {
    include: {
      category: { select: { id: true, key: true, label: true } },
    },
  },
};

// Type-safe mapping of Prisma return to frontend DTO
type ArticleDb = Prisma.ArticleGetPayload<{ select: typeof DEFAULT_SELECT }>;

export class ArticleService {
  private repo = new ArticleRepository();

  // Map DB article to frontend DTO
  private mapArticleDbToDto(dbArticle: ArticleDb) {
    const tags = (dbArticle.articleCategories || [])
      .map((ac) => ac.category?.label)
      .filter(Boolean);

    const categories = (dbArticle.articleCategories || [])
      .map((ac) =>
        ac.category ? { key: ac.category.key, label: ac.category.label } : null
      )
      .filter(Boolean);

    return {
      id: dbArticle.id,
      title: dbArticle.title,
      slug: dbArticle.slug,
      excerpt: dbArticle.excerpt,
      tags,
      categories,
      thumbnail: dbArticle.thumbnail,
      isPremium: dbArticle.isPremium,
      viewCount: dbArticle.viewCount,
      createdAt: dbArticle.createdAt,
      author: dbArticle.author,
      _count: dbArticle._count,
    };
  }

  // Fetch paginated articles with optional category filter
  async getArticles(query: { page?: any; pageSize?: any; category?: string }) {
    const { page, limit, skip } = normalizePageParams(
      query.page,
      query.pageSize
    );

    const where: any = {};
    if (query.category) {
      const normalized = categoryKey(query.category);
      where.articleCategories = { some: { category: { key: normalized } } };
    }

    const [total, articlesRaw] = await Promise.all([
      this.repo.countPublished(where),
      this.repo.findPublished({
        where,
        skip,
        take: limit,
        select: DEFAULT_SELECT,
      }),
    ]);

    const articles = articlesRaw as unknown as ArticleDb[];
    const mapped = articles.map((a) => this.mapArticleDbToDto(a));

    return {
      articles: mapped,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  // Fetch all categories
  async getCategories() {
    const categories = await this.repo.findCategories();
    return categories.map((c) => ({
      key: c.key,
      label: c.label,
      count: c.count,
    }));
  }

  // Fetch paginated articles by category
  async getArticlesByCategory(
    categoryName: string,
    pageInput?: any,
    limitInput?: any
  ) {
    const { page, limit, skip } = normalizePageParams(pageInput, limitInput);

    const normalized = categoryKey(categoryName);
    if (!normalized) {
      return { articles: [], pagination: buildPaginationMeta(page, limit, 0) };
    }

    const where = {
      articleCategories: { some: { category: { key: normalized } } },
    };
    const [total, articlesRaw] = await Promise.all([
      this.repo.countPublished(where),
      this.repo.findPublished({
        where,
        skip,
        take: limit,
        select: DEFAULT_SELECT,
      }),
    ]);

    const articles = articlesRaw as unknown as ArticleDb[];
    const mapped = articles.map((a) => this.mapArticleDbToDto(a));

    return {
      articles: mapped,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  // Fetch single article by slug
  async getArticleBySlug(slug: string) {
    if (!slug) throw new Error("INVALID_SLUG");

    const articleRaw = await this.repo.findBySlug(slug, DEFAULT_SELECT);

    if (!articleRaw) throw new Error("ARTICLE_NOT_FOUND");

    const article: ArticleDb = articleRaw as unknown as ArticleDb;

    // Fire-and-forget increment view count
    this.repo
      .incrementViewCount(article.id)
      .catch((err) => logger.error("inc view failed", { err }));

    return this.mapArticleDbToDto(article);
  }
}
