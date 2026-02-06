import { Field, InputType, Int } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
class DocumentInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  id?: number;

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
