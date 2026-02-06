import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class WorklogFileInput {
  @Field()
  @IsString()
  filename: string;

  @Field()
  @IsString()
  content: string;
}

@InputType()
export class UploadWorklogsInput {
  @Field(() => [WorklogFileInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorklogFileInput)
  files: WorklogFileInput[];
}
