import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RagService } from './rag.service';
import { BuildEmbeddingsInput } from './dto/input/build-embeddings.input';
import { SearchEmbeddingsInput } from './dto/input/search-embeddings.input';
import { BuildEmbeddingsOutput } from './dto/output/build-embeddings.output';
import { SearchResultOutput } from './dto/output/search-result.output';
import { EmbeddingStatusOutput } from './dto/output/embedding-status.output';

@Resolver()
export class RagResolver {
  constructor(private ragService: RagService) {}

  @Mutation(() => BuildEmbeddingsOutput)
  async buildEmbeddings(@Args('input') input: BuildEmbeddingsInput) {
    return this.ragService.buildEmbeddings(input);
  }

  @Query(() => SearchResultOutput)
  async searchEmbeddings(@Args('input') input: SearchEmbeddingsInput) {
    return this.ragService.search(input);
  }

  @Query(() => EmbeddingStatusOutput)
  async embeddingStatus() {
    return this.ragService.getStatus();
  }
}
