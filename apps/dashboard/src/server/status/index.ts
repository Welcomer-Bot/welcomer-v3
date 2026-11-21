import { prismaStatusRepository } from "./status-repository";
import { createStatusService } from "./status-service";

export const statusService = createStatusService(prismaStatusRepository);
