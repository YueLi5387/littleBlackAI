"use client";
import { Button, Card, Checkbox, Form, Input, message, Segmented } from "antd";
import styles from "./login.module.scss";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notification } from "antd";
import type { FormInstance } from "antd";
import { ROUTES } from "@/lib/constants/routes";
import { useUserStore } from "@/store/userStore";

export default function LoginPage() {
  const [head, setHead] = useState("登录");
  const [isLoading, setIsLoading] = useState(false); //加载状态

  // 路由跳转
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<FormInstance | null>(null);
  const { user, setUser } = useUserStore();

  const changeLogin = (value: string) => {
    formRef.current?.resetFields(); //清空表单
    // 如果是切换到登录，且仓库有存储的用户信息，则自动填充
    if (value === "登录" && user) {
      setTimeout(() => {
        formRef.current?.setFieldsValue({
          email: user.username,
          password: user.password,
          remember: true,
        });
      }, 0);
    }
    setHead(value);
  };
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationAPI, notificationHolder] = notification.useNotification();

  useEffect(() => {
    if (searchParams.get("auth_error") === "1") {
      notificationAPI.warning({
        message: "邮箱验证失败",
        description: "验证链接已过期或无效，请重新注册或再次获取验证邮件。",
      });
    }
    // 初始进入页面，如果仓库有用户信息，自动填充
    if (head === "登录" && user) {
      formRef.current?.setFieldsValue({
        email: user.username,
        password: user.password,
        remember: true,
      });
    }
  }, [notificationAPI, searchParams, user, head]);

  // 登录
  const supabase = createClient();
  const getLoginErrorTip = (error: unknown) => {
    if (!(error instanceof Error)) return "登录失败，请稍后重试~";
    const normalized = error.message.toLowerCase();
    if (normalized.includes("email not confirmed")) {
      return "邮箱尚未验证，请先完成邮件验证后再登录。";
    }
    if (normalized.includes("invalid login credentials")) {
      return "账号或密码错误，请检查后重试。";
    }
    return error.message;
  };

  const onFinishLogin = async (values: {
    email: string;
    password: string;
    remember: boolean;
  }) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      // 处理“记住我”逻辑
      if (values.remember) {
        setUser({ username: values.email, password: values.password });
      } else {
        setUser(null);
      }

      messageApi.open({
        type: "success",
        content: "登录成功",
      });
      router.push(ROUTES.chatHome);
    } catch (error: unknown) {
      messageApi.open({
        type: "error",
        content: getLoginErrorTip(error),
      });
    } finally {
      setIsLoading(false);
    }
  };
  // 注册
  const onFinishRegister = async (values: {
    email: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      const emailRedirectTo = `${window.location.origin}${
        ROUTES.authConfirm
      }?next=${encodeURIComponent(ROUTES.chatHome)}`;

      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo,
        },
      });
      if (error) throw error;

      notificationAPI["warning"]({
        title: "注册成功",
        description: "请查看邮箱信息点击验证链接确认您的身份，验证后才可登录。",
      });
      changeLogin("登录");
    } catch (error: unknown) {
      messageApi.open({
        type: "error",
        content:
          error instanceof Error ? error.message : "注册失败，请稍后重试~",
      });
    } finally {
      setIsLoading(false);
    }
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
                rules={[
                  { required: true, message: "请输入邮箱！" },
                  { type: "email", message: "请输入正确的邮箱格式！" },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: "请输入密码！" },
                  { min: 6, message: "密码至少 6 位！" },
                ]}
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
                rules={[
                  { required: true, message: "请输入邮箱！" },
                  { type: "email", message: "请输入正确的邮箱格式！" },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[
                  { required: true, message: "请输入密码！" },
                  { min: 6, message: "密码至少 6 位！" },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label="确认密码"
                name="rePassword"
                rules={[
                  { required: true, message: "请再次输入密码！" },
                  {
                    validator: (_, value) => {
                      if (
                        value !== formRef.current?.getFieldValue("password")
                      ) {
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
