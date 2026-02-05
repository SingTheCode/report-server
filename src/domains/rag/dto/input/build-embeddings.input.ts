import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class DocumentInput {
  @Field()
  @IsString()
  id: string;

  @Field()
  @IsString()
  content: string;
}

@InputType()
export class BuildEmbeddingsInput {
  @Field(() => [DocumentInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentInput)
  documents: DocumentInput[];
}
