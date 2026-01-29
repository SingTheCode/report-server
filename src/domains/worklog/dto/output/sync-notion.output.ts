import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SyncNotionOutput {
  @Field()
  success: boolean;

  @Field(() => Int)
  syncedCount: number;

  @Field(() => Int)
  embeddedCount: number;
}
