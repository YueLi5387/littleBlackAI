// "use client";
// import { Button, Card, Checkbox, Form, Input, message, Segmented } from "antd";
// import styles from "./login.module.scss";
// import { useContext, useRef, useState } from "react";
// import { useUserStore } from "@/store/userStore";
// import { useRouter } from "next/navigation";
// import { CTX } from "../layout";
// import { registerService } from "@/lib/api/user";

// export default function LoginPage() {
//   const [isLogin, setIsLogin] = useState(true);
//   // 路由跳转
//   const router = useRouter();
//   // 获取仓库
//   const { user, setUser, getUser } = useUserStore();
//   const formRef = useRef(null);
//   // 改变登录状态
//   const setLogin = useContext(CTX) as () => void;

//   const changeLogin = (value: string) => {
//     formRef.current!.resetFields();
//     setIsLogin(value === "登录");
//   };
//   const [messageApi, contextHolder] = message.useMessage();
//   // 登录
//   const onFinishLogin = (values: any) => {
//     if (
//       !user ||
//       values.email !== user?.email ||
//       values.password !== user?.password
//     ) {
//       messageApi.open({
//         type: "error",
//         content: "邮箱或密码错误",
//       });
//     } else {
//       setUser(values);
//       router.push("/view/chatPage");
//       setLogin();
//       messageApi.open({
//         type: "success",
//         content: "登录成功",
//       });
//     }
//   };
//   // 注册
//   const onFinishRegister = async (values: any) => {
//     const res = await registerService(values);
//     console.log("res:", res);

//     setUser(values);
//     messageApi.open({
//       type: "success",
//       content: "注册成功",
//     });
//     changeLogin("登录");
//   };

//   return (
//     <div className={styles.loginPage}>
//       {contextHolder}

//       <Card className={styles.login}>
//         <Segmented
//           options={["登录", "注册"]}
//           onChange={changeLogin}
//           className={styles.header}
//         />
//         <div className={styles.content}>
//           {isLogin ? (
//             <Form
//               name="basic"
//               labelCol={{ span: 8 }}
//               wrapperCol={{ span: 16 }}
//               style={{ maxWidth: 600 }}
//               initialValues={{ remember: true }}
//               onFinish={onFinishLogin}
//               // onFinishFailed={onFinishFailed}
//               autoComplete="off"
//               ref={formRef}
//             >
//               <Form.Item
//                 label="邮箱"
//                 name="email"
//                 rules={[{ required: true, message: "请输入邮箱！" }]}
//               >
//                 <Input />
//               </Form.Item>

//               <Form.Item
//                 label="密码"
//                 name="password"
//                 rules={[{ required: true, message: "请输入密码！" }]}
//               >
//                 <Input.Password />
//               </Form.Item>

//               <Form.Item name="remember" valuePropName="checked" label={null}>
//                 <Checkbox>记住我</Checkbox>
//               </Form.Item>

//               <Form.Item label={null}>
//                 <Button type="primary" htmlType="submit">
//                   登录
//                 </Button>
//               </Form.Item>
//             </Form>
//           ) : (
//             <Form
//               name="basic"
//               labelCol={{ span: 8 }}
//               wrapperCol={{ span: 16 }}
//               style={{ maxWidth: 600 }}
//               initialValues={{ remember: true }}
//               onFinish={onFinishRegister}
//               autoComplete="off"
//               ref={formRef}
//             >
//               <Form.Item
//                 label="邮箱"
//                 name="email"
//                 rules={[{ required: true, message: "请输入邮箱！" }]}
//               >
//                 <Input />
//               </Form.Item>

//               <Form.Item
//                 label="密码"
//                 name="password"
//                 rules={[{ required: true, message: "请输入密码！" }]}
//               >
//                 <Input.Password />
//               </Form.Item>
//               <Form.Item
//                 label="确认密码"
//                 name="rePassword"
//                 rules={[
//                   { required: true, message: "请再次输入密码！" },
//                   {
//                     validator: (rule, value) => {
//                       if (value !== formRef.current.getFieldValue("password")) {
//                         return Promise.reject("两次密码不一致！");
//                       }
//                       return Promise.resolve();
//                     },
//                   },
//                 ]}
//               >
//                 <Input.Password />
//               </Form.Item>

//               {/* <Form.Item name="remember" valuePropName="checked" label={null}>
//                 <Checkbox>记住我</Checkbox>
//               </Form.Item> */}

//               <Form.Item label={null}>
//                 <Button type="primary" htmlType="submit">
//                   注册
//                 </Button>
//               </Form.Item>
//             </Form>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// }

"use client";
import { Button, Card, Checkbox, Form, Input, message, Segmented } from "antd";
import styles from "./login.module.scss";
import { useContext, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { CTX } from "../layout";
import { registerService } from "@/lib/api/user";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  // // 路由跳转
  // const router = useRouter();
  // // 获取仓库
  // const { user, setUser, getUser } = useUserStore();
  const formRef = useRef(null);
  // // 改变登录状态
  // const setLogin = useContext(CTX) as () => void;

  const changeLogin = (value: string) => {
    // formRef.current!.resetFields();
    setIsLogin(value === "登录");
  };
  const [messageApi, contextHolder] = message.useMessage();
  // // 登录
  const onFinishLogin = (values: any) => {
    // if (
    //   !user ||
    //   values.email !== user?.email ||
    //   values.password !== user?.password
    // ) {
    //   messageApi.open({
    //     type: "error",
    //     content: "邮箱或密码错误",
    //   });
    // } else {
    //   setUser(values);
    //   router.push("/view/chatPage");
    //   setLogin();
    //   messageApi.open({
    //     type: "success",
    //     content: "登录成功",
    //   });
    // }
  };
  // // 注册
  const onFinishRegister = async (values: any) => {
    // const res = await registerService(values);
    // console.log("res:", res);
    // setUser(values);
    // messageApi.open({
    //   type: "success",
    //   content: "注册成功",
    // });
    // changeLogin("登录");
  };

  return (
    <div className={styles.loginPage}>
      {contextHolder}

      <Card className={styles.login}>
        <Segmented
          options={["登录", "注册"]}
          onChange={changeLogin}
          className={styles.header}
        />
        <div className={styles.content}>
          {isLogin ? (
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinishLogin}
              // onFinishFailed={onFinishFailed}
              autoComplete="off"
              ref={formRef}
            >
              <Form.Item
                label="邮箱"
                name="email"
                rules={[{ required: true, message: "请输入邮箱！" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: "请输入密码！" }]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" label={null}>
                <Checkbox>记住我</Checkbox>
              </Form.Item>

              <Form.Item label={null}>
                <Button type="primary" htmlType="submit">
                  登录
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinishRegister}
              autoComplete="off"
              ref={formRef}
            >
              <Form.Item
                label="邮箱"
                name="email"
                rules={[{ required: true, message: "请输入邮箱！" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: "请输入密码！" }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="确认密码"
                name="rePassword"
                rules={[
                  { required: true, message: "请再次输入密码！" },
                  {
                    validator: (rule, value) => {
                      if (value !== formRef.current.getFieldValue("password")) {
                        return Promise.reject("两次密码不一致！");
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password />
              </Form.Item>

              {/* <Form.Item name="remember" valuePropName="checked" label={null}>
                <Checkbox>记住我</Checkbox>
              </Form.Item> */}

              <Form.Item label={null}>
                <Button type="primary" htmlType="submit">
                  注册
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Card>
    </div>
  );
}
