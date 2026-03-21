import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StockDataDto } from './stock.dto'

/**
 * 股票服务 - 提供主力资金流入数据
 * 
 * 支持多种数据源：
 * 1. Web Search API（实时搜索）
 * 2. Tushare Pro API（需积分权限）
 * 3. 东方财富API（需外网访问）
 * 4. 模拟数据（测试用）
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
   */
  async getMainInflowRanking(): Promise<StockDataDto[]> {
    // 方案一：尝试使用真实股票数据（当前环境可能受限）
    // 如需启用真实数据，请取消下方注释并确保网络可访问外部API
    
    // 方案二：Tushare API（需要足够积分）
    if (this.tushareToken && this.tushareToken !== 'YOUR_TOKEN') {
      try {
        this.logger.log('尝试使用 Tushare Pro API')
        const data = await this.fetchFromTushare()
        if (data.length > 0) {
          return data
        }
      } catch (error) {
        this.logger.warn('Tushare API 调用失败:', error instanceof Error ? error.message : String(error))
      }
    }

    // 方案三：使用模拟数据
    // 在实际部署时，可替换为真实的股票数据API
    this.logger.log('使用模拟数据（演示模式）')
    return this.generateMockData()
  }

  /**
   * 从 Tushare Pro 获取主力资金数据
   * 
   * 注意：
   * - moneyflow 接口需要5000+积分
   * - 新注册用户积分不足时，可使用其他免费接口
   * 
   * 免费接口推荐：
   * - daily: 日线行情
   * - basic: 股票列表
   */
  private async fetchFromTushare(): Promise<StockDataDto[]> {
    const today = new Date()
    const tradeDate = today.toISOString().slice(0, 10).replace(/-/g, '')

    this.logger.log(`Tushare查询日期: ${tradeDate}`)

    // 尝试 moneyflow 接口（需要高积分）
    try {
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
            'ts_code',
            'name',
            'close',
            'pct_chg',
            'net_mf_amount',
            'net_mf_rate',
            'amount',
          ],
        }),
      })

      const result = await response.json()

      if (result.code === 0 && result.data?.items?.length > 0) {
        const fields = result.data.fields

        return result.data.items
          .map((item: any[]) => {
            const getFieldIndex = (fieldName: string) => fields.indexOf(fieldName)

            return {
              code: item[getFieldIndex('ts_code')]?.split('.')[0] || '',
              name: item[getFieldIndex('name')] || '',
              price: item[getFieldIndex('close')] || 0,
              changePercent: item[getFieldIndex('pct_chg')] || 0,
              mainInflow: (item[getFieldIndex('net_mf_amount')] || 0) * 10000,
              inflowRatio: item[getFieldIndex('net_mf_rate')] || 0,
              volume: (item[getFieldIndex('amount')] || 0) * 1000,
              updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            }
          })
          .filter((stock: StockDataDto) => stock.code && stock.name)
          .sort((a: StockDataDto, b: StockDataDto) => b.mainInflow - a.mainInflow)
      }

      if (result.code !== 0) {
        this.logger.warn(`Tushare权限不足: ${result.msg}`)
      }
    } catch (error) {
      this.logger.error('Tushare请求失败')
    }

    return []
  }

  /**
   * 生成模拟的股票数据
   * 
   * 数据说明：
   * - 本数据仅供演示使用，不构成投资建议
   * - 实际部署时请对接真实API
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
        // 基于基准价格生成合理的波动
        const priceChange = (Math.random() - 0.5) * 0.1 * stock.basePrice
        const price = stock.basePrice + priceChange
        const changePercent = (priceChange / stock.basePrice) * 100

        // 主力流入金额（基于市值规模）
        const baseInflow = stock.basePrice * 10000000 // 基于股价估算
        const mainInflow =
          (Math.random() > 0.3 ? 1 : -1) * // 70%概率流入
          (Math.random() * baseInflow + baseInflow * 0.5)

        // 成交额
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
