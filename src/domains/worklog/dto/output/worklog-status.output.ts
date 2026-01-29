import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WorklogStatusOutput {
  @Field(() => Int)
  totalWorklogs: number;
}
