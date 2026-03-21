import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StockDataDto } from './stock.dto'

/**
 * 股票服务 - 提供主力资金流入数据
 * 
 * 支持三种数据源：
 * 1. Tushare Pro API（推荐，需配置Token）
 * 2. 东方财富API（免费，实时性好）
 * 3. 模拟数据（测试用）
 */
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name)
  private readonly tushareToken: string
  private readonly tushareApiUrl = 'http://api.tushare.pro'

  constructor(private configService: ConfigService) {
    this.tushareToken = this.configService.get<string>('TUSHARE_TOKEN') || ''
  }

  /**
   * 获取集合竞价时段主力资金流入最多的股票列表
   * 
   * @returns 主力流入排行榜数据
   */
  async getMainInflowRanking(): Promise<StockDataDto[]> {
    // 优先使用 Tushare API（如果配置了 Token）
    if (this.tushareToken && this.tushareToken !== 'YOUR_TOKEN') {
      this.logger.log('使用 Tushare Pro API 获取数据')
      try {
        const data = await this.fetchFromTushare()
        if (data.length > 0) {
          return data
        }
      } catch (error) {
        this.logger.error('Tushare API 调用失败，尝试东方财富API:', error)
      }
    }

    // 降级到东方财富API
    try {
      this.logger.log('使用东方财富 API 获取数据')
      return await this.fetchFromEastMoney()
    } catch (error) {
      this.logger.error('东方财富 API 调用失败，使用模拟数据:', error)
    }

    // 最后降级到模拟数据
    return this.generateMockData()
  }

  /**
   * 从 Tushare Pro 获取主力资金数据
   * 
   * 接口文档：https://tushare.pro/document/2?doc_id=170
   */
  private async fetchFromTushare(): Promise<StockDataDto[]> {
    const today = new Date()
    const tradeDate = today.toISOString().slice(0, 10).replace(/-/g, '')

    this.logger.log(`查询日期: ${tradeDate}`)

    const response = await fetch(this.tushareApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_name: 'moneyflow',
        token: this.tushareToken,
        params: {
          trade_date: tradeDate,
        },
        fields: [
          'ts_code',      // 股票代码
          'name',         // 股票名称
          'close',        // 收盘价
          'pct_chg',      // 涨跌幅
          'net_mf_amount', // 主力净流入金额（万元）
          'net_mf_rate',  // 主力净流入占比
          'amount',       // 成交额（千元）
        ],
      }),
    })

    const result = await response.json()
    this.logger.log(`Tushare响应: ${JSON.stringify(result).slice(0, 200)}...`)

    if (result.code !== 0) {
      throw new Error(`Tushare API错误: ${result.msg}`)
    }

    if (result.data && result.data.items && result.data.items.length > 0) {
      const fields = result.data.fields
      
      return result.data.items
        .map((item: any[]) => {
          const getFieldIndex = (fieldName: string) => fields.indexOf(fieldName)
          
          return {
            code: item[getFieldIndex('ts_code')]?.split('.')[0] || '',
            name: item[getFieldIndex('name')] || '',
            price: item[getFieldIndex('close')] || 0,
            changePercent: item[getFieldIndex('pct_chg')] || 0,
            mainInflow: (item[getFieldIndex('net_mf_amount')] || 0) * 10000, // 万元转元
            inflowRatio: item[getFieldIndex('net_mf_rate')] || 0,
            volume: (item[getFieldIndex('amount')] || 0) * 1000, // 千元转元
            updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          }
        })
        .filter((stock: StockDataDto) => stock.code && stock.name)
        .sort((a: StockDataDto, b: StockDataDto) => b.mainInflow - a.mainInflow)
    }

    return []
  }

  /**
   * 从东方财富获取主力资金数据（免费API）
   */
  private async fetchFromEastMoney(): Promise<StockDataDto[]> {
    const url = 'http://push2.eastmoney.com/api/qt/clist/get'

    const params = new URLSearchParams({
      pn: '1',
      pz: '50',
      po: '1',
      np: '1',
      ut: 'bd1d9ddb0198e00',
      fltt: '2',
      invt: '2',
      fid: 'f62',
      fs: 'b:MK0021',
      fields: 'f12,f14,f2,f3,f62,f66,f6',
    })

    const response = await fetch(`${url}?${params}`)
    const result = await response.json()

    if (result.data && result.data.diff) {
      return result.data.diff
        .map((item: any) => ({
          code: item.f12,
          name: item.f14,
          price: item.f2 / 100,
          changePercent: item.f3 / 100,
          mainInflow: item.f62,
          inflowRatio: item.f66 / 100,
          volume: item.f6,
          updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        }))
        .sort((a: StockDataDto, b: StockDataDto) => b.mainInflow - a.mainInflow)
    }

    return []
  }

  /**
   * 生成模拟的股票数据（测试用）
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

    return stocks
      .map((stock) => {
        const basePrice = Math.random() * 100 + 10
        const changePercent = (Math.random() - 0.5) * 10
        const mainInflow =
          (Math.random() > 0.3 ? 1 : -1) *
          (Math.random() * 500000000 + 10000000)
        const volume = Math.abs(mainInflow) * (Math.random() * 5 + 1)
        const inflowRatio = (mainInflow / volume) * 100

        return {
          code: stock.code,
          name: stock.name,
          price: parseFloat(basePrice.toFixed(2)),
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
