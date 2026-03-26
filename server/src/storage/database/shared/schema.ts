import { pgTable, serial, timestamp, varchar, numeric, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 股票缓存表 - 存储所有A股基本信息和实时数据
export const stockCache = pgTable(
	"stock_cache",
	{
		id: serial().primaryKey(),
		code: varchar("code", { length: 10 }).notNull(),           // 股票代码，如 600519
		name: varchar("name", { length: 50 }).notNull(),           // 股票名称，如 贵州茅台
		market: varchar("market", { length: 10 }).notNull(),       // 市场：SH/SZ/BJ
		price: numeric("price", { precision: 10, scale: 2 }),      // 现价
		change_percent: numeric("change_percent", { precision: 6, scale: 2 }), // 涨跌幅（%）
		main_inflow: numeric("main_inflow", { precision: 16, scale: 2 }),      // 主力净流入（元）
		volume: numeric("volume", { precision: 16, scale: 2 }),                // 成交额（元）
		turnover_rate: numeric("turnover_rate", { precision: 6, scale: 2 }),   // 换手率（%）
		data_source: varchar("data_source", { length: 20 }).notNull().default('eastmoney'), // 数据来源
		is_active: varchar("is_active", { length: 1 }).notNull().default('1'), // 是否活跃交易
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		// 股票代码唯一索引
		index("stock_cache_code_idx").on(table.code),
		// 市场索引
		index("stock_cache_market_idx").on(table.market),
		// 主力流入排序索引
		index("stock_cache_main_inflow_idx").on(table.main_inflow),
		// 更新时间索引
		index("stock_cache_updated_at_idx").on(table.updated_at),
	]
);

export type StockCache = typeof stockCache.$inferSelect;
