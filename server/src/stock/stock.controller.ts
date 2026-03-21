import { Controller, Get } from '@nestjs/common'
import { StockService } from './stock.service'
import { StockDataDto, ApiResponseDto } from './stock.dto'

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  /**
   * 获取集合竞价时段主力资金流入排行榜
   * 
   * @returns 主力流入最多的前N只股票
   */
  @Get('main-inflow')
  async getMainInflow(): Promise<ApiResponseDto<StockDataDto[]>> {
    const data = await this.stockService.getMainInflowRanking()
    
    return {
      code: 200,
      message: 'success',
      data,
    }
  }
}
