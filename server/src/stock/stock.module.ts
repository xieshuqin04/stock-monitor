import { Module } from '@nestjs/common'
import { StockController } from './stock.controller'
import { StockService } from './stock.service'
import { StockCacheService } from './stock-cache.service'

@Module({
  controllers: [StockController],
  providers: [StockService, StockCacheService],
})
export class StockModule {}
