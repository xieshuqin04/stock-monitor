import { Injectable, Logger } from '@nestjs/common'
import { StockDataDto } from './stock.dto'

/**
 * 股票服务 - 使用东方财富免费API获取主力资金数据
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name)

  /**
   * 获取主力资金流入最多的股票列表
   */
  async getMainInflowRanking(): Promise<StockDataDto[]> {
    try {
      this.logger.log('使用东方财富API获取数据')
      const data = await this.fetchFromEastMoney()
      if (data.length > 0) {
        return data
      }
    } catch (error) {
      this.logger.error('东方财富API调用失败，使用模拟数据:', error instanceof Error ? error.message : String(error))
    }

    // 降级到模拟数据
    return this.generateMockData()
  }

  /**
   * 东方财富API - 获取主力资金流向数据
   * 
   * 字段说明：
   * - f12: 股票代码
   * - f14: 股票名称
   * - f2:  现价（需要÷100）
   * - f3:  涨跌幅（需要÷100）
   * - f62: 主力净流入（元）
   * - f66: 主力净流入占比（需要÷100）
   * - f6:  成交额（元）
   * - f15: 最高价
   * - f16: 最低价
   * - f17: 开盘价
   * - f18: 昨收
   */
  private async fetchFromEastMoney(): Promise<StockDataDto[]> {
    const url = 'http://push2.eastmoney.com/api/qt/clist/get'

    // 构建请求参数
    const params = new URLSearchParams({
      pn: '1',                    // 页码
      pz: '50',                   // 每页数量
      po: '1',                    // 排序方向：1=降序
      np: '1',                    // 不分页
      ut: 'fa5fd1943c7b386f172d6893dbfba10b', // 用户token（公开）
      fltt: '2',                  // 数据格式：2=字符串
      invt: '2',                  // 投资者类型
      fid: 'f62',                 // 排序字段：主力净流入
      fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23', // 市场筛选：A股
      fields: 'f12,f14,f2,f3,f62,f66,f6,f15,f16,f17,f18',
    })

    const requestUrl = `${url}?${params.toString()}`
    this.logger.log(`请求URL: ${requestUrl}`)

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'http://quote.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.data?.diff) {
      this.logger.warn('东方财富API返回数据为空')
      throw new Error('数据为空')
    }

    this.logger.log(`获取到 ${result.data.diff.length} 条数据`)

    // 解析数据
    const stocks: StockDataDto[] = result.data.diff
      .filter((item: any) => item.f12 && item.f14)
      .map((item: any) => {
        const code = item.f12
        const name = item.f14
        const price = (item.f2 ?? 0) / 100
        const changePercent = (item.f3 ?? 0) / 100
        const mainInflow = item.f62 ?? 0
        const inflowRatio = (item.f66 ?? 0) / 100
        const volume = item.f6 ?? 0

        return {
          code,
          name,
          price: parseFloat(price.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          mainInflow: parseFloat(mainInflow.toFixed(2)),
          inflowRatio: parseFloat(inflowRatio.toFixed(2)),
          volume: parseFloat(volume.toFixed(2)),
          updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        }
      })

    // 按主力流入金额降序排序
    stocks.sort((a, b) => b.mainInflow - a.mainInflow)

    this.logger.log(`解析成功 ${stocks.length} 条股票数据`)
    return stocks
  }

  /**
   * 生成模拟数据（降级方案）
   */
  private generateMockData(): StockDataDto[] {
    const stocks = [
      { code: '000001', name: '平安银行', basePrice: 15.5 },
      { code: '000002', name: '万科A', basePrice: 12.8 },
      { code: '000063', name: '中兴通讯', basePrice: 28.5 },
      { code: '000333', name: '美的集团', basePrice: 58.2 },
      { code: '000651', name: '格力电器', basePrice: 35.6 },
      { code: '000858', name: '五粮液', basePrice: 145.8 },
      { code: '002415', name: '海康威视', basePrice: 32.5 },
      { code: '002594', name: '比亚迪', basePrice: 265.3 },
      { code: '300059', name: '东方财富', basePrice: 18.9 },
      { code: '300750', name: '宁德时代', basePrice: 185.6 },
      { code: '600000', name: '浦发银行', basePrice: 8.5 },
      { code: '600036', name: '招商银行', basePrice: 35.2 },
      { code: '600519', name: '贵州茅台', basePrice: 1688.0 },
      { code: '600887', name: '伊利股份', basePrice: 28.6 },
      { code: '601318', name: '中国平安', basePrice: 45.8 },
    ]

    const now = new Date()
    const updateTime = now.toLocaleTimeString('zh-CN', { hour12: false })

    return stocks
      .map((stock) => {
        const priceChange = (Math.random() - 0.5) * 0.1 * stock.basePrice
        const price = stock.basePrice + priceChange
        const changePercent = (priceChange / stock.basePrice) * 100
        const baseInflow = stock.basePrice * 10000000
        const mainInflow = (Math.random() > 0.3 ? 1 : -1) * (Math.random() * baseInflow + baseInflow * 0.5)
        const volume = Math.abs(mainInflow) * (Math.random() * 3 + 2)
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
      .sort((a, b) => b.mainInflow - a.mainInflow)
  }
}
