import db from "../config/database";

export class ArticleRepository {
  async countPublished(where: any = {}) {
    return db.article.count({ where: { status: "PUBLISHED", ...where } });
  }

  async findPublished({
    where = {},
    skip = 0,
    take = 10,
    orderBy = { createdAt: "desc" },
    select = undefined,
  }: {
    where?: any;
    skip?: number;
    take?: number;
    orderBy?: any;
    select?: any;
  }) {
    return db.article.findMany({
      where: { status: "PUBLISHED", ...where },
      orderBy,
      skip,
      take,
      select,
    });
  }

  async findBySlug(slug: string, select: any = undefined) {
    return db.article.findUnique({
      where: { slug },
      select: {
        ...select,
        author: {
          select: { id: true, name: true, profileImage: true, bio: true },
        },
        comments: {
          where: { isApproved: true, isSpam: false },
          include: {
            author: { select: { id: true, name: true, profileImage: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }

  async incrementViewCount(id: string) {
    return db.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async findCategories({
    select = { key: true, label: true, count: true },
    orderBy = { count: "desc" as const },
  } = {}) {
    return db.category.findMany({ select, orderBy });
  }
}
