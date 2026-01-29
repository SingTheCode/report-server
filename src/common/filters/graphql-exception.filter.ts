import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { GqlArgumentsHost, GqlContextType } from '@nestjs/graphql';
import { Response } from 'express';

interface GqlContext {
  res?: Response;
}

@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() !== 'graphql') {
      return exception;
    }

    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext<GqlContext>();

    // GraphQL은 항상 200 반환 (에러는 errors 필드로)
    ctx?.res?.status?.(200);

    return exception;
  }
}
