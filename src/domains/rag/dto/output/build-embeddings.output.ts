import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BuildEmbeddingsOutput {
  @Field()
  success: boolean;

  @Field(() => Int)
  documentCount: number;

  @Field(() => Int)
  chunkCount: number;
}
