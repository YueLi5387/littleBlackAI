const db = require("../../../db");

// 新建一个对话，前端传来对话信息，返回对话id
export async function POST(req: Request) {
  const { user_id, content } = params;
  const sql = `INSERT INTO dialogue (user_id, content) VALUES (${user_id}, '${content}')`;
  const result = await db.query(sql);
  return result.insertId;
}
