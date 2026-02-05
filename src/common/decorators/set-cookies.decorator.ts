import {
  SetMetadata,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

export const COOKIES_KEY = 'set_cookies';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface CookiePayload {
  name: string;
  value: string;
  options?: CookieOptions;
}

export const SetCookies = () => SetMetadata(COOKIES_KEY, true);

@Injectable()
export class CookiesInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSetCookies = this.reflector.get<boolean>(
      COOKIES_KEY,
      context.getHandler(),
    );

    if (!shouldSetCookies) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: { cookies?: CookiePayload[]; [key: string]: unknown }) => {
        if (data?.cookies && Array.isArray(data.cookies)) {
          for (const cookie of data.cookies) {
            response.cookie(cookie.name, cookie.value, cookie.options || {});
          }
          const { cookies, ...rest } = data;
          return rest;
        }
        return data;
      }),
    );
  }
}

@Injectable()
export class ClearCookiesInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSetCookies = this.reflector.get<boolean>(
      COOKIES_KEY,
      context.getHandler(),
    );

    if (!shouldSetCookies) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(
        (data: { clearCookies?: string[]; [key: string]: unknown }) => {
          if (data?.clearCookies && Array.isArray(data.clearCookies)) {
            for (const name of data.clearCookies) {
              response.clearCookie(name);
            }
            const { clearCookies, ...rest } = data;
            return rest;
          }
          return data;
        },
      ),
    );
  }
}
