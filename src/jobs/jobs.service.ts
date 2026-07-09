import { Injectable } from "@nestjs/common";
import { SourceFetcherService } from "./source-fetcher.service";

@Injectable()
export class JobsService {
  constructor(private readonly fetcher: SourceFetcherService) {}

  runFetchAll() {
    return this.fetcher.fetchAll();
  }

  runFetchUserSource(userSourceId: string) {
    return this.fetcher.fetchUserSource(userSourceId);
  }
}
