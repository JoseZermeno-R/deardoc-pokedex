import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { fileURLToPath } from 'node:url';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PokemonModule } from './pokemon/pokemon.module.js';

// backend/data/pokedex.sqlite, resolved the same way from src/ and dist/.
const DEFAULT_DATABASE_PATH = fileURLToPath(
  new URL('../data/pokedex.sqlite', import.meta.url),
);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
      autoLoadEntities: true,
      // Local SQLite rebuilt from the snapshot; a real deployment would use migrations.
      synchronize: true,
    }),
    PokemonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
