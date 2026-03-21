/**
 * 股票主力资金流入数据
 */
export class StockDataDto {
  /** 股票代码 */
  code: string

  /** 股票名称 */
  name: string

  /** 现价 */
  price: number

  /** 涨跌幅 */
  changePercent: number

  /** 主力流入金额（元） */
  mainInflow: number

  /** 流入占比 */
  inflowRatio: number

  /** 成交额（元） */
  volume: number

  /** 更新时间 */
  updateTime: string
}

/**
 * API响应格式
 */
export class ApiResponseDto<T> {
  /** 状态码 */
  code: number

  /** 消息 */
  message: string

  /** 数据 */
  data: T
}
