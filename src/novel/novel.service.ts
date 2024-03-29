import { Injectable } from '@nestjs/common';
import {
  CreateNovelDto,
  FindNovelListCategoryDto,
  FindNovelListDto,
  FindNovelListUserDto,
  FindNovelListViewTypeDto,
  SearchNovelListDto,
} from '@/novel/dto';
import { Novel, PrismaClient } from '@prisma/client';
import { UserFeedType, ViewType } from '@/novel/enums';
import { NovelPaginationService } from '@/novel/novel.pagination.service';
import CreateLikeDto from './dto/request/create-like-dto';
import { AuthService } from '@/auth/auth.service';

const prisma = new PrismaClient();

@Injectable()
export class NovelService {
  constructor(
    private readonly novelPaginationService: NovelPaginationService,
    private readonly authService: AuthService,
  ) {}

  async findByViewType({
    viewType,
    index,
    size,
  }: FindNovelListViewTypeDto): Promise<FindNovelListDto> {
    return {
      data: await prisma.novel.findMany({
        orderBy: this.orderByViewType(viewType),
        skip: (index - 1) * size,
        take: size,
      }),
      meta: await this.novelPaginationService.getMetadata(index, size),
    };
  }

  async findByCategory({
    category,
    index,
    size,
  }: FindNovelListCategoryDto): Promise<FindNovelListDto> {
    return {
      data: await prisma.novel.findMany({
        where: {
          category,
        },
        skip: (index - 1) * size,
        take: size,
      }),
      meta: await this.novelPaginationService.getMetadata(
        index,
        size,
        category,
      ),
    };
  }

  async searchNovel({
    query,
    index,
    size,
    viewType,
  }: SearchNovelListDto): Promise<FindNovelListDto> {
    return {
      data: await prisma.novel.findMany({
        where: {
          title: {
            contains: query,
          },
        },
        orderBy: this.orderByViewType(viewType),
      }),
      meta: await this.novelPaginationService.getMetadata(
        index,
        size,
        null,
        query,
      ),
    };
  }

  async findById(id: number) {
    const novel = await prisma.novel.findUnique({
      where: {
        uid: id,
      },
    });

    await prisma.novel.update({
      where: {
        uid: id,
      },
      data: {
        views: novel.views + 1,
      },
      include: {
        novel_likes: {
          where: {
            novel_uid: id,
          },
        },
      },
    });

    const findNovel = await prisma.novel.findMany({
      where: {
        uid: id,
      },
      include: {
        novel_likes: {
          where: {
            novel_uid: id,
          },
        },
      },
    });

    const userResult = await prisma.user.findUnique({
      select: {
        nickname: true,
      },
      where: {
        uid: findNovel[0].user_uid,
      },
    });
    const novelResult = findNovel.map((novel) => ({
      ...novel,
      likeCount: novel.novel_likes.length,
    }));
    return { userResult, novelResult };
  }

  async findByIdWithUser(uid: number, token: string) {
    const user = await this.authService.validateToken(token);
    const novelsWithUserLike = await prisma.novel.findMany({
      where: {
        uid: uid,
      },
      include: {
        novel_likes: {
          where: {
            novel_uid: uid,
          },
        },
      },
    });

    await prisma.novel.update({
      where: {
        uid,
      },
      data: {
        views: novelsWithUserLike[0].views + 1,
      },
    });

    const userResult = await prisma.user.findUnique({
      select: {
        nickname: true,
      },
      where: {
        uid: novelsWithUserLike[0].user_uid,
      },
    });

    const novelResult = novelsWithUserLike.map((novel) => ({
      ...novel,
      like: novel.novel_likes.some((like) => like.user_uid === user.uid),
      likeCount: novel.novel_likes.length,
    }));

    return { userResult, novelResult };
  }
  async findByUserFeedType(
    userId: number,
    { userFeedType, index, size }: FindNovelListUserDto,
  ) {
    let novelList;
    if (userFeedType === UserFeedType.USER_LIKED) {
      novelList = await prisma.novel.findMany({
        include: {
          novel_likes: true,
        },
        where: {
          novel_likes: {
            some: {
              user_uid: userId,
            },
          },
        },
        orderBy: {
          uid: 'desc',
        },
        skip: (index - 1) * size,
        take: size,
      });
    } else {
      novelList = await prisma.novel.findMany({
        where: {
          user_uid: userId,
        },
        orderBy: {
          uid: 'desc',
        },
        skip: (index - 1) * size,
        take: size,
      });
    };

    const novelLikedList = novelList.map((novel) => {
      return {
        ...novel,
        novel_likes: novel.novel_likes?.length ?? 0,
      };
    });

    return {
      data: novelLikedList,
      meta: await this.novelPaginationService.getMetadata(
        index,
        size,
        null,
        null,
        userId,
      ),
    };
  }

  async createNovel(
    user_uid: number,
    { title, content, thumbnail, category }: CreateNovelDto,
  ): Promise<number> {
    return (
      await prisma.novel.create({
        data: {
          user_uid,
          title,
          content,
          thumbnail,
          category,
          views: 0,
        },
      })
    ).uid;
  }

  async deleteNovel(id: number): Promise<void> {
    await prisma.novel.delete({
      where: {
        uid: id,
      },
    });
  }

  private orderByViewType(viewType: ViewType): any {
    if (viewType === ViewType.LATEST) {
      return { uid: 'desc' };
    } else if (viewType === ViewType.POPULAR) {
      return [{ views: 'desc' }, { uid: 'desc' }];
    }
  }

  async likeStatus(novel_uid: number, createLikeDto: CreateLikeDto) {
    const { user_uid } = createLikeDto;

    const likeCheck = await prisma.novel_Like.findMany({
      where: {
        user_uid,
        novel_uid,
      },
    });

    if (likeCheck.length == 0) {
      return await prisma.novel_Like.create({
        data: { novel_uid, user_uid },
      });
    }
    return await prisma.novel_Like.delete({
      where: {
        user_uid_novel_uid: {
          user_uid,
          novel_uid,
        },
      },
    });
  }
}