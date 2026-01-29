import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class EmbeddingStatusOutput {
  @Field(() => Int)
  totalDocuments: number;

  @Field(() => Int)
  totalEmbeddings: number;
}
