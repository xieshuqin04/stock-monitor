import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common'
import { StockService } from './stock.service'
import { StockCacheService } from './stock-cache.service'
import { StockDataDto, ApiResponseDto } from './stock.dto'

@Controller('stock')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly stockCacheService: StockCacheService,
  ) {}

  /**
   * 获取集合竞价时段主力资金流入排行榜
   */
  @Get('main-inflow')
  async getMainInflow(): Promise<ApiResponseDto<StockDataDto[]>> {
    const data = await this.stockService.getMainInflowRanking()
    return { code: 200, message: 'success', data }
  }

  /**
   * 搜索股票（从数据库缓存）
   */
  @Get('search')
  async searchStocks(
    @Query('keyword') keyword: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<any[]>> {
    const data = await this.stockCacheService.searchStocks(keyword, limit ? parseInt(limit) : 20)
    return { code: 200, message: 'success', data }
  }

  /**
   * 根据代码获取股票详情
   */
  @Get('detail/:code')
  async getStockDetail(@Param('code') code: string): Promise<ApiResponseDto<any>> {
    const data = await this.stockCacheService.getStockByCode(code)
    if (!data) {
      return { code: 404, message: '股票不存在', data: null }
    }
    return { code: 200, message: 'success', data }
  }

  /**
   * 获取所有缓存的股票列表
   */
  @Get('cache/list')
  async getAllStocks(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ApiResponseDto<{ data: any[], total: number }>> {
    const data = await this.stockCacheService.getAllStocks(
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 100,
    )
    return { code: 200, message: 'success', data }
  }

  /**
   * 获取主力资金流入排行榜（从数据库缓存）
   */
  @Get('cache/inflow-ranking')
  async getInflowRanking(
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<any[]>> {
    const data = await this.stockCacheService.getMainInflowRanking(limit ? parseInt(limit) : 50)
    return { code: 200, message: 'success', data }
  }

  /**
   * 批量获取股票实时数据
   */
  @Post('cache/realtime')
  async getRealtimeData(@Body('codes') codes: string[]): Promise<ApiResponseDto<any[]>> {
    const data = await this.stockCacheService.getRealtimeData(codes)
    return { code: 200, message: 'success', data }
  }

  /**
   * 同步股票数据（从东方财富）
   */
  @Post('cache/sync/eastmoney')
  async syncFromEastmoney(): Promise<ApiResponseDto<any>> {
    const data = await this.stockCacheService.syncFromEastmoney()
    return { code: 200, message: '同步完成', data }
  }

  /**
   * 同步股票数据（从Tushare）
   */
  @Post('cache/sync/tushare')
  async syncFromTushare(): Promise<ApiResponseDto<any>> {
    const data = await this.stockCacheService.syncFromTushare()
    return { code: 200, message: '同步完成', data }
  }

  /**
   * 获取缓存统计信息
   */
  @Get('cache/stats')
  async getCacheStats(): Promise<ApiResponseDto<any>> {
    const data = await this.stockCacheService.getCacheStats()
    return { code: 200, message: 'success', data }
  }
}
