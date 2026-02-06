import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class WorklogItemOutput {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field()
  createdAt: string;
}

@ObjectType()
export class WorklogListOutput {
  @Field(() => [WorklogItemOutput])
  worklogs: WorklogItemOutput[];

  @Field(() => Int)
  total: number;
}
