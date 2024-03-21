import * as dotenv from 'dotenv';
dotenv.config();
import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './tokenPayload.interface';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  public createToken(uid: number) {
    const payload: TokenPayload = { uid };
    const token = this.jwtService.sign(payload, {
      expiresIn: '12h',
      secret: process.env.SECRET_KEY,
    });
    return token;
  }

  public validateToken(token: string) {
    try {
      const [Bearer, JWT] = token.split(' ');
      const verifiedToken: any = this.jwtService.verify(JWT, {
        secret: process.env.SECRET_KEY,
      });
      const userInfo = prisma.user.findUnique({
        select: { uid: true, id: true, nickname: true },
        where: { uid: verifiedToken.uid },
      });
      return userInfo;
    } catch (err) {
      console.log(err);
      switch (err.message) {
        case 'invalid token':
        case 'NO_USER':
          throw new HttpException('유효하지 않은 토큰', 401);

        case 'jwt expired':
          throw new HttpException('토큰 만료됨', 410);

        default:
          throw new HttpException('서버 에러', 500);
      }
    }
  }

  async validateTokenWithInfo(token: string) {
    const [Bearer, JWT] = token.split(' ');
    const verifiedToken: any = this.jwtService.verify(JWT, {
      secret: process.env.SECRET_KEY,
    });

    const userInfo = await prisma.user.findUnique({
      select: { uid: true, id: true, nickname: true },
      where: { uid: verifiedToken.uid },
    });

    const totalLikes = await prisma.novel_Like.count({
      where: {
        user_uid: verifiedToken.uid,
      },
    });

    const totalNovels = await prisma.novel.count({
      where: {
        user_uid: verifiedToken.uid,
      },
    });
    const {
      _sum: { views },
    } = await prisma.novel.aggregate({
      _sum: {
        views: true,
      },
      where: {
        user_uid: verifiedToken.uid,
      },
    });
    return { userInfo, totalLikes, totalNovels, views };
  }
}
