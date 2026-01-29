import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class UploadedFileInfo {
  @Field()
  filename: string;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
export class UploadResultOutput {
  @Field(() => Int)
  successCount: number;

  @Field(() => Int)
  failedCount: number;

  @Field(() => [UploadedFileInfo])
  successFiles: UploadedFileInfo[];

  @Field(() => [UploadedFileInfo])
  failedFiles: UploadedFileInfo[];
}

@ObjectType()
export class UploadProgressOutput {
  @Field(() => Int)
  totalFiles: number;

  @Field(() => Int)
  processedFiles: number;

  @Field(() => Float)
  progress: number;

  @Field()
  currentFile: string;

  @Field()
  status: string;

  @Field(() => UploadResultOutput, { nullable: true })
  result?: UploadResultOutput;
}

@ObjectType()
export class UploadWorklogsOutput {
  @Field()
  uploadId: string;
}
