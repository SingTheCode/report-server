import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class SyncNotionInput {
  @Field()
  @IsString()
  databaseId: string;

  @Field()
  @IsString()
  apiToken: string;
}
