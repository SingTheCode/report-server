import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchResultItem {
  @Field()
  documentId: string;

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
