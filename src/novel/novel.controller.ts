import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { NovelService } from './novel.service';
import {
  CreateNovelDto,
  FindNovelListDto,
  FindNovelListCategoryDto,
  FindNovelListViewTypeDto,
  SearchNovelListDto,
} from '@/novel/dto';
import { Novel } from '@prisma/client';

@Controller('novel')
export class NovelController {
  constructor(private readonly novelService: NovelService) {}

  @Get()
  findByViewType(
    @Query() { viewType, index, size }: FindNovelListViewTypeDto,
  ): Promise<FindNovelListDto> {
    return this.novelService.findByViewType(viewType, index, size);
  }

  @Get('category')
  findByCategory(
    @Query() { category, index, size }: FindNovelListCategoryDto,
  ): Promise<FindNovelListDto> {
    return this.novelService.findByCategory(category, index, size);
  }

  @Get('search')
  searchNovelList(
    @Query() { query, index, size, viewType }: SearchNovelListDto,
  ): Promise<FindNovelListDto> {
    return this.novelService.searchNovel(query, index, size, viewType);
  }

  @Get(':id')
  findById(@Param('id', new ParseIntPipe()) id: number): Promise<Novel> {
    return this.novelService.findById(id);
  }

  @Post()
  @HttpCode(201)
  createNovel(@Body() createNovelDto: CreateNovelDto): Promise<number> {
    return this.novelService.createNovel(createNovelDto);
  }
}
