"use client";
import { Button, Card, Checkbox, Form, Input, message, Segmented } from "antd";
import styles from "./login.module.scss";
import { useRef, useState } from "react";
// import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
// import { CTX } from "../layout";
// import { registerService } from "@/lib/api/user";
import { createClient } from "@/lib/supabase/client";
import { notification } from "antd";

export default function LoginPage() {
  const [head, setHead] = useState("登录");
  const [isLoading, setIsLoading] = useState(false); //加载状态

  // 路由跳转
  const router = useRouter();
  const formRef = useRef(null);

  const changeLogin = (value: string) => {
    formRef.current!.resetFields(); //清空表单
    setHead(value);
  };
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationAPI, notificationHolder] = notification.useNotification();

  // 登录
  const supabase = createClient();

  const onFinishLogin = async (values: any) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      messageApi.open({
        type: "success",
        content: "登录成功",
      });
      console.log("登录成功：", data);

      router.push("/view/chatPage");
    } catch (error: unknown) {
      messageApi.open({
        type: "error",
        content:
          error instanceof Error ? error.message : "登录失败，请稍后重试~",
      });
      notificationAPI["warning"]({
        title: "温馨提示",
        description: "请查看邮箱，确保您已校验用户身份。",
      });
    } finally {
      setIsLoading(false);
    }
  };
  // 注册

  const onFinishRegister = async (values: any) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `/view/loginPage`, //这里配置的是自动跳转
      },
    });
    setIsLoading(false);
    if (error) throw error;
    notificationAPI["warning"]({
      title: "注册成功",
      description: "请查看邮箱信息点击验证链接确认您的身份，验证后才可登录。",
    });
    changeLogin("登录");
  };

  return (
    <div className={styles.loginPage}>
      {contextHolder}
      {notificationHolder}

      <Card className={styles.login}>
        <Segmented
          options={["登录", "注册"]}
          value={head}
          onChange={changeLogin}
          className={styles.header}
        />
        <div className={styles.content}>
          {head === "登录" ? (
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinishLogin}
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
                <Button type="primary" htmlType="submit" disabled={isLoading}>
                  {isLoading ? "登录中..." : "登录"}
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

              <Form.Item label={null}>
                <Button type="primary" htmlType="submit" disabled={isLoading}>
                  {isLoading ? "注册中..." : "注册"}
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Card>
    </div>
  );
}
