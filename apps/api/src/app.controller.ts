import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  getHealth() {
    return {
      service: "SAR API",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
