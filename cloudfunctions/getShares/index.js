const pg = require('pg')

/**
 * 云函数 getShares：按月返回 365天思考实验 的内容清单
 *
 * 为什么要它：App 直查 PostgREST 时，拿到包里那把 publishable key 的人也能一把拖走整张表。
 * 改走这个函数之后，表上 anon 的 select 策略会被删掉 —— 直查变 401，只有这里能读。
 *
 * 连库方式（官方文档）：云函数运行时自动注入 PGHOST / PGPORT / PGDATABASE / PGUSER / PGPASSWORD，
 * 用标准 pg 驱动直连；服务端直连不触发 RLS，所以 anon 策略关掉也不影响这里。
 */
const pool = new pg.Pool({
	host: process.env.PGHOST,
	port: Number(process.env.PGPORT || 5432),
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	ssl: { rejectUnauthorized: false },
	max: 2
})

// 一次最多给多少条：防止有人拿 month 参数把整库一次捞走
const MAX_ROWS = 400

exports.main = async (event) => {
	if (!process.env.PGHOST) {
		return { code: 500, msg: '云函数运行时未注入 PG 连接变量，检查环境是否为 PostgreSQL 环境' }
	}

	const q = (event && (event.queryStringParameters || event.query)) || {}
	const month = String(q.month || '')
	if (!/^\d{4}-\d{2}$/.test(month)) {
		return { code: 400, msg: 'month 参数需要 YYYY-MM 格式' }
	}
	const limit = Math.min(Number(q.limit) || MAX_ROWS, MAX_ROWS)

	// 月份边界显式带 +08，避免数据库会话时区不是东八区时把月初 00:00–08:00 的记录漏掉
	const sql =
		'select image_url, created_at from public.daily_shares ' +
		"where created_at >= ($1 || '-01T00:00:00+08')::timestamptz " +
		"and created_at <  (($1 || '-01T00:00:00+08')::timestamptz + interval '1 month') " +
		'order by created_at asc limit $2'

	try {
		const res = await pool.query(sql, [month, limit])
		return { code: 0, month, count: res.rows.length, data: res.rows }
	} catch (e) {
		// 不把 e.message 原样回给客户端，避免暴露库名/账号
		return { code: 500, msg: 'query failed' }
	}
}
