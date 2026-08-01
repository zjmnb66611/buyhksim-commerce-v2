import { Global, Module } from "@nestjs/common";
import postgres from "postgres";

export const DB_CLIENT = Symbol("DB_CLIENT");

@Global()
@Module({
  providers: [{
    provide: DB_CLIENT,
    useFactory: () => {
      const url = process.env.DATABASE_URL;
      if (!url) return null;
      return postgres(url, { max: 20, idle_timeout: 20, connect_timeout: 10, prepare: true });
    },
  }],
  exports: [DB_CLIENT],
})
export class DatabaseModule {}
