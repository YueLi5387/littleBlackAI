import { NextRequest, NextResponse } from "next/server";

const db = require("@/lib/db");
//注册新用户
export async function POST(req: NextRequest) {
  console.log(req);
  return NextResponse.json({ });
  // const { req } = await req.json();
  //查询重名
  // const sql1 = "select * from user where username=?";
  // db.query(sql1, req.body.username, (err, results) => {
  //   if (err) return res.cc(err);
  //   if (results.length > 0) {
  //     return res.cc("用户名已存在");
  //   }
  //   //对密码进行加密
  //   req.body.password = bcrypt.hashSync(req.body.password, 10);
  //   //插入新用户
  //   const sql2 = "insert into user set ?";
  //   db.query(
  //     sql2,
  //     { username: req.body.username, password: req.body.password },
  //     (err, results) => {
  //       if (err) return res.cc(err);
  //       if (results.affectedRows !== 1) {
  //         return res.cc("注册新用户失败");
  //       }
  //       return res.cc("注册新用户成功", 0);
  //     }
  //   );
  // });
}
