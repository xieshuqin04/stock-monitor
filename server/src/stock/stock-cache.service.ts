import { Injectable, Logger } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

/**
 * 股票缓存服务 - 从多数据源获取A股数据并缓存到数据库
 */
@Injectable()
export class StockCacheService {
  private readonly logger = new Logger(StockCacheService.name)

  // Tushare配置
  private readonly TUSHARE_API_URL = 'https://api.tushare.pro'
  private readonly TUSHARE_TOKEN = process.env.TUSHARE_TOKEN || 'e54304257545987546deeb6a1e349766c05dee283948eacf48109f62'

  /**
   * 从数据库搜索股票
   */
  async searchStocks(keyword: string, limit: number = 20): Promise<any[]> {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('stock_cache')
      .select('code, name, market, price, change_percent, main_inflow, volume, turnover_rate, data_source, updated_at')
      .or(`code.ilike.%${keyword}%,name.ilike.%${keyword}%`)
      .order('volume', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error(`搜索股票失败: ${error.message}`)
      throw new Error(`搜索股票失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 根据代码获取股票详情
   */
  async getStockByCode(code: string): Promise<any | null> {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('stock_cache')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      this.logger.error(`获取股票详情失败: ${error.message}`)
      throw new Error(`获取股票详情失败: ${error.message}`)
    }

    return data
  }

  /**
   * 获取所有缓存的股票列表（带分页）
   */
  async getAllStocks(page: number = 1, pageSize: number = 100): Promise<{ data: any[], total: number }> {
    const client = getSupabaseClient()
    
    // 获取总数
    const { count, error: countError } = await client
      .from('stock_cache')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      this.logger.error(`获取股票总数失败: ${countError.message}`)
      throw new Error(`获取股票总数失败: ${countError.message}`)
    }

    // 分页获取数据
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error } = await client
      .from('stock_cache')
      .select('code, name, market, price, change_percent, main_inflow, volume, turnover_rate, data_source, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (error) {
      this.logger.error(`获取股票列表失败: ${error.message}`)
      throw new Error(`获取股票列表失败: ${error.message}`)
    }

    return { data: data || [], total: count || 0 }
  }

  /**
   * 获取主力资金流入排行榜
   */
  async getMainInflowRanking(limit: number = 50): Promise<any[]> {
    const client = getSupabaseClient()
    
    const { data, error } = await client
      .from('stock_cache')
      .select('code, name, market, price, change_percent, main_inflow, volume, turnover_rate, data_source, updated_at')
      .not('main_inflow', 'is', null)
      .order('main_inflow', { ascending: false })
      .limit(limit)

    if (error) {
      this.logger.error(`获取主力流入排行失败: ${error.message}`)
      throw new Error(`获取主力流入排行失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 从东方财富获取全量A股数据并缓存
   */
  async syncFromEastmoney(): Promise<{ success: number; failed: number; source: string }> {
    this.logger.log('开始从东方财富同步股票数据...')
    
    try {
      const url = 'https://push2.eastmoney.com/api/qt/clist/get'
      const params = new URLSearchParams({
        pn: '1',
        pz: '6000',
        po: '1',
        np: '1',
        ut: 'fa5fd1943c7b386f172d6893dbfba10b',
        fltt: '2',
        invt: '2',
        fs: 'm:0+t:6,m:1+t:2', // 沪A+深A
        fields: 'f12,f14,f2,f3,f62,f66,f6,f8',
      })

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Accept': '*/*',
          'Referer': 'http://quote.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.data?.diff) {
        throw new Error('数据为空')
      }

      const stocks = result.data.diff
        .filter((item: any) => item.f12 && item.f14)
        .map((item: any) => ({
          code: item.f12,
          name: item.f14,
          market: item.f12.startsWith('6') ? 'SH' : 'SZ',
          price: parseFloat(item.f2 ?? 0),
          change_percent: parseFloat(item.f3 ?? 0),
          main_inflow: parseFloat(item.f62 ?? 0),
          volume: parseFloat(item.f6 ?? 0),
          turnover_rate: parseFloat(item.f8 ?? 0),
          data_source: 'eastmoney',
          is_active: '1',
          updated_at: new Date().toISOString(),
        }))

      // 批量更新到数据库
      const { success, failed } = await this.batchUpsertStocks(stocks)
      
      this.logger.log(`东方财富同步完成: 成功 ${success}, 失败 ${failed}`)
      return { success, failed, source: 'eastmoney' }
    } catch (error) {
      this.logger.error(`东方财富同步失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 从Tushare获取股票基本信息并缓存
   */
  async syncFromTushare(): Promise<{ success: number; failed: number; source: string }> {
    this.logger.log('开始从Tushare同步股票数据...')
    
    try {
      // 获取股票基本信息
      const response = await fetch(this.TUSHARE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'stock_basic',
          token: this.TUSHARE_TOKEN,
          params: { list_status: 'L', exchange: '' },
          fields: 'ts_code,symbol,name,area,industry,list_date',
        }),
      })

      const result = await response.json()
      
      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API错误')
      }

      const stocks = result.data.items.map((item: any[]) => {
        const fields = result.data.fields
        const getValue = (name: string) => {
          const idx = fields.indexOf(name)
          return idx >= 0 ? item[idx] : null
        }
        
        const tsCode = getValue('ts_code') || ''
        const code = tsCode.split('.')[0]
        const market = tsCode.endsWith('.SH') ? 'SH' : tsCode.endsWith('.SZ') ? 'SZ' : 'BJ'
        
        return {
          code,
          name: getValue('name') || '',
          market,
          data_source: 'tushare',
          is_active: '1',
          updated_at: new Date().toISOString(),
        }
      })

      const { success, failed } = await this.batchUpsertStocks(stocks)
      
      this.logger.log(`Tushare同步完成: 成功 ${success}, 失败 ${failed}`)
      return { success, failed, source: 'tushare' }
    } catch (error) {
      this.logger.error(`Tushare同步失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 批量更新股票数据到数据库
   */
  private async batchUpsertStocks(stocks: any[]): Promise<{ success: number; failed: number }> {
    const client = getSupabaseClient()
    let success = 0
    let failed = 0

    // 分批处理，每批100条
    const batchSize = 100
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize)
      
      try {
        const { error } = await client
          .from('stock_cache')
          .upsert(batch, { onConflict: 'code' })

        if (error) {
          this.logger.error(`批量插入失败: ${error.message}`)
          failed += batch.length
        } else {
          success += batch.length
        }
      } catch (e) {
        this.logger.error(`批量处理异常: ${e instanceof Error ? e.message : String(e)}`)
        failed += batch.length
      }
    }

    return { success, failed }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<any> {
    const client = getSupabaseClient()
    
    // 获取总数
    const { count, error: countError } = await client
      .from('stock_cache')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw new Error(`获取统计失败: ${countError.message}`)
    }

    // 获取各市场数量
    const { data: marketData, error: marketError } = await client
      .from('stock_cache')
      .select('market')

    if (marketError) {
      throw new Error(`获取市场统计失败: ${marketError.message}`)
    }

    const marketStats: Record<string, number> = {}
    marketData?.forEach(item => {
      marketStats[item.market] = (marketStats[item.market] || 0) + 1
    })

    // 获取最后更新时间
    const { data: lastUpdate, error: lastUpdateError } = await client
      .from('stock_cache')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastUpdateError) {
      throw new Error(`获取最后更新时间失败: ${lastUpdateError.message}`)
    }

    return {
      total: count || 0,
      marketStats,
      lastUpdate: lastUpdate?.updated_at || null,
    }
  }

  /**
   * 批量获取股票实时数据（从多个数据源）
   */
  async getRealtimeData(codes: string[]): Promise<any[]> {
    const client = getSupabaseClient()
    
    if (!codes || codes.length === 0) {
      return []
    }

    const { data, error } = await client
      .from('stock_cache')
      .select('*')
      .in('code', codes)

    if (error) {
      this.logger.error(`批量获取股票数据失败: ${error.message}`)
      throw new Error(`批量获取股票数据失败: ${error.message}`)
    }

    return data || []
  }

  /**
   * 更新单只股票数据
   */
  async updateStockData(code: string, data: Partial<any>): Promise<void> {
    const client = getSupabaseClient()
    
    const { error } = await client
      .from('stock_cache')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)

    if (error) {
      this.logger.error(`更新股票数据失败: ${error.message}`)
      throw new Error(`更新股票数据失败: ${error.message}`)
    }
  }
}
