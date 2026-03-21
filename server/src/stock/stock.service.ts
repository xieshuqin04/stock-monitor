import { Injectable } from '@nestjs/common'
import { StockDataDto } from './stock.dto'

/**
 * 股票服务 - 提供主力资金流入数据
 * 
 * 注意：当前使用模拟数据演示功能
 * 如需对接真实数据，可替换为：
 * 1. 东方财富API
 * 2. 同花顺API
 * 3. 其他股票数据服务商API
 */
@Injectable()
export class StockService {
  /**
   * 获取集合竞价时段主力资金流入最多的股票列表
   * 
   * @returns 主力流入排行榜数据
   */
  async getMainInflowRanking(): Promise<StockDataDto[]> {
    // 生成模拟数据（实际生产环境应替换为真实API调用）
    const mockData = this.generateMockData()
    
    // 按主力流入金额降序排序
    return mockData.sort((a, b) => b.mainInflow - a.mainInflow)
  }

  /**
   * 生成模拟的股票数据
   * 在实际应用中，应替换为真实的股票数据API调用
   */
  private generateMockData(): StockDataDto[] {
    const stocks = [
      { code: '000001', name: '平安银行' },
      { code: '000002', name: '万科A' },
      { code: '000063', name: '中兴通讯' },
      { code: '000333', name: '美的集团' },
      { code: '000651', name: '格力电器' },
      { code: '000858', name: '五粮液' },
      { code: '002415', name: '海康威视' },
      { code: '002594', name: '比亚迪' },
      { code: '300059', name: '东方财富' },
      { code: '300750', name: '宁德时代' },
      { code: '600000', name: '浦发银行' },
      { code: '600036', name: '招商银行' },
      { code: '600519', name: '贵州茅台' },
      { code: '600887', name: '伊利股份' },
      { code: '601318', name: '中国平安' },
    ]

    const now = new Date()
    const updateTime = now.toLocaleTimeString('zh-CN', { hour12: false })

    return stocks.map((stock) => {
      // 随机生成价格和涨跌幅
      const basePrice = Math.random() * 100 + 10 // 10-110元之间
      const changePercent = (Math.random() - 0.5) * 10 // -5% 到 +5%
      const price = basePrice

      // 随机生成主力流入金额（正数表示流入，负数表示流出）
      const mainInflow =
        (Math.random() > 0.3 ? 1 : -1) * // 70%概率流入
        (Math.random() * 500000000 + 10000000) // 1000万到5亿之间

      // 流入占比 = 主力流入 / 成交额
      const volume = Math.abs(mainInflow) * (Math.random() * 5 + 1) // 成交额是主力流入的1-6倍
      const inflowRatio = (mainInflow / volume) * 100

      return {
        code: stock.code,
        name: stock.name,
        price: parseFloat(price.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        mainInflow: parseFloat(mainInflow.toFixed(2)),
        inflowRatio: parseFloat(inflowRatio.toFixed(2)),
        volume: parseFloat(volume.toFixed(2)),
        updateTime,
      }
    })
  }

  /**
   * 预留：对接真实股票数据API的方法
   * 
   * 示例：使用web-search技能搜索最新的股票数据
   * 或者对接东方财富、同花顺等数据源
   */
  // async fetchRealStockData(): Promise<StockDataDto[]> {
  //   // TODO: 对接真实API
  //   // 例如使用 coze-coding-dev-sdk 的 webSearch 功能
  //   // 或调用第三方股票数据API
  //   return []
  // }
}
