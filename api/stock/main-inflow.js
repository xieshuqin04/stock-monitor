/**
 * Vercel Serverless Function - 股票主力资金API
 * 使用 CommonJS 语法
 */

module.exports = async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ code: 405, message: 'Method Not Allowed' })
  }

  try {
    // 调用东方财富API
    const data = await fetchFromEastMoney()
    
    res.status(200).json({
      code: 200,
      message: 'success',
      data
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(200).json({
      code: 500,
      message: error.message,
      data: generateMockData()
    })
  }
}

/**
 * 从东方财富获取主力资金数据
 */
async function fetchFromEastMoney() {
  const params = new URLSearchParams({
    pn: '1',
    pz: '50',
    po: '1',
    np: '1',
    ut: 'fa5fd1943c7b386f172d6893dbfba10b',
    fltt: '2',
    invt: '2',
    fid: 'f62',
    fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
    fields: 'f12,f14,f2,f3,f62,f66,f6,f15,f16,f17,f18',
  })

  const url = `http://push2.eastmoney.com/api/qt/clist/get?${params}`
  
  const response = await fetch(url, {
    headers: {
      'Accept': '*/*',
      'Referer': 'http://quote.eastmoney.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  })

  const result = await response.json()

  if (!result.data?.diff) {
    throw new Error('数据为空')
  }

  const stocks = result.data.diff
    .filter(item => item.f12 && item.f14)
    .map(item => ({
      code: item.f12,
      name: item.f14,
      price: parseFloat((item.f2 ?? 0) / 100),
      changePercent: parseFloat((item.f3 ?? 0) / 100),
      mainInflow: parseFloat(item.f62 ?? 0),
      inflowRatio: parseFloat((item.f66 ?? 0) / 100),
      volume: parseFloat(item.f6 ?? 0),
      updateTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    }))
    .sort((a, b) => b.mainInflow - a.mainInflow)

  return stocks
}

/**
 * 模拟数据（降级方案）
 */
function generateMockData() {
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

  const updateTime = new Date().toLocaleTimeString('zh-CN', { hour12: false })

  return stocks
    .map(stock => {
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
