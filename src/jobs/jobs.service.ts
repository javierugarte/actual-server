import { Inject, Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { FETCH_QUEUE_PROVIDER } from "./queue.provider";
import { FetchJobName } from "./queue.constants";

@Injectable()
export class JobsService {
  constructor(@Inject(FETCH_QUEUE_PROVIDER) private readonly queue: Queue) {}

  enqueueFetchAll() {
    return this.queue.add(FetchJobName.FetchAll, {}, { jobId: `fetch-all-${Date.now()}` });
  }

  enqueueFetchUserSource(userSourceId: string) {
    return this.queue.add(FetchJobName.FetchUserSource, { userSourceId }, { jobId: `fetch-user-source-${userSourceId}-${Date.now()}` });
  }
}
