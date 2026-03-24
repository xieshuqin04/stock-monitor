# 主力资金监控系统

> 基于 GitHub Pages 的股票主力资金实时监控工具

---

## 项目概述

**项目地址**: https://xieshuqin04.github.io/stock-monitor/

**功能定位**: 监控A股市场主力资金流向，帮助投资者发现机构操盘动向

**技术栈**: 
- 前端：纯 HTML + JavaScript + Tailwind CSS (CDN)
- 数据源：东方财富开放API
- 部署：GitHub Pages 静态托管

---

## 功能清单

### 1. 集合竞价主力监控

**功能描述**: 监控 9:15-9:27 集合竞价时段主力资金流入最多的股票

**数据字段**:
| 字段 | 说明 |
|------|------|
| 主力净流入 | 主力资金净买入金额 |
| 主力净占比 | 主力净流入占成交额比例 |
| 现价 | 股票当前价格 |
| 涨跌幅 | 当日涨跌百分比 |
| 成交额 | 累计成交金额 |

**API接口**: 
```
https://push2.eastmoney.com/api/qt/clist/get
参数: fid=f62 (按主力净流入排序)
```

---

### 2. 实时主力流入

**功能描述**: 监控交易时段（9:30-15:00）主力资金实时流向

**数据字段**:
| 字段 | 说明 |
|------|------|
| 主力净流入 | 主力资金净买入金额 |
| 主力净占比 | 主力净流入占成交额比例 |
| 超大单 | 超大单买卖金额 |
| 大单 | 大单买卖金额 |
| 现价 | 股票当前价格 |
| 涨跌幅 | 当日涨跌百分比 |

**API接口**: 
```
https://push2.eastmoney.com/api/qt/clist/get
参数: fid=f62, fields=f84,f78 (超大单、大单)
```

**刷新频率**: 3秒/次

---

### 3. 隔夜挂单排名

**功能描述**: 显示主力资金流入/流出的实际金额，计算涨停价和跌停价

**数据字段**:
| 字段 | 说明 |
|------|------|
| 流入金额 | 主力买入总金额 |
| 流出金额 | 主力卖出总金额 |
| 净流入 | 流入 - 流出 |
| 涨停价 | 今日涨停价 (现价 × 1.1) |
| 跌停价 | 今日跌停价 (现价 × 0.9) |
| 挂单类型 | 涨停板/主力流入/主力流出 |

**计算逻辑**:
```javascript
// 流入流出金额估算
if (mainInflow >= 0) {
    inflowAmount = (volume + mainInflow) / 2;
    outflowAmount = (volume - mainInflow) / 2;
} else {
    inflowAmount = (volume + mainInflow) / 2;
    outflowAmount = (volume - mainInflow) / 2;
}

// 涨跌停价计算
limitUpPrice = price * 1.1;
limitDownPrice = price * 0.9;
```

---

### 4. 量化机构操盘监测

**功能描述**: 通过超大单交易特征识别量化机构操盘动向

**数据字段**:
| 字段 | 说明 |
|------|------|
| 机构买入 | 推算的机构买入金额 |
| 机构卖出 | 推算的机构卖出金额 |
| 机构净买 | 机构净买入金额 |
| 机构类型 | 量化基金/公募基金/私募基金/机构席位 |
| 超大单 | 超大单交易金额 |
| 大单 | 大单交易金额 |

**机构类型识别逻辑**:
```javascript
if (superInflow > mainInflow * 0.5) {
    institutionType = '量化基金';  // 超大单占比高
} else if (bigInflow > mainInflow * 0.3) {
    institutionType = '公募基金';  // 大单占比高
} else if (mainInflow > 0) {
    institutionType = '私募基金';  // 中等规模
} else {
    institutionType = '机构卖出';  // 净流出
}
```

---

## 文件结构

```
stock-monitor/
├── index.html          # 主页面（包含所有功能）
├── api/
│   └── stock/
│       └── main-inflow.js   # Vercel Serverless API（备用）
├── vercel.json         # Vercel部署配置
├── README.md           # 项目说明
└── PROJECT_RECORD.md   # 本文档
```

---

## API接口文档

### 东方财富API

**基础URL**: `https://push2.eastmoney.com/api/qt/clist/get`

