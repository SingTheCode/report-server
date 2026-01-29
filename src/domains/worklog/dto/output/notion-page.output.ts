import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NotionPageOutput {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  url: string;

  @Field()
  syncedAt: Date;
}
