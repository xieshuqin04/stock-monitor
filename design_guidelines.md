# 股票集合竞价主力监控应用设计指南

## 1. 品牌定位

- **应用定位**：股票集合竞价时段主力资金监控工具
- **设计风格**：专业、简洁、数据驱动
- **目标用户**：A股市场投资者、短线交易者
- **核心场景**：早盘集合竞价时段（9:15-9:27）实时监控主力资金流入

## 2. 配色方案

### 主色板

```css
/* 主色调 - 金融专业蓝 */
--primary: #1890ff;           /* Tailwind: bg-blue-500, text-blue-500 */
--primary-dark: #096dd9;      /* Tailwind: bg-blue-600 */
--primary-light: #40a9ff;     /* Tailwind: bg-blue-400 */

/* 涨跌色 */
--rise: #f5222d;              /* Tailwind: text-red-500 */
--fall: #52c41a;              /* Tailwind: text-green-500 */

/* 强调色 - 数据高亮 */
--accent: #fa8c16;            /* Tailwind: bg-orange-500 */
```

### 中性色

```css
--background: #f5f5f5;        /* Tailwind: bg-gray-100 */
--foreground: #262626;        /* Tailwind: text-gray-800 */
--muted: #8c8c8c;             /* Tailwind: text-gray-500 */
--border: #e8e8e8;            /* Tailwind: border-gray-200 */
```

### 语义色

```css
--success: #52c41a;           /* 上涨、正向资金流入 */
--danger: #f5222d;            /* 下跌、负向资金流出 */
--warning: #faad14;           /* 警告、提示 */
--info: #1890ff;              /* 信息、中性 */
```

## 3. 字体规范

- **页面标题**：`text-2xl font-bold text-gray-900`
- **卡片标题**：`text-lg font-semibold text-gray-800`
- **股票代码**：`text-base font-mono font-semibold text-gray-900`
- **股票名称**：`text-sm text-gray-600`
- **数据展示**：`text-xl font-bold`
- **辅助信息**：`text-xs text-gray-500`

## 4. 间距系统

- **页面边距**：`p-4` (16px)
- **卡片内边距**：`p-4` (16px)
- **列表项间距**：`gap-3` (12px)
- **组件间距**：`gap-4` (16px)
- **底部安全区**：`pb-20` (80px，避开底部操作栏)

## 5. 组件规范

### 5.1 按钮样式

```tsx
// 主按钮 - 开始监控
import { Button } from '@/components/ui/button'
<Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
  开始监控
</Button>

// 次按钮 - 刷新数据
<Button variant="outline" className="border-blue-500 text-blue-500">
  刷新
</Button>

// 禁用态
<Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
  非交易时段
</Button>
```

### 5.2 卡片容器

```tsx
// 股票列表项卡片
import { Card, CardContent } from '@/components/ui/card'
<Card className="bg-white rounded-lg shadow-sm border border-gray-100">
  <CardContent className="p-4">
    {/* 股票信息 */}
  </CardContent>
</Card>
```

### 5.3 数据展示组件

```tsx
// 主力流入金额 - 大字体高亮
<Text className="text-xl font-bold text-red-500">
  +1.2亿
</Text>

// 涨跌幅 - 带背景标签
<View className="bg-red-50 px-2 py-1 rounded">
  <Text className="text-sm font-semibold text-red-500">+3.25%</Text>
</View>
```

### 5.4 空状态

```tsx
<View className="flex flex-col items-center justify-center py-20">
  <Text className="text-gray-400 text-lg mb-2">暂无数据</Text>
  <Text className="text-gray-400 text-sm">等待集合竞价时段开始</Text>
</View>
```

### 5.5 加载态

```tsx
import { Skeleton } from '@/components/ui/skeleton'

<View className="space-y-3">
  <Skeleton className="h-20 w-full rounded-lg" />
  <Skeleton className="h-20 w-full rounded-lg" />
</View>
```

## 6. 导航结构

### 单页面应用

- **首页**：`pages/index/index` - 主力资金监控页面
- **无TabBar**：专注单一功能场景

### 页面布局

```
┌─────────────────────────────────┐
│  状态栏：交易时段/倒计时        │
├─────────────────────────────────┤
│  监控控制：开始/暂停 刷新 设置  │
├─────────────────────────────────┤
│                                 │
│  股票列表（按主力流入排序）      │
│  - 股票代码 名称                │
│  - 主力流入金额                 │
│  - 现价 涨跌幅                  │
│  - 流入占比 成交额              │
│                                 │
├─────────────────────────────────┤
│  底部：最后更新时间              │
└─────────────────────────────────┘
```

## 7. 小程序约束

### 性能优化

- 列表使用虚拟滚动（超过50条数据）
- 图片使用懒加载
- 数据缓存策略：本地存储最近一次数据

### 网络请求

- 使用 `Network.request` 封装
- 请求超时设置：5秒
- 失败重试：最多3次
- 轮询间隔：5秒（集合竞价时段）

### 数据安全

- 不存储用户敏感信息
- 股票数据仅供参考，不构成投资建议
- 数据来源声明

## 8. 实现要点

### 时间控制

```typescript
// 判断是否在集合竞价时段
const isCallAuctionTime = () => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const time = hours * 60 + minutes
  return time >= 9 * 60 + 15 && time <= 9 * 60 + 27
}

// 计算距离下次集合竞价的倒计时
const getCountdown = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const callAuctionStart = new Date(today.getTime() + 9 * 60 * 60 * 1000 + 15 * 60 * 1000)
  
  if (now < callAuctionStart) {
    const diff = callAuctionStart.getTime() - now.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}分${seconds}秒`
  }
  return null
}
```

### 数据格式化

```typescript
// 金额格式化（亿元/万元）
const formatAmount = (value: number) => {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`
  } else if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(2)}万`
  }
  return value.toFixed(2)
}

// 涨跌幅格式化
const formatChange = (value: number) => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
```

## 9. 数据结构

### 股票数据接口

```typescript
interface StockData {
  code: string           // 股票代码：600001
  name: string           // 股票名称：平安银行
  price: number          // 现价：12.34
  changePercent: number  // 涨跌幅：+3.25
  mainInflow: number     // 主力流入金额（元）：123456789
  inflowRatio: number    // 流入占比：25.6%
  volume: number         // 成交额（元）：987654321
  updateTime: string     // 更新时间：09:25:30
}
```

### API响应格式

```typescript
interface ApiResponse<T> {
  code: number           // 状态码：200成功
  message: string        // 消息
  data: T               // 数据
}
```