**通用参数**:
| 参数 | 值 | 说明 |
|------|-----|------|
| pn | 1 | 页码 |
| pz | 50 | 每页数量 |
| po | 1 | 排序方向 |
| np | 1 | 未知 |
| ut | fa5fd1943c7b386f172d6893dbfba10b | Token |
| fltt | 2 | 数据格式 |
| invt | 2 | 投资类型 |
| fs | m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23 | A股市场 |

**字段映射**:
| 字段代码 | 说明 | 单位 |
|----------|------|------|
| f12 | 股票代码 | - |
| f14 | 股票名称 | - |
| f2 | 最新价 | 元 |
| f3 | 涨跌幅 | % |
| f6 | 成交额 | 元 |
| f62 | 主力净流入 | 元 |
| f66 | 主力净占比 | % |
| f78 | 大单净流入 | 元 |
| f84 | 超大单净流入 | 元 |

---

## 核心功能代码

### 倒计时计算

```javascript
function calculateCountdown() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const callAuctionStart = new Date(today.getTime() + 9*60*60*1000 + 15*60*1000);
    const callAuctionEnd = new Date(today.getTime() + 9*60*60*1000 + 27*60*1000);
    const tradingEnd = new Date(today.getTime() + 15*60*60*1000);
    
    // 根据当前时段返回不同倒计时
}
```

### 时段判断

```javascript
function isCallAuctionTime() {
    // 9:15-9:27 集合竞价
    const time = hours * 60 + minutes;
    return time >= 9 * 60 + 15 && time <= 9 * 60 + 27;
}

function isTradingTime() {
    // 9:30-11:30, 13:00-15:00 交易时段
    const time = hours * 60 + minutes;
    return (time >= 9*60+30 && time <= 11*60+30) ||
           (time >= 13*60 && time <= 15*60);
}
```

---

## 部署说明

### GitHub Pages 部署（当前方案）

1. 代码推送到 GitHub 仓库
2. Settings → Pages → 选择 main 分支
3. 访问地址: `https://用户名.github.io/仓库名/`

**优点**: 免费、稳定、自动部署
**缺点**: 不支持后端API（需前端直接调用API）

### Vercel 部署（备选方案）

1. 连接 GitHub 仓库
2. 自动识别静态站点
3. 支持Serverless Function

**优点**: 支持后端API、更快
**缺点**: 需要注册Vercel账号

---

## 后续优化建议

### 功能优化

1. **添加自选股功能**
   - 本地存储自选股列表
   - 突出显示自选股

2. **添加预警功能**
   - 主力流入超过阈值提醒
   - 涨停板提醒
   - 浏览器通知 API

3. **历史数据对比**
   - 昨日同期对比
   - 近5日主力流向趋势

4. **数据导出**
   - 导出CSV/Excel
   - 分享功能

### 技术优化

1. **数据缓存**
   - LocalStorage 缓存
   - 减少API请求

2. **错误处理**
   - API失败重试
   - 降级显示缓存数据

3. **性能优化**
   - 虚拟滚动（大量数据）
   - 懒加载

### 数据源优化

1. **备用API**
   - 新浪财经API
   - 腾讯财经API
   - 网易财经API

2. **WebSocket实时推送**
   - 减少轮询
   - 更实时的数据

---

## 已知问题

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| 跨域限制 | 已知 | 前端直接调用API，依赖浏览器CORS |
| 价格单位 | 已修复 | 移除错误的除以100逻辑 |
| 非交易时段无数据 | 正常 | 交易时段才有数据更新 |

---

## 更新日志

### v1.4.0 (2024-01-XX)
- ✨ 新增量化机构操盘监测功能
- 🎨 优化机构类型识别逻辑

### v1.3.0 (2024-01-XX)
- ✨ 新增隔夜挂单排名功能
- 🐛 修正现价显示不准确问题
- 💄 改为显示实际流入/流出金额

### v1.2.0 (2024-01-XX)
- ✨ 新增实时主力流入功能
- 🎨 添加Tab切换功能
- ⚡ 实时模式3秒刷新

### v1.1.0 (2024-01-XX)
- ✨ 新增集合竞价主力监控
- ⏰ 添加交易时段倒计时
- 🔄 自动刷新功能

### v1.0.0 (2024-01-XX)
- 🎉 项目初始化
- 📦 部署到 GitHub Pages

---

## 联系方式

如有问题或建议，请在 GitHub 仓库提交 Issue。

---

**最后更新**: 2024年
