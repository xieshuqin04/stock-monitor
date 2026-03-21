import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Clock, TrendingUp } from 'lucide-react-taro'
import type { FC } from 'react'

interface StockData {
  code: string
  name: string
  price: number
  changePercent: number
  mainInflow: number
  inflowRatio: number
  volume: number
  updateTime: string
}

const IndexPage: FC = () => {
  const [stockList, setStockList] = useState<StockData[]>([])
  const [loading, setLoading] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')
  const [isCallAuctionTime, setIsCallAuctionTime] = useState(false)

  // 判断是否在集合竞价时段
  const checkCallAuctionTime = useCallback(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const time = hours * 60 + minutes
    const inTime = time >= 9 * 60 + 15 && time <= 9 * 60 + 27
    setIsCallAuctionTime(inTime)
    return inTime
  }, [])

  // 计算倒计时
  const calculateCountdown = useCallback(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const callAuctionStart = new Date(
      today.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000,
    )
    const callAuctionEnd = new Date(
      today.getTime() + 9 * 60 * 60 * 1000 + 27 * 60 * 1000,
    )

    if (now < callAuctionStart) {
      const diff = callAuctionStart.getTime() - now.getTime()
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      return `距离集合竞价开始 ${minutes}分${seconds}秒`
    } else if (now >= callAuctionStart && now <= callAuctionEnd) {
      const diff = callAuctionEnd.getTime() - now.getTime()
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      return `集合竞价中 ${minutes}分${seconds}秒`
    } else {
      return '今日集合竞价已结束'
    }
  }, [])

  // 格式化金额
  const formatAmount = (value: number): string => {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(2)}亿`
    } else if (Math.abs(value) >= 10000) {
      return `${(value / 10000).toFixed(2)}万`
    }
    return value.toFixed(2)
  }

  // 格式化涨跌幅
  const formatChange = (value: number): string => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  // 获取股票数据
  const fetchStockData = async () => {
    setLoading(true)
    try {
      const res = await Network.request({
        url: '/api/stock/main-inflow',
        method: 'GET',
      })
      console.log('API Response:', res.data)
      
      if (res.data && res.data.code === 200 && res.data.data) {
        setStockList(res.data.data)
        setLastUpdate(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      }
    } catch (error) {
      console.error('获取股票数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 开始/停止监控
  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false)
    } else {
      setIsMonitoring(true)
      fetchStockData()
    }
  }

  // 页面加载
  useLoad(() => {
    console.log('Page loaded.')
  })

  // 页面显示
  useDidShow(() => {
    checkCallAuctionTime()
  })

  // 下拉刷新
  usePullDownRefresh(() => {
    fetchStockData().finally(() => {
      Taro.stopPullDownRefresh()
    })
  })

  // 定时器：更新倒计时和自动刷新数据
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateCountdown())
      checkCallAuctionTime()
      
      // 在监控状态下，每5秒刷新一次数据
      if (isMonitoring) {
        fetchStockData()
      }
    }, 5000)

    // 初始化倒计时
    setCountdown(calculateCountdown())

    return () => clearInterval(timer)
  }, [isMonitoring, calculateCountdown, checkCallAuctionTime])

  return (
    <View className="min-h-screen bg-gray-100">
      {/* 顶部状态栏 */}
      <View className="bg-blue-500 px-4 py-3">
        <View className="flex items-center justify-between">
          <View className="flex items-center gap-2">
            <Clock size={20} color="#ffffff" />
            <Text className="text-white text-base">{countdown}</Text>
          </View>
          <View
            className={`px-3 py-1 rounded-full ${isCallAuctionTime ? 'bg-green-500' : 'bg-gray-400'}`}
          >
            <Text className="text-white text-sm">
              {isCallAuctionTime ? '交易中' : '非交易时段'}
            </Text>
          </View>
        </View>
      </View>

      {/* 控制栏 */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex items-center gap-3">
          <Button
            onClick={toggleMonitoring}
            className={`flex-1 ${isMonitoring ? 'bg-red-500' : 'bg-blue-500'}`}
          >
            <Text className="text-white font-medium">
              {isMonitoring ? '停止监控' : '开始监控'}
            </Text>
          </Button>
          <Button
            variant="outline"
            onClick={fetchStockData}
            disabled={loading}
            className="border-blue-500"
          >
            <View className="flex items-center gap-1">
              <RefreshCw
                size={16}
                color="#1890ff"
                className={loading ? 'animate-spin' : ''}
              />
              <Text className="text-blue-500">刷新</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* 数据列表 */}
      <View className="p-4 pb-20">
        {loading && stockList.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={32} color="#1890ff" className="animate-spin mb-4" />
            <Text className="text-gray-500">加载中...</Text>
          </View>
        ) : stockList.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <TrendingUp size={48} color="#d9d9d9" className="mb-4" />
            <Text className="text-gray-400 text-lg mb-2">暂无数据</Text>
            <Text className="text-gray-400 text-sm text-center">
              点击&ldquo;开始监控&rdquo;按钮{'\n'}在集合竞价时段获取主力资金数据
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {stockList.map((stock, index) => (
              <Card
                key={stock.code}
                className="bg-white rounded-lg shadow-sm border border-gray-100"
              >
                <CardContent className="p-4">
                  {/* 排名和股票基本信息 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center gap-3">
                      <View
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index < 3 ? 'bg-red-500' : 'bg-gray-300'
                        }`}
                      >
                        <Text className="text-white text-sm font-bold">
                          {index + 1}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-gray-900">
                          {stock.code}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {stock.name}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`px-2 py-1 rounded ${
                        stock.changePercent >= 0 ? 'bg-red-50' : 'bg-green-50'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          stock.changePercent >= 0
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {formatChange(stock.changePercent)}
                      </Text>
                    </View>
                  </View>

                  {/* 主力流入数据 */}
                  <View className="bg-gray-50 rounded-lg p-3">
                    <View className="flex items-center justify-between mb-2">
                      <Text className="text-sm text-gray-600">主力流入</Text>
                      <Text
                        className={`text-xl font-bold ${
                          stock.mainInflow >= 0
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {stock.mainInflow >= 0 ? '+' : ''}
                        {formatAmount(stock.mainInflow)}
                      </Text>
                    </View>
                    <View className="flex items-center justify-between">
                      <Text className="text-sm text-gray-600">流入占比</Text>
                      <Text className="text-base font-semibold text-blue-500">
                        {stock.inflowRatio.toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* 其他信息 */}
                  <View className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <View>
                      <Text className="text-xs text-gray-500">现价</Text>
                      <Text
                        className={`text-base font-semibold ${
                          stock.changePercent >= 0
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        ¥{stock.price.toFixed(2)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">成交额</Text>
                      <Text className="text-base font-semibold text-gray-900">
                        {formatAmount(stock.volume)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">更新时间</Text>
                      <Text className="text-sm text-gray-600">
                        {stock.updateTime}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* 底部信息栏 */}
      {lastUpdate && (
        <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <Text className="text-xs text-gray-500 text-center">
            最后更新时间：{lastUpdate}
          </Text>
        </View>
      )}
    </View>
  )
}

export default IndexPage
