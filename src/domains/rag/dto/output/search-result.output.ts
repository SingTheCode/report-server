import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchResultItem {
  @Field(() => Int)
  documentId: number;

  @Field()
  content: string;

  @Field(() => Float)
  similarity: number;
}

@ObjectType()
export class SearchResultOutput {
  @Field(() => [SearchResultItem])
  results: SearchResultItem[];
}
