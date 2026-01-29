import { Controller, Sse, Param, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorklogService } from './worklog.service';

@Controller('worklog')
export class WorklogController {
  constructor(private worklogService: WorklogService) {}

  @Sse('upload-progress/:uploadId')
  uploadProgress(
    @Param('uploadId') uploadId: string,
  ): Observable<MessageEvent> {
    return this.worklogService
      .getProgressStream(uploadId)
      .pipe(map((data) => ({ data })));
  }
}
